import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, ShoppingCart, X } from "lucide-react";
import { useBootstrap } from "../../hooks/useBootstrap";
import { useCart } from "../../store/cart";
import { assetUrl } from "../../api";

function hrefFor(slug: string) {
  if (slug === "inicio") return "/";
  if (slug === "catalogo") return "/catalogo";
  if (slug === "promocoes") return "/promocoes";
  return `/categoria/${slug}`;
}

export function Header() {
  const { data } = useBootstrap();
  const count = useCart((s) => s.items.reduce((a, i) => a + i.quantity, 0));
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const settings = data?.settings;
  const menu = useMemo(
    () => (data?.categories ?? []).filter((c) => c.showInMenu).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [data],
  );

  function onSearch(e: FormEvent) {
    e.preventDefault();
    nav(`/catalogo?q=${encodeURIComponent(q)}`);
    setOpen(false);
  }

  return (
    <header className="store-header">
      <div className="container">
        <div className="header-row">
          <Link to="/" className="brand">
            {settings?.logo ? <img src={assetUrl(settings.logo)} alt={settings.storeName} /> : <span>G</span>}
            <span>
              {settings?.storeName || "Garoa RP"}
              <small>{settings?.storeTagline || "LOJA OFICIAL"}</small>
            </span>
          </Link>
          <form className="search" onSubmit={onSearch}>
            <Search size={16} color="#8b9bb4" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar um produto"
            />
          </form>
          <div className="header-actions">
            <button type="button" className="menu-toggle icon-btn" onClick={() => setOpen((v) => !v)} aria-label="Menu">
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link to="/carrinho" className="icon-btn" aria-label="Carrinho">
              <ShoppingCart size={18} />
              {count > 0 && <span className="badge">{count}</span>}
            </Link>
            <Link to="/checkout" className="btn btn-primary header-checkout">Checkout</Link>
          </div>
        </div>
        <nav className={`cat-nav ${open ? "open" : ""}`}>
          {menu.map((c) => {
            const href = hrefFor(c.slug);
            const active = loc.pathname === href;
            return (
              <Link key={c.id} to={href} className={active ? "active" : ""} onClick={() => setOpen(false)}>
                {c.name.toUpperCase()}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
