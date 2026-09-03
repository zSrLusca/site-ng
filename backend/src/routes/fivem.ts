import type { FastifyInstance } from "fastify";
import { unauthorized } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { refreshOrderStatus } from "../services/delivery.js";
import { getRuntimeConfig } from "../services/runtime.js";

export async function fivemRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req) => {
    const { fivemApiKey } = await getRuntimeConfig();
    const key = req.headers["x-api-key"];
    if (!fivemApiKey || key !== fivemApiKey) {
      throw unauthorized("API key inválida.");
    }
  });

  app.get("/fivem/deliveries/pending", async (req) => {
    const q = req.query as { playerId?: string; discordId?: string };
    const playerId = typeof q.playerId === "string" ? q.playerId.trim() : "";
    const discordId = typeof q.discordId === "string" ? q.discordId.trim() : "";
    const customerFilter =
      playerId || discordId
        ? {
            OR: [
              ...(playerId ? [{ playerId }] : []),
              ...(discordId ? [{ discordId }] : []),
            ],
          }
        : undefined;

    const rows = await prisma.delivery.findMany({
      where: {
        status: { in: ["pending", "failed"] },
        NOT: { action: "discord" },
        ...(customerFilter ? { order: { customer: customerFilter } } : {}),
      },
      include: {
        order: {
          select: {
            number: true,
            customer: { select: { name: true, playerId: true, discordId: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      payload: row.payload,
      status: row.status,
      attempts: row.attempts,
      productId: row.productId,
      orderNumber: row.order.number,
      playerId: row.order.customer.playerId,
      discordId: row.order.customer.discordId,
      customerName: row.order.customer.name,
    }));
  });

  app.post("/fivem/deliveries/:id/ack", async (req) => {
    const { id } = req.params as { id: string };
    const updated = await prisma.delivery.update({
      where: { id },
      data: { status: "delivered", deliveredAt: new Date(), error: null },
    });
    await refreshOrderStatus(updated.orderId);
    return updated;
  });
}
