import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Seo } from "./Seo";
import { useBootstrap } from "../../hooks/useBootstrap";
import { useCart } from "../../store/cart";
import { useEffect } from "react";
import { assetUrl } from "../../api";

function FaviconAndTheme({
  favicon,
  primary,
  neon,
}: {
  favicon?: string;
  primary?: string;
  neon?: string;
}) {
  useEffect(() => {
    if (favicon) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = assetUrl(favicon);
    }
    document.documentElement.style.setProperty("--primary", primary || "#1a8cff");
    document.documentElement.style.setProperty("--neon", neon || "#00d4ff");
  }, [favicon, primary, neon]);
  return null;
}

export function StoreLayout() {
  const { data } = useBootstrap();
  const toast = useCart((s) => s.toast);
  const setToast = useCart((s) => s.setToast);
  const s = data?.settings;

  return (
    <div className="store-shell">
      <Seo title={s?.seoTitle || "Garoa RP — Loja Oficial"} description={s?.seoDescription || ""} />
      <FaviconAndTheme favicon={s?.favicon} primary={s?.primaryColor} neon={s?.neonColor} />
      <Header />
      <div className="store-body">
        <Outlet />
      </div>
      <Footer />
      {toast && (
        <button type="button" className="toast" onClick={() => setToast(null)}>
          {toast}
        </button>
      )}
    </div>
  );
}
