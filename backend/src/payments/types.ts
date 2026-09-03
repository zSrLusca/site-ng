export type PaymentMethod = "pix" | "credit_card";

export type ProviderPaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired"
  | "refunded";

export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  method: PaymentMethod;
  description: string;
  customer: {
    name: string;
    email: string;
    cpf?: string | null;
    phone?: string | null;
  };
  notificationUrl?: string;
  successUrl: string;
  failureUrl: string;
}

export interface CreatePaymentResult {
  provider: string;
  providerPaymentId: string;
  status: ProviderPaymentStatus;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  raw?: unknown;
}

export interface PaymentStatusResult {
  providerPaymentId: string;
  status: ProviderPaymentStatus;
  raw?: unknown;
}

export interface WebhookResult {
  providerPaymentId: string;
  orderId?: string;
  status: ProviderPaymentStatus;
  raw: unknown;
}

export interface PaymentProvider {
  name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult>;
  findByExternalReference?(externalReference: string): Promise<PaymentStatusResult | null>;
  handleWebhook(payload: unknown, headers: Record<string, string | string[] | undefined>): Promise<WebhookResult | null>;
  refundPayment(providerPaymentId: string): Promise<PaymentStatusResult>;
}
