import { put } from '@vercel/blob/client';
import { getApiBase } from './serverUrl';

const MAX_SIZE = 20 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', csv: 'text/csv', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp',
};

/** Sends a lesson attachment directly from the browser to Blob using a server-issued token. */
export async function uploadLessonAttachmentBlob(
  lessonId: string,
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<{ url: string; pathname: string }> {
  if (file.size < 1 || file.size > MAX_SIZE) throw new Error('حجم الملف يجب ألا يتجاوز ٢٠ ميغابايت');
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const contentType = MIME_BY_EXTENSION[extension];
  if (!contentType) throw new Error('نوع الملف غير مدعوم');
  const safeName = file.name.normalize('NFKD').replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(-120) || `attachment.${extension}`;
  const pathname = `lesson-attachments/${lessonId}/${safeName}`;
  const tokenResponse = await fetch(`${getApiBase()}/api/admin/lessons/${encodeURIComponent(lessonId)}/attachments/client`, {
    method: 'POST', credentials: 'include',
    headers: { 'X-App': 'admin', 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      type: 'blob.generate-client-token',
      payload: {
        pathname,
        clientPayload: JSON.stringify({ fileName: file.name, sizeBytes: file.size }),
        multipart: false,
      },
    }),
  });
  const tokenData = await tokenResponse.json().catch(() => null) as { clientToken?: string; error?: string } | null;
  if (!tokenResponse.ok || !tokenData?.clientToken) throw new Error(tokenData?.error || 'تعذّر إصدار إذن رفع الملف');

  const blob = await put(pathname, file, {
    access: 'public', token: tokenData.clientToken, contentType,
    onUploadProgress: ({ percentage }) => onProgress?.(percentage),
  });
  return { url: blob.url, pathname: blob.pathname };
}
