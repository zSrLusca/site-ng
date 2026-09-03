import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import cookie from "@fastify/cookie";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { env, isProd } from "./env.js";
import { AppError } from "./lib/errors.js";
import { getRuntimeConfig, SECRET_SETTING_KEYS } from "./services/runtime.js";
import { prisma } from "./lib/prisma.js";
import { publicRoutes } from "./routes/public.js";
import { adminRoutes } from "./routes/admin.js";
import { fivemRoutes } from "./routes/fivem.js";

async function main() {
  await mkdir(path.resolve(env.UPLOAD_DIR), { recursive: true });
  await prisma.setting.deleteMany({
    where: { key: { in: [...SECRET_SETTING_KEYS] } },
  });

  const app = Fastify({
    logger: {
      level: isProd ? "info" : "warn",
    },
    trustProxy: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
  await app.register(cors, {
    origin: async (origin) => {
      const { allowedOrigins } = await getRuntimeConfig();
      if (!origin) return true;
      return allowedOrigins.includes(origin);
    },
    credentials: true,
  });
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    allowList: (req) => String(req.url).startsWith("/webhooks/"),
  });
  await app.register(cookie);
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });
  await app.register(multipart, {
    limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024 },
  });
  await app.register(staticFiles, {
    root: path.resolve(env.UPLOAD_DIR),
    prefix: "/uploads/",
  });

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }
    if (error.validation) {
      return reply.status(400).send({
        error: "VALIDATION",
        message: "Dados inválidos.",
        details: error.validation,
      });
    }
    req.log.error(error);
    const status = (error as { statusCode?: number }).statusCode || 500;
    return reply.status(status).send({
      error: "INTERNAL",
      message: isProd ? "Erro interno." : error.message,
    });
  });

  await app.register(publicRoutes);
  await app.register(adminRoutes);
  await app.register(fivemRoutes);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`Garoa API em http://localhost:${env.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
