import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Flame, 
  Volume2, 
  X,
  BookOpen
} from 'lucide-react';
import { StudyReminder } from '../types';
import { SUBJECTS_DATA } from '../data/curriculumData';

const INITIAL_REMINDERS: StudyReminder[] = [
  {
    id: 'rem-1',
    time: '17:00',
    days: ['السبت', 'الإثنين', 'الأربعاء'],
    subjectName: 'الرياضيات',
    label: 'مراجعة مسائل فيثاغورس والتحليل الجبري',
    isEnabled: true,
    notifyBrowser: true,
    soundEnabled: true,
  },
  {
    id: 'rem-2',
    time: '19:30',
    days: ['الأحد', 'الثلاثاء', 'الخميس'],
    subjectName: 'العلوم',
    label: 'استذكار قوانين نيوتن والتفاعلات الكيميائية',
    isEnabled: true,
    notifyBrowser: true,
    soundEnabled: true,
  },
  {
    id: 'rem-3',
    time: '21:00',
    days: ['يومياً'],
    subjectName: 'اللغة العربية',
    label: 'حل تدريبات النحو والممنوع من الصرف',
    isEnabled: false,
    notifyBrowser: false,
    soundEnabled: false,
  },
];

export const StudyReminderWidget: React.FC = () => {
  const [reminders, setReminders] = useState<StudyReminder[]>(() => {
    try {
      const saved = localStorage.getItem('sudanese_platform_study_reminders');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_REMINDERS;
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activePopupReminder, setActivePopupReminder] = useState<StudyReminder | null>(null);
  const [testSuccessToast, setTestSuccessToast] = useState<string | null>(null);

  // Form states
  const [formTime, setFormTime] = useState('18:00');
  const [formSubject, setFormSubject] = useState(SUBJECTS_DATA[0].name);
  const [formLabel, setFormLabel] = useState('');
  const [formDays, setFormDays] = useState<string[]>(['يومياً']);
  const [formNotifyBrowser, setFormNotifyBrowser] = useState(true);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sudanese_platform_study_reminders', JSON.stringify(reminders));
    } catch (e) {
      console.error('Failed to save reminders:', e);
    }
  }, [reminders]);

  // Check notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          new Notification('منصة الطالب السوداني الذكية 🇸🇩', {
            body: 'تم تفعيل تذكيرات المذاكرة بنجاح! سنقوم بتنبيهك بمواعيد مراجعتك المقررة.',
            icon: '/favicon.ico',
          });
        }
      } catch (e) {
        console.error('Error requesting notification permission:', e);
      }
    }
  };

  const handleToggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isEnabled: !r.isEnabled } : r))
    );
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleTestReminder = (rem: StudyReminder) => {
    // 1. Show in-app interactive modal/toast
    setActivePopupReminder(rem);

    // 2. Browser push notification if supported & enabled
    if (rem.notifyBrowser && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`تذكير المذاكرة: مادة ${rem.subjectName} 📚`, {
          body: `${rem.label}\nالوقت: ${rem.time} - استمر في الحفاظ على تتابعك الدراسي! 🇸🇩`,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.error('Failed to dispatch notification:', err);
      }
    }

    setTestSuccessToast(`تم إرسال إشعار تذكير فوري لـ "${rem.subjectName}"!`);
    setTimeout(() => setTestSuccessToast(null), 3500);
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) return;

    const newReminder: StudyReminder = {
      id: `rem-${Date.now()}`,
      time: formTime,
      days: formDays,
      subjectName: formSubject,
      label: formLabel.trim(),
      isEnabled: true,
      notifyBrowser: formNotifyBrowser,
      soundEnabled: true,
    };

    setReminders((prev) => [newReminder, ...prev]);
    setShowAddForm(false);
    setFormLabel('');
    setTestSuccessToast('تمت إضافة موعد التذكير الجديد بنجاح!');
    setTimeout(() => setTestSuccessToast(null), 3000);
  };

  const dayOptions = ['يومياً', 'السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  const toggleDay = (day: string) => {
    if (day === 'يومياً') {
      setFormDays(['يومياً']);
      return;
    }
    setFormDays((prev) => {
      const filtered = prev.filter((d) => d !== 'يومياً');
      if (filtered.includes(day)) {
        const res = filtered.filter((d) => d !== day);
        return res.length === 0 ? ['يومياً'] : res;
      } else {
        return [...filtered, day];
      }
    });
  };

  return (
    <section className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-8 space-y-6 text-right shadow-sm">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#1E3A60]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                تذكيرات وجدول المذاكرة اليومي
              </h2>
              <span className="text-[10px] bg-amber-400/20 text-amber-800 dark:text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                تنبيهات فورية 🔔
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              اضبط منبه المذاكرة ليرسل لك تنبيهات دفع ذكية في المتصفح ورسائل منبثقة تحافظ على تتابع دراستك اليومي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Permission Button */}
          {notificationPermission !== 'granted' && (
            <button
              type="button"
              onClick={requestBrowserPermission}
              className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-[#142A46] text-blue-900 dark:text-amber-300 hover:bg-blue-100 text-xs font-bold border border-blue-200 dark:border-[#21436F] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>تفعيل إشعارات المتصفح</span>
            </button>
          )}

          {/* Add Reminder Button */}
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موعد مذاكرة</span>
          </button>
        </div>
      </div>

      {/* Add Reminder Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddReminder}
          className="p-5 rounded-2xl bg-slate-50 dark:bg-[#091524] border border-slate-200 dark:border-[#1E3A60] space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>إضافة موعد تذكير جديد</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Time */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                وقت التنبيه:
              </label>
              <input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#10243C] border border-slate-200 dark:border-[#1E3A60] text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                المادة المقررة:
              </label>
              <select
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#10243C] border border-slate-200 dark:border-[#1E3A60] text-xs text-slate-800 dark:text-slate-100 outline-none"
              >
                {SUBJECTS_DATA.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Label / Goal */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                عنوان وهدف جلسة المذاكرة:
              </label>
              <input
                type="text"
                placeholder="مثال: مراجعة قوانين نيوتن وحل التمارين"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#10243C] border border-slate-200 dark:border-[#1E3A60] text-xs text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>
          </div>

          {/* Days selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              أيام التكرار:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {dayOptions.map((day) => {
                const isSelected = formDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-white dark:bg-[#142A46] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1E3A60]'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-md"
            >
              حفظ التذكير
            </button>
          </div>
        </form>
      )}

      {/* Reminders List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {reminders.map((rem) => (
          <div
            key={rem.id}
            className={`p-4 rounded-2xl border transition-all text-right flex flex-col justify-between ${
              rem.isEnabled
                ? 'bg-slate-50/80 dark:bg-[#0E2036] border-slate-200 dark:border-[#1E3A60] shadow-sm'
                : 'bg-slate-100/50 dark:bg-[#0A1626]/50 border-slate-200/50 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-500 dark:text-amber-300 flex items-center justify-center font-bold text-xs font-mono">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      {rem.time}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {rem.days.join(' · ')}
                    </div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => handleToggleReminder(rem.id)}
                  title={rem.isEnabled ? 'إيقاف التذكير' : 'تفعيل التذكير'}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                    rem.isEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      rem.isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div>
                <span className="text-[11px] font-bold text-blue-700 dark:text-amber-400">
                  {rem.subjectName}
                </span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 mt-0.5">
                  {rem.label}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleTestReminder(rem)}
                className="text-[11px] text-blue-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                title="إرسال تنبيه تجريبي لمعاينة الإشعار والرسالة المنبثقة"
              >
                <Send className="w-3 h-3" />
                <span>تجربة التنبيه الآن</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteReminder(rem.id)}
                className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                title="حذف هذا التذكير"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Interactive In-App Reminder Pop-up */}
      {activePopupReminder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0D1F35] rounded-3xl max-w-md w-full p-6 text-right border-2 border-amber-400 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xl shadow-md">
                ⏰
              </div>
              <button
                type="button"
                onClick={() => setActivePopupReminder(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                تنبيه جلسة المذاكرة المقررة الآن! 🇸🇩
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                حان وقت استذكار: {activePopupReminder.subjectName}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#122844] p-3 rounded-2xl border border-slate-200 dark:border-[#1E3A60]">
                {activePopupReminder.label}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500 shrink-0" />
              <span>المذاكرة الآن تحافظ على تتابعك الدراسي وترفع ترتيبك في لوحة الشرف!</span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActivePopupReminder(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                لاحقاً (تأجيل 15 دقيقة)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePopupReminder(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>ابدأ المذاكرة فوراً</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Success Toast */}
      {testSuccessToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{testSuccessToast}</span>
        </div>
      )}
    </section>
  );
};
