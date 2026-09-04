import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError, notFound, unauthorized } from "../lib/errors.js";
import { asStringArray, requireAdmin, requirePermission } from "../plugins/auth.js";
import { slugify, uniqueSlug } from "../utils/slug.js";
import { audit } from "../services/audit.js";
import { getSettings, setSettings } from "../services/settings.js";
import { getRuntimeConfig, maskAdminSettings, sanitizeSettingsPayload } from "../services/runtime.js";
import { testMercadoPago } from "../payments/index.js";
import { saveUpload } from "../utils/upload.js";
import { fulfillOrder } from "../services/delivery.js";
import { testFiveMConnection } from "../services/fivem.js";

const productBody = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  shortDescription: z.string().optional().nullable(),
  description: z.string().min(1),
  benefits: z.array(z.string()).optional().default([]),
  extraInfo: z.string().optional().nullable(),
  priceCents: z.number().int().min(0),
  promoPriceCents: z.number().int().min(0).optional().nullable(),
  categoryId: z.string(),
  stock: z.number().int().min(0).optional().default(0),
  unlimited: z.boolean().optional().default(true),
  digital: z.boolean().optional().default(true),
  active: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
  onSale: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
  availabilityLabel: z.string().optional().default("ILIMITADO"),
  availabilityStatus: z.string().optional().default("available"),
  buttonText: z.string().optional().default("COMPRAR AGORA"),
  fivemAction: z.string().optional().nullable(),
  fivemPayload: z.any().optional().nullable(),
  images: z
    .array(z.object({ url: z.string(), alt: z.string().optional().nullable(), sortOrder: z.number().optional() }))
    .optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  app.post("/admin/auth/login", {
    config: { rateLimit: { max: 8, timeWindow: "1 minute" } },
  }, async (req) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const admin = await prisma.admin.findUnique({
      where: { email: body.email.toLowerCase() },
      include: { role: true },
    });
    if (!admin || !admin.active) throw unauthorized("Credenciais inválidas.");
    const ok = await bcrypt.compare(body.password, admin.passwordHash);
    if (!ok) throw unauthorized("Credenciais inválidas.");

    await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    const token = await app.jwt.sign({
      sub: admin.id,
      email: admin.email,
      role: admin.role.slug,
      permissions: asStringArray(admin.role.permissions),
    });
    await audit(req, "login", "admin", admin.id);
    return {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role.slug,
        permissions: asStringArray(admin.role.permissions),
      },
    };
  });

  app.addHook("preHandler", async (req, reply) => {
    if (req.url.startsWith("/admin/auth/login") && req.method === "POST") return;
    await requireAdmin(req, reply);
  });

  app.get("/admin/auth/me", async (req) => {
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });
    if (!admin) throw unauthorized();
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role.slug,
      permissions: asStringArray(admin.role.permissions),
    };
  });

  app.get("/admin/dashboard", { preHandler: [requirePermission("dashboard.view", "orders.view")] }, async () => {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const startMonth = new Date(startToday.getFullYear(), startToday.getMonth(), 1);
    const paid = { status: { in: ["paid", "processing", "delivered"] } };

    const [
      salesToday,
      salesMonth,
      ordersTotal,
      pending,
      paidCount,
      customers,
      topProducts,
      daily,
    ] = await Promise.all([
      prisma.order.aggregate({ where: { ...paid, createdAt: { gte: startToday } }, _sum: { totalCents: true }, _count: true }),
      prisma.order.aggregate({ where: { ...paid, createdAt: { gte: startMonth } }, _sum: { totalCents: true }, _count: true }),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ["awaiting_payment", "pending_payment"] } } }),
      prisma.order.count({ where: paid }),
      prisma.customer.count(),
      prisma.orderItem.groupBy({
        by: ["name"],
        _sum: { quantity: true, totalCents: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 6,
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 14 * 86400000) },
          status: { in: ["paid", "processing", "delivered"] },
        },
        select: { createdAt: true, totalCents: true },
      }),
    ]);

    const monthRevenue = salesMonth._sum.totalCents ?? 0;
    const ticket = salesMonth._count ? Math.round(monthRevenue / salesMonth._count) : 0;

    return {
      salesTodayCents: salesToday._sum.totalCents ?? 0,
      salesTodayCount: salesToday._count,
      salesMonthCents: monthRevenue,
      salesMonthCount: salesMonth._count,
      ordersTotal,
      pending,
      paid: paidCount,
      customers,
      ticketAverageCents: ticket,
      topProducts: topProducts.map((p) => ({
        name: p.name,
        quantity: p._sum.quantity ?? 0,
        totalCents: p._sum.totalCents ?? 0,
      })),
      daily: Object.values(
        daily.reduce((acc: Record<string, { day: string; totalCents: number; count: number }>, row) => {
          const day = row.createdAt.toISOString().slice(0, 10);
          acc[day] ??= { day, totalCents: 0, count: 0 };
          acc[day].totalCents += row.totalCents;
          acc[day].count += 1;
          return acc;
        }, {}),
      ),
    };
  });

  app.get("/admin/categories", { preHandler: [requirePermission("categories.manage")] }, async () => {
    return prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
  });

  app.post("/admin/categories", { preHandler: [requirePermission("categories.manage")] }, async (req) => {
    const body = z.object({
      name: z.string().min(2),
      slug: z.string().optional(),
      description: z.string().optional().nullable(),
      icon: z.string().optional().nullable(),
      image: z.string().optional().nullable(),
      sortOrder: z.number().int().optional().default(0),
      featured: z.boolean().optional().default(false),
      active: z.boolean().optional().default(true),
      showInMenu: z.boolean().optional().default(true),
    }).parse(req.body);
    const slug = body.slug
      ? body.slug
      : await uniqueSlug(body.name, async (s) => !!(await prisma.category.findUnique({ where: { slug: s } })));
    const created = await prisma.category.create({ data: { ...body, slug } });
    await audit(req, "create", "category", created.id, created);
    return created;
  });

  app.put("/admin/categories/:id", { preHandler: [requirePermission("categories.manage")] }, async (req) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      name: z.string().min(2).optional(),
      slug: z.string().optional(),
      description: z.string().optional().nullable(),
      icon: z.string().optional().nullable(),
      image: z.string().optional().nullable(),
      sortOrder: z.number().int().optional(),
      featured: z.boolean().optional(),
      active: z.boolean().optional(),
      showInMenu: z.boolean().optional(),
    }).parse(req.body);
    const updated = await prisma.category.update({ where: { id }, data: body });
    await audit(req, "update", "category", id, body);
    return updated;
  });

  app.delete("/admin/categories/:id", { preHandler: [requirePermission("categories.manage")] }, async (req) => {
    const { id } = req.params as { id: string };
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) throw new AppError("Categoria possui produtos. Mova ou exclua os produtos primeiro.", 400);
    await prisma.category.delete({ where: { id } });
    await audit(req, "delete", "category", id);
    return { ok: true };
  });

  app.get("/admin/products", { preHandler: [requirePermission("products.manage")] }, async (req) => {
    const q = z.object({
      search: z.string().optional(),
      categoryId: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
      perPage: z.coerce.number().min(1).max(100).default(20),
    }).parse(req.query);
    const where = {
      ...(q.search ? { name: { contains: q.search } } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
    ]);
    return { items, total, page: q.page, pages: Math.ceil(total / q.perPage) };
  });

  app.get("/admin/products/:id", { preHandler: [requirePermission("products.manage")] }, async (req) => {
    const { id } = req.params as { id: string };
    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
    });
    if (!product) throw notFound("Produto");
    return product;
  });

  app.post("/admin/products", { preHandler: [requirePermission("products.manage")] }, async (req) => {
    const body = productBody.parse(req.body);
    const slug = body.slug
      ? body.slug
      : await uniqueSlug(body.name, async (s) => !!(await prisma.product.findUnique({ where: { slug: s } })));
    const { images, ...data } = body;
    const created = await prisma.product.create({
      data: {
        ...data,
        slug,
        images: images?.length
          ? { create: images.map((img, i) => ({ url: img.url, alt: img.alt, sortOrder: img.sortOrder ?? i })) }
          : undefined,
      },
      include: { images: true, category: true },
    });
    await audit(req, "create", "product", created.id);
    return created;
  });

  app.put("/admin/products/:id", { preHandler: [requirePermission("products.manage")] }, async (req) => {
    const { id } = req.params as { id: string };
    const exists = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw notFound("Produto");
    const body = productBody.partial().parse(req.body);
    const { images, ...data } = body;
    if (data.slug) {
      const taken = await prisma.product.findFirst({ where: { slug: data.slug, NOT: { id } }, select: { id: true } });
      if (taken) throw new AppError("Já existe outro produto com este slug.", 409, "CONFLICT");
    }
    if (data.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } });
      if (!cat) throw new AppError("Categoria inválida. Selecione uma categoria existente.", 400);
    }
    const updated = await prisma.$transaction(async (tx) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
      }
      return tx.product.update({
        where: { id },
        data: {
          ...data,
          images: images
            ? { create: images.filter((img) => img.url).map((img, i) => ({ url: img.url, alt: img.alt, sortOrder: img.sortOrder ?? i })) }
            : undefined,
        },
        include: { images: true, category: true },
      });
    });
    await audit(req, "update", "product", id);
    return updated;
  });

  app.post("/admin/products/:id/duplicate", { preHandler: [requirePermission("products.manage")] }, async (req) => {
    const { id } = req.params as { id: string };
    const product = await prisma.product.findUnique({ where: { id }, include: { images: true } });
    if (!product) throw notFound("Produto");
    const slug = await uniqueSlug(`${product.slug}-copia`, async (s) => !!(await prisma.product.findUnique({ where: { slug: s } })));
    const copy = await prisma.product.create({
      data: {
        name: `${product.name} (cópia)`,
        slug,
        shortDescription: product.shortDescription,
        description: product.description,
        benefits: product.benefits ?? [],
        extraInfo: product.extraInfo,
        priceCents: product.priceCents,
        promoPriceCents: product.promoPriceCents,
        categoryId: product.categoryId,
        stock: product.stock,
        unlimited: product.unlimited,
        digital: product.digital,
        active: false,
        featured: product.featured,
        onSale: product.onSale,
        sortOrder: product.sortOrder,
        availabilityLabel: product.availabilityLabel,
        availabilityStatus: product.availabilityStatus,
        buttonText: product.buttonText,
        fivemAction: product.fivemAction,
        fivemPayload: product.fivemPayload ?? undefined,
        images: {
          create: product.images.map((img) => ({ url: img.url, alt: img.alt, sortOrder: img.sortOrder })),
        },
      },
      include: { images: true, category: true },
    });
    await audit(req, "duplicate", "product", copy.id, { from: id });
    return copy;
  });

  app.delete("/admin/products/:id", { preHandler: [requirePermission("products.manage")] }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.product.delete({ where: { id } });
    await audit(req, "delete", "product", id);
    return { ok: true };
  });

  app.get("/admin/banners", { preHandler: [requirePermission("banners.manage")] }, async () => {
    return prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
  });

  app.post("/admin/banners", { preHandler: [requirePermission("banners.manage")] }, async (req) => {
    const body = z.object({
      title: z.string().min(1),
      description: z.string().optional().nullable(),
      image: z.string().optional().nullable(),
      buttonText: z.string().optional().nullable(),
      buttonUrl: z.string().optional().nullable(),
      sortOrder: z.number().int().optional().default(0),
      active: z.boolean().optional().default(true),
    }).parse(req.body);
    const created = await prisma.banner.create({ data: body });
    await audit(req, "create", "banner", created.id);
    return created;
  });

  app.put("/admin/banners/:id", { preHandler: [requirePermission("banners.manage")] }, async (req) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      title: z.string().optional(),
      description: z.string().optional().nullable(),
      image: z.string().optional().nullable(),
      buttonText: z.string().optional().nullable(),
      buttonUrl: z.string().optional().nullable(),
      sortOrder: z.number().int().optional(),
      active: z.boolean().optional(),
    }).parse(req.body);
    const updated = await prisma.banner.update({ where: { id }, data: body });
    await audit(req, "update", "banner", id);
    return updated;
  });

  app.delete("/admin/banners/:id", { preHandler: [requirePermission("banners.manage")] }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.banner.delete({ where: { id } });
    await audit(req, "delete", "banner", id);
    return { ok: true };
  });

  app.get("/admin/orders", { preHandler: [requirePermission("orders.view")] }, async (req) => {
    const q = z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
      perPage: z.coerce.number().min(1).max(200).default(50),
    }).parse(req.query);
    const search = q.search?.trim();
    const where = {
      ...(q.status ? { status: q.status } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search } },
              { couponCode: { contains: search } },
              { customer: { email: { contains: search } } },
              { customer: { name: { contains: search } } },
              { customer: { playerId: { contains: search } } },
              { customer: { discordId: { contains: search } } },
            ],
          }
        : {}),
    };
    const [total, items, grouped] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          items: true,
          payments: { orderBy: { createdAt: "desc" } },
          deliveries: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]);

    const counts: Record<string, number> = { all: 0 };
    for (const row of grouped) {
      counts[row.status] = row._count.status;
      counts.all += row._count.status;
    }

    return {
      items: items.map((order) => {
        const payment = order.payments[0] ?? null;
        const discord = order.deliveries.filter((d) => d.action === "discord");
        const fivem = order.deliveries.filter((d) => d.action !== "discord");
        const pick = (rows: typeof order.deliveries) => {
          if (!rows.length) return { status: "none", error: null as string | null };
          const failed = rows.find((d) => d.status === "failed");
          if (failed) return { status: "failed", error: failed.error };
          const pending = rows.find((d) => d.status === "pending");
          if (pending) return { status: "pending", error: pending.error };
          return { status: rows[0].status, error: rows[0].error };
        };
        return {
          id: order.id,
          number: order.number,
          status: order.status,
          totalCents: order.totalCents,
          discountCents: order.discountCents,
          couponCode: order.couponCode,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
          customer: {
            id: order.customer.id,
            name: order.customer.name,
            email: order.customer.email,
            playerId: order.customer.playerId,
            discordId: order.customer.discordId,
          },
          products: order.items.map((i) => ({ name: i.name, quantity: i.quantity })),
          payment: payment
            ? {
                status: payment.status,
                method: payment.method,
                provider: payment.provider,
              }
            : null,
          delivery: {
            discord: pick(discord),
            fivem: pick(fivem),
          },
        };
      }),
      total,
      page: q.page,
      pages: Math.max(1, Math.ceil(total / q.perPage)),
      counts,
    };
  });

  app.get("/admin/orders/:id", { preHandler: [requirePermission("orders.view")] }, async (req) => {
    const { id } = req.params as { id: string };
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: true,
        deliveries: true,
        webhookLogs: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!order) throw notFound("Pedido");
    return order;
  });

  app.post("/admin/orders/:id/retry-delivery", { preHandler: [requirePermission("orders.manage")] }, async (req) => {
    const { id } = req.params as { id: string };
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw notFound("Pedido");
    if (!["paid", "processing", "delivered"].includes(order.status)) {
      throw new AppError("Pedido ainda não está pago.", 400);
    }
    await fulfillOrder(id);
    await audit(req, "retry_delivery", "order", id);
    return { ok: true };
  });

  app.patch("/admin/customers/:id", { preHandler: [requirePermission("customers.view")] }, async (req) => {
    const { id } = req.params as { id: string };
    const body = z
      .object({
        discordId: z.string().optional(),
        playerId: z.string().optional(),
      })
      .parse(req.body);
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw notFound("Cliente");
    if (body.discordId && !/^\d{17,20}$/.test(body.discordId.trim())) {
      throw new AppError("ID do Discord inválido.", 400);
    }
    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(body.discordId !== undefined ? { discordId: body.discordId.trim() } : {}),
        ...(body.playerId !== undefined ? { playerId: body.playerId.trim() } : {}),
      },
    });
    await audit(req, "update_customer", "customer", id);
    return updated;
  });

  app.get("/admin/customers", { preHandler: [requirePermission("customers.view")] }, async (req) => {
    const q = z.object({
      search: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
      perPage: z.coerce.number().min(1).max(100).default(20),
    }).parse(req.query);
    const where = q.search
      ? {
          OR: [
            { name: { contains: q.search } },
            { email: { contains: q.search } },
            { playerId: { contains: q.search } },
            { discordId: { contains: q.search } },
          ],
        }
      : {};
    const [total, rows] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: {
          orders: { select: { id: true, totalCents: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
    ]);
    return {
      items: rows.map((c) => {
        const paid = c.orders.filter((o) => ["paid", "processing", "delivered"].includes(o.status));
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          playerId: c.playerId,
          discordId: c.discordId,
          phone: c.phone,
          ordersCount: c.orders.length,
          totalSpentCents: paid.reduce((a, o) => a + o.totalCents, 0),
          firstOrderAt: c.orders.at(-1)?.createdAt ?? c.createdAt,
          lastOrderAt: c.orders[0]?.createdAt ?? null,
          createdAt: c.createdAt,
        };
      }),
      total,
      page: q.page,
      pages: Math.ceil(total / q.perPage),
    };
  });

  app.get("/admin/coupons", { preHandler: [requirePermission("coupons.manage")] }, async () => {
    return prisma.coupon.findMany({
      include: { products: true, categories: true },
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/admin/coupons", { preHandler: [requirePermission("coupons.manage")] }, async (req) => {
    const body = z.object({
      code: z.string().min(2),
      type: z.enum(["percent", "fixed"]),
      value: z.number().int().min(1),
      minSubtotalCents: z.number().int().min(0).optional().default(0),
      maxUses: z.number().int().min(1).optional().nullable(),
      startsAt: z.string().optional().nullable(),
      expiresAt: z.string().optional().nullable(),
      active: z.boolean().optional().default(true),
      productIds: z.array(z.string()).optional().default([]),
      categoryIds: z.array(z.string()).optional().default([]),
    }).parse(req.body);
    const created = await prisma.coupon.create({
      data: {
        code: body.code.trim().toUpperCase(),
        type: body.type,
        value: body.value,
        minSubtotalCents: body.minSubtotalCents,
        maxUses: body.maxUses,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        active: body.active,
        products: { create: body.productIds.map((productId) => ({ productId })) },
        categories: { create: body.categoryIds.map((categoryId) => ({ categoryId })) },
      },
      include: { products: true, categories: true },
    });
    await audit(req, "create", "coupon", created.id);
    return created;
  });

  app.put("/admin/coupons/:id", { preHandler: [requirePermission("coupons.manage")] }, async (req) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      code: z.string().min(2).optional(),
      type: z.enum(["percent", "fixed"]).optional(),
      value: z.number().int().min(1).optional(),
      minSubtotalCents: z.number().int().min(0).optional(),
      maxUses: z.number().int().min(1).optional().nullable(),
      startsAt: z.string().optional().nullable(),
      expiresAt: z.string().optional().nullable(),
      active: z.boolean().optional(),
      productIds: z.array(z.string()).optional(),
      categoryIds: z.array(z.string()).optional(),
    }).parse(req.body);
    if (body.productIds) {
      await prisma.couponProduct.deleteMany({ where: { couponId: id } });
    }
    if (body.categoryIds) {
      await prisma.couponCategory.deleteMany({ where: { couponId: id } });
    }
    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        code: body.code?.trim().toUpperCase(),
        type: body.type,
        value: body.value,
        minSubtotalCents: body.minSubtotalCents,
        maxUses: body.maxUses,
        startsAt: body.startsAt === undefined ? undefined : body.startsAt ? new Date(body.startsAt) : null,
        expiresAt: body.expiresAt === undefined ? undefined : body.expiresAt ? new Date(body.expiresAt) : null,
        active: body.active,
        products: body.productIds ? { create: body.productIds.map((productId) => ({ productId })) } : undefined,
        categories: body.categoryIds ? { create: body.categoryIds.map((categoryId) => ({ categoryId })) } : undefined,
      },
      include: { products: true, categories: true },
    });
    await audit(req, "update", "coupon", id);
    return updated;
  });

  app.delete("/admin/coupons/:id", { preHandler: [requirePermission("coupons.manage")] }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.coupon.delete({ where: { id } });
    await audit(req, "delete", "coupon", id);
    return { ok: true };
  });

  app.get("/admin/settings", { preHandler: [requirePermission("settings.manage")] }, async () => {
    const settings = await getSettings();
    const runtime = await getRuntimeConfig();
    return maskAdminSettings(settings, runtime);
  });

  app.put("/admin/settings", { preHandler: [requirePermission("settings.manage")] }, async (req) => {
    const body = z.record(z.any()).parse(req.body);
    const current = await getSettings();
    const clean = sanitizeSettingsPayload(body, current);
    const updated = await setSettings(clean);
    const runtime = await getRuntimeConfig();
    await audit(req, "update", "settings", "store", {
      keys: Object.keys(clean),
    });
    return maskAdminSettings(updated, runtime);
  });

  app.post("/admin/settings/mercadopago/test", { preHandler: [requirePermission("settings.manage")] }, async () => {
    return testMercadoPago();
  });

  app.post("/admin/settings/fivem/test", { preHandler: [requirePermission("settings.manage")] }, async (req) => {
    const body = z.object({ fivemApiUrl: z.string().optional() }).parse(req.body ?? {});
    return testFiveMConnection(body.fivemApiUrl);
  });

  app.get("/admin/admins", { preHandler: [requirePermission("admins.manage")] }, async () => {
    const [admins, roles] = await Promise.all([
      prisma.admin.findMany({ include: { role: true }, orderBy: { createdAt: "asc" } }),
      prisma.adminRole.findMany(),
    ]);
    return {
      admins: admins.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        active: a.active,
        role: a.role,
        lastLoginAt: a.lastLoginAt,
        createdAt: a.createdAt,
      })),
      roles,
    };
  });

  app.post("/admin/admins", { preHandler: [requirePermission("admins.manage")] }, async (req) => {
    const body = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      roleId: z.string(),
      active: z.boolean().optional().default(true),
    }).parse(req.body);
    const created = await prisma.admin.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        passwordHash: await bcrypt.hash(body.password, 12),
        roleId: body.roleId,
        active: body.active,
      },
      include: { role: true },
    });
    await audit(req, "create", "admin", created.id);
    return { id: created.id, name: created.name, email: created.email, role: created.role, active: created.active };
  });

  app.put("/admin/admins/:id", { preHandler: [requirePermission("admins.manage")] }, async (req) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      password: z.string().min(8).optional(),
      roleId: z.string().optional(),
      active: z.boolean().optional(),
    }).parse(req.body);
    const updated = await prisma.admin.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email?.toLowerCase(),
        roleId: body.roleId,
        active: body.active,
        passwordHash: body.password ? await bcrypt.hash(body.password, 12) : undefined,
      },
      include: { role: true },
    });
    await audit(req, "update", "admin", id);
    return { id: updated.id, name: updated.name, email: updated.email, role: updated.role, active: updated.active };
  });

  const ruleSpecSchema = z
    .object({
      policiaisMin: z.string().optional().default(""),
      criminososMin: z.string().optional().default(""),
      criminososMax: z.string().optional().default(""),
      refensMax: z.string().optional().default(""),
      cooldown: z.string().optional().default(""),
      nivel: z.string().optional().default(""),
      negociacao: z.string().optional().default(""),
      fuga: z.string().optional().nullable(),
    })
    .nullable()
    .optional();

  const ruleFilterBody = z.object({
    slug: z.string().optional(),
    label: z.string().min(2),
    hint: z.string().optional().default(""),
    sortOrder: z.number().int().optional().default(0),
    active: z.boolean().optional().default(true),
  });

  const ruleSectionBody = z.object({
    slug: z.string().optional(),
    category: z.string().min(1),
    number: z.string().min(1),
    title: z.string().min(2),
    intro: z.string().optional().nullable(),
    items: z.array(z.string()).optional().default([]),
    spec: ruleSpecSchema,
    sortOrder: z.number().int().optional().default(0),
    active: z.boolean().optional().default(true),
  });

  app.get("/admin/rules", { preHandler: [requirePermission("rules.manage")] }, async () => {
    const [filters, sections] = await Promise.all([
      prisma.ruleFilter.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.ruleSection.findMany({ orderBy: [{ sortOrder: "asc" }, { number: "asc" }] }),
    ]);
    return { filters, sections };
  });

  app.post("/admin/rule-filters", { preHandler: [requirePermission("rules.manage")] }, async (req) => {
    const body = ruleFilterBody.parse(req.body);
    const slug = body.slug
      ? slugify(body.slug)
      : await uniqueSlug(body.label, async (s) => !!(await prisma.ruleFilter.findUnique({ where: { slug: s } })));
    if (!slug || slug === "todas") throw new AppError("Slug de filtro inválido.", 400);
    const created = await prisma.ruleFilter.create({ data: { ...body, slug } });
    await audit(req, "create", "rule_filter", created.slug, created);
    return created;
  });

  app.put("/admin/rule-filters/:slug", { preHandler: [requirePermission("rules.manage")] }, async (req) => {
    const { slug } = req.params as { slug: string };
    const exists = await prisma.ruleFilter.findUnique({ where: { slug } });
    if (!exists) throw notFound("Filtro");
    const body = ruleFilterBody.partial().parse(req.body);
    const updated = await prisma.ruleFilter.update({
      where: { slug },
      data: { label: body.label, hint: body.hint, sortOrder: body.sortOrder, active: body.active },
    });
    await audit(req, "update", "rule_filter", slug, body);
    return updated;
  });

  app.delete("/admin/rule-filters/:slug", { preHandler: [requirePermission("rules.manage")] }, async (req) => {
    const { slug } = req.params as { slug: string };
    await prisma.ruleFilter.delete({ where: { slug } });
    await audit(req, "delete", "rule_filter", slug);
    return { ok: true };
  });

  app.post("/admin/rule-sections", { preHandler: [requirePermission("rules.manage")] }, async (req) => {
    const body = ruleSectionBody.parse(req.body);
    const slug = body.slug
      ? slugify(body.slug)
      : await uniqueSlug(body.title, async (s) => !!(await prisma.ruleSection.findUnique({ where: { slug: s } })));
    const created = await prisma.ruleSection.create({
      data: {
        slug,
        category: body.category,
        number: body.number,
        title: body.title,
        intro: body.intro ?? null,
        items: body.items.filter((i) => i.trim()),
        spec: body.spec ?? undefined,
        sortOrder: body.sortOrder,
        active: body.active,
      },
    });
    await audit(req, "create", "rule_section", created.id, created);
    return created;
  });

  app.put("/admin/rule-sections/:id", { preHandler: [requirePermission("rules.manage")] }, async (req) => {
    const { id } = req.params as { id: string };
    const exists = await prisma.ruleSection.findUnique({ where: { id } });
    if (!exists) throw notFound("Regra");
    const body = ruleSectionBody.partial().parse(req.body);
    const updated = await prisma.ruleSection.update({
      where: { id },
      data: {
        slug: body.slug ? slugify(body.slug) : undefined,
        category: body.category,
        number: body.number,
        title: body.title,
        intro: body.intro,
        items: body.items ? body.items.filter((i) => i.trim()) : undefined,
        spec: body.spec === undefined ? undefined : body.spec === null ? Prisma.DbNull : body.spec,
        sortOrder: body.sortOrder,
        active: body.active,
      },
    });
    await audit(req, "update", "rule_section", id, body);
    return updated;
  });

  app.delete("/admin/rule-sections/:id", { preHandler: [requirePermission("rules.manage")] }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.ruleSection.delete({ where: { id } });
    await audit(req, "delete", "rule_section", id);
    return { ok: true };
  });

  app.post("/admin/uploads", { preHandler: [requirePermission("products.manage", "banners.manage", "settings.manage")] }, async (req) => {
    const file = await req.file();
    if (!file) throw new AppError("Arquivo obrigatório.", 400);
    const folder = ((req.query as { folder?: string }).folder || "misc").replace(/[^a-z0-9-_]/gi, "");
    const url = await saveUpload(file, folder || "misc");
    return { url };
  });
}
