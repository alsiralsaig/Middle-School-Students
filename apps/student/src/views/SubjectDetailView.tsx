import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Subject, Lesson } from '../types';
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  MessageCircle,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { InAppFileViewer, ViewerFile, resolveFileUrl } from '../components/InAppFileViewer';
import { SubjectFileRow } from '../components/SubjectFileRow';
import { subjectVisual } from '../utils/subjectVisuals';
import { warmPdfEngine } from '../utils/pdfEngine';
import {
  formatBytes,
  guessMime,
  fileBadge,
  listOfflineFiles,
  removeOfflineFile,
  saveOfflineFile,
  type OfflineFileMeta,
} from '../utils/offlineFiles';

interface SubjectDetailViewProps {
  subject: Subject;
  completedLessonIds: string[];
  bookmarkedLessonIds?: string[];
  onToggleBookmark?: (lessonId: string) => void;
  onBack: () => void;
  onSelectLesson: (lesson: Lesson) => void;
  /** فتح المساعد الذكي (تبويب الدردشة) */
  onOpenAssistant?: () => void;
  /** فتح شاشة الامتحانات التفاعلية */
  onOpenExams?: () => void;
}

type TabKey = 'books' | 'exams' | 'lessons' | 'offline' | 'chat';

const TABS: Array<{ key: TabKey; label: string; emoji: string }> = [
  { key: 'books', label: 'الكتب', emoji: '📖' },
  { key: 'exams', label: 'الامتحانات', emoji: '📝' },
  { key: 'lessons', label: 'الدروس', emoji: '⚡' },
  { key: 'offline', label: 'بدون نت', emoji: '📶' },
  { key: 'chat', label: 'الدردشة', emoji: '💬' },
];

/** كلمات تدل على أن الملف امتحان/نموذج وليس كتاباً */
const EXAM_PATTERN = /امتحان|امتحانات|نموذج|اختبار|مراجعة|أسئلة/;

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  subject,
  completedLessonIds,
  bookmarkedLessonIds = [],
  onToggleBookmark,
  onBack,
  onSelectLesson,
  onOpenAssistant,
  onOpenExams,
}) => {
  const visual = subjectVisual(subject.id, subject.name);
  const [tab, setTab] = useState<TabKey>('lessons');
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({
    [subject.units[0]?.id || '']: true,
  });

  const [viewing, setViewing] = useState<ViewerFile | null>(null);
  const [offline, setOffline] = useState<OfflineFileMeta[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState('');

  const refreshOffline = useCallback(async () => {
    const rows = await listOfflineFiles();
    setOffline(rows);
  }, []);

  useEffect(() => {
    void refreshOffline();
    // نسخّن محرّك PDF في الخلفية حتى يفتح أي ملف لاحقاً بدون إنترنت
    warmPdfEngine();
  }, [refreshOffline]);

  const offlineUrls = useMemo(() => new Set(offline.map((f) => f.url)), [offline]);

  /** ملفات المادة المرفوعة من الإدارة */
  const mediaFiles = useMemo(
    () => (subject.mediaAssets || []).filter((a) => !!a.url),
    [subject.mediaAssets],
  );

  const examFiles = useMemo(
    () => mediaFiles.filter((a) => EXAM_PATTERN.test(a.title || '')),
    [mediaFiles],
  );

  const bookFiles = useMemo(() => {
    const books = mediaFiles
      .filter((a) => !EXAM_PATTERN.test(a.title || ''))
      .map<ViewerFile>((a) => ({
        title: a.title,
        url: a.url,
        mimeType: a.mimeType,
        kind: a.kind,
        bytes: a.sizeBytes ?? null,
        sizeLabel: formatBytes(a.sizeBytes) || undefined,
      }));

    // الكتاب المدرسي الرسمي إن كان له رابط مباشر
    if (subject.official?.url) {
      books.unshift({
        title: subject.official.book
          ? `الكتاب المدرسي — ${subject.official.book}`
          : 'الكتاب المدرسي الرسمي',
        url: subject.official.url,
        mimeType: 'application/pdf',
        kind: 'document',
        sizeLabel: subject.official.pages ? `${subject.official.pages} صفحة` : undefined,
      });
    }
    return books;
  }, [mediaFiles, subject.official]);

  const subjectOffline = useMemo(
    () => offline.filter((f) => !f.subjectId || f.subjectId === subject.id),
    [offline, subject.id],
  );

  const toggleUnit = (unitId: string) =>
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));

  const handleDownload = async (file: ViewerFile) => {
    const absolute = resolveFileUrl(file.url);
    setProgress((p) => ({ ...p, [absolute]: 1 }));
    setNotice('');
    try {
      await saveOfflineFile(
        {
          url: absolute,
          title: file.title,
          mimeType: guessMime(absolute, file.mimeType),
          kind: file.kind || null,
          sizeLabel: file.sizeLabel || null,
          subjectId: subject.id,
          subjectName: subject.name,
        },
        (p) => setProgress((prev) => ({ ...prev, [absolute]: p })),
      );
      await refreshOffline();
      warmPdfEngine();
      setNotice(`تم تحميل «${file.title}» — يفتح الآن من تبويب «بدون نت».`);
    } catch (e) {
      setNotice(e instanceof Error ? `تعذّر التحميل: ${e.message}` : 'تعذّر التحميل، تحقق من الإنترنت.');
    } finally {
      setProgress((p) => {
        const next = { ...p };
        delete next[absolute];
        return next;
      });
    }
  };

  const handleRemove = async (url: string) => {
    await removeOfflineFile(url);
    await refreshOffline();
  };

  const renderFiles = (files: ViewerFile[], emptyText: string) => {
    if (files.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-7 text-center text-[12px] font-semibold text-slate-500 dark:border-[#25476F] dark:bg-[#0D1F35]/60 dark:text-slate-400">
          {emptyText}
        </div>
      );
    }
    return (
      <div className="space-y-2.5">
        {files.map((f, i) => {
          const absolute = resolveFileUrl(f.url);
          const mime = guessMime(absolute, f.mimeType);
          return (
            <SubjectFileRow
              key={`${absolute}-${i}`}
              title={f.title}
              subtitle={f.sizeLabel || undefined}
              badge={fileBadge(mime)}
              accent={visual.accent}
              offline={offlineUrls.has(absolute)}
              downloading={progress[absolute] !== undefined}
              progress={progress[absolute] || 0}
              onOpen={() => setViewing(f)}
              onDownload={() => void handleDownload(f)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* رجوع */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 active:scale-95 dark:border-[#1C3A62] dark:bg-[#0D1F35] dark:text-slate-200"
        >
          <ArrowRight className="h-4 w-4" />
          العودة لقائمة المواد
        </button>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {subject.unitsCount} وحدة · {subject.lessonsCount} درس
        </span>
      </div>

      {/* بانر المادة — إيموجي كبير + اسم المادة (نفس نظام تطبيق الثانوي) */}
      <div
        className="relative overflow-hidden rounded-3xl px-5 py-7 text-center shadow-lg"
        style={{ backgroundColor: visual.accent }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 10%, #fff 0%, transparent 55%)' }} />
        <div className="relative space-y-2">
          <div className="text-5xl leading-none drop-shadow">{visual.emoji}</div>
          <h1 className="text-2xl font-black text-white drop-shadow-sm">{subject.name}</h1>
          <p className="text-[11.5px] font-bold text-white/85">{subject.curriculumRef}</p>
        </div>
      </div>

      {/* شريط التبويبات */}
      <div className="flex gap-1.5 rounded-2xl bg-slate-100 p-1 dark:bg-[#0B1E36]">
        {TABS.map((t) => {
          const active = tab === t.key;
          const activeBg = t.key === 'offline' ? '#16a34a' : t.key === 'chat' ? '#7c3aed' : visual.accent;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-xl px-1 py-2.5 text-[11px] font-black transition-colors active:scale-95 ${
                active ? 'text-white shadow' : 'text-slate-600 dark:text-slate-300'
              }`}
              style={active ? { backgroundColor: activeBg } : undefined}
            >
              <span className="block text-[13px] leading-none">{t.emoji}</span>
              <span className="mt-1 block">{t.label}</span>
            </button>
          );
        })}
      </div>

      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11.5px] font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          {notice}
        </p>
      )}

      {/* ============ الكتب ============ */}
      {tab === 'books' && (
        <section className="space-y-2.5">
          <h2 className="px-1 text-[13px] font-black text-slate-900 dark:text-white">كتب ومذكرات {subject.name}</h2>
          {renderFiles(bookFiles, 'ما في كتب أو مذكرات مرفوعة للمادة دي حالياً.')}
        </section>
      )}

      {/* ============ الامتحانات ============ */}
      {tab === 'exams' && (
        <section className="space-y-2.5">
          <h2 className="px-1 text-[13px] font-black text-slate-900 dark:text-white">نماذج امتحانات {subject.name}</h2>
          {renderFiles(examFiles, 'ما في نماذج امتحانات مرفوعة للمادة دي حالياً.')}

          {onOpenExams && (
            <button
              type="button"
              onClick={onOpenExams}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-right active:scale-[0.99] dark:border-amber-700/60 dark:bg-amber-950/30"
            >
              <div>
                <p className="text-[13px] font-black text-amber-900 dark:text-amber-200">الامتحانات التفاعلية</p>
                <p className="mt-0.5 text-[11px] font-semibold text-amber-800/80 dark:text-amber-300/80">
                  جرّب نموذجاً كاملاً بالتصحيح الفوري
                </p>
              </div>
              <Sparkles className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            </button>
          )}
        </section>
      )}

      {/* ============ الدروس ============ */}
      {tab === 'lessons' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[13px] font-black text-slate-900 dark:text-white">وحدات ودروس المادة</h2>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">اضغط الوحدة للفتح</span>
          </div>

          {subject.units.map((unit) => {
            const isExpanded = !!expandedUnits[unit.id];
            const unitDone = unit.lessons.filter((l) => completedLessonIds.includes(l.id)).length;
            return (
              <div
                key={unit.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#1C3A62] dark:bg-[#0D1F35]"
              >
                <button
                  onClick={() => toggleUnit(unit.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-right active:bg-slate-50 dark:active:bg-[#122844]"
                >
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-black" style={{ color: visual.accent }}>
                      الوحدة {unit.unitNumber} · {unit.lessons.length} دروس
                      {unitDone > 0 && ` · أُنجز ${unitDone}`}
                    </p>
                    <h3 className="mt-1 text-[13.5px] font-extrabold leading-snug text-slate-900 dark:text-white">
                      {unit.title}
                    </h3>
                  </div>
                  <span className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-600 dark:bg-[#142A46] dark:text-slate-200">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </span>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-[#173253] dark:border-[#173253]">
                    {unit.lessons.map((lesson) => {
                      const done = completedLessonIds.includes(lesson.id);
                      const bookmarked = bookmarkedLessonIds.includes(lesson.id);
                      return (
                        <div
                          key={lesson.id}
                          onClick={() => onSelectLesson(lesson)}
                          className="flex cursor-pointer items-center justify-between gap-2.5 p-3.5 active:bg-slate-50 dark:active:bg-[#122844]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                              <span>درس {lesson.lessonNumber}</span>
                              <span>·</span>
                              <Clock className="h-3 w-3" />
                              <span>{lesson.durationMinutes} د</span>
                              {done && (
                                <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" /> تمت دراسته
                                </span>
                              )}
                            </div>
                            <h4 className="mt-1 text-[13px] font-extrabold leading-snug text-slate-900 dark:text-white">
                              {lesson.title}
                            </h4>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {onToggleBookmark && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleBookmark(lesson.id);
                                }}
                                aria-label={bookmarked ? 'إزالة من المتابعة' : 'حفظ للمتابعة'}
                                className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                                  bookmarked
                                    ? 'border-amber-400 bg-amber-400 text-slate-950'
                                    : 'border-slate-200 text-slate-400 dark:border-[#1E3A60] dark:text-slate-300'
                                }`}
                              >
                                <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? 'fill-current' : ''}`} />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectLesson(lesson);
                              }}
                              className="inline-flex min-h-[38px] items-center gap-1 rounded-xl px-3 text-[11.5px] font-black text-white active:scale-95"
                              style={{ backgroundColor: visual.accent }}
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                              فتح
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* ============ بدون نت ============ */}
      {tab === 'offline' && (
        <section className="space-y-2.5">
          <p className="rounded-2xl bg-slate-100 px-3 py-2.5 text-[11px] font-semibold leading-relaxed text-slate-600 dark:bg-[#0B1E36] dark:text-slate-300">
            الملفات اللي حمّلتها هنا بتفتح حتى لو ما عندك إنترنت. اضغط زر التنزيل 📥 جنب أي ملف في تبويب الكتب
            أو الامتحانات عشان تضيفه هنا.
          </p>

          {subjectOffline.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-7 text-center text-[12px] font-semibold text-slate-500 dark:border-[#25476F] dark:text-slate-400">
              ما في ملفات محفوظة بدون إنترنت حتى الآن.
            </div>
          ) : (
            <div className="space-y-2.5">
              {subjectOffline.map((f) => (
                <SubjectFileRow
                  key={f.url}
                  title={f.title}
                  subtitle={[f.sizeLabel, f.subjectName].filter(Boolean).join(' · ')}
                  badge={fileBadge(guessMime(f.url, f.mimeType))}
                  accent={visual.accent}
                  offline
                  onOpen={() => setViewing({ title: f.title, url: f.url, mimeType: f.mimeType, sizeLabel: f.sizeLabel })}
                  onRemove={() => void handleRemove(f.url)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ============ الدردشة ============ */}
      {tab === 'chat' && (
        <section className="space-y-3">
          <div className="rounded-2xl border border-violet-300 bg-violet-50 p-4 text-center dark:border-violet-800/70 dark:bg-violet-950/30">
            <div className="text-4xl">💬</div>
            <h2 className="mt-2 text-[14px] font-black text-violet-900 dark:text-violet-100">
              مساعد {subject.name} الذكي
            </h2>
            <p className="mt-1 text-[11.5px] font-semibold leading-relaxed text-violet-800/80 dark:text-violet-200/80">
              اسأل عن أي حاجة في المادة — يجاوبك من كتابك ودروسك.
            </p>
            <button
              type="button"
              onClick={onOpenAssistant}
              disabled={!onOpenAssistant}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-[12.5px] font-black text-white active:scale-95 disabled:opacity-60"
            >
              <MessageCircle className="h-4 w-4" />
              ابدأ المحادثة
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-[#1C3A62] dark:bg-[#0D1F35]">
            <p className="flex items-center gap-1.5 text-[12px] font-black text-slate-900 dark:text-white">
              <BookOpen className="h-4 w-4" style={{ color: visual.accent }} />
              من داخل الدروس
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
              كل درس فيه زر «اسأل عن الدرس» — يجيب لك شرح مبسّط من نفس الدرس بدون ما تخرج منه.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <FileText className="h-3.5 w-3.5" />
              الملفات والوسائط في تبويب الكتب.
            </p>
          </div>
        </section>
      )}

      {/* عارض الملفات داخل التطبيق */}
      {viewing && <InAppFileViewer file={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

export default SubjectDetailView;
