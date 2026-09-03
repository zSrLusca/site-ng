import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { ProductGrid } from "../../components/store/ProductGrid";
import type { Category, Product } from "../../types";

export function CategoryPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") || "1");
  const query = useQuery({
    queryKey: ["category", slug, page],
    queryFn: () =>
      api.get(`/store/categories/${slug}?page=${page}`) as Promise<{
        category: Category;
        items: Product[];
        pages: number;
      }>,
    enabled: !!slug,
  });

  return (
    <main className="container" style={{ paddingBlock: "28px 60px" }}>
      <ProductGrid
        title={query.data?.category.name || "Categoria"}
        subtitle={query.data?.category.description || undefined}
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
