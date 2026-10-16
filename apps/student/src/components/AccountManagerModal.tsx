import React, { useState } from 'react';
import { useAccount } from '../context/AccountContext';
import { useLanguage } from '../context/LanguageContext';
import { X, UserPlus, Check, User, School, MapPin, Sparkles, Award } from 'lucide-react';
import { PlatformAuthCard } from './PlatformAuthCard';

const SUDANESE_STATES = [
  'الخرطوم',
  'الجزيرة',
  'البحر الأحمر',
  'نهر النيل',
  'الشمالية',
  'كسلا',
  'القضارف',
  'سنار',
  'النيل الأزرق',
  'النيل الأبيض',
  'شمال كردفان',
  'جنوب كردفان',
  'غرب كردفان',
  'شمال دارفور',
  'جنوب دارفور',
  'غرب دارفور',
  'وسط دارفور',
  'شرق دارفور'
];

const GRADE_TRACKS = [
  'الصف الثالث الثانوي (علمي رياضيات)',
  'الصف الثالث الثانوي (علمي أحياء)',
  'الصف الثالث الثانوي (المسار الأدبي)',
  'الصف الثاني الثانوي',
  'الصف الأول الثانوي',
];

const AVATAR_OPTIONS = ['👨‍🎓', '👩‍🎓', '🧑‍🎓', '🧑‍💻', '👩‍🔬', '👨‍🔬', '🌟', '📚'];

export const AccountManagerModal: React.FC = () => {
  const { accounts, activeAccount, switchAccount, createAccount, isAccountModalOpen, setIsAccountModalOpen } = useAccount();
  const { t, isRtl } = useLanguage();

  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState(GRADE_TRACKS[0]);
  const [newState, setNewState] = useState(SUDANESE_STATES[0]);
  const [newSchool, setNewSchool] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [formError, setFormError] = useState('');

  if (!isAccountModalOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError('الرجاء إدخال اسم الطالب');
      return;
    }
    if (!newSchool.trim()) {
      setFormError('الرجاء إدخال اسم المدرسة');
      return;
    }

    createAccount({
      name: newName.trim(),
      grade: newGrade,
      state: newState,
      school: newSchool.trim(),
      avatar: selectedAvatar,
    });

    setNewName('');
    setNewSchool('');
    setFormError('');
    setMode('list');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-[#0B1E36] border border-[#1E3A60] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1E3A60] flex items-center justify-between bg-[#08172B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('account')}</h3>
              <p className="text-xs text-slate-400">
                {mode === 'list' ? 'التبديل بين حسابات الطلاب أو إنشاء حساب جديد' : t('createNewAccount')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAccountModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#162D4A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {mode === 'list' && <PlatformAuthCard />}

          {mode === 'list' ? (
            <>
              {/* Account list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    الحسابات المسجلة ({accounts.length})
                  </span>
                  <button
                    onClick={() => setMode('create')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{t('createNewAccount')}</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {accounts.map(acc => {
                    const isActive = acc.id === activeAccount.id;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => switchAccount(acc.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-950/40 via-[#102B48] to-[#102B48] border-emerald-500/50 shadow-md'
                            : 'bg-[#0E2440]/60 border-[#1B3658] hover:border-slate-500/50 hover:bg-[#142E50]'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-[#09182A] border border-[#1E3A60] flex items-center justify-center text-2xl shadow-inner">
                            {acc.avatar || '👨‍🎓'}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-sm">{acc.name}</h4>
                              {isActive && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                                  {t('activeProfile')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{acc.grade}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-300">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-emerald-400" />
                                {acc.state}
                              </span>
                              <span className="flex items-center gap-1">
                                <School className="w-3 h-3 text-sky-400" />
                                {acc.school}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 text-right">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-[#071728] px-2.5 py-1 rounded-lg border border-[#1A385C]">
                            <Award className="w-3.5 h-3.5" />
                            <span>{acc.completedLessonIds.length} درس</span>
                          </div>
                          {isActive && (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Information callout */}
              <div className="bg-[#08182B] border border-[#1A375A] rounded-xl p-3.5 text-xs text-slate-300 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  يتم حفظ تقدم كل طالب (الدروس المكتملة، المذكرات المحفوظة، وتاريخ الاختبارات) بشكل منفصل في المتصفح. يمكنك التنقل بين الحسابات في أي وقت دون فقدان بياناتك.
                </p>
              </div>
            </>
          ) : (
            /* Create new account form */
            <form onSubmit={handleCreate} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  اختر الرمز التعبيري (Avatar)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVATAR_OPTIONS.map(av => (
                    <button
                      type="button"
                      key={av}
                      onClick={() => setSelectedAvatar(av)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-all ${
                        selectedAvatar === av
                          ? 'bg-emerald-500/20 border-emerald-500 scale-110 shadow-lg'
                          : 'bg-[#0E2440] border-[#1B3658] hover:border-slate-500'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('studentName')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="مثال: سارة محمد نور"
                  className="w-full bg-[#08172B] border border-[#1B3658] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-hidden transition-colors"
                />
              </div>

              {/* Grade */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('academicYear')}
                </label>
                <select
                  value={newGrade}
                  onChange={e => setNewGrade(e.target.value)}
                  className="w-full bg-[#08172B] border border-[#1B3658] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-hidden cursor-pointer"
                >
                  {GRADE_TRACKS.map(g => (
                    <option key={g} value={g} className="bg-[#08172B] text-white">
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* State */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t('state')}
                  </label>
                  <select
                    value={newState}
                    onChange={e => setNewState(e.target.value)}
                    className="w-full bg-[#08172B] border border-[#1B3658] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-hidden cursor-pointer"
                  >
                    {SUDANESE_STATES.map(s => (
                      <option key={s} value={s} className="bg-[#08172B] text-white">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* School */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t('schoolName')} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSchool}
                    onChange={e => setNewSchool(e.target.value)}
                    placeholder="مثال: مدرسة وادي سيدنا المتوسطة"
                    className="w-full bg-[#08172B] border border-[#1B3658] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1E3A60]">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#162D4A] transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/40 flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('createStudentProfile')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
