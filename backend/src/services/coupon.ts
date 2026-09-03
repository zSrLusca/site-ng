import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

export type CartLine = {
  productId: string;
  categoryId: string;
  quantity: number;
  unitPriceCents: number;
};

export async function validateCoupon(code: string, lines: CartLine[], subtotalCents: number) {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: { products: true, categories: true },
  });

  if (!coupon || !coupon.active) {
    throw new AppError("Cupom inválido.", 400, "INVALID_COUPON");
  }
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new AppError("Este cupom ainda não está válido.", 400, "COUPON_NOT_STARTED");
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new AppError("Este cupom expirou.", 400, "COUPON_EXPIRED");
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    throw new AppError("Este cupom atingiu o limite de uso.", 400, "COUPON_LIMIT");
  }
  if (subtotalCents < coupon.minSubtotalCents) {
    throw new AppError("Valor mínimo do cupom não atingido.", 400, "COUPON_MIN");
  }

  const productIds = new Set(coupon.products.map((p) => p.productId));
  const categoryIds = new Set(coupon.categories.map((c) => c.categoryId));
  const restricted = productIds.size > 0 || categoryIds.size > 0;

  const eligible = restricted
    ? lines.filter(
        (l) => productIds.has(l.productId) || categoryIds.has(l.categoryId),
      )
    : lines;

  if (restricted && eligible.length === 0) {
    throw new AppError("Cupom não se aplica aos produtos do carrinho.", 400, "COUPON_SCOPE");
  }

  const base = eligible.reduce((acc, l) => acc + l.unitPriceCents * l.quantity, 0);
  let discount = 0;
  if (coupon.type === "percent") {
    discount = Math.floor((base * coupon.value) / 100);
  } else {
    discount = Math.min(coupon.value, base);
  }

  return { coupon, discountCents: Math.min(discount, subtotalCents) };
}
