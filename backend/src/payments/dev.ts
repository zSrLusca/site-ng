import { randomUUID } from "node:crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatusResult,
  ProviderPaymentStatus,
  WebhookResult,
} from "./types.js";

const store = new Map<string, { status: ProviderPaymentStatus; orderId: string; amountCents: number }>();

export class DevPaymentProvider implements PaymentProvider {
  name = "dev";

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const id = `dev_${randomUUID()}`;
    store.set(id, {
      status: "pending",
      orderId: input.orderId,
      amountCents: input.amountCents,
    });
    return {
      provider: this.name,
      providerPaymentId: id,
      status: "pending",
      qrCode: `000201GAROA-DEV-${id}`,
      qrCodeBase64: "",
      ticketUrl: `${input.successUrl}?payment_id=${id}`,
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    const row = store.get(providerPaymentId);
    return {
      providerPaymentId,
      status: row?.status ?? "pending",
    };
  }

  async handleWebhook(payload: unknown): Promise<WebhookResult | null> {
    const body = payload as {
      providerPaymentId?: string;
      status?: ProviderPaymentStatus;
    };
    if (!body.providerPaymentId) return null;
    const row = store.get(body.providerPaymentId);
    if (row && body.status) {
      row.status = body.status;
    }
    return {
      providerPaymentId: body.providerPaymentId,
      orderId: row?.orderId,
      status: body.status ?? row?.status ?? "pending",
      raw: payload,
    };
  }

  async refundPayment(providerPaymentId: string): Promise<PaymentStatusResult> {
    const row = store.get(providerPaymentId);
    if (row) row.status = "refunded";
    return { providerPaymentId, status: "refunded" };
  }
}
