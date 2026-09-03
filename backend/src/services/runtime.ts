import { env, isProd } from "../env.js";
import { prisma } from "../lib/prisma.js";
import { getSettings } from "./settings.js";

export const SECRET_SETTING_KEYS = [
  "mpAccessToken",
  "mpPublicKey",
  "mpWebhookSecret",
  "fivemApiKey",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_PUBLIC_KEY",
  "MERCADOPAGO_WEBHOOK_SECRET",
  "FIVEM_API_KEY",
  "DISCORD_BOT_TOKEN",
  "JWT_SECRET",
  "ADMIN_PASSWORD",
  "DATABASE_URL",
] as const;

function asString(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function asBool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

export type RuntimeConfig = {
  appUrl: string;
  apiUrl: string;
  allowedOrigins: string[];
  paymentProvider: string;
  paymentDevMode: boolean;
  mpAccessToken: string;
  mpPublicKey: string;
  mpWebhookSecret: string;
  fivemApiUrl: string;
  fivemApiKey: string;
  discordBotToken: string;
  discordGuildId: string;
  discordRoles: Record<string, string>;
  webhookUrl: string;
  paymentReady: boolean;
  mpMode: "test" | "production" | "custom" | "none";
};

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  const rows = await prisma.setting.findMany();
  const db = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const str = (key: string, fallback: string) =>
    key in db ? asString(db[key], fallback) : fallback;
  const flag = (key: string, fallback: boolean) =>
    key in db ? asBool(db[key], fallback) : fallback;

  const appUrl = str("appUrl", env.APP_URL).replace(/\/$/, "");
  const apiUrl = str("apiUrl", env.API_URL).replace(/\/$/, "");
  const origins = str("allowedOrigins", env.ALLOWED_ORIGINS)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const mpAccessToken = env.MERCADOPAGO_ACCESS_TOKEN;
  const paymentProvider = str("paymentProvider", env.PAYMENT_PROVIDER) || "mercadopago";
  const paymentDevMode = flag("paymentDevMode", env.PAYMENT_DEV_MODE);

  return {
    appUrl,
    apiUrl,
    allowedOrigins: origins.length ? origins : [env.FRONTEND_URL],
    paymentProvider,
    paymentDevMode,
    mpAccessToken,
    mpPublicKey: env.MERCADOPAGO_PUBLIC_KEY,
    mpWebhookSecret: env.MERCADOPAGO_WEBHOOK_SECRET,
    fivemApiUrl: str("fivemApiUrl", env.FIVEM_API_URL),
    fivemApiKey: env.FIVEM_API_KEY,
    discordBotToken: env.DISCORD_BOT_TOKEN,
    discordGuildId: env.DISCORD_GUILD_ID,
    discordRoles: {
      select: str("discordRoleSelect", env.DISCORD_ROLE_SELECT),
      prime: str("discordRolePrime", env.DISCORD_ROLE_PRIME),
      prestige: str("discordRolePrestige", env.DISCORD_ROLE_PRESTIGE),
      elite: str("discordRoleElite", env.DISCORD_ROLE_ELITE),
      imperial: str("discordRoleImperial", env.DISCORD_ROLE_IMPERIAL),
      supreme: str("discordRoleSupreme", env.DISCORD_ROLE_SUPREME),
    },
    webhookUrl: `${apiUrl}/webhooks/payment`,
    paymentReady: Boolean(mpAccessToken) && paymentProvider === "mercadopago",
    mpMode: mpAccessToken.startsWith("TEST-")
      ? "test"
      : mpAccessToken.startsWith("APP_USR-")
        ? "production"
        : mpAccessToken
          ? "custom"
          : "none",
  };
}

export function maskAdminSettings(all: Record<string, unknown>, runtime: RuntimeConfig) {
  const next = { ...all };
  for (const key of SECRET_SETTING_KEYS) {
    delete next[key];
  }
  next.appUrl = asString(next.appUrl, runtime.appUrl);
  next.apiUrl = asString(next.apiUrl, runtime.apiUrl);
  next.allowedOrigins = asString(next.allowedOrigins, runtime.allowedOrigins.join(","));
  next.paymentProvider = runtime.paymentProvider;
  next.paymentDevMode = runtime.paymentDevMode;
  next.fivemApiUrl = asString(next.fivemApiUrl, runtime.fivemApiUrl);
  next.webhookUrl = runtime.webhookUrl;
  next.paymentReady = runtime.paymentReady;
  next.mpConfigured = Boolean(runtime.mpAccessToken);
  next.mpWebhookConfigured = Boolean(runtime.mpWebhookSecret);
  next.fivemKeyConfigured = Boolean(runtime.fivemApiKey);
  next.discordConfigured = Boolean(runtime.discordBotToken && runtime.discordGuildId);
  next.discordRoleSelect = runtime.discordRoles.select;
  next.discordRolePrime = runtime.discordRoles.prime;
  next.discordRolePrestige = runtime.discordRoles.prestige;
  next.discordRoleElite = runtime.discordRoles.elite;
  next.discordRoleImperial = runtime.discordRoles.imperial;
  next.discordRoleSupreme = runtime.discordRoles.supreme;
  next.discordRoles = runtime.discordRoles;
  next.mpMode = runtime.mpMode;
  next.environment = isProd ? "production" : env.NODE_ENV;
  return next;
}

export function sanitizeSettingsPayload(body: Record<string, unknown>, current: Record<string, unknown>) {
  const allowed = new Set([
    "storeName",
    "storeTagline",
    "logo",
    "favicon",
    "primaryColor",
    "neonColor",
    "currency",
    "contactEmail",
    "contactPhone",
    "discord",
    "instagram",
    "youtube",
    "tiktok",
    "footerText",
    "checkoutRequireCpf",
    "checkoutRequirePhone",
    "playerIdLabel",
    "seoTitle",
    "seoDescription",
    "appUrl",
    "apiUrl",
    "allowedOrigins",
    "paymentProvider",
    "paymentDevMode",
    "fivemApiUrl",
    "fivemEnabled",
    "discordRoleSelect",
    "discordRolePrime",
    "discordRolePrestige",
    "discordRoleElite",
    "discordRoleImperial",
    "discordRoleSupreme",
  ]);

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!allowed.has(key)) continue;
    if ((SECRET_SETTING_KEYS as readonly string[]).includes(key)) continue;
    if (value === undefined) continue;
    clean[key] = value;
  }

  if (!clean.appUrl && current.appUrl) clean.appUrl = current.appUrl;
  return clean;
}
