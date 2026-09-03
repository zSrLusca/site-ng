import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import { useAuth } from "../../store/auth";
import { formatBRL } from "../../lib/money";

export function AdminProducts() {
  const token = useAuth((s) => s.token)!;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["admin-products", search],
    queryFn: () => api.authGet(`/admin/products?search=${encodeURIComponent(search)}`, token),
  });
  const toggle = useMutation({
    mutationFn: (p: { id: string; active: boolean }) => api.put(`/admin/products/${p.id}`, { active: !p.active }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });
  const dup = useMutation({
    mutationFn: (id: string) => api.post(`/admin/products/${id}/duplicate`, {}, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/admin/products/${id}`, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  return (
    <div className="admin-page">
      <div className="page-toolbar">
        <h1>Produtos</h1>
        <Link to="/admin/products/new" className="btn btn-primary">Novo produto</Link>
      </div>
      <input
        className="input"
        placeholder="Buscar"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ margin: "0 0 16px" }}
      />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {(q.data?.items ?? []).map((p: {
              id: string; name: string; slug: string; priceCents: number; promoPriceCents?: number;
              unlimited: boolean; stock: number; active: boolean; category: { name: string };
            }) => (
              <tr key={p.id}>
                <td>{p.name}<div style={{ color: "#8b9bb4", fontSize: 12 }}>{p.slug}</div></td>
                <td>{p.category?.name}</td>
                <td>{formatBRL(p.promoPriceCents || p.priceCents)}</td>
                <td>{p.unlimited ? "Ilimitado" : p.stock}</td>
                <td><span className={`tag ${p.active ? "ok" : "bad"}`}>{p.active ? "Ativo" : "Off"}</span></td>
                <td className="row-actions">
                  <Link className="btn btn-ghost" to={`/admin/products/${p.id}`}>Editar</Link>
                  <button type="button" className="btn btn-ghost" onClick={() => toggle.mutate(p)}>{p.active ? "Desativar" : "Ativar"}</button>
                  <button type="button" className="btn btn-ghost" onClick={() => dup.mutate(p.id)}>Duplicar</button>
                  <button type="button" className="btn btn-ghost" onClick={() => del.mutate(p.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
