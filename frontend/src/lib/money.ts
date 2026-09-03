export function effectivePrice(priceCents: number, promo?: number | null) {
  if (promo != null && promo > 0 && promo < priceCents) return promo;
  return priceCents;
}

export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function reaisToCents(value: string) {
  const n = Number(value.replace(/\./g, "").replace(",", "."));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}
