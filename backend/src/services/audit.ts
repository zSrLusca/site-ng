import type { FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function audit(
  req: FastifyRequest,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: unknown,
) {
  const adminId = (req.user as { sub?: string } | undefined)?.sub;
  await prisma.auditLog.create({
    data: {
      adminId: adminId ?? null,
      action,
      entity,
      entityId,
      metadata: metadata as object | undefined,
      ip: req.ip,
    },
  });
}
