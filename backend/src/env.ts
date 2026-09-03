import "dotenv/config";
import { z } from "zod";


const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3333),
  APP_URL: z.string().default("http://localhost:5173"),
  API_URL: z.string().default("http://localhost:3333"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("8h"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  UPLOAD_DIR: z.string().default("./uploads"),
  UPLOAD_MAX_MB: z.coerce.number().default(8),
  PAYMENT_PROVIDER: z.string().default("mercadopago"),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional().default(""),
  MERCADOPAGO_PUBLIC_KEY: z.string().optional().default(""),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional().default(""),
  PAYMENT_DEV_MODE: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  FIVEM_API_URL: z.string().optional().default(""),
  FIVEM_API_KEY: z.string().optional().default(""),
  FIVEM_TIMEOUT_MS: z.coerce.number().default(8000),
  DISCORD_BOT_TOKEN: z.string().optional().default(""),
  DISCORD_GUILD_ID: z.string().optional().default(""),
  DISCORD_ROLE_SELECT: z.string().optional().default(""),
  DISCORD_ROLE_PRIME: z.string().optional().default(""),
  DISCORD_ROLE_PRESTIGE: z.string().optional().default(""),
  DISCORD_ROLE_ELITE: z.string().optional().default(""),
  DISCORD_ROLE_IMPERIAL: z.string().optional().default(""),
  DISCORD_ROLE_SUPREME: z.string().optional().default(""),
  RATE_LIMIT_MAX: z.coerce.number().default(120),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),
});

export const env = schema.parse(process.env);
export const isProd = env.NODE_ENV === "production";
