import React, { useEffect, useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  Video, 
  AlertCircle, 
  FileText, 
  ExternalLink, 
  Sparkles,
  MapPin,
  X
} from 'lucide-react';
import { CalendarEvent } from '../types';
import { PlannerEvent, getAllEvents, removeEvent, subscribePlanner, typeLabelAr, typeTone } from '../utils/plannerStore';
import { useLanguage } from '../context/LanguageContext';

export const InteractiveCalendar: React.FC = () => {
  const { t, language, isRtl } = useLanguage();
  const [events, setEvents] = useState<PlannerEvent[]>(getAllEvents);
  const [selectedEventType, setSelectedEventType] = useState<'all' | 'live_class' | 'deadline' | 'exam' | 'trial_exam' | 'review'>('all');
  const [selectedEvent, setSelectedEvent] = useState<PlannerEvent | null>(null);

  // Month state - October 2026 default based on environment date
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 1)); // October 2026
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-10-18');

  // متابعة أي إضافة أو حذف في مواعيد التقويم (الاختبارات التجريبية…)
  useEffect(() => subscribePlanner(() => setEvents(getAllEvents())), []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNamesAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeekAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const daysOfWeekEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Days in month calculation
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Find events for a specific day string (YYYY-MM-DD)
  const getEventsForDay = (day: number) => {
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === formatted);
  };

  const filteredUpcomingEvents = events.filter(e => {
    if (selectedEventType === 'all') return true;
    return e.type === selectedEventType;
  });

  const getEventBadge = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'live_class':
        return {
          label: language === 'en' ? 'Live Session' : 'حصة مباشرة',
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400',
          icon: <Video className="w-3.5 h-3.5" />
        };
      case 'deadline':
        return {
          label: language === 'en' ? 'Assignment Deadline' : 'تسليم واجب',
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-400',
          icon: <FileText className="w-3.5 h-3.5" />
        };
      case 'exam':
        return {
          label: language === 'en' ? 'Monthly Exam' : 'امتحان شهري',
          bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
          dot: 'bg-rose-400',
          icon: <AlertCircle className="w-3.5 h-3.5" />
        };
      case 'trial_exam':
        return {
          label: language === 'en' ? 'Trial Exam' : 'اختبار تجريبي',
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          dot: 'bg-amber-300',
          icon: <Sparkles className="w-3.5 h-3.5" />
        };
      case 'review':
        return {
          label: language === 'en' ? 'Review Session' : 'جلسة مراجعة',
          bg: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
          dot: 'bg-sky-300',
          icon: <Clock className="w-3.5 h-3.5" />
        };
      default:
        return {
          label: language === 'en' ? 'Reminder' : 'تذكير',
          bg: 'bg-slate-500/15 border-slate-500/30 text-slate-300',
          dot: 'bg-slate-300',
          icon: <Clock className="w-3.5 h-3.5" />
        };
    }
  };

  return (
    <div className="bg-[#0B1E36] border border-[#1A375A] rounded-2xl p-6 shadow-xl" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#162D4A]">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase">
            <CalendarIcon className="w-4 h-4" />
            <span>{t('calendarTitle')}</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            {language === 'en' ? 'Live Classes, Deadlines & Exam Dates' : 'مواعيد الحصص المباشرة والواجبات والامتحانات'}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">{t('calendarDesc')}</p>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedEventType('all')}
            className={`px-3 py-2 min-h-[36px] inline-flex items-center rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedEventType === 'all'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-[#0E2440] text-slate-300 hover:text-white border border-[#1B385D]'
            }`}
          >
            {t('all')}
          </button>
          <button
            onClick={() => setSelectedEventType('live_class')}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedEventType === 'live_class'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-[#0E2440] text-emerald-400 hover:bg-[#122E52] border border-emerald-500/30'
            }`}
          >
            <Video className="w-3 h-3" />
            <span>{t('liveClasses')}</span>
          </button>
          <button
            onClick={() => setSelectedEventType('deadline')}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedEventType === 'deadline'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-[#0E2440] text-amber-400 hover:bg-[#122E52] border border-amber-500/30'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>{t('deadlines')}</span>
          </button>
          <button
            onClick={() => setSelectedEventType('exam')}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedEventType === 'exam'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-[#0E2440] text-rose-400 hover:bg-[#122E52] border border-rose-500/30'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            <span>{t('monthlyExams')}</span>
          </button>
          <button
            onClick={() => setSelectedEventType('trial_exam')}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedEventType === 'trial_exam'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-[#0E2440] text-amber-300 hover:bg-[#122E52] border border-amber-500/30'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>اختباراتي التجريبية</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Calendar Month Grid (7 cols on desktop) */}
        <div className="lg:col-span-7 bg-[#07172B] p-5 rounded-2xl border border-[#142A46]">
          {/* Month Navigator */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{language === 'en' ? monthNamesEn[month] : monthNamesAr[month]}</span>
              <span className="text-emerald-400">{year}</span>
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-2 min-h-[36px] min-w-[36px] grid place-items-center rounded-lg bg-[#0E2440] text-slate-300 hover:text-white hover:bg-[#16355C] border border-[#1A385C] transition-colors"
                title="الشهر السابق"
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <button
                onClick={nextMonth}
                className="p-2 min-h-[36px] min-w-[36px] grid place-items-center rounded-lg bg-[#0E2440] text-slate-300 hover:text-white hover:bg-[#16355C] border border-[#1A385C] transition-colors"
                title="الشهر القادم"
              >
                {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {(language === 'en' ? daysOfWeekEn : daysOfWeekAr).map((d, i) => (
              <div key={i} className="text-[11px] font-semibold text-slate-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-14 sm:h-16 rounded-xl bg-transparent" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = getEventsForDay(day);
              const isSelected = selectedDateStr === dateStr;
              const isToday = day === 16 && month === 9 && year === 2026;

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => {
                    setSelectedDateStr(dateStr);
                    if (dayEvents.length > 0) {
                      setSelectedEvent(dayEvents[0]);
                    }
                  }}
                  className={`h-14 sm:h-16 p-1 sm:p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-950/60 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                      : dayEvents.length > 0
                      ? 'bg-[#0E2440] border-[#1C3A60] hover:border-emerald-500/50'
                      : 'bg-[#091A30]/50 border-transparent hover:border-[#142C4C] hover:bg-[#0B1E36]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[11px]'
                          : isSelected
                          ? 'text-emerald-300 font-bold'
                          : 'text-slate-300'
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] px-1 rounded-full bg-slate-800 text-slate-300 font-medium">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Event indicators */}
                  <div className="flex items-center gap-1 overflow-hidden mt-0.5">
                    {dayEvents.map(evt => {
                      const badge = getEventBadge(evt.type);
                      return (
                        <div
                          key={evt.id}
                          className={`w-2 h-2 rounded-full shrink-0 ${badge.dot}`}
                          title={evt.title}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="mt-4 pt-4 border-t border-[#142A46] flex items-center justify-around text-[11px] text-slate-300 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>{t('liveClasses')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>{t('deadlines')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>{t('monthlyExams')}</span>
            </div>
          </div>
        </div>

        {/* Upcoming events list (5 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>
                {language === 'en' ? 'Upcoming Sessions & Deadlines' : 'المواعيد والحصص القادمة'}
              </span>
            </h3>
            <span className="text-xs text-slate-400 bg-[#07172B] px-2.5 py-0.5 rounded-full border border-[#162D4A]">
              {filteredUpcomingEvents.length} مواعيد
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredUpcomingEvents.length === 0 ? (
              <div className="p-8 text-center bg-[#07172B] border border-[#142A46] rounded-xl text-slate-400 text-xs">
                لا توجد مواعيد مسجلة لهذا النوع حالياً.
              </div>
            ) : (
              filteredUpcomingEvents.map(evt => {
                const badge = getEventBadge(evt.type);
                const isEventSelected = selectedEvent?.id === evt.id;

                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-right ${
                      isEventSelected
                        ? 'bg-[#102B4B] border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-[#07172B] border-[#142A46] hover:bg-[#0B203B] hover:border-[#1E3A60]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${badge.bg}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      <span className="text-[11px] text-emerald-400 font-mono font-medium">
                        {evt.date}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white mb-1 leading-snug">
                      {language === 'en' ? evt.titleEn : evt.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-300 mt-2 pt-2 border-t border-[#132842]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {evt.time}
                      </span>
                      <span className="text-slate-400 truncate max-w-[140px]">
                        {evt.subjectName}
                      </span>
                    </div>

                    {evt.link && (
                      <div className="mt-2.5">
                        <a
                          href={evt.link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-500/20 border border-emerald-500/30 px-3 py-2 min-h-[36px] rounded-lg transition-colors"
                        >
                          <Video className="w-3 h-3" />
                          <span>{t('joinLive')}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Selected Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-[#0B1E36] border border-[#1E3A60] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 text-right"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`text-xs px-3 py-1 rounded-full border font-semibold flex items-center gap-1.5 ${getEventBadge(selectedEvent.type).bg}`}>
                {getEventBadge(selectedEvent.type).icon}
                <span>{getEventBadge(selectedEvent.type).label}</span>
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#162D4A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-base font-bold text-white leading-relaxed">
                {language === 'en' ? selectedEvent.titleEn : selectedEvent.title}
              </h3>
              {selectedEvent.status === 'sample' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-300 font-bold">
                  موعد تجريبي
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#071728] p-3.5 rounded-xl border border-[#152D4C] mb-4">
              {selectedEvent.description}
            </p>

            <div className="space-y-2 text-xs text-slate-300 bg-[#091C33] p-3 rounded-xl border border-[#163254] mb-5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">التاريخ:</span>
                <span className="font-semibold text-emerald-400">{selectedEvent.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">الوقت:</span>
                <span className="font-semibold text-white">{selectedEvent.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">المادة المقررة:</span>
                <span className="font-semibold text-sky-400">{selectedEvent.subjectName}</span>
              </div>
              {selectedEvent.teacher && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">الأستاذ / المشرف:</span>
                  <span className="font-semibold text-amber-300">{selectedEvent.teacher}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 flex-wrap">
              {selectedEvent.status === 'user' && (
                <button
                  onClick={() => {
                    removeEvent(selectedEvent.id);
                    setSelectedEvent(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
                >
                  حذف الموعد
                </button>
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-[#162D4A] transition-colors"
              >
                {t('close')}
              </button>
              {selectedEvent.link ? (
                <a
                  href={selectedEvent.link}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/40 flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{t('joinLive')}</span>
                </a>
              ) : (
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 transition-colors"
                >
                  حسناً، فهمت
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
