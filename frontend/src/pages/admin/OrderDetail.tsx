import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import { useAuth } from "../../store/auth";
import { formatBRL } from "../../lib/money";

const SALE_STATUS: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  pending_payment: "Pagamento pendente",
  paid: "Pago",
  processing: "Processando entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
  expired: "Expirado",
  refunded: "Reembolsado",
};

const PAYMENT_STATUS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  cancelled: "Cancelado",
  expired: "Expirado",
  refunded: "Reembolsado",
};

const DELIVERY_STATUS: Record<string, string> = {
  pending: "Pendente",
  delivered: "Entregue",
  failed: "Falhou",
};

export function AdminOrderDetail() {
  const { id } = useParams();
  const token = useAuth((s) => s.token)!;
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => api.authGet(`/admin/orders/${id}`, token),
    enabled: !!id,
  });
  const retry = useMutation({
    mutationFn: () => api.post(`/admin/orders/${id}/retry-delivery`, {}, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-order", id] }),
  });
  const o = q.data;
  const [discordId, setDiscordId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [linkMsg, setLinkMsg] = useState("");
  if (!o) return <p>Carregando...</p>;

  async function saveCustomer(e: FormEvent) {
    e.preventDefault();
    setLinkMsg("");
    await api.patch(`/admin/customers/${o.customer.id}`, {
      discordId: discordId || o.customer.discordId,
      playerId: playerId || o.customer.playerId,
    }, token);
    await retry.mutateAsync();
    setLinkMsg("Cliente atualizado e entrega reprocessada.");
  }

  return (
    <div className="admin-page">
      <p><Link className="btn btn-ghost" to="/admin/orders">← Compras</Link></p>
      <h1>Pedido {o.number}</h1>
      <p>
        Status da venda:{" "}
        <span className="tag warn">{SALE_STATUS[o.status] || o.status}</span>
      </p>
      <p>Cliente: {o.customer.name} · {o.customer.email} · personagem {o.customer.playerId || "—"} · Discord {o.customer.discordId || "não informado"}</p>
      <p>Total: {formatBRL(o.totalCents)} {o.couponCode && `· cupom ${o.couponCode}`}</p>
      <h3>Itens</h3>
      <ul>{o.items.map((i: { id: string; name: string; quantity: number; totalCents: number }) => (
        <li key={i.id}>{i.name} × {i.quantity} — {formatBRL(i.totalCents)}</li>
      ))}</ul>
      <h3>Pagamentos</h3>
      {o.payments.map((p: { id: string; provider: string; providerPaymentId?: string; status: string; method: string }) => (
        <p key={p.id}>
          {p.provider} · {p.method === "credit_card" ? "Cartão" : p.method} ·{" "}
          <span className="tag">{PAYMENT_STATUS[p.status] || p.status}</span>
          {p.providerPaymentId ? ` · ${p.providerPaymentId}` : ""}
        </p>
      ))}
      <h3>Entregas</h3>
      {o.deliveries.map((d: { id: string; status: string; action?: string; error?: string; idempotency: string }) => (
        <p key={d.id}>
          {d.action === "discord" ? "Discord" : d.action === "vip" ? "VIP no servidor" : d.action || "FiveM"} ·{" "}
          <span className="tag">{DELIVERY_STATUS[d.status] || d.status}</span>
          {d.error ? ` · ${d.error}` : ""}
        </p>
      ))}
      <h3>Webhooks</h3>
      {o.webhookLogs.map((w: { id: string; event: string; processed: boolean; createdAt: string; error?: string }) => (
        <p key={w.id}>{new Date(w.createdAt).toLocaleString("pt-BR")} · {w.event} · {w.processed ? "ok" : "pendente"} {w.error}</p>
      ))}
      <form onSubmit={saveCustomer} className="form-section" style={{ marginTop: 16 }}>
        <h3>Vínculo para entrega</h3>
        <div className="field">
          <label>ID do personagem (HUD)</label>
          <input value={playerId} placeholder={o.customer.playerId || ""} onChange={(e) => setPlayerId(e.target.value)} />
        </div>
        <div className="field">
          <label>ID do Discord</label>
          <input value={discordId} placeholder={o.customer.discordId || ""} onChange={(e) => setDiscordId(e.target.value.replace(/\D/g, ""))} />
        </div>
        {linkMsg && <p style={{ color: "var(--ok)" }}>{linkMsg}</p>}
        <button className="btn btn-ghost" type="submit">Salvar vínculo e reprocessar</button>
      </form>
      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => retry.mutate()}>Reprocessar entrega</button>
    </div>
  );
}
