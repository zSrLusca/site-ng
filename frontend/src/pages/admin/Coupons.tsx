import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import { useAuth } from "../../store/auth";

const empty = {
  code: "",
  type: "percent" as "percent" | "fixed",
  value: 10,
  minSubtotalCents: 0,
  maxUses: 100,
  expiresAt: "",
  active: true,
};

export function AdminCoupons() {
  const token = useAuth((s) => s.token)!;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-coupons"], queryFn: () => api.authGet("/admin/coupons", token) });
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () =>
      editId
        ? api.put(`/admin/coupons/${editId}`, { ...form, maxUses: form.maxUses || null, expiresAt: form.expiresAt || null }, token)
        : api.post("/admin/coupons", { ...form, maxUses: form.maxUses || null, expiresAt: form.expiresAt || null }, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      setForm(empty);
      setEditId(null);
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/admin/coupons/${id}`, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <div className="admin-page">
      <h1>Cupons</h1>
      <form onSubmit={onSubmit} className="form-section">
        <div className="form-grid">
          <div className="field"><label>Código</label><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div className="field">
            <label>Tipo</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "percent" | "fixed" })}>
              <option value="percent">Porcentagem</option>
              <option value="fixed">Valor fixo (centavos)</option>
            </select>
          </div>
          <div className="field"><label>Valor</label><input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
          <div className="field"><label>Mínimo (centavos)</label><input type="number" value={form.minSubtotalCents} onChange={(e) => setForm({ ...form, minSubtotalCents: Number(e.target.value) })} /></div>
          <div className="field"><label>Máximo de usos</label><input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })} /></div>
          <div className="field"><label>Validade</label><input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></div>
        </div>
        <div className="check-row">
          <label className="check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo</label>
        </div>
        <button className="btn btn-primary" type="submit">{editId ? "Salvar" : "Criar cupom"}</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Código</th><th>Tipo</th><th>Valor</th><th>Usos</th><th></th></tr></thead>
          <tbody>
            {(q.data ?? []).map((c: { id: string; code: string; type: string; value: number; usedCount: number; active: boolean }) => (
              <tr key={c.id}>
                <td>{c.code}</td>
                <td>{c.type}</td>
                <td>{c.value}{c.type === "percent" ? "%" : " centavos"}</td>
                <td>{c.usedCount}</td>
                <td className="row-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => { setEditId(c.id); setForm({ ...empty, code: c.code, type: c.type === "fixed" ? "fixed" : "percent", value: c.value, active: c.active, expiresAt: "" }); }}>Editar</button>
                  <button type="button" className="btn btn-ghost" onClick={() => del.mutate(c.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
