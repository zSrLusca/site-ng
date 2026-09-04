import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, assetUrl } from "../../api";
import { AdminError } from "../../components/admin/AdminError";
import { useAuth } from "../../store/auth";

type Banner = {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
  sortOrder: number;
  active: boolean;
};

const empty = { title: "", description: "", image: "", buttonText: "", buttonUrl: "", sortOrder: 0, active: true };

function toForm(b: Banner) {
  return {
    title: b.title ?? "",
    description: b.description ?? "",
    image: b.image ?? "",
    buttonText: b.buttonText ?? "",
    buttonUrl: b.buttonUrl ?? "",
    sortOrder: b.sortOrder ?? 0,
    active: b.active !== false,
  };
}

export function AdminBanners() {
  const token = useAuth((s) => s.token)!;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-banners"], queryFn: () => api.authGet("/admin/banners", token) as Promise<Banner[]> });
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [uploading, setUploading] = useState(false);

  const payload = {
    title: form.title,
    description: form.description || null,
    image: form.image || null,
    buttonText: form.buttonText || null,
    buttonUrl: form.buttonUrl || null,
    sortOrder: Number(form.sortOrder) || 0,
    active: form.active,
  };

  const save = useMutation({
    mutationFn: () =>
      editId ? api.put(`/admin/banners/${editId}`, payload, token) : api.post("/admin/banners", payload, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
      setForm(empty);
      setEditId(null);
      setError(null);
    },
    onError: (err) => setError(err),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del(`/admin/banners/${id}`, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const res = await api.upload(file, "banners", token);
      setForm((f) => ({ ...f, image: res.url }));
    } catch (err) {
      setError(err);
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <div className="admin-page">
      <h1>Banners</h1>
      <form onSubmit={onSubmit} className="form-section">
        <h2>{editId ? "Editar banner" : "Novo banner"}</h2>
        <div className="form-grid">
          <div className="field"><label>Título</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field"><label>Texto do botão</label><input value={form.buttonText} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} /></div>
          <div className="field span-2"><label>Descrição</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="field"><label>URL do botão</label><input value={form.buttonUrl} onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })} /></div>
          <div className="field"><label>Ordem</label><input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></div>
          <div className="field span-2">
            <label>Imagem</label>
            <label className="file-btn">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void upload(file);
                }}
              />
              {uploading ? "Enviando..." : form.image ? "Trocar imagem" : "Enviar imagem"}
            </label>
            {form.image && (
              <div className="thumb-row">
                <div className="thumb thumb-wide">
                  <img src={assetUrl(form.image)} alt="" />
                  <button type="button" onClick={() => setForm({ ...form, image: "" })}>×</button>
                </div>
              </div>
            )}
            <small className="hint">Mesmo envio dos produtos. Ideal 1920×650. Depois clique em Salvar.</small>
          </div>
        </div>
        <div className="check-row">
          <label className="check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo</label>
        </div>
        <AdminError error={error} />
        <div className="row-actions">
          <button className="btn btn-primary" type="submit" disabled={save.isPending || uploading}>
            {editId ? "Salvar" : "Criar banner"}
          </button>
          {editId && (
            <button type="button" className="btn btn-ghost" onClick={() => { setEditId(null); setForm(empty); setError(null); }}>
              Cancelar
            </button>
          )}
        </div>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Imagem</th><th>Título</th><th>Ordem</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {(q.data ?? []).map((b) => (
              <tr key={b.id}>
                <td>
                  {b.image ? (
                    <img src={assetUrl(b.image)} alt="" style={{ width: 96, height: 36, objectFit: "cover", borderRadius: 8 }} />
                  ) : (
                    <span className="hint">Sem imagem</span>
                  )}
                </td>
                <td>{b.title}</td>
                <td>{b.sortOrder}</td>
                <td><span className={`tag ${b.active ? "ok" : "bad"}`}>{b.active ? "Ativo" : "Off"}</span></td>
                <td className="row-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => { setEditId(b.id); setForm(toForm(b)); setError(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { if (confirm(`Excluir "${b.title}"?`)) del.mutate(b.id); }}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
