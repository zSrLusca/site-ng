import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api";
import { useAuth } from "../../store/auth";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <small style={{ color: "#8b9bb4" }}>{hint}</small>}
    </div>
  );
}

export function AdminSettings() {
  const token = useAuth((s) => s.token)!;
  const q = useQuery({ queryKey: ["admin-settings"], queryFn: () => api.authGet("/admin/settings", token) });
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [ok, setOk] = useState("");
  const [error, setError] = useState("");
  const [mpTest, setMpTest] = useState("");

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
    setOk("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const saved = await api.put("/admin/settings", form, token);
      setForm(saved);
      setOk("Configurações da loja salvas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    }
  }

  async function upload(key: string, file: File) {
    const res = await api.upload(file, "brand", token);
    set(key, res.url);
  }

  async function testMp() {
    setMpTest("Testando conexão com o Mercado Pago...");
    setError("");
    try {
      const res = await api.post("/admin/settings/mercadopago/test", {}, token);
      setMpTest(`Conectado: ${res.nickname || res.accountId} (${res.siteId || "MLB"})`);
    } catch (err) {
      setMpTest("");
      setError(err instanceof Error ? err.message : "Falha no teste do Mercado Pago");
    }
  }

  return (
    <form className="admin-page" onSubmit={onSubmit}>
      <div className="page-toolbar">
        <h1>Configurações</h1>
        <button className="btn btn-primary" type="submit">Salvar configurações</button>
      </div>
      <p style={{ color: "#8b9bb4" }}>
        Ambiente: {String(form.environment || "development")}. Tokens e secrets ficam só no{" "}
        <code>backend/.env</code> — nunca passam pelo navegador.
      </p>

      <section className="form-section">
        <h2>Loja</h2>
        <div className="form-grid">
          <Field label="Nome da loja"><input value={String(form.storeName ?? "")} onChange={(e) => set("storeName", e.target.value)} /></Field>
          <Field label="Slogan"><input value={String(form.storeTagline ?? "")} onChange={(e) => set("storeTagline", e.target.value)} /></Field>
          <Field label="E-mail de contato"><input value={String(form.contactEmail ?? "")} onChange={(e) => set("contactEmail", e.target.value)} /></Field>
          <Field label="Discord"><input value={String(form.discord ?? "")} onChange={(e) => set("discord", e.target.value)} /></Field>
          <Field label="Instagram"><input value={String(form.instagram ?? "")} onChange={(e) => set("instagram", e.target.value)} /></Field>
          <Field label="YouTube"><input value={String(form.youtube ?? "")} onChange={(e) => set("youtube", e.target.value)} /></Field>
          <Field label="Título SEO"><input value={String(form.seoTitle ?? "")} onChange={(e) => set("seoTitle", e.target.value)} /></Field>
          <Field label="Cor primária"><input value={String(form.primaryColor ?? "")} onChange={(e) => set("primaryColor", e.target.value)} /></Field>
          <Field label="Cor neon"><input value={String(form.neonColor ?? "")} onChange={(e) => set("neonColor", e.target.value)} /></Field>
          <Field label="Rótulo do ID do jogador"><input value={String(form.playerIdLabel ?? "")} onChange={(e) => set("playerIdLabel", e.target.value)} /></Field>
          <div className="field span-2"><label>Descrição SEO</label><textarea value={String(form.seoDescription ?? "")} onChange={(e) => set("seoDescription", e.target.value)} /></div>
          <div className="field span-2"><label>Texto do rodapé</label><textarea value={String(form.footerText ?? "")} onChange={(e) => set("footerText", e.target.value)} /></div>
        </div>
        <div className="form-grid">
          <Field label="Logo">
            <label className="file-btn">
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload("logo", e.target.files[0])} />
              Enviar logo
            </label>
          </Field>
          <Field label="Favicon">
            <label className="file-btn">
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload("favicon", e.target.files[0])} />
              Enviar favicon
            </label>
          </Field>
        </div>
        <div className="check-row">
          <label className="check"><input type="checkbox" checked={!!form.checkoutRequireCpf} onChange={(e) => set("checkoutRequireCpf", e.target.checked)} /> Exigir CPF no checkout</label>
          <label className="check"><input type="checkbox" checked={!!form.checkoutRequirePhone} onChange={(e) => set("checkoutRequirePhone", e.target.checked)} /> Exigir telefone</label>
        </div>
      </section>

      <section className="form-section">
        <h2>VPS / domínio</h2>
        <div className="form-grid">
          <Field label="URL pública da loja" hint="Ex.: https://loja.garoarp.com">
            <input value={String(form.appUrl ?? "")} onChange={(e) => set("appUrl", e.target.value)} placeholder="https://loja.garoarp.com" />
          </Field>
          <Field label="URL pública da API" hint="Ex.: https://loja.garoarp.com/api">
            <input value={String(form.apiUrl ?? "")} onChange={(e) => set("apiUrl", e.target.value)} placeholder="https://loja.garoarp.com/api" />
          </Field>
          <Field label="Origens CORS permitidas" hint="Separadas por vírgula">
            <input className="span-2" value={String(form.allowedOrigins ?? "")} onChange={(e) => set("allowedOrigins", e.target.value)} placeholder="https://loja.garoarp.com" />
          </Field>
        </div>
        <p style={{ color: "var(--neon)" }}>Webhook a cadastrar no Mercado Pago: <code>{String(form.webhookUrl || "")}</code></p>
      </section>

      <section className="form-section">
        <h2>Mercado Pago</h2>
        <p className="hint">
          No localhost, preencha só <code>MERCADOPAGO_ACCESS_TOKEN</code> e{" "}
          <code>MERCADOPAGO_PUBLIC_KEY</code> de teste no <code>backend/.env</code>. O webhook secret
          pode ficar vazio: a loja confirma o pagamento consultando a API do Mercado Pago.
        </p>
        <p>
          Status:{" "}
          <strong>
            {form.mpConfigured
              ? `configurado (${String(form.mpMode)})`
              : "não configurado — preencha o .env"}
          </strong>
        </p>
        <p>Webhook secret: {form.mpWebhookConfigured ? "presente no .env" : "ausente"}</p>
        <button type="button" className="btn btn-ghost" onClick={testMp}>Testar conexão Mercado Pago</button>
        {mpTest && <p style={{ color: "var(--ok)" }}>{mpTest}</p>}
      </section>

      <section className="form-section">
        <h2>FiveM (cidade na VPS)</h2>
        <p className="hint">
          A loja envia a entrega para o FXServer. Use o IP público da VPS. A porta TCP <code>30120</code> precisa estar aberta.
        </p>
        <Field label="URL da cidade" hint="Ex.: http://SEU_IP:30120/ng-loja">
          <input
            value={String(form.fivemApiUrl ?? "")}
            onChange={(e) => set("fivemApiUrl", e.target.value)}
            placeholder="http://IP_DA_VPS:30120/ng-loja"
          />
        </Field>
        <p className="hint">
          API key: {form.fivemKeyConfigured ? "presente no .env (FIVEM_API_KEY)" : "ausente — defina FIVEM_API_KEY"}
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => {
            setError("");
            setOk("");
            try {
              await api.post("/admin/settings/fivem/test", form, token);
              setOk("Cidade respondeu. Entregas podem ser enviadas para a VPS.");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Falha ao falar com a cidade");
            }
          }}
        >
          Testar conexão com a cidade
        </button>
      </section>

      <section className="form-section">
        <h2>Discord — cargos VIP</h2>
        <p className="hint">
          Token do bot e ID do servidor ficam no <code>backend/.env</code>. Os IDs dos cargos podem ser preenchidos aqui
          (Modo desenvolvedor no Discord → clique no cargo → Copiar ID).
        </p>
        <p>
          Status:{" "}
          <strong>{form.discordConfigured ? "bot configurado" : "não configurado — preencha DISCORD_BOT_TOKEN e DISCORD_GUILD_ID no .env"}</strong>
        </p>
        <div className="form-grid">
          <Field label="Cargo Select"><input inputMode="numeric" value={String(form.discordRoleSelect ?? "")} onChange={(e) => set("discordRoleSelect", e.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="Cargo Prime"><input inputMode="numeric" value={String(form.discordRolePrime ?? "")} onChange={(e) => set("discordRolePrime", e.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="Cargo Prestige"><input inputMode="numeric" value={String(form.discordRolePrestige ?? "")} onChange={(e) => set("discordRolePrestige", e.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="Cargo Elite"><input inputMode="numeric" value={String(form.discordRoleElite ?? "")} onChange={(e) => set("discordRoleElite", e.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="Cargo Imperial"><input inputMode="numeric" value={String(form.discordRoleImperial ?? "")} onChange={(e) => set("discordRoleImperial", e.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="Cargo Supreme"><input inputMode="numeric" value={String(form.discordRoleSupreme ?? "")} onChange={(e) => set("discordRoleSupreme", e.target.value.replace(/\D/g, ""))} /></Field>
        </div>
      </section>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      {ok && <p style={{ color: "var(--ok)" }}>{ok}</p>}
      <button className="btn btn-primary" type="submit">Salvar configurações</button>
    </form>
  );
}
