import { prisma } from "../lib/prisma.js";
import { assignDiscordRole } from "./discord.js";
import { deliverToFiveM } from "./fivem.js";

async function upsertDelivery(orderId: string, idempotency: string, data: {
  productId?: string;
  action?: string | null;
  payload?: unknown;
}) {
  const existing = await prisma.delivery.findUnique({ where: { idempotency } });
  if (existing?.status === "delivered") return existing;
  if (existing) {
    return prisma.delivery.update({
      where: { id: existing.id },
      data: { status: "pending", attempts: { increment: 1 }, error: null },
    });
  }
  return prisma.delivery.create({
    data: {
      orderId,
      productId: data.productId,
      status: "pending",
      action: data.action,
      payload: data.payload as object | undefined,
      idempotency,
      attempts: 1,
    },
  });
}

export async function refreshOrderStatus(orderId: string) {
  const deliveries = await prisma.delivery.findMany({ where: { orderId } });
  if (!deliveries.length) return;
  const allOk = deliveries.every((d) => d.status === "delivered");
  const anyFail = deliveries.some((d) => d.status === "failed");
  await prisma.order.update({
    where: { id: orderId },
    data: { status: allOk ? "delivered" : anyFail ? "processing" : "processing" },
  });
}

export async function fulfillOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, customer: true, deliveries: true },
  });
  if (!order) return;
  if (order.status !== "paid" && order.status !== "processing") return;

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "processing" },
  });

  for (const item of order.items) {
    const discordKey = `${order.id}:${item.id}:discord`;
    const fivemKey = `${order.id}:${item.id}:fivem`;
    const itemPayload =
      item.fivemPayload && typeof item.fivemPayload === "object" && !Array.isArray(item.fivemPayload)
        ? (item.fivemPayload as Record<string, unknown>)
        : {};
    const skipDiscord = itemPayload.skipDiscord === true;
    const skipFiveM = !item.fivemAction || item.fivemAction === "none";

    const discordRow = await upsertDelivery(order.id, discordKey, {
      productId: item.productId,
      action: "discord",
      payload: { ...itemPayload, product: item.name },
    });
    if (discordRow.status !== "delivered") {
      try {
        if (skipDiscord) {
          await prisma.delivery.update({
            where: { id: discordRow.id },
            data: {
              status: "delivered",
              response: { skipped: true, message: "Produto sem cargo Discord." },
              deliveredAt: new Date(),
            },
          });
        } else {
          if (!order.customer.discordId) {
            throw new Error("Cliente sem ID do Discord no pedido.");
          }
          const discordResult = await assignDiscordRole(order.customer.discordId, item.fivemPayload);
          await prisma.delivery.update({
            where: { id: discordRow.id },
            data: {
              status: "delivered",
              response: discordResult as object,
              deliveredAt: new Date(),
            },
          });
        }
      } catch (error) {
        await prisma.delivery.update({
          where: { id: discordRow.id },
          data: {
            status: "failed",
            error: error instanceof Error ? error.message : "Falha no Discord",
          },
        });
      }
    }

    const fivemPayload =
      item.fivemPayload && typeof item.fivemPayload === "object" && !Array.isArray(item.fivemPayload)
        ? {
            ...(item.fivemPayload as Record<string, unknown>),
            quantity: item.quantity,
            name: item.name,
            discordId: order.customer.discordId || "",
            playerId: order.customer.playerId || "",
          }
        : {
            quantity: item.quantity,
            name: item.name,
            discordId: order.customer.discordId || "",
            playerId: order.customer.playerId || "",
          };

    const fivemRow = await upsertDelivery(order.id, fivemKey, {
      productId: item.productId,
      action: item.fivemAction,
      payload: fivemPayload,
    });
    if (fivemRow.status !== "delivered") {
      try {
        if (skipFiveM) {
          await prisma.delivery.update({
            where: { id: fivemRow.id },
            data: {
              status: "delivered",
              response: { skipped: true, message: "Produto sem entrega no servidor." },
              deliveredAt: new Date(),
            },
          });
        } else {
          const fivemResult = await deliverToFiveM({
            deliveryId: fivemRow.id,
            orderNumber: order.number,
            playerId: order.customer.playerId || "",
            discordId: order.customer.discordId || "",
            customerName: order.customer.name,
            items: [
              {
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                action: item.fivemAction,
                payload: fivemPayload,
              },
            ],
          });
          if (fivemResult.queued) {
            await prisma.delivery.update({
              where: { id: fivemRow.id },
              data: { status: "pending", response: fivemResult as object },
            });
          } else {
            await prisma.delivery.update({
              where: { id: fivemRow.id },
              data: {
                status: "delivered",
                response: fivemResult as object,
                deliveredAt: new Date(),
              },
            });
          }
        }
      } catch (error) {
        await prisma.delivery.update({
          where: { id: fivemRow.id },
          data: {
            status: "failed",
            error: error instanceof Error ? error.message : "Falha na entrega FiveM",
          },
        });
      }
    }
  }

  await refreshOrderStatus(order.id);
}

export async function markPaymentAndFulfill(orderId: string, paymentStatus: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return null;

  if (paymentStatus === "approved") {
    if (["paid", "processing", "delivered"].includes(order.status)) {
      if (order.status === "paid" || order.status === "processing") {
        await fulfillOrder(order.id);
      }
      return prisma.order.findUnique({ where: { id: order.id } });
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "paid" },
      });
      for (const item of order.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product && !product.unlimited) {
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usedCount: { increment: 1 } },
        });
        await tx.couponUsage.create({
          data: {
            couponId: order.couponId,
            customerId: order.customerId,
            orderId: order.id,
          },
        });
      }
    });

    await fulfillOrder(order.id);
  } else if (paymentStatus === "rejected" || paymentStatus === "cancelled") {
    await prisma.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
  } else if (paymentStatus === "expired") {
    await prisma.order.update({ where: { id: order.id }, data: { status: "expired" } });
  } else if (paymentStatus === "refunded") {
    await prisma.order.update({ where: { id: order.id }, data: { status: "refunded" } });
  } else if (paymentStatus === "pending") {
    if (order.status === "awaiting_payment") {
      await prisma.order.update({ where: { id: order.id }, data: { status: "pending_payment" } });
    }
  }

  return prisma.order.findUnique({ where: { id: order.id } });
}
