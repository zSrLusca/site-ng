import { Link } from "react-router-dom";
import { useBootstrap } from "../../hooks/useBootstrap";

export function Footer() {
  const { data } = useBootstrap();
  const s = data?.settings;
  return (
    <footer className="store-footer">
      <div className="container footer-grid">
        <div>
          <strong>{s?.storeName || "Garoa RP"}</strong>
          <p>{s?.footerText}</p>
          <p>Compras no site são doações. Não há reembolso.</p>
        </div>
        <div>
          <strong>Loja</strong>
          <p><Link to="/catalogo">Catálogo</Link></p>
          <p><Link to="/promocoes">Promoções</Link></p>
          <p><Link to="/categoria/planos-vip">Planos VIP</Link></p>
        </div>
        <div>
          <strong>Cidade</strong>
          <p><Link to="/regras">Leis Gerais</Link></p>
          <p><Link to="/regras/loja">Doações e reembolso</Link></p>
          {s?.discord && <p><a href={s.discord} target="_blank" rel="noreferrer">Discord</a></p>}
          {s?.contactEmail && <p>{s.contactEmail}</p>}
        </div>
      </div>
    </footer>
  );
}
