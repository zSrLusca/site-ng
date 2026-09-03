import { useQuery } from "@tanstack/react-query";
import { api } from "../../api";
import { useBootstrap } from "../../hooks/useBootstrap";
import { BannerCarousel } from "../../components/store/BannerCarousel";
import { ProductGrid } from "../../components/store/ProductGrid";
import type { Paginated, Product } from "../../types";

export function HomePage() {
  const { data } = useBootstrap();
  const featured = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => api.get("/store/products?featured=true&perPage=8") as Promise<Paginated<Product>>,
  });
  const sale = useQuery({
    queryKey: ["products", "sale"],
    queryFn: () => api.get("/store/products?sale=true&perPage=8") as Promise<Paginated<Product>>,
  });

  return (
    <main className="container" style={{ paddingBottom: 60 }}>
      <BannerCarousel banners={data?.banners ?? []} />
      <ProductGrid
        title="Destaques da cidade"
        subtitle="Os benefícios mais procurados da Garoa."
        products={featured.data?.items ?? []}
      />
      <div style={{ height: 28 }} />
      <ProductGrid
        title="Promoções"
        subtitle="Ofertas ativas neste momento."
        products={sale.data?.items ?? []}
      />
    </main>
  );
}
