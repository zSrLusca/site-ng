import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { effectivePrice } from "../utils/money.js";
import { validateCoupon } from "./coupon.js";
import { getPaymentProvider } from "../payments/index.js";
import { getRuntimeConfig } from "./runtime.js";
import { markPaymentAndFulfill } from "./delivery.js";
import { isDiscordSnowflake } from "./discord.js";

export async function nextOrderNumber() {
  const year = new Date().getFullYear();
  const counter = await prisma.orderCounter.upsert({
    where: { year },
    create: { year, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `GR-${year}-${String(counter.value).padStart(5, "0")}`;
}

type CheckoutItem = { productId: string; quantity: number };

export async function createCheckout(input: {
  name: string;
  email: string;
  playerId: string;
  discordId: string;
  phone?: string;
  cpf?: string;
  couponCode?: string;
  paymentMethod: "pix" | "credit_card";
  items: CheckoutItem[];
}) {
  if (!input.items.length) {
    throw new AppError("Carrinho vazio.", 400, "EMPTY_CART");
  }
  if (!isDiscordSnowflake(input.discordId)) {
    throw new AppError("Informe o ID numérico do Discord (17 a 20 dígitos).", 400, "DISCORD_ID");
  }

  const products = await prisma.product.findMany({
    where: { id: { in: input.items.map((i) => i.productId) }, active: true },
    include: { category: true },
  });

  const lines = input.items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new AppError("Produto inválido no carrinho.", 400, "INVALID_PRODUCT");
    if (item.quantity < 1) throw new AppError("Quantidade inválida.", 400, "INVALID_QTY");
    const soldOut =
      product.availabilityStatus === "sold_out" ||
      (!product.unlimited && product.stock < item.quantity);
    if (soldOut) {
      throw new AppError(`Produto ${product.name} indisponível.`, 400, "OUT_OF_STOCK");
    }
    const unit = effectivePrice(product.priceCents, product.promoPriceCents);
    return {
      product,
      quantity: item.quantity,
      unitPriceCents: unit,
      totalCents: unit * item.quantity,
    };
  });

  const subtotalCents = lines.reduce((acc, l) => acc + l.totalCents, 0);
  let discountCents = 0;
  let couponId: string | undefined;
  let couponCode: string | undefined;

  if (input.couponCode) {
    const applied = await validateCoupon(
      input.couponCode,
      lines.map((l) => ({
        productId: l.product.id,
        categoryId: l.product.categoryId,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
      })),
      subtotalCents,
    );
    discountCents = applied.discountCents;
    couponId = applied.coupon.id;
    couponCode = applied.coupon.code;
  }

  const totalCents = Math.max(subtotalCents - discountCents, 0);
  if (totalCents <= 0) {
    throw new AppError("Valor do pedido inválido.", 400, "INVALID_TOTAL");
  }

  const customer = await prisma.customer.upsert({
    where: {
      email_playerId: {
        email: input.email.toLowerCase().trim(),
        playerId: input.playerId.trim(),
      },
    },
    create: {
      name: input.name.trim(),
      email: input.email.toLowerCase().trim(),
      playerId: input.playerId.trim(),
      discordId: input.discordId.trim(),
      phone: input.phone,
      cpf: input.cpf?.replace(/\D/g, ""),
    },
    update: {
      name: input.name.trim(),
      discordId: input.discordId.trim(),
      phone: input.phone,
      cpf: input.cpf?.replace(/\D/g, ""),
    },
  });

  const number = await nextOrderNumber();

  const order = await prisma.order.create({
    data: {
      number,
      customerId: customer.id,
      status: "awaiting_payment",
      subtotalCents,
      discountCents,
      totalCents,
      couponId,
      couponCode,
      paymentMethod: input.paymentMethod,
      items: {
        create: lines.map((l) => ({
          productId: l.product.id,
          name: l.product.name,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
          totalCents: l.totalCents,
          fivemAction: l.product.fivemAction,
          fivemPayload: l.product.fivemPayload ?? undefined,
        })),
      },
    },
    include: { items: true, customer: true },
  });

  const runtime = await getRuntimeConfig();
  const provider = await getPaymentProvider();
  const payment = await provider.createPayment({
    orderId: order.id,
    orderNumber: order.number,
    amountCents: totalCents,
    method: input.paymentMethod,
    description: `Garoa RP — Pedido ${order.number}`,
    customer: {
      name: customer.name,
      email: customer.email,
      cpf: customer.cpf,
      phone: customer.phone,
    },
    notificationUrl: /^https:\/\//i.test(runtime.webhookUrl) && !/localhost|127\.0\.0\.1/i.test(runtime.webhookUrl)
      ? runtime.webhookUrl
      : undefined,
    successUrl: `${runtime.appUrl}/pedido/${order.number}/sucesso`,
    failureUrl: `${runtime.appUrl}/pedido/${order.number}`,
  });

  const saved = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      method: input.paymentMethod,
      status: payment.status,
      amountCents: totalCents,
      qrCode: payment.qrCode,
      qrCodeBase64: payment.qrCodeBase64,
      ticketUrl: payment.ticketUrl,
      rawPayload: payment.raw as object | undefined,
    },
  });

  return { order, payment: saved };
}

export async function processWebhook(payload: unknown, headers: Record<string, string | string[] | undefined>) {
  const provider = await getPaymentProvider();
  const log = await prisma.webhookLog.create({
    data: {
      provider: provider.name,
      event: "payment",
      payload: payload as object,
      headers: headers as object,
    },
  });

  try {
    const result = await provider.handleWebhook(payload, headers);
    if (!result) {
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: { processed: true },
      });
      return { ignored: true };
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { providerPaymentId: result.providerPaymentId },
          { orderId: result.orderId ?? "" },
        ],
      },
    });

    if (!payment) {
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: { processed: true, error: "Pagamento não encontrado" },
      });
      return { ignored: true };
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: result.status,
        providerPaymentId: result.providerPaymentId || payment.providerPaymentId,
        rawPayload: result.raw as object,
      },
    });

    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { processed: true, orderId: payment.orderId },
    });

    await markPaymentAndFulfill(payment.orderId, result.status);
    return { ok: true, orderId: payment.orderId, status: result.status };
  } catch (error) {
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { error: error instanceof Error ? error.message : "Erro no webhook" },
    });
    throw error;
  }
}

export async function syncOrderPayment(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order || ["paid", "processing", "delivered", "refunded"].includes(order.status)) {
    return order;
  }

  const row = order.payments[0];
  if (!row?.providerPaymentId || row.provider === "dev") return order;

  const provider = await getPaymentProvider();
  let status = row.status;
  let providerPaymentId = row.providerPaymentId;

  try {
    const direct = await provider.getPaymentStatus(row.providerPaymentId);
    status = direct.status;
    providerPaymentId = direct.providerPaymentId;
  } catch {
    const found = await provider.findByExternalReference?.(order.id);
    if (!found) return order;
    status = found.status;
    providerPaymentId = found.providerPaymentId;
  }

  await prisma.payment.update({
    where: { id: row.id },
    data: { status, providerPaymentId },
  });
  await markPaymentAndFulfill(order.id, status);
  return prisma.order.findUnique({ where: { id: order.id } });
}
