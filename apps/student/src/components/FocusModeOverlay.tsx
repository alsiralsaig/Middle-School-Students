import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Coffee, Maximize2, Minimize2, Pause, Play, RotateCcw, SkipForward, Timer, X } from 'lucide-react';
import { pushNotification, showToast } from '../utils/toastBus';
import { addFocusSession, getFocusLog } from '../utils/focusStore';

interface Props {
  lessonTitle: string;
  onExit: () => void;
  /** يُستدعى عند إنهاء جلسة تركيز كاملة (٢٥ دقيقة) */
  onSessionComplete?: (minutes: number) => void;
}

const WORK_MIN = 25;
const BREAK_MIN = 5;
const LONG_BREAK_MIN = 15;
const SESSIONS_BEFORE_LONG_BREAK = 4;

const SESSIONS_KEY = 'ssp_focus_sessions_v1';

const readSessions = () => {
  try {
    return Number(localStorage.getItem(SESSIONS_KEY) || 0) || 0;
  } catch {
    return 0;
  }
};

/** نغمة تنبيه قصيرة مُولّدة عبر Web Audio (بدون ملفات خارجية) */
function beep(times = 2): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 660;
      const start = ctx.currentTime + i * 0.45;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      osc.start(start);
      osc.stop(start + 0.42);
    }
    setTimeout(() => ctx.close(), times * 600 + 400);
  } catch {
    /* بعض المتصفحات تمنع الصوت بدون تفاعل سابق */
  }
}

/**
 * وضع التركيز (Study Focus Mode)
 *
 * - يُخفي الهيدر والفوتر وشريط التنقل السفلي وأي عنصر موسوم
 *   بـ data-ssp-hide-in-focus (عبر الصنف ssp-focus على <html>)
 * - مؤقّت بومودورو: ٢٥ دقيقة تركيز / ٥ دقائق راحة / ١٥ دقيقة بعد كل ٤ جلسات
 * - عند انتهاء الجلسة: Toast + إشعار في المركز + نغمة قصيرة
 * - الخروج: زر الخروج أو مفتاح Esc
 */
export const FocusModeOverlay: React.FC<Props> = ({ lessonTitle, onExit, onSessionComplete }) => {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [secondsLeft, setSecondsLeft] = useState(WORK_MIN * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(() => {
    const log = getFocusLog();
    return Object.values(log).reduce((a, b) => a + b, 0);
  });
  const [minimized, setMinimized] = useState(false);
  const runningRef = useRef(running);
  runningRef.current = running;

  const total = (mode === 'work' ? WORK_MIN : sessions % SESSIONS_BEFORE_LONG_BREAK === 0 && sessions > 0 ? LONG_BREAK_MIN : BREAK_MIN) * 60;
  const progress = Math.max(0, Math.min(100, ((total - secondsLeft) / total) * 100));

  const finishPhase = useCallback(
    (finishedMode: 'work' | 'break') => {
      beep(2);
      if (finishedMode === 'work') {
        const log = addFocusSession();
        const next = Object.values(log).reduce((a, b) => a + b, 0);
        setSessions(next);
        window.dispatchEvent(new CustomEvent('ssp:focus-changed'));
        showToast({
          title: 'انتهت جلسة التركيز (25 دقيقة) 🎯',
          message: 'أحسنت! خذ راحة قصيرة قبل مواصلة المذاكرة.',
          tone: 'success',
        });
        pushNotification({
          title: 'جلسة تركيز مكتملة',
          titleEn: 'Focus session completed',
          message: `أنهيت 25 دقيقة من التركيز على «${lessonTitle}».`,
          messageEn: `You completed a 25-minute focus session on "${lessonTitle}".`,
          type: 'system',
        });
        onSessionComplete?.(WORK_MIN);
        setMode('break');
        const isLong = next % SESSIONS_BEFORE_LONG_BREAK === 0;
        setSecondsLeft((isLong ? LONG_BREAK_MIN : BREAK_MIN) * 60);
      } else {
        showToast({
          title: 'انتهت الاستراحة ☕',
          message: 'جاهز للعودة إلى التركيز؟ ابدأ جلسة جديدة.',
          tone: 'info',
        });
        pushNotification({
          title: 'انتهت الاستراحة',
          titleEn: 'Break finished',
          message: 'حان وقت العودة إلى المذاكرة.',
          messageEn: 'Time to get back to studying.',
          type: 'system',
        });
        setMode('work');
        setSecondsLeft(WORK_MIN * 60);
      }
      setRunning(false);
    },
    [lessonTitle, onSessionComplete, sessions],
  );

  // المؤقّت
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          finishPhase(mode);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, mode, finishPhase]);

  // تفعيل وضع التركيز على مستوى الصفحة (إخفاء العناصر غير الضرورية)
  useEffect(() => {
    document.documentElement.classList.add('ssp-focus');
    return () => {
      document.documentElement.classList.remove('ssp-focus');
    };
  }, []);

  // الخروج بمفتاح Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const reset = () => {
    setRunning(false);
    setMode('work');
    setSecondsLeft(WORK_MIN * 60);
  };

  const skip = () => {
    setRunning(false);
    if (mode === 'work') {
      finishPhase('work');
    } else {
      setMode('work');
      setSecondsLeft(WORK_MIN * 60);
    }
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 left-4 z-[90] flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#002368] text-white shadow-2xl border border-[#054287] text-xs font-bold"
        title="إظهار مؤقت التركيز"
      >
        <Timer className="w-4 h-4 text-amber-400" />
        <span className="font-mono">
          {mm}:{ss}
        </span>
        {running && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
      </button>
    );
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[95] sm:inset-x-auto sm:left-6 sm:bottom-6 sm:w-[340px] bg-[#001842] text-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-[#054287] p-5 pb-6"
      dir="rtl"
      role="dialog"
      aria-label="وضع التركيز"
    >
      {/* الترويسة */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5" />
            {mode === 'work' ? 'جلسة تركيز — بومودورو' : 'استراحة قصيرة'}
          </p>
          <p className="text-[10px] text-white/60 mt-0.5 truncate">الدرس: {lessonTitle}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setMinimized(true)}
            aria-label="تصغير"
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onExit}
            aria-label="الخروج من وضع التركيز"
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* المؤقّت */}
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -scale-x-100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#054287" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={mode === 'work' ? '#F1AC12' : '#34d399'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
              transform="rotate(-90 50 50)"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-mono text-xl font-black tabular-nums">
              {mm}:{ss}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRunning((r) => !r)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-extrabold min-h-[44px] transition-colors ${
                running ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500 text-slate-950'
              }`}
            >
              {running ? (
                <>
                  <Pause className="w-4 h-4" /> إيقاف مؤقت
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> {secondsLeft === total ? 'ابدأ' : 'متابعة'}
                </>
              )}
            </button>
            <button
              onClick={reset}
              aria-label="إعادة الضبط"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 min-h-[44px] min-w-[44px] grid place-items-center"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={skip}
              aria-label="تخطي المرحلة"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 min-h-[44px] min-w-[44px] grid place-items-center"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-white/70">
            <span className="flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5" />
              {mode === 'work' ? '٢٥ دقيقة تركيز' : sessions % SESSIONS_BEFORE_LONG_BREAK === 0 && sessions > 0 ? '١٥ دقيقة راحة' : '٥ دقائق راحة'}
            </span>
            <span>جلسات اليوم: {sessions}</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-white/50 leading-relaxed mt-3 border-t border-white/10 pt-3">
        تم إخفاء الهيدر وقوائم التنقل لزيادة التركيز. اضغط <Maximize2 className="w-3 h-3 inline" /> أو
        مفتاح <span className="font-mono">Esc</span> للخروج من وضع التركيز.
      </p>
    </div>
  );
};
