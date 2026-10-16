import React, { useState } from 'react';
import { 
  Award, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Printer, 
  Download, 
  Share2, 
  Calendar, 
  School, 
  MapPin, 
  X,
  Star,
  FileCheck2
} from 'lucide-react';
import { INITIAL_BADGES } from '../data/platformFeaturesData';
import { BadgeItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAccount } from '../context/AccountContext';

interface AchievementsViewProps {
  onBack: () => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({ onBack }) => {
  const { t, language, isRtl } = useLanguage();
  const { activeAccount } = useAccount();

  const [badges] = useState<BadgeItem[]>(INITIAL_BADGES);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'progress' | 'quiz' | 'streak' | 'subject'>('all');
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const unlockedBadges = badges.filter(b => b.isUnlocked);
  const totalPoints = unlockedBadges.reduce((sum, b) => sum + b.points, 0);

  const filteredBadges = badges.filter(b => {
    if (selectedCategory === 'all') return true;
    return b.category === selectedCategory;
  });

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#102947] via-[#0C223E] to-[#07172A] border border-[#1F3F6D] shadow-2xl overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 text-right">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 py-2.5 min-h-[36px] border border-emerald-500/20 px-3.5 py-1.5 rounded-xl transition-all mb-2 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>{t('back')}</span>
            </button>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Award className="w-6 h-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {t('achievementsTitle')}
              </h1>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {t('achievementsSubtitle')}
            </p>
          </div>

          {/* Action: Open Certificate */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => setShowCertificateModal(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-xl shadow-amber-950/40 flex items-center justify-center gap-2 transition-transform hover:scale-105 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{t('viewCertificate')}</span>
            </button>
          </div>
        </div>

        {/* Quick summary stats cards */}
        <div className="mt-8 pt-6 border-t border-[#173357] grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-[#071626]/80 p-4 rounded-2xl border border-[#142A46] text-right">
            <span className="text-[11px] text-slate-400">الأوسمة المكتسبة</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-amber-400">{unlockedBadges.length}</span>
              <span className="text-xs text-slate-400">/ {badges.length}</span>
            </div>
          </div>

          <div className="bg-[#071626]/80 p-4 rounded-2xl border border-[#142A46] text-right">
            <span className="text-[11px] text-slate-400">{t('totalPointsEarned')}</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-emerald-400">{totalPoints}</span>
              <span className="text-xs text-slate-400">{t('points')}</span>
            </div>
          </div>

          <div className="bg-[#071626]/80 p-4 rounded-2xl border border-[#142A46] text-right">
            <span className="text-[11px] text-slate-400">الدروس المكتملة</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-sky-400">{activeAccount.completedLessonIds.length}</span>
              <span className="text-xs text-slate-400">درس</span>
            </div>
          </div>

          <div className="bg-[#071626]/80 p-4 rounded-2xl border border-[#142A46] text-right">
            <span className="text-[11px] text-slate-400">تتابع الدراسة</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-amber-500">{activeAccount.streakDays}</span>
              <span className="text-xs text-slate-400">أيام</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'bg-[#0E2440] text-slate-300 hover:text-white border border-[#1B385D]'
          }`}
        >
          {t('all')} ({badges.length})
        </button>
        <button
          onClick={() => setSelectedCategory('progress')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedCategory === 'progress'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'bg-[#0E2440] text-slate-300 hover:text-white border border-[#1B385D]'
          }`}
        >
          التقدم والدروس
        </button>
        <button
          onClick={() => setSelectedCategory('quiz')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedCategory === 'quiz'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'bg-[#0E2440] text-slate-300 hover:text-white border border-[#1B385D]'
          }`}
        >
          الاختبارات والدرجات
        </button>
        <button
          onClick={() => setSelectedCategory('streak')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedCategory === 'streak'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'bg-[#0E2440] text-slate-300 hover:text-white border border-[#1B385D]'
          }`}
        >
          التتابع والمواظبة
        </button>
        <button
          onClick={() => setSelectedCategory('subject')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedCategory === 'subject'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'bg-[#0E2440] text-slate-300 hover:text-white border border-[#1B385D]'
          }`}
        >
          المواد والتخصص
        </button>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredBadges.map(badge => {
          return (
            <div
              key={badge.id}
              className={`rounded-2xl p-5 border text-right transition-all relative overflow-hidden flex flex-col justify-between ${
                badge.isUnlocked
                  ? 'bg-gradient-to-b from-[#122A4A] to-[#0A1A2E] border-amber-500/40 shadow-xl shadow-amber-950/20'
                  : 'bg-[#08182B]/60 border-[#142A46] opacity-75 hover:opacity-90'
              }`}
            >
              {/* Unlock badge glow */}
              {badge.isUnlocked && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
              )}

              <div>
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${
                      badge.isUnlocked
                        ? 'bg-amber-500/20 border-2 border-amber-400/60 ring-2 ring-amber-400/20'
                        : 'bg-[#0E2440] border border-[#1B385D] grayscale'
                    }`}
                  >
                    {badge.icon}
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      badge.isUnlocked
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    +{badge.points} {t('points')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mb-1">
                  <h3 className="font-bold text-white text-sm">
                    {language === 'en' ? badge.titleEn : badge.title}
                  </h3>
                  {badge.isUnlocked && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {language === 'en' ? badge.descriptionEn : badge.description}
                </p>
              </div>

              {/* Progress and status */}
              <div className="mt-4 pt-3 border-t border-[#142A46]">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-slate-400">
                    {badge.isUnlocked ? 'تم الإنجاز بنجاح' : 'التقدم الحالي'}
                  </span>
                  <span
                    className={`font-semibold ${
                      badge.isUnlocked ? 'text-amber-400' : 'text-slate-300'
                    }`}
                  >
                    {badge.isUnlocked ? '100%' : `${badge.progressPercent}%`}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-[#071626] rounded-full overflow-hidden border border-[#142A46]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      badge.isUnlocked
                        ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                        : 'bg-sky-500'
                    }`}
                    style={{ width: `${badge.isUnlocked ? 100 : badge.progressPercent}%` }}
                  />
                </div>

                <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                  <span className="truncate max-w-[170px]">{badge.requirement}</span>
                  {badge.isUnlocked && badge.unlockedAt && (
                    <span className="text-amber-400/80 font-mono text-[9px]">{badge.unlockedAt}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Printable Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-[#0B1E36] border border-[#1E3A60] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Modal Actions Header */}
            <div className="p-4 bg-[#08172B] border-b border-[#1E3A60] flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">{t('certificateOfCompletion')}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintCertificate}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t('print')}</span>
                </button>
                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#162D4A] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Certificate Canvas Sheet */}
            <div className="p-6 sm:p-10 overflow-y-auto bg-slate-900 flex justify-center">
              <div 
                id="printable-certificate"
                className="w-full max-w-2xl bg-amber-50/95 text-slate-900 rounded-2xl p-8 sm:p-12 border-8 border-double border-amber-600 shadow-2xl relative text-center"
                style={{ fontFamily: "'Cairo', 'Amiri', serif" }}
              >
                {/* Decorative border corners */}
                <div className="absolute top-2 left-2 text-amber-700 text-xl">❖</div>
                <div className="absolute top-2 right-2 text-amber-700 text-xl">❖</div>
                <div className="absolute bottom-2 left-2 text-amber-700 text-xl">❖</div>
                <div className="absolute bottom-2 right-2 text-amber-700 text-xl">❖</div>

                {/* Header */}
                <div className="space-y-1 mb-6">
                  <span className="text-xs tracking-widest text-amber-900 font-semibold uppercase">
                    منصة الطالب السوداني الذكية • الصف الثالث المتوسط
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-amber-950 mt-1">
                    شهادة تفوق وإنجاز دراسي
                  </h2>
                  <div className="w-24 h-1 bg-amber-600 mx-auto rounded-full mt-2" />
                </div>

                {/* Body Text */}
                <p className="text-sm text-slate-700 mb-4">
                  تشهد منصة الطالب السوداني الذكية — الصف الثالث المتوسط (الشهادة المتوسطة) بأن الطالب/الطالبة:
                </p>

                <div className="my-5 py-3 px-6 bg-white/80 rounded-xl border border-amber-300 shadow-inner inline-block">
                  <h3 className="text-2xl sm:text-3xl font-black text-amber-900">
                    {activeAccount.name}
                  </h3>
                </div>

                <div className="text-xs text-slate-700 space-y-2 max-w-lg mx-auto leading-relaxed my-4">
                  <p>
                    المقيد بمدرسة <strong className="text-slate-900">{activeAccount.school}</strong> – ولاية <strong className="text-slate-900">{activeAccount.state}</strong>
                  </p>
                  <p>
                    قد أظهر تفوقاً ومثابرة ملحوظة في إكمال الوحدات الدراسية وحصد الأوسمة الرقمية المعتمدة وفق مقررات الشهادة الثانوية السودانية بمجموع <strong className="text-amber-800">{totalPoints} نقطة تفوق</strong>.
                  </p>
                </div>

                {/* Badges preview row */}
                <div className="flex items-center justify-center gap-3 my-6">
                  {unlockedBadges.slice(0, 4).map(b => (
                    <div key={b.id} className="text-center">
                      <div className="w-11 h-11 rounded-xl bg-amber-200/80 border border-amber-400 mx-auto flex items-center justify-center text-xl shadow-xs">
                        {b.icon}
                      </div>
                      <span className="text-[10px] text-amber-950 font-bold block mt-1 truncate max-w-[65px]">
                        {b.title}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Signatures & Seal */}
                <div className="mt-8 pt-6 border-t border-amber-300/80 grid grid-cols-2 text-xs text-slate-700">
                  <div className="text-right">
                    <span className="block text-[11px] text-slate-500">تاريخ التحرير:</span>
                    <span className="font-bold text-slate-900 font-mono">2026-10-16</span>
                    <span className="block text-[10px] text-slate-500 mt-2">اعتماد إدارة التعليم الإلكتروني</span>
                  </div>
                  <div className="text-left flex flex-col items-end">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-700 flex items-center justify-center text-[10px] text-amber-900 font-bold rotate-12 bg-amber-100/50 shadow-xs">
                      الختم الرسمي
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
