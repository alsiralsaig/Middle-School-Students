import React, { useState, useRef } from 'react';
import { Lesson, Subject } from '../types';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  Clock, 
  FileText, 
  Download, 
  HelpCircle, 
  Lightbulb, 
  Bookmark, 
  Share2, 
  BookOpen,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Award,
  X,
  Star,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Send,
  Printer,
  SlidersHorizontal,
  Sun,
  Moon,
  Palette,
  Type,
  Timer} from 'lucide-react';
import { ReaderSettings, ReaderTheme, ReaderLineHeight, ReaderFontSize } from '../types';
import { ChatWidget } from '../components/ChatWidget';
import { InteractiveQuiz } from '../components/InteractiveQuiz';
import { LessonRatingPanel } from '../components/LessonRatingPanel';
import { FocusModeOverlay } from '../components/FocusModeOverlay';
import { MediaAssetViewer } from '../components/MediaAssetViewer';
import { showToast } from '../utils/toastBus';


interface EncouragementToast {
  title: string;
  subtitle: string;
  type: 'completed' | 'uncompleted';
}

interface LessonRatingInfo {
  average: number;
  totalRatings: number;
  userRating: number | null;
}

interface LessonViewProps {
  lesson: Lesson;
  subject: Subject;
  allLessonsInSubject: Lesson[];
  isCompleted: boolean;
  onToggleComplete: (lessonId: string) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (lessonId: string) => void;
  onSelectLesson: (lesson: Lesson) => void;
  onBackToSubject: () => void;
}

export const LessonView: React.FC<LessonViewProps> = ({
  lesson,
  subject,
  allLessonsInSubject,
  isCompleted,
  onToggleComplete,
  isBookmarked = false,
  onToggleBookmark,
  onSelectLesson,
  onBackToSubject,
}) => {
  const [activeTab, setActiveTab] = useState<'explanation' | 'summary' | 'attachments' | 'faq'>('explanation');
  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);
  const [toast, setToast] = useState<EncouragementToast | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Share Modal & Clipboard States
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [shareToastMessage, setShareToastMessage] = useState<string | null>(null);

  // Reader Settings & Auto Night Mode
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(() => {
    try {
      const saved = localStorage.getItem('sudanese_platform_reader_settings');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      lineHeight: 'relaxed',
      fontSize: 'base',
      theme: 'comfort',
      autoNightMode: true,
    };
  });
  const [showReaderControls, setShowReaderControls] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Auto Night mode detection (7 PM to 6 AM)
  const isNightHour = () => {
    const hr = new Date().getHours();
    return hr >= 19 || hr < 6;
  };

  const isAutoNightActive = readerSettings.autoNightMode && isNightHour();
  const effectiveTheme: ReaderTheme = isAutoNightActive ? 'dark' : readerSettings.theme;

  const handlePrint = () => {
    window.print();
  };

  const updateReaderSetting = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    setReaderSettings(prev => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem('sudanese_platform_reader_settings', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };


  // 5-Star Ratings State per lesson
  const [ratingsMap, setRatingsMap] = useState<Record<string, LessonRatingInfo>>({
    'math-l1': { average: 4.8, totalRatings: 54, userRating: null },
    'math-l2': { average: 4.7, totalRatings: 42, userRating: null },
    'math-l3': { average: 4.9, totalRatings: 88, userRating: null },
    'sci-l1': { average: 4.8, totalRatings: 63, userRating: null },
    'sci-l2': { average: 4.6, totalRatings: 39, userRating: null },
    'arb-l1': { average: 4.9, totalRatings: 96, userRating: null },
    'isl-l1': { average: 5.0, totalRatings: 112, userRating: null },
    'soc-l1': { average: 4.8, totalRatings: 75, userRating: null },
    'eng-l1': { average: 4.7, totalRatings: 50, userRating: null },
    'ict-l1': { average: 4.8, totalRatings: 37, userRating: null },
    'civ-l1': { average: 4.9, totalRatings: 44, userRating: null },
  });
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  // وضع التركيز (إخفاء المشتتات + مؤقّت بومودورو)
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusMinutes, setFocusMinutes] = useState(() => {
    try { return Number(localStorage.getItem('ssp_focus_sessions_v1') || 0) * 25 || 0; }
    catch { return 0; }
  });
  const [ratingSubmittedMsg, setRatingSubmittedMsg] = useState<string | null>(null);

  const currentRatingInfo = ratingsMap[lesson.id] || { average: 4.8, totalRatings: 45, userRating: null };

  const handleRateLesson = (stars: number) => {
    setRatingsMap((prev) => {
      const existing = prev[lesson.id] || { average: 4.8, totalRatings: 45, userRating: null };
      const prevUserRating = existing.userRating;
      let newTotal = existing.totalRatings;
      let newSum = existing.average * existing.totalRatings;

      if (prevUserRating === null) {
        newTotal += 1;
        newSum += stars;
      } else {
        newSum = newSum - prevUserRating + stars;
      }

      const newAvg = Math.round((newSum / newTotal) * 10) / 10;
      return {
        ...prev,
        [lesson.id]: {
          average: newAvg,
          totalRatings: newTotal,
          userRating: stars,
        },
      };
    });

    setRatingSubmittedMsg(`تم تسجيل تقييمك (${stars} من 5 نجوم) بنجاح! شكراً لمشاركتك 🌟`);
    setTimeout(() => {
      setRatingSubmittedMsg(null);
    }, 4500);
  };

  // Gentle celebration sound synthesized via Web Audio API (offline, zero external files)
  const playCelebrationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: 587.33Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: 880Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(880, now + 0.14);
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.16, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.55);
    } catch {
      // Safe fallback if audio is not permitted
    }
  };

  const handleToggleWithToast = () => {
    const willBeCompleted = !isCompleted;
    onToggleComplete(lesson.id);

    if (willBeCompleted) {
      playCelebrationChime();
      const motivationalQuotes = [
        'ما شاء الله! خطوة مباركة نحو التفوق والتميز في الشهادة المتوسطة 🇸🇩✨',
        'أحسنت يا بطل! تم تسجيل إنجازك بنجاح في سجل دراستك، استمر في الاجتهاد 🌟',
        'بارك الله في همتك! بالعلم تبني مستقبلك ومستقبل السودان 🎓',
        'إنجاز رائع! أضفت درساً جديداً إلى رصيدك الدراسي، فخورون بجهدك 💪',
      ];
      const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
      setToast({
        title: 'تهانينا! تم إكمال الدرس بنجاح',
        subtitle: randomQuote,
        type: 'completed',
      });
    } else {
      setToast({
        title: 'تم تحديث حالة الدرس',
        subtitle: 'تمت إزالة علامة الإكمال، يمكنك مراجعة الدرس وإكماله في أي وقت.',
        type: 'uncompleted',
      });
    }

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleToggleBookmarkWithFeedback = () => {
    if (onToggleBookmark) {
      const willBeBookmarked = !isBookmarked;
      onToggleBookmark(lesson.id);
      if (willBeBookmarked) {
        setToast({
          title: 'تم حفظ الدرس في قائمة المتابعة 🔖',
          subtitle: 'يمكنك الوصول السريع إلى هذا الدرس في أي وقت من لوحة تحكم الطالب.',
          type: 'completed',
        });
      } else {
        setToast({
          title: 'تمت إزالة الدرس من قائمة المتابعة',
          subtitle: 'تم تحديث قائمة الدروس المحفوظة للمتابعة لاحقاً.',
          type: 'uncompleted',
        });
      }
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
      }, 4000);
    }
  };

  // Find previous and next lesson in this subject
  const currentIndex = allLessonsInSubject.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? allLessonsInSubject[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessonsInSubject.length - 1
      ? allLessonsInSubject[currentIndex + 1]
      : null;

  const handleDownload = (title: string) => {
    setDownloadNotification(`جاري تحضير ملف "${title}" للمعاينة والتنزيل...`);
    setTimeout(() => {
      setDownloadNotification(null);
    }, 4000);
  };

  const getShareUrl = () => {
    return typeof window !== 'undefined' ? window.location.href : '';
  };

  const getShareMessage = () => {
    const url = getShareUrl();
    return `📚 درس: ${lesson.title}\n📖 مادة: ${subject.name} - الصف الثالث المتوسط\n🇸🇩 المنهج السوداني القومي\n\n📌 خلاصة الدرس: ${lesson.summary}\n\n🔗 رابط الدرس كاملاً عبر «منصة الطالب السوداني الذكية»:\n${url}`;
  };

  const handleCopyLink = async () => {
    try {
      const url = getShareUrl();
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopiedLink(true);
      setShareToastMessage('تم نسخ رابط الدرس بنجاح إلى الحافظة!');
      setTimeout(() => setCopiedLink(false), 2500);
      setTimeout(() => setShareToastMessage(null), 4000);
    } catch {
      setShareToastMessage('يمكنك نسخ الرابط من شريط المتصفح.');
    }
  };

  const handleCopySummary = async () => {
    try {
      const msg = getShareMessage();
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(msg);
      }
      setCopiedSummary(true);
      setShareToastMessage('تم نسخ ملخص الدرس المنسق لمشاركته في مجموعات المذاكرة!');
      setTimeout(() => setCopiedSummary(false), 2500);
      setTimeout(() => setShareToastMessage(null), 4000);
    } catch {
      setShareToastMessage('تعذر النسخ التلقائي.');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `درس ${lesson.title} - مادة ${subject.name}`,
          text: `شاهد شرح درس "${lesson.title}" في مادة ${subject.name} (الصف الثالث المتوسط) بالمنهج السوداني:\n${lesson.summary}`,
          url: getShareUrl(),
        });
        setShareModalOpen(false);
      } catch {
        // user dismissed share sheet
      }
    } else {
      setShareModalOpen(true);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Floating Encouragement Toast Notification */}
      {toast && (
        <div 
          role="status" 
          aria-live="polite"
          className="fixed top-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-top-4 fade-in duration-300"
        >
          {toast.type === 'completed' ? (
            <div className="bg-[#0B1E36] text-white rounded-2xl p-4 shadow-2xl border-2 border-amber-400 flex items-start gap-3.5 text-right">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                <Award className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-amber-300">
                    {toast.title}
                  </h4>
                  <button
                    onClick={() => setToast(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer -ml-1 -mt-1"
                    aria-label="إغلاق التنبيه"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {toast.subtitle}
                </p>
                <div className="pt-1 flex items-center gap-2 text-[11px] text-amber-400/90 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+1 درس أُضيف إلى لوحة إنجازك</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-700 flex items-start gap-3 text-right">
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                <Circle className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-200">
                    {toast.title}
                  </h4>
                  <button
                    onClick={() => setToast(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                    aria-label="إغلاق"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  {toast.subtitle}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBackToSubject}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-blue-900 dark:hover:text-amber-300 bg-white dark:bg-[#0D1F35] px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1C3A62] shadow-sm transition-colors cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرجوع إلى وحدات {subject.name}</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span className="hidden sm:inline">المواد</span>
          <span className="hidden sm:inline">/</span>
          <span className="cursor-pointer hover:underline" onClick={onBackToSubject}>
            {subject.name}
          </span>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-bold truncate max-w-[200px] sm:max-w-none">
            {lesson.title}
          </span>
        </div>
      </div>

      {/* Lesson Header Banner */}
      <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-8 shadow-sm space-y-4 text-right">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-blue-900 dark:text-amber-300 bg-blue-50 dark:bg-[#142A46] px-2.5 py-1 rounded-md border border-blue-100 dark:border-[#20406C]">
              {subject.name}
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">درس رقم {lesson.lessonNumber}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{lesson.durationMinutes} دقيقة</span>
            </span>
          </div>

          {/* Action Buttons: Bookmark, Share & Mark Complete */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Bookmark / Save for Later Button */}
            <button
              onClick={handleToggleBookmarkWithFeedback}
              className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm min-h-[44px] ${
                isBookmarked
                  ? 'bg-amber-400 dark:bg-amber-500 text-slate-950 hover:bg-amber-300 dark:hover:bg-amber-400 font-extrabold border border-amber-500 shadow-sm'
                  : 'bg-slate-100 dark:bg-[#142A46] hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 border border-slate-200 dark:border-[#21436F]'
              }`}
              title={isBookmarked ? 'الدرس محفوظ في قائمة المتابعة لاحقاً (انقر للإزالة)' : 'حفظ في قائمة المتابعة لاحقاً'}
              aria-label={isBookmarked ? 'إزالة من قائمة المتابعة لاحقاً' : 'حفظ في قائمة المتابعة لاحقاً'}
            >
              <Bookmark className={`w-4 h-4 transition-transform ${isBookmarked ? 'fill-slate-950 text-slate-950 scale-110' : 'text-amber-600 dark:text-amber-400'}`} />
              <span>{isBookmarked ? 'محفوظ للمتابعة 🔖' : 'متابعة لاحقاً'}</span>
            </button>

            {/* Share Lesson Button */}
            <button
              onClick={() => setShareModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm bg-blue-50 dark:bg-[#142A46] hover:bg-blue-100 dark:hover:bg-[#1E3A60] text-blue-900 dark:text-amber-300 border border-blue-200 dark:border-[#21436F] min-h-[44px]"
              title="مشاركة رابط ومحتوى الدرس"
              aria-label="مشاركة الدرس"
            >
              <Share2 className="w-4 h-4 text-blue-900 dark:text-amber-400" />
              <span>مشاركة</span>
            </button>

            {/* Print Lesson / Note Button */}
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm bg-emerald-50 dark:bg-[#142A46] hover:bg-emerald-100 dark:hover:bg-[#1E3A60] text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-[#21436F] min-h-[44px]"
              title="طباعة مذكرة الدرس بتنسيق ورقي ملائم"
              aria-label="طباعة المذكرة"
            >
              <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>طباعة المذكرة</span>
            </button>

            {/* Ask Gemini AI Teacher Chat Button */}
            <button
              onClick={() => setIsChatOpen(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 border border-amber-300 dark:border-amber-500/40 min-h-[44px] shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
              title="اسأل المعلم الذكي عن هذا الدرس (Gemini API)"
              aria-label="اسأل المعلم الذكي"
            >
              <Sparkles className="w-4 h-4 text-slate-950 animate-pulse" />
              <span>اسأل المعلم الذكي</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-950/20 text-slate-950 font-mono font-bold">
                Gemini
              </span>
            </button>

            {/* Reader Controls Toggle Button */}
            <button
              onClick={() => setShowReaderControls(!showReaderControls)}
              className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm min-h-[44px] ${
                showReaderControls
                  ? 'bg-amber-400 text-slate-950 font-black border border-amber-500 shadow-md ring-2 ring-amber-400/30'
                  : 'bg-slate-100 dark:bg-[#142A46] hover:bg-amber-50 dark:hover:bg-amber-950/30 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#21436F]'
              }`}
              title="تخصيص القراءة (السمة، تباعد الأسطر، حجم الخط، القراءة الليلية)"
              aria-label="تخصيص القراءة"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>تخصيص القراءة</span>
              {isAutoNightActive && (
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" title="القراءة الليلية نشطة" />
              )}
            </button>


            {/* زر وضع التركيز */}
            <button
              onClick={() => setIsFocusMode(true)}
              className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm min-h-[44px] ${
                isFocusMode
                  ? 'bg-[#002368] text-white border border-[#054287]'
                  : 'bg-slate-100 dark:bg-[#142A46] hover:bg-[#EEF2F7] dark:hover:bg-[#1B3559] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#21436F]'
              }`}
              title="إخفاء المشتتات وتفعيل مؤقّت بومودورو (25 دقيقة)"
              aria-label="تفعيل وضع التركيز"
            >
              <Timer className="w-4 h-4 text-amber-500" />
              <span>وضع التركيز</span>
              {focusMinutes > 0 && (
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                  {focusMinutes}د
                </span>
              )}
            </button>

            {/* Mark Complete Action Button */}
            <button
              onClick={handleToggleWithToast}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm min-h-[44px] ${
                isCompleted
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-100 dark:bg-[#122844] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200 dark:border-[#1E3A60]'
              }`}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>تم إكمال الدرس</span>
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4 text-slate-400" />
                  <span>تحديد كـ "تمت الدراسة"</span>
                </>
              )}
            </button>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-snug">
          {lesson.title}
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#122844] p-4 rounded-xl border border-slate-100 dark:border-[#1E3A60]">
          <span className="font-bold text-slate-800 dark:text-slate-100">موجز الدرس: </span>
          {lesson.summary}
        </p>

        {/* Learning Objectives */}
        <div className="pt-2">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">أهداف الدرس التعليمية:</h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
            {lesson.learningObjectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2 bg-slate-50/70 dark:bg-[#122844] p-2.5 rounded-lg border border-slate-100 dark:border-[#1E3A60]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Dedicated Printable Header (visible ONLY when printed / Save to PDF) */}
      <div className="hidden print:block text-right border-b-2 border-slate-900 pb-5 mb-8">
        <div className="flex items-center justify-between border-b border-slate-400 pb-3 mb-3">
          <div>
            <span className="text-xs font-bold text-slate-800">منصة الطالب السوداني الذكية • الصف الثالث المتوسط</span>
            <h2 className="text-lg font-black text-slate-950">منصة الطالب السوداني الذكية — الشهادة المتوسطة</h2>
          </div>
          <div className="text-left text-xs text-slate-700">
            <span className="block font-bold">مذكرات المذاكرة النموذجية</span>
            <span className="font-mono">{new Date().toLocaleDateString('ar-SD')}</span>
          </div>
        </div>
        <h1 className="text-2xl font-black text-slate-950 mb-1">{lesson.title}</h1>
        <p className="text-xs text-slate-700">
          <strong>المقرر:</strong> {subject.name} | <strong>درس رقم:</strong> {lesson.lessonNumber} | <strong>الوقت المقدر:</strong> {lesson.durationMinutes} دقيقة
        </p>
      </div>

      {/* Reader Controls Toolbar (Toggleable or Floating) */}
      {showReaderControls && (
        <div className="bg-[#0B1E36] border border-[#1E3A60] rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 print:hidden space-y-4 text-right">
          <div className="flex items-center justify-between border-b border-[#1A385C] pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white">شريط تخصيص تجربة القراءة والمذاكرة</h3>
            </div>
            <div className="flex items-center gap-2">
              {isAutoNightActive ? (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                  <Moon className="w-3 h-3 text-indigo-400" />
                  <span>الوضع الليلي التلقائي نشط الآن</span>
                </span>
              ) : (
                <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span>الوضع النهاري</span>
                </span>
              )}
              <button
                onClick={() => setShowReaderControls(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#142A46]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Color Theme Selector */}
            <div className="space-y-1.5">
              <span className="block font-semibold text-slate-300">سمة العرض والخلفية:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateReaderSetting('theme', 'comfort')}
                  className={`flex-1 py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                    readerSettings.theme === 'comfort'
                      ? 'bg-[#FBF0D9] text-[#433422] border-[#C8B18B] ring-2 ring-amber-400 shadow-sm'
                      : 'bg-[#0E2440] text-amber-200 border-[#1B3658] hover:bg-[#15345C]'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8D0A9]" />
                  <span>بني مريح</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateReaderSetting('theme', 'white')}
                  className={`flex-1 py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                    readerSettings.theme === 'white'
                      ? 'bg-white text-slate-900 border-white ring-2 ring-emerald-400 shadow-sm'
                      : 'bg-[#0E2440] text-slate-300 border-[#1B3658] hover:bg-[#15345C]'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                  <span>أبيض</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateReaderSetting('theme', 'dark')}
                  className={`flex-1 py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                    readerSettings.theme === 'dark'
                      ? 'bg-[#071626] text-amber-300 border-amber-400/50 ring-2 ring-amber-400 shadow-sm'
                      : 'bg-[#0E2440] text-slate-300 border-[#1B3658] hover:bg-[#15345C]'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
                  <span>أسود</span>
                </button>
              </div>
            </div>

            {/* Line Spacing */}
            <div className="space-y-1.5">
              <span className="block font-semibold text-slate-300">تباعد الأسطر:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateReaderSetting('lineHeight', 'normal')}
                  className={`flex-1 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                    readerSettings.lineHeight === 'normal'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-[#0E2440] text-slate-300 border-[#1B3658] hover:bg-[#15345C]'
                  }`}
                >
                  عادي
                </button>
                <button
                  type="button"
                  onClick={() => updateReaderSetting('lineHeight', 'relaxed')}
                  className={`flex-1 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                    readerSettings.lineHeight === 'relaxed'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-[#0E2440] text-slate-300 border-[#1B3658] hover:bg-[#15345C]'
                  }`}
                >
                  متوسط
                </button>
                <button
                  type="button"
                  onClick={() => updateReaderSetting('lineHeight', 'loose')}
                  className={`flex-1 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                    readerSettings.lineHeight === 'loose'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-[#0E2440] text-slate-300 border-[#1B3658] hover:bg-[#15345C]'
                  }`}
                >
                  واسع
                </button>
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-1.5">
              <span className="block font-semibold text-slate-300">حجم الخط:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateReaderSetting('fontSize', 'sm')}
                  className={`flex-1 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                    readerSettings.fontSize === 'sm'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-[#0E2440] text-slate-300 border-[#1B3658] hover:bg-[#15345C]'
                  }`}
                  title="صغير"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => updateReaderSetting('fontSize', 'base')}
                  className={`flex-1 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                    readerSettings.fontSize === 'base'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-[#0E2440] text-slate-300 border-[#1B3658] hover:bg-[#15345C]'
                  }`}
                  title="متوسط"
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => updateReaderSetting('fontSize', 'lg')}
                  className={`flex-1 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                    readerSettings.fontSize === 'lg'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-[#0E2440] text-slate-300 border-[#1B3658] hover:bg-[#15345C]'
                  }`}
                  title="كبير"
                >
                  A+
                </button>
                <button
                  type="button"
                  onClick={() => updateReaderSetting('fontSize', 'xl')}
                  className={`flex-1 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                    readerSettings.fontSize === 'xl'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-[#0E2440] text-slate-300 border-[#1B3658] hover:bg-[#15345C]'
                  }`}
                  title="كبير جداً"
                >
                  A++
                </button>
              </div>
            </div>

            {/* Auto Night Mode Toggle */}
            <div className="space-y-1.5">
              <span className="block font-semibold text-slate-300">القراءة الليلية الذكية:</span>
              <button
                type="button"
                onClick={() => updateReaderSetting('autoNightMode', !readerSettings.autoNightMode)}
                className={`w-full py-1.5 px-3 rounded-xl font-semibold border flex items-center justify-between transition-all cursor-pointer ${
                  readerSettings.autoNightMode
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-[#0E2440] text-slate-300 border-[#1B3658] hover:bg-[#15345C]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5" />
                  <span>تلقائي (7م - 6ص)</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">
                  {readerSettings.autoNightMode ? 'مفعل' : 'معطل'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-[#122846] rounded-2xl overflow-x-auto text-xs font-semibold print:hidden">

        <button
          onClick={() => setActiveTab('explanation')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all whitespace-nowrap cursor-pointer text-center ${
            activeTab === 'explanation'
              ? 'bg-white dark:bg-[#0B1E36] text-blue-900 dark:text-amber-300 shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          الشرح المفصل والأمثلة
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all whitespace-nowrap cursor-pointer text-center ${
            activeTab === 'summary'
              ? 'bg-white dark:bg-[#0B1E36] text-blue-900 dark:text-amber-300 shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          قواعد الدرس وتوجيهات الامتحان
        </button>
        <button
          onClick={() => setActiveTab('attachments')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all whitespace-nowrap cursor-pointer text-center ${
            activeTab === 'attachments'
              ? 'bg-white dark:bg-[#0B1E36] text-blue-900 dark:text-amber-300 shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          المذكرات والمرفقات ({lesson.attachments.length})
        </button>
        <button
          onClick={() => setActiveTab('faq')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all whitespace-nowrap cursor-pointer text-center ${
            activeTab === 'faq'
              ? 'bg-white dark:bg-[#0B1E36] text-blue-900 dark:text-amber-300 shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          الأسئلة الشائعة
        </button>
      </div>

      {/* Download Alert Notification */}
      {downloadNotification && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between animate-in fade-in">
          <span>{downloadNotification}</span>
          <span className="text-[11px] text-amber-700 font-bold">(نموذج تجريبي جاهز للربط)</span>
        </div>
      )}

      {/* Tab 1: Detailed Explanations */}
      {activeTab === 'explanation' && (
        <div className="space-y-6">
          {lesson.sections.map((section, idx) => {
            const containerStyle = effectiveTheme === 'comfort'
              ? 'bg-[#FBF0D9] text-[#433422] border-[#EADCC3] shadow-md'
              : effectiveTheme === 'white'
              ? 'bg-white text-slate-900 border-slate-200 shadow-sm'
              : 'bg-white dark:bg-[#0D1F35] text-slate-900 dark:text-white border-slate-200 dark:border-[#1C3A62] shadow-sm';

            const textStyle = effectiveTheme === 'comfort'
              ? 'text-[#433422]'
              : effectiveTheme === 'white'
              ? 'text-slate-700'
              : 'text-slate-700 dark:text-slate-300';

            const fontSizeClass = readerSettings.fontSize === 'sm' ? 'text-xs sm:text-sm' :
                                  readerSettings.fontSize === 'base' ? 'text-sm sm:text-base' :
                                  readerSettings.fontSize === 'lg' ? 'text-base sm:text-lg' : 'text-lg sm:text-xl';

            const lineHeightClass = readerSettings.lineHeight === 'normal' ? 'leading-normal' :
                                    readerSettings.lineHeight === 'relaxed' ? 'leading-relaxed' : 'leading-loose';

            return (
              <div
                key={idx}
                className={`rounded-2xl border p-6 sm:p-8 space-y-4 text-right transition-colors lesson-content-container ${containerStyle}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    effectiveTheme === 'comfort'
                      ? 'bg-[#EBD8B8] text-[#433422]'
                      : 'bg-blue-100 dark:bg-[#142D50] text-blue-900 dark:text-amber-300'
                  }`}>
                    {idx + 1}
                  </span>
                  <h3 className="text-lg font-bold">
                    {section.title}
                  </h3>
                </div>

                <p className={`${fontSizeClass} ${lineHeightClass} ${textStyle}`}>
                  {section.content}
                </p>

                {/* Formula or Rule Callout */}
                {section.formulaOrRule && (
                  <div className={`p-4 rounded-xl font-mono text-center text-sm sm:text-base border shadow-inner ${
                    effectiveTheme === 'comfort'
                      ? 'bg-[#EBD8B8] text-[#342410] border-[#DFC9A5]'
                      : 'bg-slate-900 text-amber-300 border-slate-800'
                  }`}>
                    {section.formulaOrRule}
                  </div>
                )}
            

              {/* Key points */}
              {section.keyPoints && (
                <div className="space-y-2 pt-2">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200">نقاط استيعاب هامة:</h5>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {section.keyPoints.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Solved Example */}
              {section.example && (
                <div className="mt-4 p-5 rounded-xl bg-amber-50/70 dark:bg-[#152B4A] border border-amber-200 dark:border-amber-400/30 space-y-3 text-right">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>مثال امتحاني نموذجي محلول</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-[#0D1F35] p-3 rounded-lg border border-amber-100 dark:border-amber-400/20">
                    {section.example.question}
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-[#0D1F35]/80 p-3 rounded-lg border border-amber-100/60 dark:border-amber-400/20 leading-relaxed">
                    <span className="font-bold text-emerald-800 dark:text-emerald-400 block mb-1">خطوات الحل:</span>
                    {section.example.solution}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}


      {/* Tab 2: Summary & Exam Tips */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Key Rules Card */}
          <div className="bg-white dark:bg-[#0D1F35] rounded-2xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-8 space-y-4 text-right shadow-sm">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3>القواعد الذهبية للدرس</h3>
            </div>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              {lesson.keyRules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#122844] border border-slate-100 dark:border-[#1E3A60]">
                  <span className="font-bold text-blue-900 dark:text-amber-300 font-mono">{idx + 1}.</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Exam Tips Card */}
          <div className="bg-gradient-to-br from-[#0B1E36] to-[#162D4A] text-white rounded-2xl p-6 sm:p-8 space-y-4 text-right shadow-sm">
            <div className="flex items-center gap-2 font-bold text-base text-amber-300">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3>توجيهات مصححي الشهادة المتوسطة</h3>
            </div>
            <p className="text-xs text-slate-300">
              ملاحظات يوصي بها موجهو المواد لتجنب خصم درجات الامتحان النهائي:
            </p>
            <ul className="space-y-2.5 text-xs text-slate-200">
              {lesson.examTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tab 3: Attachments */}
      {activeTab === 'attachments' && (
        <div className="bg-white dark:bg-[#0D1F35] rounded-2xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-8 space-y-6 text-right shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              الملحقات وأوراق العمل التابعة للدرس
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ملفات PDF جاهزة للمطالعة والتدريب العملي
            </p>
          </div>

          <div className="space-y-3">
            <MediaAssetViewer assets={lesson.attachments.filter(att=>!!(att.filePath||att.url)).map(att=>({id:att.id,title:att.title,url:att.filePath||att.url||'',kind:att.kind||att.type,mimeType:att.mimeType,originalName:att.originalName}))}/>
            {lesson.attachments.filter(att=>!(att.filePath||att.url)).map((att) => (
              <div
                key={att.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3A60] bg-slate-50 dark:bg-[#122844] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 flex items-center justify-center font-bold text-xs shrink-0">
                    PDF
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{att.title}</h5>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{att.size}</span>
                      {att.pages && (
                        <>
                          <span>·</span>
                          <span>{att.pages} صفحات</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(att.title)}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-[#0B1E36] hover:bg-slate-100 dark:hover:bg-[#163359] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-[#20406C] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 min-h-[44px]"
                >
                  <Download className="w-4 h-4 text-blue-900 dark:text-amber-400" />
                  <span>تنزيل الملف</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: FAQ */}
      {activeTab === 'faq' && (
        <div className="bg-white dark:bg-[#0D1F35] rounded-2xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-8 space-y-6 text-right shadow-sm">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
            <HelpCircle className="w-5 h-5 text-blue-900 dark:text-amber-400" />
            <h3>الأسئلة الشائعة حول هذا الدرس</h3>
          </div>

          <div className="space-y-4">
            {lesson.faq.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] space-y-2">
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  س: {item.question}
                </div>
                <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  ج: {item.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* تقييم الدرس + ملاحظات تحسين الشرح */}
      <LessonRatingPanel lessonId={lesson.id} lessonTitle={lesson.title} />

      {/* اختبار فوري مُولّد من بيانات هذا الدرس (قواعد + أمثلة + ملخص) */}
      <section className="pt-2">
        <InteractiveQuiz
          lesson={lesson}
          subjectName={subject.name}
          onQuizComplete={(score, total) => {
            const percent = Math.round((score / total) * 100);
            showToast({
              title: `نتيجة الاختبار الفوري: ${score} من ${total}`,
              message:
                percent >= 80
                  ? 'ممتاز! أتقنت مفاهيم هذا الدرس — واصل على نفس المستوى.'
                  : percent >= 50
                  ? 'جيد — راجع القواعد الذهبية وأعد الاختبار لتثبت المعلومة.'
                  : 'لا بأس، أعد قراءة الشرح ثم أعد الاختبار مرة أخرى.',
              tone: percent >= 80 ? 'success' : percent >= 50 ? 'info' : 'warning',
            });
          }}
        />
      </section>

      {/* Previous / Next Lesson Navigation Footer */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {prevLesson ? (
          <button
            onClick={() => onSelectLesson(prevLesson)}
            className="p-4 rounded-2xl bg-white dark:bg-[#0D1F35] hover:bg-slate-50 dark:hover:bg-[#142C4B] border border-slate-200 dark:border-[#1C3A62] text-right flex items-center gap-3 transition-colors cursor-pointer group shadow-sm min-h-[56px]"
          >
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-900 dark:group-hover:text-amber-400 shrink-0" />
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">الدرس السابق</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                {prevLesson.title}
              </span>
            </div>
          </button>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#10243C] border border-dashed border-slate-200 dark:border-[#1C3A62] text-right text-xs text-slate-400 flex items-center">
            أنت في الدرس الأول من هذه الوحدة
          </div>
        )}

        {nextLesson ? (
          <button
            onClick={() => onSelectLesson(nextLesson)}
            className="p-4 rounded-2xl bg-white dark:bg-[#0D1F35] hover:bg-slate-50 dark:hover:bg-[#142C4B] border border-slate-200 dark:border-[#1C3A62] text-left flex items-center justify-between gap-3 transition-colors cursor-pointer group shadow-sm min-h-[56px]"
          >
            <div className="text-right">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">الدرس التالي</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                {nextLesson.title}
              </span>
            </div>
            <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-blue-900 dark:group-hover:text-amber-400 shrink-0" />
          </button>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#10243C] border border-dashed border-slate-200 dark:border-[#1C3A62] text-right text-xs text-slate-400 flex items-center">
            وصلت إلى نهاية دروس هذه الوحدة
          </div>
        )}
      </div>

      {/* Share Toast Notification */}
      {shareToastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-4 fade-in duration-300"
        >
          <div className="bg-[#0B1E36] text-white p-4 rounded-2xl shadow-2xl border border-amber-400 flex items-center justify-between gap-3 text-right">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-100">{shareToastMessage}</span>
            </div>
            <button
              onClick={() => setShareToastMessage(null)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="إغلاق الإشعار"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Share Modal Dialog */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0D1F35] rounded-3xl max-w-lg w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-[#1C3A62] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-[#0B1E36] text-white flex items-center justify-between gap-4 text-right">
              <div>
                <span className="text-xs text-amber-300 font-bold block mb-1">
                  مشاركة المحتوى التعليمي · الصف الثالث المتوسط
                </span>
                <h3 className="text-base sm:text-lg font-bold">
                  مشاركة درس: {lesson.title}
                </h3>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                className="p-2 rounded-xl bg-[#173155] text-slate-300 hover:text-white cursor-pointer shrink-0"
                aria-label="إغلاق نافذة المشاركة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-right">
              {/* Preview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-900 dark:text-amber-400">{subject.name}</span>
                  <span className="text-slate-500 dark:text-slate-400">الدرس {lesson.lessonNumber} ({lesson.durationMinutes} دقيقة)</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {lesson.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {lesson.summary}
                </p>
                <div className="pt-2 text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>المنهج السوداني المعتمد - مرحلة التعليم المتوسط</span>
                </div>
              </div>

              {/* Native Mobile Share Button (if available on device) */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-900 to-[#193A64] hover:from-blue-800 hover:to-[#22487A] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-amber-300" />
                  <span>فتح قائمة مشاركة تطبيقات الهاتف (أندرويد / آيفون)</span>
                </button>
              )}

              {/* Social Channels Direct Share Grid */}
              <div className="space-y-2.5">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  المشاركة المباشرة عبر تطبيقات التواصل:
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* WhatsApp */}
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getShareMessage())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all text-center min-h-[72px] cursor-pointer group"
                  >
                    <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>واتساب</span>
                  </a>

                  {/* Telegram */}
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent('درس ' + lesson.title + ' - مادة ' + subject.name + ' (الصف الثالث المتوسط)')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all text-center min-h-[72px] cursor-pointer group"
                  >
                    <Send className="w-5 h-5 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform" />
                    <span>تيليجرام</span>
                  </a>

                  {/* Facebook */}
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all text-center min-h-[72px] cursor-pointer group"
                  >
                    <ExternalLink className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                    <span>فيسبوك</span>
                  </a>

                  {/* Twitter / X */}
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('شرح درس ' + lesson.title + ' في مادة ' + subject.name + ' - الصف الثالث المتوسط بالمنهج السوداني')}&url=${encodeURIComponent(getShareUrl())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-slate-100 dark:bg-[#142A46] hover:bg-slate-200 dark:hover:bg-[#1E3A60] border border-slate-200 dark:border-[#21436F] text-slate-800 dark:text-slate-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all text-center min-h-[72px] cursor-pointer group"
                  >
                    <span className="font-mono font-black text-sm">𝕏</span>
                    <span>منصة إكس</span>
                  </a>
                </div>
              </div>

              {/* Direct Copy Links Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* Copy URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                    رابط الدرس المباشر:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={getShareUrl()}
                      className="flex-1 bg-slate-50 dark:bg-[#10243C] border border-slate-200 dark:border-[#1E3A60] rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-200 select-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 min-h-[38px] ${
                        copiedLink
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-900 hover:bg-blue-800 dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950 text-white'
                      }`}
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'تم النسخ!' : 'نسخ الرابط'}</span>
                    </button>
                  </div>
                </div>

                {/* Copy Formatted Summary for study groups */}
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[42px] ${
                    copiedSummary
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                      : 'bg-slate-50 dark:bg-[#122844] hover:bg-slate-100 dark:hover:bg-[#18365D] border-slate-200 dark:border-[#1E3A60] text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {copiedSummary ? <Check className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4 text-amber-500" />}
                  <span>{copiedSummary ? 'تم نسخ نص الملخص كاملاً!' : 'نسخ نص ملخص الدرس لمجموعات واتساب المدرسية'}</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-[#091524] border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-[#1E3A60] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#142A46] text-xs font-semibold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating & Pop-up Gemini AI Chat Widget for this lesson */}
      <div data-ssp-hide-in-focus="true">
      <ChatWidget 
        lesson={lesson} 
        subject={subject} 
        isOpen={isChatOpen} 
        onOpenChange={setIsChatOpen} 
      />
      </div>

      {/* وضع التركيز: يخفي الهيدر والتنقل + مؤقّت بومودورو */}
      {isFocusMode && (
        <FocusModeOverlay
          lessonTitle={lesson.title}
          onExit={() => setIsFocusMode(false)}
          onSessionComplete={(mins) => {
            setFocusMinutes((m) => m + mins);
            showToast({
              title: 'أُضيفت 25 دقيقة لرصيد تركيزك اليوم',
              message: 'استمر — الانتظام أهم من الطول.',
              tone: 'success',
            });
          }}
        />
      )}
    </div>
  );
};

