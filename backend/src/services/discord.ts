import { AppError } from "../lib/errors.js";
import { getRuntimeConfig } from "./runtime.js";

function payloadObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function isDiscordSnowflake(value: string) {
  return /^\d{17,20}$/.test(value.trim());
}

export function resolveDiscordRoleId(payload: unknown, roles: Record<string, string>) {
  const data = payloadObject(payload);
  if (typeof data.discordRoleId === "string" && data.discordRoleId.trim()) {
    return data.discordRoleId.trim();
  }
  const aliases: Record<string, string> = {
    bronze: "select",
    prata: "prime",
    ouro: "supreme",
    diamante: "supreme",
  };
  const raw = typeof data.vip === "string" ? data.vip.toLowerCase().trim() : "";
  const vip = aliases[raw] || raw;
  return (vip && roles[vip]) || "";
}

export async function assignDiscordRole(discordId: string, payload: unknown) {
  const runtime = await getRuntimeConfig();
  if (!runtime.discordBotToken || !runtime.discordGuildId) {
    throw new AppError(
      "Discord não configurado. Defina DISCORD_BOT_TOKEN e DISCORD_GUILD_ID no .env.",
      503,
      "DISCORD_NOT_CONFIGURED",
    );
  }
  if (!isDiscordSnowflake(discordId)) {
    throw new AppError("ID do Discord inválido. Use o ID numérico da conta.", 400, "DISCORD_ID");
  }

  const roleId = resolveDiscordRoleId(payload, runtime.discordRoles);
  if (!roleId) {
    return { skipped: true, message: "Produto sem cargo de Discord mapeado." };
  }

  const url = `https://discord.com/api/v10/guilds/${runtime.discordGuildId}/members/${discordId.trim()}/roles/${roleId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${runtime.discordBotToken}`,
      "X-Audit-Log-Reason": encodeURIComponent("Garoa Store - compra aprovada"),
    },
  });

  if (res.status === 204 || res.ok) {
    return { skipped: false, roleId, discordId: discordId.trim() };
  }

  const body = await res.json().catch(() => ({}));
  const message = (body as { message?: string }).message || `Discord HTTP ${res.status}`;
  throw new Error(message);
}
