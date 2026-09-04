import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, assetUrl } from "../../api";
import { AdminError } from "../../components/admin/AdminError";
import { useAuth } from "../../store/auth";
import { reaisToCents } from "../../lib/money";

const VIP_LEVELS = [
  { id: "select", label: "Select" },
  { id: "prime", label: "Prime" },
  { id: "prestige", label: "Prestige" },
  { id: "elite", label: "Elite" },
  { id: "imperial", label: "Imperial" },
  { id: "supreme", label: "Supreme" },
] as const;

const ACTIONS = [
  { id: "vip", label: "VIP (ng-vip)" },
  { id: "diamonds", label: "Diamantes" },
  { id: "vehicle", label: "Veículo" },
  { id: "item", label: "Item no inventário" },
  { id: "business", label: "Negócio" },
  { id: "none", label: "Sem entrega no servidor" },
] as const;

type Payload = Record<string, unknown>;

function asPayload(value: unknown): Payload {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Payload;
  return {};
}

const empty = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  benefitsText: "",
  extraInfo: "",
  price: "",
  promoPrice: "",
  categoryId: "",
  stock: 0,
  unlimited: true,
  digital: true,
  active: true,
  featured: false,
  onSale: false,
  sortOrder: 0,
  availabilityLabel: "ILIMITADO",
  availabilityStatus: "available",
  buttonText: "COMPRAR AGORA",
  fivemAction: "vip",
  grantDiscord: true,
  vip: "select",
  days: "30",
  amount: "",
  model: "",
  plate: "",
  garage: "centro",
  item: "",
  itemQty: "1",
  business: "",
  discordRoleId: "",
  images: [] as { url: string }[],
};

function fromProduct(p: {
  name: string;
  slug: string;
  shortDescription?: string | null;
  description: string;
  benefits?: string[];
  extraInfo?: string | null;
  priceCents: number;
  promoPriceCents?: number | null;
  categoryId: string;
  stock: number;
  unlimited: boolean;
  digital: boolean;
  active: boolean;
  featured: boolean;
  onSale: boolean;
  sortOrder: number;
  availabilityLabel: string;
  availabilityStatus: string;
  buttonText: string;
  fivemAction?: string | null;
  fivemPayload?: unknown;
  images?: { url: string }[];
}) {
  const payload = asPayload(p.fivemPayload);
  const action = p.fivemAction || (payload.vip ? "vip" : "none");
  return {
    ...empty,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription || "",
    description: p.description,
    benefitsText: (p.benefits || []).join("\n"),
    extraInfo: p.extraInfo || "",
    price: (p.priceCents / 100).toFixed(2),
    promoPrice: p.promoPriceCents != null ? (p.promoPriceCents / 100).toFixed(2) : "",
    categoryId: p.categoryId,
    stock: p.stock,
    unlimited: p.unlimited,
    digital: p.digital,
    active: p.active,
    featured: p.featured,
    onSale: p.onSale,
    sortOrder: p.sortOrder,
    availabilityLabel: p.availabilityLabel,
    availabilityStatus: p.availabilityStatus,
    buttonText: p.buttonText,
    fivemAction: action,
    grantDiscord: payload.skipDiscord !== true,
    vip: String(payload.vip || "select"),
    days: String(payload.days ?? 30),
    amount: payload.amount != null ? String(payload.amount) : "",
    model: String(payload.model || ""),
    plate: String(payload.plate || ""),
    garage: String(payload.garage || "centro"),
    item: String(payload.item || ""),
    itemQty: String(payload.quantity || 1),
    business: String(payload.business || ""),
    discordRoleId: String(payload.discordRoleId || ""),
    images: p.images || [],
  };
}

function buildPayload(form: typeof empty): Payload {
  const payload: Payload = {};
  if (!form.grantDiscord) payload.skipDiscord = true;
  if (form.discordRoleId.trim()) payload.discordRoleId = form.discordRoleId.trim();

  if (form.fivemAction === "vip") {
    payload.vip = form.vip;
    payload.days = Number(form.days) || 30;
  } else if (form.fivemAction === "diamonds") {
    payload.amount = Number(form.amount) || 0;
  } else if (form.fivemAction === "vehicle") {
    payload.model = form.model.trim();
    if (form.plate.trim()) payload.plate = form.plate.trim();
    if (form.garage.trim()) payload.garage = form.garage.trim();
    if (form.days) payload.days = Number(form.days) || undefined;
  } else if (form.fivemAction === "item") {
    payload.item = form.item.trim();
    payload.quantity = Number(form.itemQty) || 1;
  } else if (form.fivemAction === "business") {
    payload.business = form.business.trim();
  }
  return payload;
}

export function AdminProductForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const token = useAuth((s) => s.token)!;
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<unknown>(null);
  const cats = useQuery({ queryKey: ["admin-cats"], queryFn: () => api.authGet("/admin/categories", token) });
  const settings = useQuery({ queryKey: ["admin-settings"], queryFn: () => api.authGet("/admin/settings", token) });
  const product = useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => api.authGet(`/admin/products/${id}`, token),
    enabled: !!id && id !== "new",
  });

  useEffect(() => {
    if (product.data) setForm(fromProduct(product.data));
  }, [product.data]);

  const roles = (settings.data?.discordRoles || {}) as Record<string, string>;
  const mappedRole = useMemo(() => {
    if (form.discordRoleId.trim()) return form.discordRoleId.trim();
    if (form.fivemAction === "vip") return roles[form.vip] || "";
    return "";
  }, [form.discordRoleId, form.fivemAction, form.vip, roles]);

  function set<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function upload(file: File) {
    setError(null);
    try {
      const res = await api.upload(file, "products", token);
      setForm((f) => ({ ...f, images: [...f.images, { url: res.url }] }));
    } catch (err) {
      setError(err);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.grantDiscord && !mappedRole) {
      setError("Informe o ID do cargo Discord ou escolha um VIP com cargo mapeado em Configurações.");
      return;
    }
    if (form.fivemAction === "vip" && !form.vip) {
      setError("Selecione o nível VIP.");
      return;
    }
    if (form.fivemAction === "diamonds" && Number(form.amount) <= 0) {
      setError("Informe a quantidade de diamantes.");
      return;
    }
    if (form.fivemAction === "vehicle" && !form.model.trim()) {
      setError("Informe o model do veículo (spawn name).");
      return;
    }
    if (form.fivemAction === "item" && !form.item.trim()) {
      setError("Informe o nome do item no inventário.");
      return;
    }
    if (form.fivemAction === "business" && !form.business.trim()) {
      setError("Informe o identificador do negócio.");
      return;
    }

    const body = {
      name: form.name,
      slug: form.slug || undefined,
      shortDescription: form.shortDescription,
      description: form.description,
      benefits: form.benefitsText.split("\n").map((s) => s.trim()).filter(Boolean),
      extraInfo: form.extraInfo,
      priceCents: reaisToCents(form.price),
      promoPriceCents: form.promoPrice ? reaisToCents(form.promoPrice) : null,
      categoryId: form.categoryId,
      stock: Number(form.stock),
      unlimited: form.unlimited,
      digital: form.digital,
      active: form.active,
      featured: form.featured,
      onSale: form.onSale,
      sortOrder: Number(form.sortOrder),
      availabilityLabel: form.availabilityLabel,
      availabilityStatus: form.availabilityStatus,
      buttonText: form.buttonText,
      fivemAction: form.fivemAction === "none" ? "" : form.fivemAction,
      fivemPayload: buildPayload(form),
      images: form.images,
    };
    try {
      if (id && id !== "new") await api.put(`/admin/products/${id}`, body, token);
      else await api.post("/admin/products", body, token);
      nav("/admin/products");
    } catch (err) {
      setError(err);
    }
  }

  return (
    <form className="admin-page" onSubmit={onSubmit}>
      <div className="page-toolbar">
        <h1>{id === "new" || !id ? "Novo produto" : "Editar produto"}</h1>
        <button className="btn btn-primary" type="submit">Salvar produto</button>
      </div>
      <AdminError error={error} />

      <section className="form-section">
        <h2>Loja</h2>
        <p className="hint">Nome, preço e como o item aparece no catálogo.</p>
        <div className="form-grid">
          <div className="field"><label>Nome</label><input required value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="field"><label>Slug (opcional)</label><input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="gerado automaticamente" /></div>
          <div className="field">
            <label>Categoria</label>
            <select required value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">Selecione</option>
              {(cats.data ?? []).map((c: { id: string; name: string }) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field"><label>Texto do botão</label><input value={form.buttonText} onChange={(e) => set("buttonText", e.target.value)} /></div>
          <div className="field"><label>Preço (R$)</label><input required inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} /></div>
          <div className="field"><label>Preço promocional (R$)</label><input inputMode="decimal" value={form.promoPrice} onChange={(e) => set("promoPrice", e.target.value)} /></div>
          <div className="field"><label>Selo de disponibilidade</label><input value={form.availabilityLabel} onChange={(e) => set("availabilityLabel", e.target.value)} /></div>
          <div className="field">
            <label>Status de estoque</label>
            <select value={form.availabilityStatus} onChange={(e) => set("availabilityStatus", e.target.value)}>
              <option value="available">Disponível</option>
              <option value="limited">Limitado</option>
              <option value="sold_out">Esgotado</option>
            </select>
          </div>
          <div className="field"><label>Ordem no catálogo</label><input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} /></div>
          {!form.unlimited && (
            <div className="field"><label>Estoque</label><input type="number" value={form.stock} onChange={(e) => set("stock", Number(e.target.value))} /></div>
          )}
          <div className="field span-2"><label>Descrição curta</label><textarea value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} /></div>
          <div className="field span-2"><label>Descrição completa</label><textarea rows={6} required value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="field span-2"><label>Benefícios (um por linha)</label><textarea rows={5} value={form.benefitsText} onChange={(e) => set("benefitsText", e.target.value)} /></div>
          <div className="field span-2"><label>Informações extras</label><textarea value={form.extraInfo} onChange={(e) => set("extraInfo", e.target.value)} /></div>
        </div>
        <div className="check-row">
          <label className="check"><input type="checkbox" checked={form.unlimited} onChange={(e) => set("unlimited", e.target.checked)} /> Produto ilimitado</label>
          <label className="check"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Ativo na loja</label>
          <label className="check"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> Destaque</label>
          <label className="check"><input type="checkbox" checked={form.onSale} onChange={(e) => set("onSale", e.target.checked)} /> Promoção</label>
        </div>
        <div className="field">
          <label>Imagens</label>
          <label className="file-btn">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(file);
              }}
            />
            Enviar imagem
          </label>
          <div className="thumb-row">
            {form.images.map((img, i) => (
              <div className="thumb" key={`${img.url}-${i}`}>
                <img src={assetUrl(img.url)} alt="" />
                <button type="button" onClick={() => setForm({ ...form, images: form.images.filter((_, x) => x !== i) })}>×</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="form-section">
        <h2>Entrega no servidor (FiveM)</h2>
        <p className="hint">O que o personagem recebe na cidade depois do pagamento aprovado.</p>
        <div className="form-grid">
          <div className="field">
            <label>Tipo de entrega</label>
            <select value={form.fivemAction} onChange={(e) => set("fivemAction", e.target.value)}>
              {ACTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          {form.fivemAction === "vip" && (
            <>
              <div className="field">
                <label>Nível VIP</label>
                <select value={form.vip} onChange={(e) => set("vip", e.target.value)}>
                  {VIP_LEVELS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Duração (dias)</label>
                <input type="number" min={1} value={form.days} onChange={(e) => set("days", e.target.value)} />
              </div>
            </>
          )}
          {form.fivemAction === "diamonds" && (
            <div className="field">
              <label>Quantidade de diamantes</label>
              <input type="number" min={1} value={form.amount} onChange={(e) => set("amount", e.target.value)} />
            </div>
          )}
          {form.fivemAction === "vehicle" && (
            <>
              <div className="field">
                <label>Model (spawn name)</label>
                <input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="sultanrs" />
              </div>
              <div className="field">
                <label>Placa (opcional)</label>
                <input value={form.plate} onChange={(e) => set("plate", e.target.value)} placeholder="gerada se vazio" />
              </div>
              <div className="field">
                <label>Garagem</label>
                <input value={form.garage} onChange={(e) => set("garage", e.target.value)} />
              </div>
              <div className="field">
                <label>Expira em (dias, 0 = permanente)</label>
                <input type="number" min={0} value={form.days} onChange={(e) => set("days", e.target.value)} />
              </div>
            </>
          )}
          {form.fivemAction === "item" && (
            <>
              <div className="field">
                <label>Nome do item (qb-inventory)</label>
                <input value={form.item} onChange={(e) => set("item", e.target.value)} placeholder="backpack_80" />
              </div>
              <div className="field">
                <label>Quantidade</label>
                <input type="number" min={1} value={form.itemQty} onChange={(e) => set("itemQty", e.target.value)} />
              </div>
            </>
          )}
          {form.fivemAction === "business" && (
            <div className="field">
              <label>Identificador do negócio</label>
              <input value={form.business} onChange={(e) => set("business", e.target.value)} placeholder="lanchonete_centro" />
            </div>
          )}
        </div>
      </section>

      <section className="form-section">
        <h2>Cargo no Discord</h2>
        <p className="hint">
          Cole o ID do cargo (Modo desenvolvedor → cargo → Copiar ID) ou use o mapeamento VIP das Configurações.
        </p>
        <label className="check" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={form.grantDiscord} onChange={(e) => set("grantDiscord", e.target.checked)} />
          Aplicar cargo no Discord após o pagamento
        </label>
        {form.grantDiscord && (
          <div className="form-grid">
            <div className="field">
              <label>ID do cargo Discord</label>
              <input
                inputMode="numeric"
                value={form.discordRoleId}
                onChange={(e) => set("discordRoleId", e.target.value.replace(/\D/g, ""))}
                placeholder={form.fivemAction === "vip" && roles[form.vip] ? roles[form.vip] : "1544..."}
              />
              <small>
                {form.discordRoleId
                  ? "Este ID será usado neste produto."
                  : form.fivemAction === "vip" && roles[form.vip]
                    ? `Usará o cargo mapeado do VIP ${form.vip}: ${roles[form.vip]}`
                    : "Obrigatório se o VIP não tiver cargo mapeado em Configurações."}
              </small>
            </div>
          </div>
        )}
      </section>

      <AdminError error={error} />
      <button className="btn btn-primary" type="submit">Salvar produto</button>
    </form>
  );
}
