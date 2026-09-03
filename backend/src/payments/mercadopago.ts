import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, MerchantOrder, Payment, Preference } from "mercadopago";
import { AppError } from "../lib/errors.js";
import { toReais } from "../utils/money.js";
import type { RuntimeConfig } from "../services/runtime.js";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatusResult,
  ProviderPaymentStatus,
  WebhookResult,
} from "./types.js";

function mapStatus(status?: string): ProviderPaymentStatus {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "expired":
      return "expired";
    default:
      return "pending";
  }
}

function isPublicHttps(url?: string) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

function verifySignature(
  headers: Record<string, string | string[] | undefined>,
  dataId: string,
  secret: string,
) {
  const rawSig = headerValue(headers["x-signature"]);
  const requestId = headerValue(headers["x-request-id"]);
  if (!rawSig || !requestId) {
    throw new AppError("Webhook do Mercado Pago sem assinatura.", 401, "INVALID_WEBHOOK");
  }
  const parts = Object.fromEntries(
    rawSig.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key.trim(), rest.join("=")];
    }),
  );
  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1 || "");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError("Assinatura do webhook do Mercado Pago inválida.", 401, "INVALID_WEBHOOK");
  }
}

export class MercadoPagoProvider implements PaymentProvider {
  name = "mercadopago";
  private client: MercadoPagoConfig;
  private accessToken: string;
  private webhookSecret: string;

  constructor(config: Pick<RuntimeConfig, "mpAccessToken" | "mpWebhookSecret">) {
    if (!config.mpAccessToken) {
      throw new AppError(
        "Mercado Pago não configurado. Informe o Access Token em Configurações ou no .env.",
        503,
        "PAYMENT_NOT_CONFIGURED",
      );
    }
    this.accessToken = config.mpAccessToken;
    this.client = new MercadoPagoConfig({ accessToken: config.mpAccessToken });
    this.webhookSecret = config.mpWebhookSecret;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (input.method === "pix") {
      const payment = new Payment(this.client);
      const created = await payment.create({
        body: {
          transaction_amount: Number(toReais(input.amountCents)),
          description: input.description,
          payment_method_id: "pix",
          payer: {
            email: input.customer.email,
            first_name: input.customer.name.split(" ")[0],
            last_name: input.customer.name.split(" ").slice(1).join(" ") || input.customer.name,
            identification: input.customer.cpf
              ? { type: "CPF", number: input.customer.cpf.replace(/\D/g, "") }
              : undefined,
          },
          notification_url: input.notificationUrl || undefined,
          external_reference: input.orderId,
          metadata: { orderNumber: input.orderNumber },
          date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      });

      const tx = created.point_of_interaction?.transaction_data;
      return {
        provider: this.name,
        providerPaymentId: String(created.id),
        status: mapStatus(created.status),
        qrCode: tx?.qr_code,
        qrCodeBase64: tx?.qr_code_base64,
        ticketUrl: tx?.ticket_url,
        raw: created,
      };
    }

    const publicReturn = isPublicHttps(input.successUrl);
    const preference = new Preference(this.client);
    const created = await preference.create({
      body: {
        items: [
          {
            id: input.orderId,
            title: input.description,
            quantity: 1,
            unit_price: Number(toReais(input.amountCents)),
            currency_id: "BRL",
          },
        ],
        payer: {
          name: input.customer.name,
          email: input.customer.email,
          identification: input.customer.cpf
            ? { type: "CPF", number: input.customer.cpf.replace(/\D/g, "") }
            : undefined,
        },
        external_reference: input.orderId,
        notification_url: input.notificationUrl || undefined,
        ...(publicReturn
          ? {
              back_urls: {
                success: input.successUrl,
                failure: input.failureUrl,
                pending: input.successUrl,
              },
              auto_return: "approved" as const,
            }
          : {}),
        statement_descriptor: "GAROA RP",
        metadata: { orderNumber: input.orderNumber },
      },
    });

    return {
      provider: this.name,
      providerPaymentId: String(created.id),
      status: "pending",
      ticketUrl: created.sandbox_init_point || created.init_point,
      raw: created,
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    const payment = new Payment(this.client);
    const data = await payment.get({ id: providerPaymentId });
    return {
      providerPaymentId: String(data.id),
      status: mapStatus(data.status),
      raw: data,
    };
  }

  async findByExternalReference(externalReference: string): Promise<PaymentStatusResult | null> {
    const payment = new Payment(this.client);
    const found = await payment.search({
      options: {
        external_reference: externalReference,
        sort: "date_created",
        criteria: "desc",
      },
    });
    const row = found.results?.[0];
    if (!row?.id) return null;
    return {
      providerPaymentId: String(row.id),
      status: mapStatus(row.status),
      raw: row,
    };
  }

  async handleWebhook(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookResult | null> {
    const body = payload as {
      type?: string;
      topic?: string;
      action?: string;
      id?: string;
      data?: { id?: string };
      resource?: string;
    };

    const kind = body.type || body.topic || body.action || "";
    const dataId = String(body.data?.id || body.id || "").replace(/\D/g, "") || String(body.data?.id || body.id || "");

    if (!dataId && !kind) return null;

    if (this.webhookSecret && dataId) {
      verifySignature(headers, String(body.data?.id || body.id), this.webhookSecret);
    }

    if (kind.includes("merchant_order")) {
      const orderApi = new MerchantOrder(this.client);
      const merchant = await orderApi.get({ merchantOrderId: dataId });
      const paid = (merchant.payments || []).find((p) => p.status === "approved") || merchant.payments?.[0];
      if (!paid?.id) return null;
      const status = await this.getPaymentStatus(String(paid.id));
      return {
        providerPaymentId: status.providerPaymentId,
        orderId: merchant.external_reference,
        status: status.status,
        raw: { merchant, payment: status.raw },
      };
    }

    if (!dataId) return null;
    const status = await this.getPaymentStatus(dataId);
    const raw = status.raw as { external_reference?: string };
    return {
      providerPaymentId: status.providerPaymentId,
      orderId: raw?.external_reference,
      status: status.status,
      raw: status.raw,
    };
  }

  async refundPayment(providerPaymentId: string): Promise<PaymentStatusResult> {
    const payment = new Payment(this.client);
    const refunded = await payment.refund({ id: providerPaymentId });
    return {
      providerPaymentId,
      status: "refunded",
      raw: refunded,
    };
  }

  async ping() {
    const res = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: number;
      nickname?: string;
      site_id?: string;
      message?: string;
    };
    if (!res.ok) {
      throw new AppError(data.message || "Access Token do Mercado Pago inválido.", 400, "MP_AUTH");
    }
    return {
      ok: true,
      accountId: data.id,
      nickname: data.nickname,
      siteId: data.site_id,
    };
  }
}
