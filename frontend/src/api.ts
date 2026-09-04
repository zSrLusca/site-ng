const BASE = import.meta.env.VITE_API_URL || "";

function url(path: string) {
  if (BASE) return `${BASE.replace(/\/$/, "")}${path}`;
  return `/api${path}`;
}

export class ApiError extends Error {
  status: number;
  details: string[];
  constructor(message: string, status: number, details: string[] = []) {
    const extra = details.filter(Boolean);
    super(extra.length ? [message, ...extra].join("\n") : message);
    this.status = status;
    this.details = extra;
  }
}

function asDetails(data: Record<string, unknown>): string[] {
  const raw = data.details;
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "message" in item) return String((item as { message: string }).message);
      return JSON.stringify(item);
    }).filter(Boolean);
  }
  return [];
}

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.message || "Erro na requisição", res.status, asDetails(data));
  }
  return data;
}

export function formatApiError(err: unknown) {
  if (err instanceof ApiError) return { message: err.message.split("\n")[0] || err.message, details: err.details };
  if (err instanceof Error) return { message: err.message, details: [] as string[] };
  return { message: "Erro inesperado.", details: [] as string[] };
}

export function assetUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  if (path.startsWith("/uploads") && BASE) return `${BASE.replace(/\/$/, "")}${path}`;
  return path;
}

export const api = {
  get: (path: string) => fetch(url(path)).then(parse),
  post: (path: string, body?: unknown, token?: string) =>
    fetch(url(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then(parse),
  put: (path: string, body: unknown, token: string) =>
    fetch(url(path), {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).then(parse),
  patch: (path: string, body: unknown, token: string) =>
    fetch(url(path), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).then(parse),
  del: (path: string, token: string) =>
    fetch(url(path), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).then(parse),
  authGet: (path: string, token: string) =>
    fetch(url(path), { headers: { Authorization: `Bearer ${token}` } }).then(parse),
  upload: async (file: File, folder: string, token: string) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(url(`/admin/uploads?folder=${folder}`), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    return parse(res) as Promise<{ url: string }>;
  },
};
