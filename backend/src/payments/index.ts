import { env, isProd } from "../env.js";
import { AppError } from "../lib/errors.js";
import { getRuntimeConfig } from "../services/runtime.js";
import { DevPaymentProvider } from "./dev.js";
import { MercadoPagoProvider } from "./mercadopago.js";
import type { PaymentProvider } from "./types.js";

export type { PaymentProvider } from "./types.js";

export async function getPaymentProvider(): Promise<PaymentProvider> {
  const cfg = await getRuntimeConfig();
  const hasToken = Boolean(cfg.mpAccessToken);
  const forceFake = cfg.paymentProvider === "dev";

  if (hasToken && !forceFake) {
    return new MercadoPagoProvider(cfg);
  }

  if (isProd && !cfg.paymentDevMode) {
    throw new AppError(
      "Mercado Pago não configurado na VPS. Salve o Access Token de teste ou produção em /admin/settings.",
      503,
      "PAYMENT_NOT_CONFIGURED",
    );
  }
  return new DevPaymentProvider();
}

export async function testMercadoPago() {
  const cfg = await getRuntimeConfig();
  if (!cfg.mpAccessToken) {
    throw new AppError("Informe o Access Token do Mercado Pago antes de testar.", 400, "MP_MISSING");
  }
  const provider = new MercadoPagoProvider(cfg);
  return provider.ping();
}
