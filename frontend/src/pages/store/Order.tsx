import { FormEvent, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api";
import { formatBRL } from "../../lib/money";

const STATUS: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  pending_payment: "Pagamento pendente",
  paid: "Pago",
  processing: "Processando entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
  expired: "Expirado",
  refunded: "Reembolsado",
};

export function OrderPage() {
  const { number } = useParams();
  const [discordId, setDiscordId] = useState("");
  const [email, setEmail] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linking, setLinking] = useState(false);
  const query = useQuery({
    queryKey: ["order", number],
    queryFn: () => api.get(`/store/orders/${number}`),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "awaiting_payment" || status === "pending_payment" || status === "processing" ? 4000 : false;
    },
  });
  const o = query.data;
  if (!o) return <main className="container product-page">Carregando pedido...</main>;

  return (
    <main className="container" style={{ paddingBlock: "32px 70px", maxWidth: 760 }}>
      <h1>Pedido {o.number}</h1>
      <p>Status: <strong>{STATUS[o.status] || o.status}</strong></p>
      <p>Cliente: {o.customer.name} — personagem {o.customer.playerId}</p>
      {o.customer.discordId && <p>Discord: {o.customer.discordId}</p>}
      {o.items.map((i: { id: string; name: string; quantity: number; totalCents: number }) => (
        <div key={i.id} className="summary-row">
          <span>{i.name} × {i.quantity}</span>
          <span>{formatBRL(i.totalCents)}</span>
        </div>
      ))}
      <div className="summary-row"><span>Subtotal</span><span>{formatBRL(o.subtotalCents)}</span></div>
      <div className="summary-row"><span>Desconto</span><span>{formatBRL(o.discountCents)}</span></div>
      <div className="summary-row total"><span>Total</span><span>{formatBRL(o.totalCents)}</span></div>

      {o.payment?.qrCode && o.status !== "paid" && o.status !== "delivered" && (
        <div className="summary" style={{ marginTop: 20, position: "static" }}>
          <h3>Pague com Pix</h3>
          {o.payment.qrCodeBase64 && (
            <img
              src={o.payment.qrCodeBase64.startsWith("data:") ? o.payment.qrCodeBase64 : `data:image/png;base64,${o.payment.qrCodeBase64}`}
              alt="QR Pix"
              style={{ width: 220, margin: "12px 0" }}
            />
          )}
          <textarea readOnly value={o.payment.qrCode} rows={4} />
          <button
            className="btn btn-primary btn-wide"
            style={{ marginTop: 10 }}
            onClick={() => navigator.clipboard.writeText(o.payment.qrCode)}
          >
            Copiar código Pix
          </button>
        </div>
      )}
      {o.payment?.ticketUrl && o.payment.method === "credit_card" && o.status !== "paid" && o.status !== "delivered" && (
        <div className="summary" style={{ marginTop: 20, position: "static" }}>
          <a className="btn btn-neon btn-wide" href={o.payment.ticketUrl} target="_blank" rel="noreferrer">
            Pagar com cartão no gateway
          </a>
          <p style={{ color: "#8b9bb4", fontSize: 13, marginTop: 12 }}>
            No teste, abra o link em uma janela anônima e entre com o usuário
            <strong> Comprador de teste</strong> do painel do Mercado Pago. Se você estiver
            logado com sua conta real, o MP mostra “uma das partes é de teste”.
          </p>
        </div>
      )}
      {(o.status === "paid" || o.status === "processing" || o.status === "delivered") && (
        <p style={{ color: "var(--ok)", marginTop: 20 }}>
          Pagamento confirmado pelo gateway. A entrega digital está em andamento ou já foi concluída.
        </p>
      )}
      {o.needsDiscord && (
        <form
          className="summary"
          style={{ marginTop: 20, position: "static" }}
          onSubmit={async (e: FormEvent) => {
            e.preventDefault();
            setLinkError("");
            setLinking(true);
            try {
              await api.post(`/store/orders/${o.number}/link-discord`, { email, discordId });
              await query.refetch();
            } catch (err) {
              setLinkError(err instanceof Error ? err.message : "Não foi possível vincular o Discord.");
            } finally {
              setLinking(false);
            }
          }}
        >
          <h3>Vincular Discord para receber o cargo</h3>
          <p style={{ color: "#8b9bb4", fontSize: 13 }}>
            Este pedido foi pago sem o ID do Discord. Informe o e-mail do pedido e o ID numérico da sua conta.
          </p>
          <div className="field">
            <label>E-mail do pedido</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>ID do Discord</label>
            <input
              required
              inputMode="numeric"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          {linkError && <p style={{ color: "var(--danger)" }}>{linkError}</p>}
          <button className="btn btn-neon btn-wide" disabled={linking}>
            {linking ? "Vinculando..." : "Vincular e entregar"}
          </button>
        </form>
      )}
    </main>
  );
}
