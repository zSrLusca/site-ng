import { prisma } from "../lib/prisma.js";
import { DEFAULT_STORE_TERMS } from "../data/default-terms.js";

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  storeName: "Garoa RP",
  storeTagline: "Viva a experiência",
  logo: "",
  favicon: "",
  primaryColor: "#1a8cff",
  neonColor: "#00d4ff",
  currency: "BRL",
  contactEmail: "contato@garoarp.com",
  contactPhone: "",
  discord: "https://discord.gg/garoarp",
  instagram: "",
  youtube: "",
  tiktok: "",
  footerText: "Garoa RP — a cidade não para. Loja oficial de benefícios digitais.",
  checkoutRequireCpf: true,
  checkoutRequirePhone: false,
  playerIdLabel: "ID do personagem / passaporte",
  seoTitle: "Garoa RP — Loja Oficial",
  seoDescription:
    "Loja oficial da Garoa RP. Compre VIP, diamantes, veículos, negócios e acessórios com pagamento via Pix ou cartão.",
  storeTerms: DEFAULT_STORE_TERMS,
  paymentProvider: "mercadopago",
  paymentDevMode: false,
  appUrl: "",
  apiUrl: "",
  allowedOrigins: "",
  fivemApiUrl: "",
  fivemEnabled: false,
  discordRoleSelect: "",
  discordRolePrime: "",
  discordRolePrestige: "",
  discordRoleElite: "",
  discordRoleImperial: "",
  discordRoleSupreme: "",
};

export async function getSettings() {
  const rows = await prisma.setting.findMany();
  const map = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return (row?.value as T) ?? fallback;
}

export async function setSettings(values: Record<string, unknown>) {
  await prisma.$transaction(
    Object.entries(values).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: value as object },
        update: { value: value as object },
      }),
    ),
  );
  return getSettings();
}

export function publicSettings(all: Record<string, unknown>) {
  const {
    storeName,
    storeTagline,
    logo,
    favicon,
    primaryColor,
    neonColor,
    currency,
    contactEmail,
    contactPhone,
    discord,
    instagram,
    youtube,
    tiktok,
    footerText,
    checkoutRequireCpf,
    checkoutRequirePhone,
    playerIdLabel,
    seoTitle,
    seoDescription,
    storeTerms,
  } = all;
  return {
    storeName,
    storeTagline,
    logo,
    favicon,
    primaryColor,
    neonColor,
    currency,
    contactEmail,
    contactPhone,
    discord,
    instagram,
    youtube,
    tiktok,
    footerText,
    checkoutRequireCpf,
    checkoutRequirePhone,
    playerIdLabel,
    seoTitle,
    seoDescription,
    storeTerms: storeTerms || DEFAULT_STORE_TERMS,
  };
}
