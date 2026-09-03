import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api";
import { useAuth } from "../../store/auth";
import { formatBRL } from "../../lib/money";

export function AdminDashboard() {
  const token = useAuth((s) => s.token)!;
  const q = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.authGet("/admin/dashboard", token),
  });
  const d = q.data;
  if (!d) return <p>Carregando dashboard...</p>;

  return (
    <div className="admin-page">
      <h1>Dashboard</h1>
      <div className="stats">
        <div className="stat">Vendas hoje<b>{formatBRL(d.salesTodayCents)}</b><small>{d.salesTodayCount} pedidos</small></div>
        <div className="stat">Vendas do mês<b>{formatBRL(d.salesMonthCents)}</b></div>
        <div className="stat">Pedidos<b>{d.ordersTotal}</b><small>{d.pending} pendentes · {d.paid} pagos</small></div>
        <div className="stat">Ticket médio<b>{formatBRL(d.ticketAverageCents)}</b><small>{d.customers} clientes</small></div>
      </div>
      <div className="form-section" style={{ marginTop: 18 }}>
        <h2>Faturamento (14 dias)</h2>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.daily}>
              <XAxis dataKey="day" tickFormatter={(v) => new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} />
              <YAxis tickFormatter={(v) => `R$${Math.round(v / 100)}`} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Area dataKey="totalCents" stroke="#1a8cff" fill="rgba(26,140,255,.25)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <h3 style={{ marginTop: 24 }}>Mais vendidos</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Produto</th><th>Qtd</th><th>Total</th></tr></thead>
          <tbody>
            {d.topProducts.map((p: { name: string; quantity: number; totalCents: number }) => (
              <tr key={p.name}><td>{p.name}</td><td>{p.quantity}</td><td>{formatBRL(p.totalCents)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
