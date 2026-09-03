import { env } from "../env.js";
import { getRuntimeConfig } from "./runtime.js";

export type FiveMDeliveryPayload = {
  deliveryId: string;
  orderNumber: string;
  playerId: string;
  discordId: string;
  customerName: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    action?: string | null;
    payload?: unknown;
  }>;
};

export async function deliverToFiveM(payload: FiveMDeliveryPayload) {
  const runtime = await getRuntimeConfig();
  if (!runtime.fivemApiUrl || !runtime.fivemApiKey) {
    return {
      queued: true,
      message: "Integração FiveM ainda não configurada. Defina o IP da VPS em Configurações.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.FIVEM_TIMEOUT_MS);
  try {
    const res = await fetch(`${runtime.fivemApiUrl.replace(/\/$/, "")}/deliveries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": runtime.fivemApiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { message?: string }).message || `FiveM HTTP ${res.status}`);
    }
    return { queued: false, response: data };
  } finally {
    clearTimeout(timer);
  }
}

export async function testFiveMConnection(urlOverride?: string) {
  const runtime = await getRuntimeConfig();
  const url = (urlOverride || runtime.fivemApiUrl).trim();
  if (!url) {
    throw new Error("Informe a URL da cidade: http://IP_DA_VPS:30120/ng-loja");
  }
  if (!runtime.fivemApiKey) {
    throw new Error("FIVEM_API_KEY ausente no .env");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.FIVEM_TIMEOUT_MS);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/health`, {
      headers: {
        Accept: "application/json",
        "X-Api-Key": runtime.fivemApiKey,
      },
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { message?: string }).message || `FiveM HTTP ${res.status}`);
    }
    return { ok: true, url, ...(data as object) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao falar com a cidade";
    if (message.toLowerCase().includes("abort")) {
      throw new Error("Timeout. Confira o IP da VPS e se a porta TCP 30120 está aberta.");
    }
    throw error instanceof Error ? error : new Error(message);
  } finally {
    clearTimeout(timer);
  }
}
