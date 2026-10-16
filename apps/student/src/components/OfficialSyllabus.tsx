import React, { useState } from 'react';
import {
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  Target,
  Lightbulb,
  Tags,
  BookOpen,
  ListOrdered,
  FileWarning,
} from 'lucide-react';
import { Subject, SyllabusEntry } from '../types';

interface OfficialSyllabusProps {
  subject: Subject;
}

const CONFIDENCE_LABEL: Record<string, { text: string; cls: string }> = {
  high: { text: 'موثّق من الكتاب الرسمي', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  partial: { text: 'موثّق جزئياً', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  none: { text: 'غير موثّق', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

/** يعرض الهيكل الرسمي المستخرج من الكتاب المدرسي — لا يخلطه بالمحتوى المؤلَّف */
export const OfficialSyllabus: React.FC<OfficialSyllabusProps> = ({ subject }) => {
  const syllabus = subject.syllabus;
  const official = subject.official;

  const [open, setOpen] = useState(true);
  const [openUnits, setOpenUnits] = useState<Record<number, boolean>>({ 1: true });

  if (!syllabus || syllabus.length === 0) return null;

  const conf = CONFIDENCE_LABEL[official?.confidence ?? 'none'] ?? CONFIDENCE_LABEL.none;
  const total = syllabus.reduce((n, u) => n + (u.lessons?.length ?? 0), 0);
  const isThemes = syllabus.some((u) => u.numbering === 'themes');

  const toggleUnit = (n: number) =>
    setOpenUnits((prev) => ({ ...prev, [n]: !prev[n] }));

  return (
    <section
      dir="rtl"
      className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] shadow-sm overflow-hidden"
    >
      {/* الترويسة: المصدر الرسمي */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-5 sm:p-7 text-right flex items-start justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-[#122844] transition-colors cursor-pointer"
      >
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#142D4F] border border-[#234676] text-amber-300 text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              الهيكل الرسمي من الكتاب
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${conf.cls}`}
            >
              {conf.text}
            </span>
          </div>

          <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            ما يقرّره الكتاب المدرسي في «{subject.name}»
          </h2>

          {official?.book && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {official.book}
              {official.pages ? ` · ${official.pages} صفحة` : ''}
              {official.edition ? ` · ${official.edition}` : ''}
            </p>
          )}
          {official?.publisher && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {official.publisher}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold">
            <span className="bg-slate-100 dark:bg-[#142A46] text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-lg">
              {syllabus.length} وحدات
            </span>
            <span className="bg-slate-100 dark:bg-[#142A46] text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-lg">
              {total} {isThemes ? 'محوراً' : 'درساً'}
            </span>
            {official?.verifiedAt && (
              <span className="text-slate-400 dark:text-slate-500">
                استُخرج في {official.verifiedAt}
              </span>
            )}
            {official?.url && (
              <a
                href={official.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-blue-900 dark:text-amber-300 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                الكتاب الرسمي
              </a>
            )}
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-100 dark:bg-[#142A46] text-slate-700 dark:text-slate-200 shrink-0">
          {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          {/* تحذير اختلاف الصف */}
          {subject.gradeWarning && (
            <div className="m-4 sm:m-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 flex gap-3 text-right">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                {subject.gradeWarning}
              </p>
            </div>
          )}

          {/* ملاحظة طريقة العدّ */}
          {subject.lessonsCountNote && (
            <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-slate-50 dark:bg-[#091524] border border-slate-200 dark:border-slate-700 flex gap-2.5 text-right">
              <ListOrdered className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {subject.lessonsCountNote}
              </p>
            </div>
          )}

          {/* تصحيح جوهري */}
          {official?.correction && (
            <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 flex gap-2.5 text-right">
              <FileWarning className="w-4 h-4 text-blue-700 dark:text-blue-300 shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                {official.correction}
              </p>
            </div>
          )}

          {/* ملاحظة المصدر العامة */}
          {official?.note && (
            <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-slate-50 dark:bg-[#091524] border border-slate-200 dark:border-slate-700 text-right">
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {official.note}
              </p>
            </div>
          )}

          {/* قائمة الوحدات */}
          <div className="p-4 sm:p-6 space-y-3">
            {syllabus.map((u) => (
              <UnitBlock
                key={`${u.subject ?? ''}-${u.unitNumber}`}
                unit={u}
                expanded={!!openUnits[u.unitNumber]}
                onToggle={() => toggleUnit(u.unitNumber)}
                hasUnitTitles={official?.hasUnitTitles}
                unitNaming={official?.unitNaming}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

interface UnitBlockProps {
  unit: SyllabusEntry;
  expanded: boolean;
  onToggle: () => void;
  hasUnitTitles?: boolean;
  unitNaming?: string | null;
}

const UnitBlock: React.FC<UnitBlockProps> = ({
  unit,
  expanded,
  onToggle,
  hasUnitTitles,
  unitNaming,
}) => {
  const isThemes = unit.numbering === 'themes';
  const unitLabel = 'الوحدة ' + toArabicDigits(unit.unitNumber);
  const pageLabel = unit.startPage
    ? `ص ${toArabicDigits(unit.startPage)}–${toArabicDigits(unit.endPage ?? unit.startPage)}`
    : unit.sourcePage
      ? `ص ${toArabicDigits(unit.sourcePage)}`
      : null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[#1C3A62] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 text-right flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-[#122844] transition-colors cursor-pointer"
      >
        <div className="space-y-1 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="text-blue-900 dark:text-amber-300">{unitLabel}</span>
            {pageLabel && (
              <span className="text-slate-400 dark:text-slate-500 font-mono">{pageLabel}</span>
            )}
            <span className="text-slate-500 dark:text-slate-400 font-semibold">
              {toArabicDigits(unit.lessons?.length ?? 0)} {isThemes ? 'محوراً' : 'درساً'}
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {unit.title ?? (hasUnitTitles === false ? unitLabel : unitLabel)}
          </h3>
          {hasUnitTitles === false && unitNaming && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {unitNaming}
            </p>
          )}
        </div>
        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#142A46] text-slate-600 dark:text-slate-300 shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-[#091524] p-4 space-y-4 text-right">
          {unit.mainIdea && (
            <div className="flex gap-2.5">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                <span className="font-bold">الفكرة الرئيسة: </span>
                {unit.mainIdea}
              </p>
            </div>
          )}

          {unit.objectives && unit.objectives.length > 0 && (
            <div className="flex gap-2.5">
              <Target className="w-4 h-4 text-blue-900 dark:text-amber-300 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  أهداف الوحدة كما كتبها الكتاب:
                </p>
                <ul className="space-y-1">
                  {unit.objectives.map((o, i) => (
                    <li
                      key={i}
                      className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                    >
                      {toArabicDigits(i + 1)}. {o}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {unit.components && unit.components.length > 0 && (
            <div className="flex gap-2.5">
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  مكوّنات الوحدة:
                </p>
                <ul className="space-y-1">
                  {unit.components.map((c, i) => (
                    <li key={i} className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {c.type}:
                      </span>{' '}
                      {c.topic}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {unit.lessons && unit.lessons.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {isThemes ? 'المحاور:' : 'الدروس:'}
              </p>
              <ol className="space-y-1">
                {unit.lessons.map((l, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-slate-200"
                  >
                    <span className="font-mono text-slate-400 dark:text-slate-500 shrink-0">
                      {l.lessonNumber ? toArabicDigits(l.lessonNumber) : toArabicDigits(i + 1)}
                    </span>
                    <span className="flex-1 leading-relaxed">{l.title}</span>
                    {(l.pages || l.sourcePage) && (
                      <span className="font-mono text-slate-400 dark:text-slate-500 shrink-0">
                        {l.pages ? `ص ${l.pages}` : `ص ${toArabicDigits(l.sourcePage as number)}`}
                      </span>
                    )}
                    {l.note && (
                      <span
                        className="text-amber-600 dark:text-amber-400 shrink-0"
                        title={l.note}
                        aria-label={l.note}
                      >
                        ⚠️
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {unit.vocabulary && unit.vocabulary.length > 0 && (
            <div className="flex gap-2.5">
              <Tags className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">مفردات الوحدة:</p>
                <div className="flex flex-wrap gap-1.5">
                  {unit.vocabulary.map((v, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#142A46] border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

export default OfficialSyllabus;
