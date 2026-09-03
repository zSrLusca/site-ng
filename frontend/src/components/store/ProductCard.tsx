import { Link } from "react-router-dom";
import type { Product } from "../../types";
import { assetUrl } from "../../api";
import { effectivePrice, formatBRL } from "../../lib/money";

export function ProductCard({ product }: { product: Product }) {
  const price = effectivePrice(product.priceCents, product.promoPriceCents);
  const img = product.images[0]?.url;
  return (
    <article className="card">
      <Link to={`/produto/${product.slug}`} className="card-media">
        {img ? <img src={assetUrl(img)} alt={product.name} loading="lazy" /> : <span>{product.name}</span>}
      </Link>
      <div className="card-body">
        <h3>
          <Link to={`/produto/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="card-actions">
          <Link to={`/produto/${product.slug}`} className="btn-details">DETALHES</Link>
          <div className="price">
            {product.promoPriceCents ? <s>{formatBRL(product.priceCents)}</s> : null}
            {formatBRL(price)}
          </div>
        </div>
      </div>
    </article>
  );
}
