import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import { useAuth } from "../../store/auth";

export function AdminUsers() {
  const token = useAuth((s) => s.token)!;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-users"], queryFn: () => api.authGet("/admin/admins", token) });
  const [form, setForm] = useState({ name: "", email: "", password: "", roleId: "", active: true });
  const save = useMutation({
    mutationFn: () => api.post("/admin/admins", form, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setForm({ name: "", email: "", password: "", roleId: "", active: true });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <div className="admin-page">
      <h1>Administradores</h1>
      <form onSubmit={onSubmit} className="form-section">
        <div className="form-grid">
          <div className="field"><label>Nome</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>E-mail</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="field"><label>Senha</label><input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div className="field">
            <label>Perfil</label>
            <select required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              <option value="">Selecione</option>
              {(q.data?.roles ?? []).map((r: { id: string; name: string }) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" type="submit">Criar administrador</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th></tr></thead>
          <tbody>
            {(q.data?.admins ?? []).map((a: { id: string; name: string; email: string; active: boolean; role: { name: string } }) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>{a.role.name}</td>
                <td>{a.active ? "Ativo" : "Inativo"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
