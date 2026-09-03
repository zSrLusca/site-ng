import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import { useAuth } from "../../store/auth";

type Cat = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  featured: boolean;
  active: boolean;
  showInMenu: boolean;
};

const empty = { name: "", slug: "", description: "", icon: "", sortOrder: 0, featured: false, active: true, showInMenu: true };

export function AdminCategories() {
  const token = useAuth((s) => s.token)!;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-cats"], queryFn: () => api.authGet("/admin/categories", token) });
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      editId
        ? api.put(`/admin/categories/${editId}`, form, token)
        : api.post("/admin/categories", form, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cats"] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
      setForm(empty);
      setEditId(null);
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/admin/categories/${id}`, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-cats"] }),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <div className="admin-page">
      <h1>Categorias</h1>
      <form onSubmit={onSubmit} className="form-section">
        <div className="form-grid">
          <div className="field"><label>Nome</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Slug (opcional)</label><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
          <div className="field"><label>Ícone</label><input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
          <div className="field"><label>Ordem</label><input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></div>
          <div className="field span-2"><label>Descrição</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <div className="check-row">
          <label className="check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativa</label>
          <label className="check"><input type="checkbox" checked={form.showInMenu} onChange={(e) => setForm({ ...form, showInMenu: e.target.checked })} /> Menu</label>
          <label className="check"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Destaque</label>
        </div>
        <button className="btn btn-primary" type="submit">{editId ? "Salvar" : "Criar categoria"}</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Slug</th><th>Ordem</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {(q.data ?? []).map((c: Cat) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.slug}</td>
                <td>{c.sortOrder}</td>
                <td><span className={`tag ${c.active ? "ok" : "bad"}`}>{c.active ? "Ativa" : "Off"}</span></td>
                <td className="row-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => { setEditId(c.id); setForm({ ...empty, ...c }); }}>Editar</button>
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
