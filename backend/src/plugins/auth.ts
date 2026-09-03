import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { forbidden, unauthorized } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

export type JwtUser = {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
};

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: JwtUser;
  }
}

export async function requireAdmin(req: FastifyRequest, _reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    throw unauthorized("Sessão inválida. Faça login novamente.");
  }

  const admin = await prisma.admin.findUnique({
    where: { id: req.user.sub },
    include: { role: true },
  });
  if (!admin || !admin.active) {
    throw unauthorized("Conta administrativa inativa.");
  }
  req.user.permissions = asStringArray(admin.role.permissions);
  req.user.role = admin.role.slug;
}

export function requirePermission(...needed: string[]) {
  return async (req: FastifyRequest) => {
    const perms = req.user.permissions ?? [];
    if (perms.includes("*")) return;
    const ok = needed.some((p) => perms.includes(p));
    if (!ok) throw forbidden("Você não tem permissão para esta ação.");
  };
}

export async function registerAuth(app: FastifyInstance) {
  app.decorate("requireAdmin", requireAdmin);
}
