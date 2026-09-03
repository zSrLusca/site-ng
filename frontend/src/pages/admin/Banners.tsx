import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import { useAuth } from "../../store/auth";

const empty = { title: "", description: "", image: "", buttonText: "", buttonUrl: "", sortOrder: 0, active: true };

export function AdminBanners() {
  const token = useAuth((s) => s.token)!;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-banners"], queryFn: () => api.authGet("/admin/banners", token) });
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      editId ? api.put(`/admin/banners/${editId}`, form, token) : api.post("/admin/banners", form, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
      setForm(empty);
      setEditId(null);
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/admin/banners/${id}`, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-banners"] }),
  });

  async function upload(file: File) {
    const res = await api.upload(file, "banners", token);
    setForm((f) => ({ ...f, image: res.url }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <div className="admin-page">
      <h1>Banners</h1>
      <form onSubmit={onSubmit} className="form-section">
        <div className="form-grid">
          <div className="field"><label>Título</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field"><label>Texto do botão</label><input value={form.buttonText} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} /></div>
          <div className="field span-2"><label>Descrição</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="field"><label>URL do botão</label><input value={form.buttonUrl} onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })} /></div>
          <div className="field"><label>Ordem</label><input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></div>
          <div className="field span-2">
            <label>Imagem</label>
            <label className="file-btn">
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              {form.image ? "Trocar imagem" : "Enviar imagem"}
            </label>
          </div>
        </div>
        <div className="check-row">
          <label className="check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo</label>
        </div>
        <button className="btn btn-primary" type="submit">{editId ? "Salvar" : "Criar banner"}</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Título</th><th>Ordem</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {(q.data ?? []).map((b: typeof empty & { id: string }) => (
              <tr key={b.id}>
                <td>{b.title}</td>
                <td>{b.sortOrder}</td>
                <td><span className={`tag ${b.active ? "ok" : "bad"}`}>{b.active ? "Ativo" : "Off"}</span></td>
                <td className="row-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => { setEditId(b.id); setForm(b); }}>Editar</button>
                  <button type="button" className="btn btn-ghost" onClick={() => del.mutate(b.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
