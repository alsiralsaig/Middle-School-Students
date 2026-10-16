import React from 'react';
import { ShieldCheck, AlertTriangle, ExternalLink, BookMarked } from 'lucide-react';
import { Badge, Card } from './ui';
import type { Subject } from '@shared/curriculumTypes';

/**
 * بطاقة «الهيكل الرسمي» في لوحة الإدارة.
 *
 * لماذا موجودة: كانت اللوحة تعرض `s.units.length` وعدد دروسها، وهو **ما
 * ألّفناه نحن** (مثلاً العلوم: وحدتان)، في حين أن المقرَّر الفعلي في الكتاب
 * الرسمي ٧ وحدات و٥٥ محوراً. عرض الرقمين دون تمييز يجعل الإدارة تظن أن
 * المنهج ناقص أو أن العرض خاطئ. هنا يُعرض الرقمان جنباً إلى جنب وبوضوح.
 */
export const OfficialStructureCard: React.FC<{ subject: Subject }> = ({ subject }) => {
  const o = subject.official;
  const syllabus = subject.syllabus ?? [];
  const authoredLessons = subject.units.reduce((a, u) => a + (u.lessons?.length ?? 0), 0);
  const officialLessons = subject.lessonsCount ?? 0;

  if (!o && !syllabus.length) return null;

  const tone =
    o?.confidence === 'high' ? 'green' : o?.confidence === 'partial' ? 'amber' : 'slate';

  return (
    <Card
      title="الهيكل الرسمي من الكتاب المدرسي"
      subtitle="ما يقرّره الكتاب — لا علاقة له بما ألّفناه نحن في التطبيق"
      action={
        o?.confidence ? (
          <Badge tone={tone}>
            <ShieldCheck className="w-3 h-3" />
            {o.confidence === 'high'
              ? 'موثّق'
              : o.confidence === 'partial'
                ? 'موثّق جزئياً'
                : 'غير موثّق'}
          </Badge>
        ) : null
      }
    >
      <div className="p-4 space-y-4 text-right" dir="rtl">
        {subject.gradeWarning && (
          <div className="flex gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 leading-relaxed">{subject.gradeWarning}</p>
          </div>
        )}

        {o?.book && (
          <div className="space-y-1">
            <p className="text-sm font-bold text-navy-800">{o.book}</p>
            {o.publisher && <p className="text-[11px] text-slate-500">{o.publisher}</p>}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {o.pages ? <Badge tone="slate">{o.pages} صفحة</Badge> : null}
              {o.edition ? <Badge tone="slate">{o.edition}</Badge> : null}
              {o.verifiedAt ? <Badge tone="slate">استُخرج {o.verifiedAt}</Badge> : null}
              {o.url && (
                <a
                  href={o.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-navy-800 hover:text-gold-600"
                >
                  <ExternalLink className="w-3 h-3" />
                  الكتاب الرسمي
                </a>
              )}
            </div>
          </div>
        )}

        {/* الرقمان جنباً إلى جنب: المقرَّر مقابل المؤلَّف */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <p className="text-[10px] text-emerald-700 font-bold">المقرَّر في الكتاب</p>
            <p className="text-xl font-black text-emerald-800 nums mt-1">
              {subject.unitsCount} وحدة
            </p>
            <p className="text-xs text-emerald-700 nums">
              {officialLessons} {syllabus.some((u) => u.numbering === 'themes') ? 'محوراً' : 'درساً'}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <p className="text-[10px] text-amber-700 font-bold">ما ألّفناه نحن</p>
            <p className="text-xl font-black text-amber-800 nums mt-1">
              {subject.units.length} وحدة
            </p>
            <p className="text-xs text-amber-700 nums">{authoredLessons} درساً</p>
          </div>
        </div>

        {officialLessons > 0 && authoredLessons < officialLessons && (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            التغطية الحالية لشروحنا:{' '}
            <strong className="text-navy-800 nums">
              {Math.round((authoredLessons / officialLessons) * 100)}%
            </strong>{' '}
            من المقرَّر — أي {officialLessons - authoredLessons} درساً ومحوراً بلا شرح بعد.
          </p>
        )}

        {subject.lessonsCountNote && (
          <p className="text-[11px] text-slate-500 leading-relaxed">{subject.lessonsCountNote}</p>
        )}

        {o?.correction && (
          <p className="text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded-xl p-3 leading-relaxed">
            {o.correction}
          </p>
        )}

        {syllabus.length > 0 && (
          <details className="rounded-xl border border-slate-200 bg-slate-50/60" open>
            <summary className="cursor-pointer px-3 py-2.5 text-xs font-bold text-navy-800 flex items-center gap-2">
              <BookMarked className="w-3.5 h-3.5" />
              الوحدات كما وردت في الكتاب ({syllabus.length})
            </summary>
            <ul className="px-3 pb-3 space-y-2">
              {syllabus.map((u, i) => (
                <li key={i} className="text-[11px] text-slate-600">
                  <span className="font-bold text-navy-800">
                    {u.title ?? `الوحدة ${u.unitNumber}`}
                  </span>
                  {u.startPage ? (
                    <span className="nums text-slate-400">
                      {' '}
                      · ص {u.startPage}–{u.endPage ?? u.startPage}
                    </span>
                  ) : u.sourcePage ? (
                    <span className="nums text-slate-400"> · ص {u.sourcePage}</span>
                  ) : null}
                  <span className="nums text-slate-500"> · {u.lessons?.length ?? 0} عنصراً</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Card>
  );
};

export default OfficialStructureCard;
