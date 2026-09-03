const BASE = import.meta.env.VITE_API_URL || "";

function url(path: string) {
  if (BASE) return `${BASE.replace(/\/$/, "")}${path}`;
  return `/api${path}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.message || "Erro na requisição", res.status);
  }
  return data;
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
