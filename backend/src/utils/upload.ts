import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../lib/errors.js";
import { env } from "../env.js";

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
};

export async function saveUpload(
  file: { filename: string; mimetype: string; toBuffer: () => Promise<Buffer> },
  folder: string,
) {
  const extFromMime = ALLOWED[file.mimetype];
  const extFromName = path.extname(file.filename).toLowerCase();
  const allowedExt = Object.values(ALLOWED);

  if (!extFromMime || !allowedExt.includes(extFromName) && !extFromMime) {
    throw new AppError("Tipo de arquivo não permitido.", 400, "INVALID_FILE");
  }

  const ext = extFromMime || extFromName;
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
