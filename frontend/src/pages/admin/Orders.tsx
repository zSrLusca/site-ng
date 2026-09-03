import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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

const SALE_FILTERS = [
  { id: "", label: "Todas" },
  { id: "awaiting_payment", label: "Aguardando pagamento" },
  { id: "pending_payment", label: "Pagamento pendente" },
  { id: "paid", label: "Pago" },
  { id: "processing", label: "Processando" },
  { id: "delivered", label: "Entregue" },
  { id: "cancelled", label: "Cancelado" },
  { id: "expired", label: "Expirado" },
  { id: "refunded", label: "Reembolsado" },
];

const PAYMENT_STATUS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  cancelled: "Cancelado",
  expired: "Expirado",
  refunded: "Reembolsado",
};

const DELIVERY_STATUS: Record<string, string> = {
  none: "—",
  pending: "Pendente",
  delivered: "OK",
  failed: "Falhou",
};

type DeliveryState = { status: string; error?: string | null };

type OrderRow = {
  id: string;
  number: string;
  status: string;
  totalCents: number;
  couponCode?: string | null;
  paymentMethod?: string;
  createdAt: string;
  customer: { name: string; email: string; playerId?: string | null; discordId?: string | null };
  products: Array<{ name: string; quantity: number }>;
  payment: { status: string; method: string; provider: string } | null;
  delivery: { discord: DeliveryState; fivem: DeliveryState };
};

function saleTag(status: string) {
  if (status === "delivered" || status === "paid") return "ok";
  if (status === "processing" || status === "pending_payment" || status === "awaiting_payment") return "warn";
  if (status === "cancelled" || status === "expired" || status === "refunded") return "bad";
  return "";
}

function deliveryTag(status: string) {
  if (status === "delivered") return "ok";
  if (status === "pending") return "warn";
  if (status === "failed") return "bad";
  return "";
}

function paymentTag(status?: string) {
  if (status === "approved") return "ok";
  if (status === "pending") return "warn";
  if (status === "rejected" || status === "cancelled" || status === "expired" || status === "refunded") return "bad";
  return "";
}

function methodLabel(method?: string) {
  if (method === "pix") return "Pix";
  if (method === "credit_card") return "Cartão";
  return method || "—";
}

export function AdminOrders() {
  const token = useAuth((s) => s.token)!;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["admin-orders", search, status, page],
    queryFn: () =>
      api.authGet(
        `/admin/orders?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&page=${page}&perPage=50`,
        token,
      ),
  });

  const counts: Record<string, number> = q.data?.counts ?? {};
  const pages = q.data?.pages ?? 1;

  return (
    <div className="admin-page">
      <h1>Compras</h1>
      <p style={{ color: "#8b9bb4", marginTop: -6 }}>
        Todas as vendas da loja, com status do pagamento, Discord e entrega no servidor.
      </p>

      <div className="status-filters">
        {SALE_FILTERS.map((f) => {
          const n = f.id ? counts[f.id] ?? 0 : counts.all ?? 0;
          return (
            <button
              key={f.id || "all"}
              type="button"
              className={`status-chip ${status === f.id ? "active" : ""}`}
              onClick={() => {
                setStatus(f.id);
                setPage(1);
              }}
            >
              {f.label}
              <b>{n}</b>
            </button>
          );
        })}
      </div>

      <input
        className="input"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Buscar número, cliente, e-mail, personagem ou Discord"
        style={{ margin: "12px 0" }}
      />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Itens</th>
              <th>Personagem</th>
              <th>Discord</th>
              <th>Pagamento</th>
              <th>Gateway</th>
              <th>Venda</th>
              <th>Cargo</th>
              <th>Servidor</th>
              <th>Data</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(q.data?.items ?? []).map((o: OrderRow) => (
              <tr key={o.id}>
                <td>
                  <strong>{o.number}</strong>
                  <div style={{ color: "#8b9bb4", fontSize: 12 }}>{formatBRL(o.totalCents)}</div>
                </td>
                <td>
                  {o.customer.name}
                  <div style={{ color: "#8b9bb4", fontSize: 12 }}>{o.customer.email}</div>
                </td>
                <td>{o.products.map((p) => `${p.name} ×${p.quantity}`).join(", ") || "—"}</td>
                <td>{o.customer.playerId || "—"}</td>
                <td>{o.customer.discordId || "—"}</td>
                <td>{methodLabel(o.paymentMethod)}</td>
                <td>
                  <span className={`tag ${paymentTag(o.payment?.status)}`}>
                    {o.payment ? PAYMENT_STATUS[o.payment.status] || o.payment.status : "Sem cobrança"}
                  </span>
                </td>
                <td>
                  <span className={`tag ${saleTag(o.status)}`}>{SALE_STATUS[o.status] || o.status}</span>
                </td>
                <td title={o.delivery.discord.error || ""}>
                  <span className={`tag ${deliveryTag(o.delivery.discord.status)}`}>
                    {DELIVERY_STATUS[o.delivery.discord.status] || o.delivery.discord.status}
                  </span>
                </td>
                <td title={o.delivery.fivem.error || ""}>
                  <span className={`tag ${deliveryTag(o.delivery.fivem.status)}`}>
                    {DELIVERY_STATUS[o.delivery.fivem.status] || o.delivery.fivem.status}
                  </span>
                </td>
                <td>{new Date(o.createdAt).toLocaleString("pt-BR")}</td>
                <td><Link className="btn btn-ghost" to={`/admin/orders/${o.id}`}>Detalhes</Link></td>
              </tr>
            ))}
            {!q.data?.items?.length && (
              <tr>
                <td colSpan={12} className="empty">Nenhuma compra encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="pager">
          <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span>Página {page} de {pages}</span>
          <button type="button" className="btn btn-ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
