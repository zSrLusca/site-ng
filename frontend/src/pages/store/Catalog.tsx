import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { ProductGrid } from "../../components/store/ProductGrid";
import type { Paginated, Product } from "../../types";

export function CatalogPage({ sale = false }: { sale?: boolean }) {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const page = Number(params.get("page") || "1");
  const query = useQuery({
    queryKey: ["catalog", q, page, sale],
    queryFn: () => {
      const sp = new URLSearchParams({ page: String(page), perPage: "16" });
      if (q) sp.set("search", q);
      if (sale) sp.set("sale", "true");
      return api.get(`/store/products?${sp}`) as Promise<Paginated<Product>>;
    },
  });

  return (
    <main className="container" style={{ paddingBlock: "28px 60px" }}>
      <ProductGrid
        title={sale ? "Promoções" : q ? `Busca: ${q}` : "Catálogo"}
        subtitle="Todos os produtos digitais da Garoa RP."
        products={query.data?.items ?? []}
      />
      {(query.data?.pages ?? 1) > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          {Array.from({ length: query.data!.pages }, (_, i) => (
            <button
              key={i}
              className={`btn ${page === i + 1 ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                params.set("page", String(i + 1));
                setParams(params);
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
