import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api, assetUrl } from "../../api";
import { useCart } from "../../store/cart";
import { effectivePrice, formatBRL } from "../../lib/money";

export function CartPage() {
  const { items, remove, setQty, coupon, setCoupon, subtotal } = useCart();
  const [code, setCode] = useState(coupon?.code || "");
  const [error, setError] = useState("");
  const sub = subtotal();
  const discount = coupon?.discountCents ?? 0;
  const total = Math.max(sub - discount, 0);

  async function applyCoupon(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/store/coupons/validate", {
        code,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      setCoupon({ code: res.code, discountCents: res.discountCents });
    } catch (err) {
      setCoupon(null);
      setError(err instanceof Error ? err.message : "Cupom inválido");
    }
  }

  return (
    <main className="container cart-layout">
      <section>
        <h1>Carrinho</h1>
        {items.length === 0 && <p className="empty">Seu carrinho está vazio.</p>}
        {items.map((i) => (
          <div className="line-item" key={i.productId}>
            <img src={assetUrl(i.image)} alt="" style={{ width: 84, height: 64, objectFit: "cover", borderRadius: 10 }} />
            <div>
              <strong>{i.name}</strong>
              <div className="price">{formatBRL(effectivePrice(i.priceCents, i.promoPriceCents))}</div>
              <div className="qty">
                <button onClick={() => setQty(i.productId, i.quantity - 1)}>-</button>
                <span>{i.quantity}</span>
                <button onClick={() => setQty(i.productId, i.quantity + 1)}>+</button>
                <button type="button" className="btn btn-ghost" style={{ height: 36, padding: "0 10px" }} onClick={() => remove(i.productId)}>
                  Remover
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>
      <aside className="summary">
        <h3>Resumo</h3>
        <form onSubmit={applyCoupon} style={{ display: "flex", gap: 8, margin: "12px 0" }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Cupom"
            style={{ flex: 1, background: "#0b1118", border: "1px solid var(--line)", color: "white", borderRadius: 10, padding: 10 }}
          />
          <button className="btn btn-ghost" type="submit">Aplicar</button>
        </form>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <div className="summary-row"><span>Subtotal</span><span>{formatBRL(sub)}</span></div>
        <div className="summary-row"><span>Desconto</span><span>{formatBRL(discount)}</span></div>
        <div className="summary-row total"><span>Total</span><span>{formatBRL(total)}</span></div>
        <p className="hint">
          Compras no site são doações. Não há reembolso. <Link to="/regras/loja">Leis da loja</Link>
        </p>
        <Link to="/checkout" className="btn btn-neon btn-wide" style={{ marginTop: 14 }}>
          Ir para checkout
        </Link>
      </aside>
    </main>
  );
}
