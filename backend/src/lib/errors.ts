export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "APP_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
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
