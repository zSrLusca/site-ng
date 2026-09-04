import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class AppError extends Error {
  statusCode: number;
  code: string;
  details: string[];

  constructor(message: string, statusCode = 400, code = "APP_ERROR", details: string[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  slug: "Slug",
  description: "Descrição",
  shortDescription: "Descrição curta",
  priceCents: "Preço",
  promoPriceCents: "Preço promocional",
  categoryId: "Categoria",
  stock: "Estoque",
  buttonText: "Texto do botão",
  images: "Imagens",
  "images.url": "URL da imagem",
  title: "Título",
  image: "Imagem",
  email: "E-mail",
  label: "Nome",
  number: "Número",
  items: "Itens",
};

function fieldLabel(path: (string | number)[]) {
  const key = path.filter((p) => typeof p === "string").join(".");
  return FIELD_LABELS[key] || FIELD_LABELS[String(path[0])] || path.join(".") || "Campo";
}

export function zodDetails(error: ZodError) {
  return error.issues.map((issue) => {
    const field = fieldLabel(issue.path);
    if (issue.code === "too_small") return `${field}: valor obrigatório ou curto demais.`;
    if (issue.code === "invalid_type") return `${field}: tipo inválido.`;
    return `${field}: ${issue.message}`;
  });
}

export function prismaToAppError(error: unknown): AppError | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (error.code === "P2002") {
    const fields = (error.meta?.target as string[] | undefined)?.join(", ") || "valor único";
    return new AppError(`Já existe outro registro com este ${fields}.`, 409, "CONFLICT");
  }
  if (error.code === "P2003") {
    return new AppError("Referência inválida (categoria ou registro ligado).", 400, "FK");
  }
  if (error.code === "P2025") {
    return new AppError("Registro não encontrado.", 404, "NOT_FOUND");
  }
  return new AppError(error.message || "Erro no banco de dados.", 400, error.code);
}

export function notFound(entity = "Recurso") {
  return new AppError(`${entity} não encontrado.`, 404, "NOT_FOUND");
}

export function unauthorized(message = "Não autorizado.") {
  return new AppError(message, 401, "UNAUTHORIZED");
}

export function forbidden(message = "Acesso negado.") {
  return new AppError(message, 403, "FORBIDDEN");
}
