/**
 * هل نفتح هذا الرابط داخل التطبيق أم في المتصفح؟
 *
 * المشكلة التي حلّها هذا الملف: أي رابط يبدأ بـ https كان يُصنَّف «رابط خارجي»،
 * فكتاب PDF مرفوع على التخزين (Vercel Blob) كان يظهر بزر «فتح الرابط» ويخرج
 * الطالب إلى المتصفح بدل قراءته داخل التطبيق — رغم أنه ملف PDF حقيقي.
 * الآن الحكم على امتداد الملف لا على البروتوكول:
 *   • ينتهي بـ .pdf (أو نوعه PDF)  ⟹ يُقرأ داخل التطبيق بعارض PDF.
 *   • صفحة معاينة درايف /preview   ⟹ رابط خارجي (صفحة HTML لا ملف).
 *   • أي شيء آخر (اختبار تفاعلي، مجلد درايف، فيديو) ⟹ رابط خارجي.
 */
export function isInAppPdf(url?: string | null, fileType?: string | null): boolean {
  const u = String(url || '').trim();
  if (!u) return false;
  const path = u.split('#')[0].split('?')[0].toLowerCase();
  if (path.endsWith('.pdf')) return true;
  const t = String(fileType || '').toUpperCase();
  if (t === 'PDF' && !/\/preview$/i.test(path) && !/drive\.google\.com/i.test(path)) return true;
  return false;
}

/** النوع المناسب لعارض الملفات داخل التطبيق */
export function viewerKindFor(url?: string | null, fileType?: string | null): 'document' | 'link' {
  return isInAppPdf(url, fileType) ? 'document' : 'link';
}

/** نوع MIME المناسب */
export function viewerMimeFor(url?: string | null, fileType?: string | null): string | null {
  return isInAppPdf(url, fileType) ? 'application/pdf' : null;
}
