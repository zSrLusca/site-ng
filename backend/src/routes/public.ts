import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { notFound, AppError } from "../lib/errors.js";
import { getSettings, publicSettings } from "../services/settings.js";
import { validateCoupon } from "../services/coupon.js";
import { createCheckout, processWebhook, syncOrderPayment } from "../services/order.js";
import { getPaymentProvider } from "../payments/index.js";
import { getRuntimeConfig } from "../services/runtime.js";
import { fulfillOrder, markPaymentAndFulfill } from "../services/delivery.js";
import { isDiscordSnowflake } from "../services/discord.js";

function productPublic(p: {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string;
  benefits: unknown;
  extraInfo: string | null;
  priceCents: number;
  promoPriceCents: number | null;
  stock: number;
  unlimited: boolean;
  featured: boolean;
  onSale: boolean;
  availabilityLabel: string;
  availabilityStatus: string;
  buttonText: string;
  images: { url: string; alt: string | null; sortOrder: number }[];
  category: { id: string; name: string; slug: string; icon: string | null };
}) {
  const soldOut =
    p.availabilityStatus === "sold_out" || (!p.unlimited && p.stock <= 0);
  return {
    ...p,
    soldOut,
    availableStock: p.unlimited ? null : p.stock,
  };
}

export async function publicRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ ok: true, service: "garoa-store-api" }));

  app.get("/store/bootstrap", async () => {
    const [settings, categories, banners] = await Promise.all([
      getSettings(),
      prisma.category.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          image: true,
          featured: true,
          showInMenu: true,
        },
      }),
      prisma.banner.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);
    return { settings: publicSettings(settings), categories, banners };
  });

  app.get("/store/rules", async () => {
    const [filters, sections] = await Promise.all([
      prisma.ruleFilter.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
      prisma.ruleSection.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { number: "asc" }] }),
    ]);
    return { filters, sections };
  });

  app.get("/store/sitemap", async (req, reply) => {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
      prisma.category.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    ]);
    const base = (await getRuntimeConfig()).appUrl;
    const urls = [
      `${base}/`,
      `${base}/catalogo`,
      `${base}/regras`,
      ...categories.map((c) => `${base}/categoria/${c.slug}`),
      ...products.map((p) => `${base}/produto/${p.slug}`),
    ];
    reply.header("Content-Type", "application/xml");
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${u}</loc></url>`).join("\n")}
</urlset>`;
  });

  app.get("/store/products", async (req) => {
    const q = z
      .object({
        search: z.string().optional(),
        category: z.string().optional(),
        featured: z.enum(["true", "false"]).optional(),
        sale: z.enum(["true", "false"]).optional(),
        page: z.coerce.number().min(1).default(1),
        perPage: z.coerce.number().min(1).max(48).default(16),
      })
      .parse(req.query);

    const where = {
      active: true,
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search } },
              { shortDescription: { contains: q.search } },
            ],
          }
        : {}),
      ...(q.category ? { category: { slug: q.category } } : {}),
      ...(q.featured === "true" ? { featured: true } : {}),
      ...(q.sale === "true" ? { onSale: true } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          category: { select: { id: true, name: true, slug: true, icon: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
    ]);

    return {
      items: rows.map(productPublic),
      page: q.page,
      perPage: q.perPage,
      total,
      pages: Math.ceil(total / q.perPage),
    };
  });

  app.get("/store/products/:slug", async (req) => {
    const { slug } = req.params as { slug: string };
    const product = await prisma.product.findFirst({
      where: { slug, active: true },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: { select: { id: true, name: true, slug: true, icon: true } },
      },
    });
    if (!product) throw notFound("Produto");
    return productPublic(product);
  });

  app.get("/store/categories/:slug", async (req) => {
    const { slug } = req.params as { slug: string };
    const q = z
      .object({
        page: z.coerce.number().min(1).default(1),
        perPage: z.coerce.number().min(1).max(48).default(16),
      })
      .parse(req.query);

    const category = await prisma.category.findFirst({ where: { slug, active: true } });
    if (!category) throw notFound("Categoria");

    const where = { active: true, categoryId: category.id };
    const [total, rows] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          category: { select: { id: true, name: true, slug: true, icon: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
    ]);

    return {
      category,
      items: rows.map(productPublic),
      page: q.page,
      perPage: q.perPage,
      total,
      pages: Math.ceil(total / q.perPage),
    };
  });

  app.post("/store/coupons/validate", async (req) => {
    const body = z
      .object({
        code: z.string().min(2),
        items: z.array(
          z.object({
            productId: z.string(),
            quantity: z.number().int().min(1),
          }),
        ),
      })
      .parse(req.body);

    const products = await prisma.product.findMany({
      where: { id: { in: body.items.map((i) => i.productId) }, active: true },
    });
    const { effectivePrice } = await import("../utils/money.js");
    const lines = body.items.map((item) => {
      const p = products.find((x) => x.id === item.productId);
      if (!p) throw new AppError("Produto inválido.", 400);
      return {
        productId: p.id,
        categoryId: p.categoryId,
        quantity: item.quantity,
        unitPriceCents: effectivePrice(p.priceCents, p.promoPriceCents),
      };
    });
    const subtotal = lines.reduce((a, l) => a + l.unitPriceCents * l.quantity, 0);
    const result = await validateCoupon(body.code, lines, subtotal);
    return {
      code: result.coupon.code,
      type: result.coupon.type,
      value: result.coupon.value,
      discountCents: result.discountCents,
    };
  });

  app.post("/store/checkout", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  }, async (req) => {
    const settings = await getSettings();
    const body = z
      .object({
        name: z.string().min(3),
        email: z.string().email(),
        playerId: z.string().min(1),
        discordId: z.string().min(17),
        phone: z.string().optional(),
        cpf: z.string().optional(),
        couponCode: z.string().optional(),
        paymentMethod: z.enum(["pix", "credit_card"]),
        items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1) })).min(1),
      })
      .parse(req.body);

    if (settings.checkoutRequireCpf && !body.cpf) {
      throw new AppError("CPF é obrigatório para o pagamento.", 400);
    }

    return createCheckout(body);
  });

  app.get("/store/orders/:number", async (req) => {
    const { number } = req.params as { number: string };
    let order = await prisma.order.findUnique({
      where: { number },
      include: {
        items: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        customer: { select: { name: true, email: true, playerId: true, discordId: true } },
        deliveries: { select: { status: true, action: true, error: true } },
      },
    });
    if (!order) throw notFound("Pedido");
    if (["awaiting_payment", "pending_payment"].includes(order.status)) {
      await syncOrderPayment(order.id);
    } else if (["paid", "processing"].includes(order.status)) {
      await fulfillOrder(order.id);
    }
    if (["awaiting_payment", "pending_payment", "paid", "processing"].includes(order.status)) {
      order = await prisma.order.findUnique({
        where: { number },
        include: {
          items: true,
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
          customer: { select: { name: true, email: true, playerId: true, discordId: true } },
          deliveries: { select: { status: true, action: true, error: true } },
        },
      });
      if (!order) throw notFound("Pedido");
    }
    const payment = order.payments[0];
    return {
      number: order.number,
      status: order.status,
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      totalCents: order.totalCents,
      couponCode: order.couponCode,
      paymentMethod: order.paymentMethod,
      items: order.items,
      customer: order.customer,
      needsDiscord: !order.customer.discordId && ["paid", "processing", "delivered"].includes(order.status),
      deliveries: order.deliveries,
      payment: payment
        ? {
            status: payment.status,
            method: payment.method,
            qrCode: payment.qrCode,
            qrCodeBase64: payment.qrCodeBase64,
            ticketUrl: payment.ticketUrl,
          }
        : null,
      createdAt: order.createdAt,
    };
  });

  app.post("/store/orders/:number/link-discord", async (req) => {
    const { number } = req.params as { number: string };
    const body = z
      .object({
        email: z.string().email(),
        discordId: z.string().min(17),
      })
      .parse(req.body);
    if (!isDiscordSnowflake(body.discordId)) {
      throw new AppError("ID do Discord inválido. Use o ID numérico da conta.", 400);
    }

    const order = await prisma.order.findUnique({
      where: { number },
      include: { customer: true },
    });
    if (!order) throw notFound("Pedido");
    if (!["paid", "processing", "delivered"].includes(order.status)) {
      throw new AppError("O pagamento deste pedido ainda não foi aprovado.", 400);
    }
    if (order.customer.email.toLowerCase() !== body.email.toLowerCase().trim()) {
      throw new AppError("E-mail não confere com o pedido.", 400);
    }

    await prisma.customer.update({
      where: { id: order.customerId },
      data: { discordId: body.discordId.trim() },
    });
    await fulfillOrder(order.id);
    return { ok: true };
  });

  async function receivePaymentWebhook(req: { body: unknown; query: unknown; headers: object }, reply: { send: (v: unknown) => unknown }) {
    const query = req.query as { id?: string; topic?: string; type?: string };
    const payload =
      req.body && typeof req.body === "object" && Object.keys(req.body as object).length
        ? req.body
        : { id: query.id, topic: query.topic, type: query.type, data: query.id ? { id: query.id } : undefined };
    const result = await processWebhook(payload, req.headers as Record<string, string | string[] | undefined>);
    return reply.send(result);
  }

  app.post("/webhooks/payment", { config: { rateLimit: false } }, receivePaymentWebhook);
  app.get("/webhooks/payment", { config: { rateLimit: false } }, receivePaymentWebhook);

  app.post("/webhooks/dev-confirm", async (req) => {
    const runtime = await getRuntimeConfig();
    if (!runtime.paymentDevMode) {
      throw new AppError("Endpoint disponível apenas com modo de desenvolvimento de pagamento ativo.", 403);
    }
    const body = z
      .object({
        orderNumber: z.string(),
        status: z.enum(["approved", "rejected", "expired", "cancelled", "refunded"]).default("approved"),
      })
      .parse(req.body);

    const order = await prisma.order.findUnique({
      where: { number: body.orderNumber },
      include: { payments: true },
    });
    if (!order) throw notFound("Pedido");
    const payment = order.payments[0];
    if (payment) {
      const provider = await getPaymentProvider();
      await provider.handleWebhook(
        { providerPaymentId: payment.providerPaymentId, status: body.status },
        {},
      );
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: body.status },
      });
    }
    await markPaymentAndFulfill(order.id, body.status);
    return { ok: true };
  });
}
