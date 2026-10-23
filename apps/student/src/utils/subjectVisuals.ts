/**
 * الهوية البصرية لكل مادة — إيموجي + لون مميّز.
 *
 * لماذا ملف منفصل؟ لأن الشكل الجديد (نظام تطبيق الثانوي) يعتمد على
 * مربعات كبيرة بإيموجي ولون لكل مادة، ولا نريد تكرار الخريطة في كل شاشة.
 * الخريطة تعمل بالمعرّف أولاً ثم بالاسم كاحتياط (لو تغيّر المعرّف).
 */

export interface SubjectVisual {
  /** الإيموجي الكبير الذي يظهر داخل المربع */
  emoji: string;
  /** اللون الأساسي (hex) — للحدود والخلفية والتبويب النشط */
  accent: string;
  /** نسخة شفافة من اللون نفسه — لتعبئة الخلفيات */
  accentSoft: string;
}

const BY_ID: Record<string, SubjectVisual> = {
  arabic: { emoji: '📖', accent: '#f59e0b', accentSoft: 'rgba(245,158,11,0.16)' },
  islamic: { emoji: '🕌', accent: '#14b8a6', accentSoft: 'rgba(20,184,166,0.16)' },
  math: { emoji: '➗', accent: '#3b82f6', accentSoft: 'rgba(59,130,246,0.16)' },
  science: { emoji: '🧪', accent: '#22c55e', accentSoft: 'rgba(34,197,94,0.16)' },
  english: { emoji: '🇬🇧', accent: '#6366f1', accentSoft: 'rgba(99,102,241,0.16)' },
  social: { emoji: '🌍', accent: '#f97316', accentSoft: 'rgba(249,115,22,0.16)' },
  ict: { emoji: '💻', accent: '#06b6d4', accentSoft: 'rgba(6,182,212,0.16)' },
  technical: { emoji: '🛠️', accent: '#eab308', accentSoft: 'rgba(234,179,8,0.16)' },
  civics: { emoji: '🏛️', accent: '#f43f5e', accentSoft: 'rgba(244,63,94,0.16)' },
};

/** احتياط بالاسم — لو جاءت مادة بمعرّف غير معروف */
const BY_NAME: Array<[string, SubjectVisual]> = [
  ['عربية', BY_ID.arabic],
  ['إسلامية', BY_ID.islamic],
  ['رياضيات', BY_ID.math],
  ['علوم', BY_ID.science],
  ['إنجليزية', BY_ID.english],
  ['اجتماع', BY_ID.social],
  ['تقنية', BY_ID.technical],
  ['تكنولوجيا', BY_ID.ict],
  ['حاسوب', BY_ID.ict],
  ['وطنية', BY_ID.civics],
];

const FALLBACK: SubjectVisual = { emoji: '📚', accent: '#f59e0b', accentSoft: 'rgba(245,158,11,0.16)' };

export function subjectVisual(id?: string | null, name?: string | null): SubjectVisual {
  if (id && BY_ID[id]) return BY_ID[id];
  const n = (name || '').trim();
  for (const [key, visual] of BY_NAME) if (n.includes(key)) return visual;
  return FALLBACK;
}
