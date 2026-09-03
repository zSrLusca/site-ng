import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useCart } from "../../store/cart";
import { useBootstrap } from "../../hooks/useBootstrap";
import { formatBRL } from "../../lib/money";

export function CheckoutPage() {
  const { items, coupon, subtotal, clear } = useCart();
  const { data } = useBootstrap();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    playerId: "",
    discordId: "",
    phone: "",
    cpf: "",
    paymentMethod: "pix" as "pix" | "credit_card",
  });

  const sub = subtotal();
  const discount = coupon?.discountCents ?? 0;
  const total = Math.max(sub - discount, 0);
  const s = data?.settings;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!items.length) {
      setError("Carrinho vazio.");
      return;
    }
    if (!acceptTerms) {
      setError("Aceite os termos de compra e doação para continuar.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/store/checkout", {
        ...form,
        couponCode: coupon?.code,
        acceptedTerms: true,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      clear();
      nav(`/pedido/${res.order.number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container checkout-layout">
      <form className="checkout-form" onSubmit={onSubmit}>
        <h1>Checkout</h1>
        <p className="lead">Preencha os dados do personagem para receber VIP, cargo e itens após o pagamento.</p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="chk-name">Nome</label>
            <input id="chk-name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="chk-email">E-mail</label>
            <input id="chk-email" required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="chk-player">{s?.playerIdLabel || "ID do personagem"}</label>
            <input id="chk-player" required value={form.playerId} onChange={(e) => setForm({ ...form, playerId: e.target.value })} placeholder="ID do HUD" />
            <small>É o número do personagem no HUD, não o Discord.</small>
          </div>
          <div className="field">
            <label htmlFor="chk-discord">ID do Discord</label>
            <input
              id="chk-discord"
              required
              inputMode="numeric"
              pattern="\d{17,20}"
              value={form.discordId}
              onChange={(e) => setForm({ ...form, discordId: e.target.value.replace(/\D/g, "") })}
              placeholder="17 a 20 dígitos"
            />
            <small>Discord → Configurações → Avançado → Modo desenvolvedor → Copiar ID do usuário.</small>
          </div>
          <div className="field">
            <label htmlFor="chk-phone">Telefone {s?.checkoutRequirePhone ? "" : "(opcional)"}</label>
            <input id="chk-phone" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="chk-cpf">CPF {s?.checkoutRequireCpf ? "" : "(opcional)"}</label>
            <input id="chk-cpf" required={!!s?.checkoutRequireCpf} value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
          </div>
          <div className="field span-2">
            <label htmlFor="chk-pay">Pagamento</label>
            <select
              id="chk-pay"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as "pix" | "credit_card" })}
            >
              <option value="pix">Pix</option>
              <option value="credit_card">Cartão de crédito</option>
            </select>
          </div>
        </div>
        <aside className="rules-donate checkout-donate" role="note">
          <div>
            <strong>Doação sem reembolso</strong>
            <p>
              O pagamento é uma doação voluntária. Não há estorno. Leia os{" "}
              <Link to="/termos" target="_blank" rel="noreferrer">termos de compra</Link> antes de pagar.
            </p>
          </div>
        </aside>
        <label className="check checkout-accept">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            required
          />
          <span>
            Li e aceito os <Link to="/termos" target="_blank" rel="noreferrer">Termos de compra e doação</Link>.
            Sei que não existe reembolso.
          </span>
        </label>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="btn btn-neon btn-wide" type="submit" disabled={loading || !items.length || !acceptTerms}>
          {loading ? "Gerando pagamento..." : "Finalizar pedido"}
        </button>
      </form>
      <aside className="summary">
        <h3>Resumo</h3>
        {items.length === 0 ? (
          <p className="hint">Nenhum item no carrinho. <Link to="/catalogo">Ver catálogo</Link></p>
        ) : (
          items.map((i) => (
            <div className="summary-row" key={i.productId}>
              <span>{i.name} × {i.quantity}</span>
            </div>
          ))
        )}
        <div className="summary-row"><span>Subtotal</span><span>{formatBRL(sub)}</span></div>
        <div className="summary-row"><span>Desconto {coupon?.code ? `(${coupon.code})` : ""}</span><span>{formatBRL(discount)}</span></div>
        <div className="summary-row total"><span>Total</span><span>{formatBRL(total)}</span></div>
        <p className="hint">
          Doação voluntária, sem reembolso. O cartão é processado pelo gateway. Nenhum dado de cartão fica na Garoa.
        </p>
      </aside>
    </main>
  );
}
