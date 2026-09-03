import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { Seo } from "../../components/store/Seo";
import { api, assetUrl } from "../../api";
import type { Product } from "../../types";
import { effectivePrice, formatBRL } from "../../lib/money";
import { useCart } from "../../store/cart";

export function ProductPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const add = useCart((s) => s.add);
  const query = useQuery({
    queryKey: ["product", slug],
    queryFn: () => api.get(`/store/products/${slug}`) as Promise<Product>,
    enabled: !!slug,
  });

  const p = query.data;
  if (query.isLoading) return <main className="container product-page">Carregando...</main>;
  if (!p) return <main className="container product-page">Produto não encontrado.</main>;

  const soldOut = !!p.soldOut;
  const price = effectivePrice(p.priceCents, p.promoPriceCents);
  const img = p.images[0]?.url;

  return (
    <main className="container product-page">
      <Seo title={`${p.name} — Garoa RP`} description={p.shortDescription || p.description.slice(0, 150)} />
      <div className="breadcrumb">
        <Link to="/">Início</Link>
        <span>/</span>
        <Link to={`/categoria/${p.category.slug}`}>{p.category.name}</Link>
        <span>/</span>
        <span>{p.name}</span>
      </div>
      <div className="product-split">
        <div className="product-visual">
          {img ? <img src={assetUrl(img)} alt={p.name} /> : null}
        </div>
        <div className="product-info">
          <div className="kicker">{p.category.icon || "•"} {p.category.name.toUpperCase()}</div>
          <h1>{p.name}</h1>
          <span className="seal">{soldOut ? "ESGOTADO" : p.availabilityLabel}</span>
          {!p.unlimited && p.availableStock != null && p.availableStock > 0 && (
            <p style={{ color: "#8b9bb4" }}>Restam {p.availableStock} unidades</p>
          )}
          <div className="price-hero">
            {p.promoPriceCents ? (
              <span>
                <s style={{ fontSize: "0.7em", color: "#8b9bb4", marginRight: 10 }}>{formatBRL(p.priceCents)}</s>
                {formatBRL(price)}
              </span>
            ) : (
              formatBRL(price)
            )}
          </div>
          <div className="kicker" style={{ marginBottom: 8 }}>DESCRIÇÃO</div>
          <div className="desc-box">
            <strong>{p.name}</strong>
            {"\n\n"}
            {p.description}
            {p.benefits?.length ? `\n\n${p.benefits.join("\n")}` : ""}
            {p.extraInfo ? `\n\n${p.extraInfo}` : ""}
          </div>
          <div className="product-cta">
            <button
              className="btn btn-neon btn-wide"
              disabled={soldOut}
              onClick={() => {
                add(p);
                nav("/checkout");
              }}
            >
              <ShoppingCart size={18} /> {p.buttonText || "COMPRAR AGORA"}
            </button>
            <button
              className="btn btn-ghost btn-wide"
              disabled={soldOut}
              onClick={() => add(p)}
            >
              + ADICIONAR AO CARRINHO
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
