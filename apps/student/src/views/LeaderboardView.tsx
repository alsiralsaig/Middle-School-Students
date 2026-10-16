import React, { useState } from 'react';
import { 
  Trophy, 
  Medal, 
  Flame, 
  CheckCircle, 
  Award, 
  MapPin, 
  School, 
  Search, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { INITIAL_LEADERBOARD } from '../data/platformFeaturesData';
import { useLanguage } from '../context/LanguageContext';
import { useAccount } from '../context/AccountContext';

interface LeaderboardViewProps {
  onBack: () => void;
}

const STATES_FILTER = [
  'جميع الولايات',
  'الخرطوم',
  'الجزيرة',
  'البحر الأحمر',
  'نهر النيل',
  'سنار',
  'شمال كردفان',
  'كسلا',
];

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onBack }) => {
  const { t, language, isRtl } = useLanguage();
  const { activeAccount } = useAccount();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('جميع الولايات');
  const [timePeriod, setTimePeriod] = useState<'weekly' | 'monthly' | 'all'>('weekly');

  // Filter leaderboard
  const filteredStudents = INITIAL_LEADERBOARD.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.school.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = selectedState === 'جميع الولايات' || student.state === selectedState;
    return matchesSearch && matchesState;
  });

  const top3 = filteredStudents.slice(0, 3);
  const remaining = filteredStudents.slice(3);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner & Header */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#0F294D] via-[#0C2240] to-[#08182B] border border-[#1E3E6B] shadow-2xl overflow-hidden">
        {/* Glow effects */}
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
              <span className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <Trophy className="w-6 h-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {t('leaderboardTitle')}
              </h1>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {t('leaderboardSubtitle')}
            </p>
          </div>

          {/* Current student quick rank highlight */}
          <div className="bg-[#08182B]/80 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4 text-right shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-black text-xl">
              #4
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{t('yourRank')}</span>
              </div>
              <h4 className="text-white font-bold text-sm mt-0.5">{activeAccount.name}</h4>
              <p className="text-[11px] text-slate-300">
                1,850 نقطة • {activeAccount.completedLessonIds.length} دروس مكتملة
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0A1A2E] p-4 rounded-2xl border border-[#163152]">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم الطالب أو مدرسته..."
            className="w-full bg-[#071526] border border-[#1A385C] focus:border-amber-400 rounded-xl pr-10 pl-3.5 py-2 text-xs text-white placeholder-slate-500 outline-hidden transition-colors"
          />
        </div>

        {/* Time period pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimePeriod('weekly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              timePeriod === 'weekly'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-[#0E2440] text-slate-300 hover:text-white border border-[#1A385C]'
            }`}
          >
            {t('weekly')}
          </button>
          <button
            onClick={() => setTimePeriod('monthly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              timePeriod === 'monthly'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-[#0E2440] text-slate-300 hover:text-white border border-[#1A385C]'
            }`}
          >
            {t('monthly')}
          </button>
          <button
            onClick={() => setTimePeriod('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              timePeriod === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-[#0E2440] text-slate-300 hover:text-white border border-[#1A385C]'
            }`}
          >
            {t('allTime')}
          </button>
        </div>

        {/* State filter selector */}
        <select
          value={selectedState}
          onChange={e => setSelectedState(e.target.value)}
          className="bg-[#071526] border border-[#1A385C] focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-hidden cursor-pointer"
        >
          {STATES_FILTER.map(s => (
            <option key={s} value={s} className="bg-[#071526] text-white">
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Podium for Top 3 */}
      {top3.length >= 3 && selectedState === 'جميع الولايات' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
          {/* Rank 2 - Silver */}
          <div className="order-2 md:order-1 bg-gradient-to-b from-[#10243E] to-[#0A1A2E] border border-slate-400/30 rounded-3xl p-6 text-center relative flex flex-col justify-between shadow-xl transform md:translate-y-4">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-950 font-black text-xs px-3 py-1 rounded-full border border-white shadow-md flex items-center gap-1">
              <Medal className="w-3.5 h-3.5" />
              <span>المركز الثاني 🥈</span>
            </div>
            <div>
              <div className="w-20 h-20 rounded-2xl bg-slate-800/80 border-2 border-slate-300/40 mx-auto flex items-center justify-center text-4xl shadow-inner mt-2 mb-3">
                {top3[1].avatar}
              </div>
              <h3 className="font-bold text-white text-base">{top3[1].name}</h3>
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                <School className="w-3 h-3 text-sky-400" />
                <span>{top3[1].school}</span>
              </p>
              <span className="inline-block mt-2 text-[11px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                {top3[1].state}
              </span>
            </div>
            <div className="mt-6 pt-4 border-t border-[#162D4A] flex items-center justify-around text-xs">
              <div>
                <span className="block text-slate-400 text-[10px]">الدروس</span>
                <span className="font-bold text-white">{top3[1].completedLessons}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px]">الامتحانات</span>
                <span className="font-bold text-emerald-400">{top3[1].examsPassed}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px]">النقاط</span>
                <span className="font-bold text-amber-300">{top3[1].score}</span>
              </div>
            </div>
          </div>

          {/* Rank 1 - Gold (Center, prominent) */}
          <div className="order-1 md:order-2 bg-gradient-to-b from-[#23200D] via-[#152336] to-[#0A1A2E] border-2 border-amber-400/60 rounded-3xl p-7 text-center relative flex flex-col justify-between shadow-2xl ring-2 ring-amber-400/20">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs px-4 py-1.5 rounded-full border border-white shadow-lg flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              <span>المركز الأول 🥇</span>
            </div>
            <div>
              <div className="w-24 h-24 rounded-2xl bg-amber-500/20 border-2 border-amber-400 mx-auto flex items-center justify-center text-5xl shadow-xl mt-3 mb-3">
                {top3[0].avatar}
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-bold bg-amber-400/10 border border-amber-400/30 px-3 py-0.5 rounded-full mb-1">
                <Sparkles className="w-3 h-3" />
                <span>نجم الأسبوع</span>
              </div>
              <h3 className="font-black text-white text-lg">{top3[0].name}</h3>
              <p className="text-xs text-slate-300 flex items-center justify-center gap-1 mt-1">
                <School className="w-3 h-3 text-sky-400" />
                <span>{top3[0].school}</span>
              </p>
              <span className="inline-block mt-2 text-[11px] bg-amber-950/60 text-amber-300 px-3 py-0.5 rounded-full border border-amber-500/30 font-medium">
                {top3[0].state}
              </span>
            </div>
            <div className="mt-6 pt-4 border-t border-amber-500/20 flex items-center justify-around text-xs">
              <div>
                <span className="block text-slate-400 text-[10px]">الدروس</span>
                <span className="font-bold text-white">{top3[0].completedLessons}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px]">الامتحانات</span>
                <span className="font-bold text-emerald-400">{top3[0].examsPassed}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px]">النقاط</span>
                <span className="font-bold text-amber-300 text-sm">{top3[0].score}</span>
              </div>
            </div>
          </div>

          {/* Rank 3 - Bronze */}
          <div className="order-3 bg-gradient-to-b from-[#1F1710] to-[#0A1A2E] border border-amber-700/40 rounded-3xl p-6 text-center relative flex flex-col justify-between shadow-xl transform md:translate-y-6">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-700 text-white font-black text-xs px-3 py-1 rounded-full border border-amber-500 shadow-md flex items-center gap-1">
              <Medal className="w-3.5 h-3.5" />
              <span>المركز الثالث 🥉</span>
            </div>
            <div>
              <div className="w-20 h-20 rounded-2xl bg-amber-950/50 border-2 border-amber-700/50 mx-auto flex items-center justify-center text-4xl shadow-inner mt-2 mb-3">
                {top3[2].avatar}
              </div>
              <h3 className="font-bold text-white text-base">{top3[2].name}</h3>
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                <School className="w-3 h-3 text-sky-400" />
                <span>{top3[2].school}</span>
              </p>
              <span className="inline-block mt-2 text-[11px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                {top3[2].state}
              </span>
            </div>
            <div className="mt-6 pt-4 border-t border-[#162D4A] flex items-center justify-around text-xs">
              <div>
                <span className="block text-slate-400 text-[10px]">الدروس</span>
                <span className="font-bold text-white">{top3[2].completedLessons}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px]">الامتحانات</span>
                <span className="font-bold text-emerald-400">{top3[2].examsPassed}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px]">النقاط</span>
                <span className="font-bold text-amber-300">{top3[2].score}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-[#0B1E36] border border-[#1A375A] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#08172B] border-b border-[#1A375A] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>ترتيب الطلاب ({filteredStudents.length})</span>
          </h3>
          <span className="text-xs text-slate-400">تحديث أسبوعي تلقائي</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#09182A] text-slate-400 border-b border-[#142A46]">
              <tr>
                <th className="py-3.5 px-4 font-semibold text-center w-16">الترتيب</th>
                <th className="py-3.5 px-4 font-semibold">الطالب</th>
                <th className="py-3.5 px-4 font-semibold">المدرسة والولاية</th>
                <th className="py-3.5 px-4 font-semibold text-center">الدروس المكتملة</th>
                <th className="py-3.5 px-4 font-semibold text-center">امتحانات مجتازة</th>
                <th className="py-3.5 px-4 font-semibold text-center">التتابع</th>
                <th className="py-3.5 px-4 font-semibold text-center">مجموع النقاط</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#142A46]">
              {filteredStudents.map((student, idx) => {
                const rank = idx + 1;
                const isCurrent = student.isCurrentStudent;

                return (
                  <tr
                    key={student.id}
                    className={`transition-colors ${
                      isCurrent
                        ? 'bg-amber-500/10 hover:bg-amber-500/15 font-semibold'
                        : 'hover:bg-[#0E2442]'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-bold text-xs ${
                          rank === 1
                            ? 'bg-amber-400 text-slate-950 shadow-md'
                            : rank === 2
                            ? 'bg-slate-300 text-slate-950 shadow-md'
                            : rank === 3
                            ? 'bg-amber-700 text-white shadow-md'
                            : 'bg-[#0E2440] text-slate-300 border border-[#1A385C]'
                        }`}
                      >
                        {rank}
                      </span>
                    </td>

                    {/* Student Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{student.avatar}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-bold">{student.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                                أنت
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* School & State */}
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center gap-1 text-[11px]">
                        <School className="w-3 h-3 text-sky-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{student.school}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        <span>{student.state}</span>
                      </div>
                    </td>

                    {/* Completed Lessons */}
                    <td className="py-3.5 px-4 text-center font-semibold text-white">
                      <span className="inline-flex items-center gap-1 bg-[#071626] px-2.5 py-1 rounded-lg border border-[#173252]">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span>{student.completedLessons}</span>
                      </span>
                    </td>

                    {/* Exams Passed */}
                    <td className="py-3.5 px-4 text-center font-semibold text-emerald-400">
                      <span className="inline-flex items-center gap-1 bg-[#071626] px-2.5 py-1 rounded-lg border border-[#173252]">
                        <Award className="w-3 h-3 text-sky-400" />
                        <span>{student.examsPassed}</span>
                      </span>
                    </td>

                    {/* Streak */}
                    <td className="py-3.5 px-4 text-center text-amber-400 font-semibold">
                      <span className="inline-flex items-center gap-1 bg-[#071626] px-2.5 py-1 rounded-lg border border-[#173252]">
                        <Flame className="w-3 h-3 text-amber-400" />
                        <span>{student.streakDays} ي</span>
                      </span>
                    </td>

                    {/* Total Score */}
                    <td className="py-3.5 px-4 text-center font-bold text-amber-300">
                      <span className="bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-lg">
                        {student.score.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
