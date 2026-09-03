export function toReais(cents: number) {
  return (cents / 100).toFixed(2);
}

export function effectivePrice(priceCents: number, promoPriceCents?: number | null) {
  if (promoPriceCents != null && promoPriceCents > 0 && promoPriceCents < priceCents) {
    return promoPriceCents;
  }
  return priceCents;
}

export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
