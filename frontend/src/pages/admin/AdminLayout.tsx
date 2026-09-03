import { useState } from "react";
import { NavLink, Outlet, Navigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../../store/auth";

const LINKS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/products", label: "Produtos" },
  { to: "/admin/categories", label: "Categorias" },
  { to: "/admin/banners", label: "Banners" },
  { to: "/admin/orders", label: "Compras" },
  { to: "/admin/customers", label: "Clientes" },
  { to: "/admin/coupons", label: "Cupons" },
  { to: "/admin/admins", label: "Administradores" },
  { to: "/admin/settings", label: "Configurações" },
];

export function AdminLayout() {
  const { token, admin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!token) return <Navigate to="/admin/login" replace />;

  return (
    <div className="admin-shell">
      {open && <button type="button" className="admin-backdrop open" aria-label="Fechar menu" onClick={() => setOpen(false)} />}
      <aside className={`admin-side ${open ? "open" : ""}`}>
        <strong style={{ display: "block", padding: "0 12px 16px" }}>Garoa Admin</strong>
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </NavLink>
        ))}
        <button type="button" className="linkish" onClick={logout}>Sair ({admin?.name})</button>
      </aside>
      <div className="admin-main">
        <button
          type="button"
          className="menu-toggle icon-btn"
          style={{ marginBottom: 12 }}
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
        <Outlet />
      </div>
    </div>
  );
}
