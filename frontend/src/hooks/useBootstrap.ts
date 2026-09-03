import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import type { Banner, Category, Settings } from "../types";

export function useBootstrap() {
  return useQuery({
    queryKey: ["bootstrap"],
    queryFn: () =>
      api.get("/store/bootstrap") as Promise<{
        settings: Settings;
        categories: Category[];
        banners: Banner[];
      }>,
  });
}
