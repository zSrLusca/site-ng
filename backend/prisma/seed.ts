import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_RULE_FILTERS, DEFAULT_RULE_SECTIONS } from "../src/data/default-rules.js";

const prisma = new PrismaClient();

const PERMS_ALL = ["*"];
const PERMS_ADMIN = [
  "dashboard.view",
  "products.manage",
  "categories.manage",
  "banners.manage",
  "orders.view",
  "orders.manage",
  "customers.view",
  "coupons.manage",
  "settings.manage",
  "rules.manage",
];
const PERMS_SUPPORT = ["dashboard.view", "orders.view", "customers.view"];

async function main() {
  const superRole = await prisma.adminRole.upsert({
    where: { slug: "super_admin" },
    update: { permissions: PERMS_ALL },
    create: { slug: "super_admin", name: "Super Admin", permissions: PERMS_ALL },
  });
  await prisma.adminRole.upsert({
    where: { slug: "admin" },
    update: { permissions: PERMS_ADMIN },
    create: { slug: "admin", name: "Admin", permissions: PERMS_ADMIN },
  });
  await prisma.adminRole.upsert({
    where: { slug: "support" },
    update: { permissions: PERMS_SUPPORT },
    create: { slug: "support", name: "Suporte", permissions: PERMS_SUPPORT },
  });

  const email = (process.env.ADMIN_EMAIL || "admin@garoarp.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "TroqueEstaSenha123!";
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (!existing) {
    await prisma.admin.create({
      data: {
        email,
        name: "Administrador Garoa",
        passwordHash: await bcrypt.hash(password, 12),
        roleId: superRole.id,
      },
    });
  }

  const cats = [
    { name: "Início", slug: "inicio", icon: "home", showInMenu: true, featured: false, sortOrder: 0, description: "Página inicial da loja oficial." },
    { name: "Catálogo", slug: "catalogo", icon: "grid", showInMenu: true, featured: false, sortOrder: 1, description: "Todos os produtos da cidade." },
    { name: "Promoções", slug: "promocoes", icon: "tag", showInMenu: true, featured: true, sortOrder: 2, description: "Ofertas ativas da Garoa." },
    { name: "Planos VIP", slug: "planos-vip", icon: "crown", showInMenu: true, featured: true, sortOrder: 3, description: "Benefícios exclusivos Garoa: Select, Prime, Prestige, Elite, Imperial e Supreme." },
    { name: "Acessórios", slug: "acessorios", icon: "watch", showInMenu: true, featured: false, sortOrder: 4, description: "Itens e vantagens para o personagem." },
    { name: "Negócios", slug: "negocios", icon: "building", showInMenu: true, featured: true, sortOrder: 5, description: "Empresas e pontos comerciais da cidade." },
    { name: "Diamantes", slug: "diamantes", icon: "gem", showInMenu: true, featured: true, sortOrder: 6, description: "Moeda premium da Garoa RP." },
    { name: "Veículos", slug: "veiculos", icon: "car", showInMenu: true, featured: true, sortOrder: 7, description: "Carros e motos exclusivos." },
    { name: "Outros", slug: "outros", icon: "box", showInMenu: true, featured: false, sortOrder: 8, description: "Demais produtos digitais." },
  ];

  const categoryIds: Record<string, string> = {};
  for (const cat of cats) {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
    categoryIds[cat.slug] = row.id;
  }

  const products = [
    {
      name: "VIP Select",
      slug: "vip-select",
      category: "planos-vip",
      priceCents: 4999,
      promoPriceCents: null,
      availabilityLabel: "ILIMITADO",
      featured: true,
      image: "/media/vip-bronze.svg",
      shortDescription: "75 kg · R$ 1.000/h · 1 cartão comum · kit semanal",
      description:
        "VIP SELECT — o primeiro passo na Garoa.\n\nMochila de 75 kg, salário de R$ 1.000 por hora, 1 cartão comum (até 8.000 💎), propriedade Select e kit semanal automático (5x água, 5x energético e 1x kit de reparo).",
      extraInfo:
        "1 cartão = 1 veículo. Pode adquirir ou renovar um veículo comprado com diamantes, até o limite do cartão. O saldo restante não vira dinheiro nem diamantes.",
      benefits: [
        "🟢 1x Cartão Comum — até 8.000 💎",
        "🎒 Mochila: 75 kg",
        "💰 Salário: R$ 1.000 / hora",
        "🏠 1x Propriedade Select",
        "🎁 Kit semanal: 5x Água, 5x Energético, 1x Kit de Reparo",
      ],
      fivemAction: "vip",
      fivemPayload: { vip: "select", days: 30 },
    },
    {
      name: "VIP Prime",
      slug: "vip-prime",
      category: "planos-vip",
      priceCents: 9999,
      promoPriceCents: 6999,
      availabilityLabel: "ILIMITADO",
      featured: true,
      onSale: true,
      image: "/media/vip-prata.svg",
      shortDescription: "120 kg · R$ 1.800/h · 2 cartões · kit semanal",
      description:
        "VIP PRIME — mais recursos na rotina da cidade.\n\nMochila de 120 kg, salário de R$ 1.800 por hora, 2 cartões (1 comum + 1 épico), propriedade Prime e kit semanal (8x água, 8x energético e 2x kit de reparo).",
      extraInfo:
        "1 cartão = 1 veículo. Pode adquirir ou renovar um veículo comprado com diamantes, até o limite do cartão. O saldo restante não vira dinheiro nem diamantes.",
      benefits: [
        "🟢 1x Cartão Comum — até 8.000 💎",
        "🔵 1x Cartão Épico — até 25.000 💎",
        "🎒 Mochila: 120 kg",
        "💰 Salário: R$ 1.800 / hora",
        "🏠 1x Propriedade Prime",
        "🎁 Kit semanal: 8x Água, 8x Energético, 2x Kit de Reparo",
      ],
      fivemAction: "vip",
      fivemPayload: { vip: "prime", days: 30 },
    },
    {
      name: "VIP Prestige",
      slug: "vip-prestige",
      category: "planos-vip",
      priceCents: 12999,
      promoPriceCents: null,
      availabilityLabel: "ILIMITADO",
      featured: true,
      image: "/media/vip-prata.svg",
      shortDescription: "165 kg · R$ 2.600/h · 3 cartões · veículos exclusivos",
      description:
        "VIP PRESTIGE — presença marcada na Garoa.\n\nMochila de 165 kg, salário de R$ 2.600 por hora, 3 cartões (1 comum + 2 épicos), propriedade Prestige, kit semanal (10x água, 10x energético e 3x kit de reparo) e veículos exclusivos Prestige.",
      extraInfo:
        "1 cartão = 1 veículo. Pode adquirir ou renovar um veículo comprado com diamantes, até o limite do cartão. O saldo restante não vira dinheiro nem diamantes.",
      benefits: [
        "🟢 1x Cartão Comum — até 8.000 💎",
        "🔵 2x Cartões Épicos — até 25.000 💎 cada",
        "🎒 Mochila: 165 kg",
        "💰 Salário: R$ 2.600 / hora",
        "🏠 1x Propriedade Prestige",
        "🎁 Kit semanal: 10x Água, 10x Energético, 3x Kit de Reparo",
        "🚗 Veículos exclusivos Prestige",
      ],
      fivemAction: "vip",
      fivemPayload: { vip: "prestige", days: 30 },
    },
    {
      name: "VIP Elite",
      slug: "vip-elite",
      category: "planos-vip",
      priceCents: 14999,
      promoPriceCents: 11999,
      availabilityLabel: "ILIMITADO",
      featured: true,
      onSale: true,
      image: "/media/vip-ouro.svg",
      shortDescription: "210 kg · R$ 3.400/h · 4 cartões · veículos exclusivos",
      description:
        "VIP ELITE — o plano mais procurado da Garoa.\n\nMochila de 210 kg, salário de R$ 3.400 por hora, 4 cartões (2 comuns + 2 épicos), propriedade Elite, kit semanal (12x água, 12x energético e 4x kit de reparo) e veículos exclusivos Elite.",
      extraInfo:
        "1 cartão = 1 veículo. Pode adquirir ou renovar um veículo comprado com diamantes, até o limite do cartão. O saldo restante não vira dinheiro nem diamantes.",
      benefits: [
        "🟢 2x Cartões Comuns — até 8.000 💎 cada",
        "🔵 2x Cartões Épicos — até 25.000 💎 cada",
        "🎒 Mochila: 210 kg",
        "💰 Salário: R$ 3.400 / hora",
        "🏠 1x Propriedade Elite",
        "🎁 Kit semanal: 12x Água, 12x Energético, 4x Kit de Reparo",
        "🚗 Veículos exclusivos Elite",
      ],
      fivemAction: "vip",
      fivemPayload: { vip: "elite", days: 30 },
    },
    {
      name: "VIP Imperial",
      slug: "vip-imperial",
      category: "planos-vip",
      priceCents: 19999,
      promoPriceCents: null,
      availabilityLabel: "ILIMITADO",
      featured: true,
      image: "/media/vip-ouro.svg",
      shortDescription: "255 kg · R$ 4.200/h · farm 2x · ATS e câmeras",
      description:
        "VIP IMPERIAL — farm 2x e benefícios pesados.\n\nMochila de 255 kg, salário de R$ 4.200 por hora, farm em dobro, 5 cartões (1 comum + 3 épicos + 1 lendário), propriedade Imperial, kit semanal (15x água, 15x energético e 5x kit de reparo), 1 helicóptero, 1 baú de R$ 5.000, /ats por 1 mês e /cam com 5 câmeras.",
      extraInfo:
        "1 cartão = 1 veículo. Pode adquirir ou renovar um veículo comprado com diamantes, até o limite do cartão. O saldo restante não vira dinheiro nem diamantes. Farm 2x somente Imperial e Supreme.",
      benefits: [
        "🟢 1x Cartão Comum — até 8.000 💎",
        "🔵 3x Cartões Épicos — até 25.000 💎 cada",
        "🟣 1x Cartão Lendário — até 50.000 💎",
        "🎒 Mochila: 255 kg",
        "💰 Salário: R$ 4.200 / hora",
        "📈 Farm 2x quantidade",
        "🏠 1x Propriedade Imperial",
        "🎁 Kit semanal: 15x Água, 15x Energético, 5x Kit de Reparo",
        "🚁 1x Helicóptero",
        "📦 1x Baú de R$ 5.000",
        "🔫 /ats — 1 mês",
        "📹 /cam — 5 câmeras",
      ],
      fivemAction: "vip",
      fivemPayload: { vip: "imperial", days: 30 },
    },
    {
      name: "VIP Supreme",
      slug: "vip-supreme",
      category: "planos-vip",
      priceCents: 24999,
      promoPriceCents: null,
      availabilityLabel: "ILIMITADO",
      featured: true,
      image: "/media/vip-diamante.svg",
      shortDescription: "300 kg · R$ 5.000/h · farm 2x · +1 personagem",
      description:
        "VIP SUPREME — o topo da Garoa.\n\nMochila de 300 kg, salário de R$ 5.000 por hora, farm 2x, 6 cartões (1 comum + 3 épicos + 2 lendários), propriedade Supreme, crédito em diamantes no valor de +1 personagem, kit semanal (20x água, 20x energético e 7x kit de reparo), helicóptero, avião, 2 baús (R$ 10.000 no total), /ats e Spotify por 1 mês, /cam com 5 câmeras, /criaranimal e controle de televisão.",
      extraInfo:
        "1 cartão = 1 veículo. Pode adquirir ou renovar um veículo comprado com diamantes, até o limite do cartão. O saldo restante não vira dinheiro nem diamantes. Farm 2x somente Imperial e Supreme. +1 personagem: crédito em diamantes no valor atual do slot extra.",
      benefits: [
        "🟢 1x Cartão Comum — até 8.000 💎",
        "🔵 3x Cartões Épicos — até 25.000 💎 cada",
        "🟣 2x Cartões Lendários — até 50.000 💎 cada",
        "🎒 Mochila: 300 kg",
        "💰 Salário: R$ 5.000 / hora",
        "📈 Farm 2x quantidade",
        "🏠 1x Propriedade Supreme",
        "👤 +1 personagem (crédito em diamantes no valor do slot)",
        "🎁 Kit semanal: 20x Água, 20x Energético, 7x Kit de Reparo",
        "🚁 1x Helicóptero",
        "✈️ 1x Avião",
        "📦 2x Baús de R$ 5.000 (total R$ 10.000)",
        "🔫 /ats — 1 mês",
        "📹 /cam — 5 câmeras",
        "🐕 /criaranimal",
        "📺 Controle de televisão",
        "🎵 Spotify — 1 mês",
      ],
      fivemAction: "vip",
      fivemPayload: { vip: "supreme", days: 30 },
    },
    {
      name: "Pacote 500 Diamantes",
      slug: "diamantes-500",
      category: "diamantes",
      priceCents: 2499,
      image: "/media/diamantes.svg",
      shortDescription: "Moeda premium para trocas e vantagens na cidade.",
      description: "💎 500 diamantes creditados no personagem após a confirmação do pagamento.",
      benefits: ["💎 500 diamantes", "⚡ Entrega automática", "🎮 Uso imediato na cidade"],
      fivemAction: "diamonds",
      fivemPayload: { amount: 500 },
    },
    {
      name: "Pacote 1.500 Diamantes",
      slug: "diamantes-1500",
      category: "diamantes",
      priceCents: 5999,
      promoPriceCents: 4999,
      onSale: true,
      featured: true,
      image: "/media/diamantes.svg",
      shortDescription: "Melhor custo-benefício em diamantes.",
      description: "💎 1.500 diamantes com bônus de recarga para acelerar sua jornada na Garoa.",
      benefits: ["💎 1.500 diamantes", "🎁 Bônus de recarga", "⚡ Entrega automática"],
      fivemAction: "diamonds",
      fivemPayload: { amount: 1500 },
    },
    {
      name: "Sultan RS Garoa",
      slug: "sultan-rs-garoa",
      category: "veiculos",
      priceCents: 18999,
      image: "/media/veiculo.svg",
      shortDescription: "Esportivo exclusivo da cidade, pronto para as avenidas molhadas.",
      description: "🚗 Sultan RS na edição Garoa. Liberado na garagem do personagem após o pagamento.",
      benefits: ["🚗 Veículo permanente", "🎨 Pintura exclusiva Garoa", "📦 Entrega na garagem"],
      fivemAction: "vehicle",
      fivemPayload: { model: "sultanrs", plate: "GAROA" },
    },
    {
      name: "Hakuchou Drag",
      slug: "hakuchou-drag",
      category: "veiculos",
      priceCents: 12999,
      image: "/media/moto.svg",
      shortDescription: "Moto de alta performance para quem corta a garoa em alta.",
      description: "🏍️ Hakuchou Drag liberada no personagem após confirmação do gateway.",
      benefits: ["🏍️ Moto permanente", "⚡ Performance alta", "📦 Entrega na garagem"],
      fivemAction: "vehicle",
      fivemPayload: { model: "hakuchou2" },
    },
    {
      name: "Lanchonete do Centro",
      slug: "lanchonete-centro",
      category: "negocios",
      priceCents: 39900,
      availabilityLabel: "ÚLTIMAS UNIDADES",
      availabilityStatus: "limited",
      unlimited: false,
      stock: 3,
      image: "/media/negocio.svg",
      shortDescription: "Ponto comercial no coração da cidade.",
      description: "🏢 Negócio digital: lanchonete do centro com gestão pelo personagem.",
      benefits: ["🏢 Escritura do negócio", "💵 Renda passiva configurável", "📍 Localização central"],
      fivemAction: "business",
      fivemPayload: { business: "lanchonete_centro" },
    },
    {
      name: "Mochila Tática 80kg",
      slug: "mochila-tatica-80",
      category: "acessorios",
      priceCents: 3999,
      image: "/media/acessorio.svg",
      shortDescription: "Mais espaço para viver o RP sem voltar à base o tempo todo.",
      description: "🎒 Mochila tática com 80kg de capacidade, aplicada no personagem.",
      benefits: ["🎒 +80kg de capacidade", "⚡ Aplicação automática"],
      fivemAction: "item",
      fivemPayload: { item: "backpack_80" },
    },
  ];

  for (const p of products) {
    const { category, image, ...data } = p;
    await prisma.product.upsert({
      where: { slug: data.slug },
      update: {
        ...data,
        categoryId: categoryIds[category],
        images: {
          deleteMany: {},
          create: [{ url: image, alt: data.name, sortOrder: 0 }],
        },
      },
      create: {
        ...data,
        categoryId: categoryIds[category],
        images: { create: [{ url: image, alt: data.name, sortOrder: 0 }] },
      },
    });
  }

  await prisma.banner.deleteMany({ where: { title: { in: ["Viva a experiência", "Planos VIP", "Diamantes da cidade"] } } });
  await prisma.banner.createMany({
    data: [
      {
        title: "Viva a experiência",
        description: "A loja oficial da Garoa RP. VIP, veículos, negócios e diamantes com entrega digital após o pagamento.",
        image: "/media/banner-hero.svg",
        buttonText: "Conheça a cidade",
        buttonUrl: "/catalogo",
        sortOrder: 0,
        active: true,
      },
      {
        title: "Planos VIP",
        description: "Select, Prime, Prestige, Elite, Imperial e Supreme. Escolha o seu ritmo na cidade.",
        image: "/media/banner-vip.svg",
        buttonText: "Ver planos",
        buttonUrl: "/categoria/planos-vip",
        sortOrder: 1,
        active: true,
      },
      {
        title: "Diamantes da cidade",
        description: "Recarregue e acelere sua jornada nas ruas cobertas de garoa.",
        image: "/media/banner-diamantes.svg",
        buttonText: "Comprar diamantes",
        buttonUrl: "/categoria/diamantes",
        sortOrder: 2,
        active: true,
      },
    ],
  });

  await prisma.coupon.upsert({
    where: { code: "GAROA10" },
    update: { type: "percent", value: 10, active: true },
    create: { code: "GAROA10", type: "percent", value: 10, maxUses: 500, active: true },
  });
  await prisma.coupon.upsert({
    where: { code: "VIP20" },
    update: { type: "percent", value: 20, active: true },
    create: { code: "VIP20", type: "percent", value: 20, active: true },
  });

  const settings: Record<string, unknown> = {
    storeName: "Garoa RP",
    storeTagline: "Viva a experiência",
    logo: "/media/logo.svg",
    favicon: "/favicon.svg",
    primaryColor: "#1a8cff",
    neonColor: "#00d4ff",
    currency: "BRL",
    contactEmail: "contato@garoarp.com",
    discord: "https://discord.gg/garoarp",
    footerText: "Garoa RP — a cidade não para. Loja oficial de benefícios digitais.",
    checkoutRequireCpf: true,
    playerIdLabel: "ID do personagem / passaporte",
    seoTitle: "Garoa RP — Loja Oficial",
    seoDescription:
      "Loja oficial da Garoa RP. Compre VIP, diamantes, veículos e negócios com Pix ou cartão.",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: value as object },
      create: { key, value: value as object },
    });
  }

  if ((await prisma.ruleFilter.count()) === 0) {
    await prisma.ruleFilter.createMany({
      data: DEFAULT_RULE_FILTERS.map((f, i) => ({ ...f, sortOrder: i, active: true })),
    });
  }
  if ((await prisma.ruleSection.count()) === 0) {
    for (const [i, section] of DEFAULT_RULE_SECTIONS.entries()) {
      await prisma.ruleSection.create({
        data: {
          slug: section.slug,
          category: section.category,
          number: section.number,
          title: section.title,
          intro: "intro" in section ? section.intro ?? null : null,
          items: section.items,
          spec: "spec" in section && section.spec ? section.spec : undefined,
          sortOrder: i,
          active: true,
        },
      });
    }
  }

  console.log("Seed Garoa RP concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
