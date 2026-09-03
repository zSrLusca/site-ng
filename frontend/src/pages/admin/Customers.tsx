import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api";
import { useAuth } from "../../store/auth";
import { formatBRL } from "../../lib/money";

export function AdminCustomers() {
  const token = useAuth((s) => s.token)!;
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["admin-customers", search],
    queryFn: () => api.authGet(`/admin/customers?search=${encodeURIComponent(search)}`, token),
  });
  return (
    <div className="admin-page">
      <h1>Clientes</h1>
      <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" />
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Personagem</th><th>Discord</th><th>Pedidos</th><th>Total gasto</th><th>Primeiro</th><th>Último</th></tr></thead>
          <tbody>
            {(q.data?.items ?? []).map((c: {
              id: string; name: string; email: string; playerId?: string; discordId?: string; ordersCount: number;
              totalSpentCents: number; firstOrderAt: string; lastOrderAt?: string;
            }) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.email}</td>
                <td>{c.playerId}</td>
                <td>{c.discordId || "-"}</td>
                <td>{c.ordersCount}</td>
                <td>{formatBRL(c.totalSpentCents)}</td>
                <td>{new Date(c.firstOrderAt).toLocaleDateString("pt-BR")}</td>
                <td>{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString("pt-BR") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
