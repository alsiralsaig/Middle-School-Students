import React from 'react';

/**
 * عرض نص السؤال بشكل مقروء.
 *
 * بعض الأسئلة في بنك الامتحانات تجمع أربعة أسئلة فرعية في سطر واحد:
 *   «اختر: (١) عاصمة ولاية سنار: (أ) سنجة (ب) سنار … (٢) من أهم أشجار …»
 * فيظهر النص كتلة واحدة متلاصقة يصعب قراءتها على الجوال (شكوى المستخدم).
 * هنا نفصل الأسئلة الفرعية والخيارات على أسطر مستقلة بمسافات مريحة،
 * ونحفظ النص كما هو دون أي تغيير في المعنى.
 */

/** يفصل عند (١) (٢) (٣)… أو (1) (2) (3)… */
const SUB_SPLIT = /(?=\(\s*[١٢٣٤٥٦٧٨٩٠\d]+\s*\))/;
/** الخيارات (أ) (ب) (ج) (د) أو (a) (b) */
const OPT_SPLIT = /(?=\(\s*[أبجدABCD]\s*\))/;

export const QuestionText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const raw = (text || '').replace(/\r/g, '').trim();
  if (!raw) return null;

  // لو النص فيه أسطر جديدة أصلية نحترمها ونكتفي بها
  const lines = raw.split('\n').flatMap((line) => line.split(SUB_SPLIT)).map((s) => s.trim()).filter(Boolean);

  return (
    <div dir="rtl" className={className}>
      {lines.map((line, i) => {
        const parts = line.split(OPT_SPLIT).map((p) => p.trim()).filter(Boolean);
        const head = parts[0] || '';
        const opts = parts.slice(1);
        return (
          <div key={i} className={i === 0 ? '' : 'mt-2'}>
            <p className="text-[13.5px] font-bold leading-8 text-slate-900 dark:text-white">{head}</p>
            {opts.length > 0 && (
              <ul className="mt-1.5 space-y-1 pr-1">
                {opts.map((o, j) => (
                  <li
                    key={j}
                    className="rounded-lg bg-slate-50 px-2.5 py-1 text-[12.5px] leading-7 text-slate-700 dark:bg-[#122844] dark:text-slate-200"
                  >
                    {o}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default QuestionText;
