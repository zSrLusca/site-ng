export function effectivePrice(priceCents: number, promo?: number | null) {
  if (promo != null && promo > 0 && promo < priceCents) return promo;
  return priceCents;
}

export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function reaisToCents(value: string) {
  const raw = value.trim();
  if (!raw) return 0;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const n = Number(normalized);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}
