import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** مجلد الملفات المرفوعة — في جذر المستودع: /uploads */
export const UPLOAD_DIR = path.resolve(__dirname, '../../../../uploads');

export function ensureUploadDir(): string {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}
