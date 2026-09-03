export type Settings = {
  storeName: string;
  storeTagline: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  neonColor: string;
  currency: string;
  contactEmail: string;
  contactPhone: string;
  discord: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  footerText: string;
  checkoutRequireCpf: boolean;
  checkoutRequirePhone: boolean;
  playerIdLabel: string;
  seoTitle: string;
  seoDescription: string;
  storeTerms?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  featured?: boolean;
  showInMenu?: boolean;
  active?: boolean;
  sortOrder?: number;
};

export type ProductImage = { url: string; alt?: string | null; sortOrder?: number };

export type Product = {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description: string;
  benefits: string[];
  extraInfo?: string | null;
  priceCents: number;
  promoPriceCents?: number | null;
  stock: number;
  unlimited: boolean;
  featured?: boolean;
  onSale?: boolean;
  availabilityLabel: string;
  availabilityStatus: string;
  buttonText: string;
  soldOut?: boolean;
  availableStock?: number | null;
  images: ProductImage[];
  category: { id: string; name: string; slug: string; icon?: string | null };
};

export type Banner = {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
};

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  image?: string;
  priceCents: number;
  promoPriceCents?: number | null;
  quantity: number;
  unlimited: boolean;
  stock: number;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pages: number;
  total: number;
};
