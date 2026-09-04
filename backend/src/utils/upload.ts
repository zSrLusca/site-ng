import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../lib/errors.js";
import { env } from "../env.js";

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/pjpeg": ".jpg",
  "image/png": ".png",
  "image/x-png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/svg": ".svg",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
  "image/ico": ".ico",
  "image/icon": ".ico",
};

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".ico"]);

export async function saveUpload(
  file: { filename: string; mimetype: string; toBuffer: () => Promise<Buffer> },
  folder: string,
) {
  const mime = String(file.mimetype || "").toLowerCase();
  const extFromName = path.extname(file.filename || "").toLowerCase();
  const extFromMime = ALLOWED_MIME[mime];
  const ext = extFromMime || (ALLOWED_EXT.has(extFromName) ? (extFromName === ".jpeg" ? ".jpg" : extFromName) : "");

  if (!ext) {
    throw new AppError("Tipo de arquivo não permitido. Use JPG, PNG, WebP, SVG ou ICO.", 400, "INVALID_FILE");
  }
  const buffer = await file.toBuffer();
  const max = env.UPLOAD_MAX_MB * 1024 * 1024;
  if (buffer.length > max) {
    throw new AppError(`Arquivo maior que ${env.UPLOAD_MAX_MB}MB.`, 400, "FILE_TOO_LARGE");
  }

  const dir = path.resolve(env.UPLOAD_DIR, folder);
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}${ext}`;
  const full = path.join(dir, name);
  await writeFile(full, buffer);
  return `/uploads/${folder}/${name}`;
}
