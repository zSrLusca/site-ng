import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../store/auth";

export function AdminLogin() {
  const nav = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/admin/auth/login", { email, password });
      setSession(res.token, res.admin);
      nav("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Painel Garoa</h1>
        <p style={{ color: "#8b9bb4" }}>Acesso restrito à administração da loja.</p>
        <div className="field">
          <label>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Senha</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="btn btn-primary btn-wide">Entrar</button>
      </form>
    </div>
  );
}
