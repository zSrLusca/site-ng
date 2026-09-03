import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "../types";
import { effectivePrice } from "../lib/money";

type Coupon = { code: string; discountCents: number } | null;

type CartState = {
  items: CartItem[];
  coupon: Coupon;
  toast: string | null;
  add: (product: Product, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  setCoupon: (coupon: Coupon) => void;
  clear: () => void;
  setToast: (msg: string | null) => void;
  count: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      toast: null,
      add: (product, qty = 1) => {
        const items = [...get().items];
        const idx = items.findIndex((i) => i.productId === product.id);
        const nextQty = (idx >= 0 ? items[idx].quantity : 0) + qty;
        if (!product.unlimited && product.stock < nextQty) {
          set({ toast: "Quantidade acima do estoque disponível." });
          return;
        }
        const line: CartItem = {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: product.images[0]?.url,
          priceCents: product.priceCents,
          promoPriceCents: product.promoPriceCents,
          quantity: nextQty,
          unlimited: product.unlimited,
          stock: product.stock,
        };
        if (idx >= 0) items[idx] = line;
        else items.push(line);
        set({ items, coupon: null, toast: "Produto adicionado ao carrinho." });
      },
      remove: (productId) => set({ items: get().items.filter((i) => i.productId !== productId), coupon: null }),
      setQty: (productId, qty) => {
        if (qty < 1) return get().remove(productId);
        set({
          items: get().items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
          coupon: null,
        });
      },
      setCoupon: (coupon) => set({ coupon }),
      clear: () => set({ items: [], coupon: null }),
      setToast: (toast) => set({ toast }),
      count: () => get().items.reduce((a, i) => a + i.quantity, 0),
      subtotal: () =>
        get().items.reduce((a, i) => a + effectivePrice(i.priceCents, i.promoPriceCents) * i.quantity, 0),
    }),
    { name: "garoa-cart", partialize: (s) => ({ items: s.items, coupon: s.coupon }) },
  ),
);
