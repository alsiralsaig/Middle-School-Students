import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  FileText,
  FlaskConical,
  GraduationCap,
  KeyRound,
  Layers,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge, Card, NotConnectedNote } from '../components/ui';
import { subjectEmoji } from '@shared/curriculum';
import { getApiBase } from '../lib/serverUrl';
import { BRAND } from '@shared/brand';

const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: number | string;
  hint?: string;
  tone?: string;
  to: string;
}> = ({ icon: Icon, label, value, hint, tone = 'text-navy-800', to }) => (
  <Link to={to} aria-label={`${label}: ${value} — فتح الصفحة`} className="block text-right bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-navy-300 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[11px] text-slate-500 font-bold">{label}</p>
        <p className={`text-2xl font-black mt-1 nums ${tone}`}>{value}</p>
        {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
      </div>
      <div className="w-10 h-10 rounded-xl bg-navy-50 grid place-items-center">
        <Icon className="w-5 h-5 text-navy-800" />
      </div>
    </div>
  </Link>
);

interface OverviewStats {
  subjects: number;
  units: number;
  plannedUnits: number;
  lessons: number;
  plannedLessons: number;
  verifiedLessons: number;
  sampleLessons: number;
  resources: number;
  students: number;
  activeCodes: number;
  exams: number;
  examAttempts: number;
  coverage: number;
}

interface OverviewSubject {
  id: string;
  name: string;
  code: string;
  status: string;
  units: number;
  plannedUnits: number;
  lessons: number;
  plannedLessons: number;
  coverage: number;
  gradeWarning: string | null;
}

interface ReadinessItem {
  label: string;
  state: 'ready' | 'partial' | 'off';
  note: string;
}

export const OverviewPage: React.FC = () => {
  const [stats, setStats] = React.useState<OverviewStats | null>(null);
  const [subjects, setSubjects] = React.useState<OverviewSubject[]>([]);
  const [readiness, setReadiness] = React.useState<ReadinessItem[]>([]);
  const [offline, setOffline] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/admin/overview`, {
        headers: { Accept: 'application/json', 'X-App': 'admin' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        stats: OverviewStats;
        subjects: OverviewSubject[];
        readiness: ReadinessItem[];
      };
      setStats(data.stats);
      setSubjects(data.subjects);
      setReadiness(data.readiness);
      setOffline(false);
    } catch {
      setStats(null);
      setOffline(true);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      {/* هيدر */}
      <div className="rounded-2xl overflow-hidden border border-slate-200">
        <div className="relative h-28 sm:h-36">
          <img src="/brand/banner.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,35,104,.92), rgba(5,66,135,.72))' }} />
          <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-center">
            <h1 className="text-white text-lg sm:text-2xl font-black">لوحة الإدارة</h1>
            <p className="text-white/80 text-[11px] sm:text-xs mt-1">
              {BRAND.name} — {BRAND.grade}
            </p>
          </div>
        </div>
      </div>

      {offline && (
        <NotConnectedNote>
          تعذّر الوصول إلى الخادم. احفظ عنوان الخادم الصحيح من صفحة{' '}
          <strong>الإعدادات</strong>، ثم أعد تحميل هذه الصفحة.
        </NotConnectedNote>
      )}

      {/* إحصاءات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="المواد" value={stats?.subjects ?? '—'} to="/subjects" />
        <StatCard
          icon={Layers}
          label="الوحدات"
          value={stats?.units ?? '—'}
          hint={stats ? `من ${stats.plannedUnits} في الخطة` : undefined}
          to="/units"
        />
        <StatCard
          icon={FlaskConical}
          label="الدروس"
          value={stats?.lessons ?? '—'}
          hint={stats ? `من ${stats.plannedLessons} · ${stats.coverage}%` : undefined}
          to="/content"
        />
        <StatCard icon={FileText} label="عناصر المكتبة" value={stats?.resources ?? '—'} to="/library" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="الطلاب المسجّلون" value={stats?.students ?? '—'} to="/students" />
        <StatCard icon={KeyRound} label="رموز نشطة" value={stats?.activeCodes ?? '—'} to="/codes" />
        <StatCard icon={GraduationCap} label="الامتحانات" value={stats?.exams ?? '—'} to="/exams" />
        <StatCard
          icon={CheckCircle2}
          label="دروس مُراجَعة"
          value={stats ? `${stats.verifiedLessons}/${stats.lessons}` : '—'}
          hint={stats ? `${stats.sampleLessons} بوسم «تجريبي»` : undefined}
          to="/content"
        />
      </div>

      {/* حالة المحتوى */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card
          title="المواد وتغطية المنهج"
          subtitle="من قاعدة البيانات — المصدر الوحيد للمنهج"
        >
          {stats === null ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {subjects.map((s) => (
                <li key={s.id} className="py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center">{subjectEmoji(s.id)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-navy-800 truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {s.units} من {s.plannedUnits} وحدة · {s.lessons} من{' '}
                        {s.plannedLessons} درس
                      </p>
                    </div>
                    <span className="nums text-xs font-black text-navy-800">
                      {s.coverage}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-navy-800"
                      style={{ width: `${s.coverage}%` }}
                    />
                  </div>
                  {s.gradeWarning && (
                    <p className="mt-1.5 text-[10px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
                      ⚠️ {s.gradeWarning}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="حالة الميزات" subtitle="مقروءة من واقع قاعدة البيانات">
          {readiness.length === 0 ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-8 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="space-y-3">
              {readiness.map((item) => (
                <li key={item.label}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-700">
                      {item.label}
                    </span>
                    {item.state === 'ready' ? (
                      <Badge tone="green">
                        <CheckCircle2 className="w-3 h-3" /> يعمل
                      </Badge>
                    ) : item.state === 'partial' ? (
                      <Badge tone="amber">جزئي</Badge>
                    ) : (
                      <Badge tone="slate">غير متصل</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.note}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 rounded-xl p-3">
            <TrendingUp className="w-4 h-4 text-navy-800" />
            <span>
              كل رقم في هذه الصفحة مقروء من قاعدة البيانات — لا قيم مقدَّرة.
            </span>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/content"
          className="text-xs font-extrabold bg-navy-800 text-white px-4 py-2.5 rounded-xl hover:bg-navy-500"
        >
          إدارة المحتوى
        </Link>
        <Link
          to="/library"
          className="text-xs font-extrabold border border-navy-200 text-navy-800 px-4 py-2.5 rounded-xl hover:bg-navy-50"
        >
          المكتبة
        </Link>
        <Link
          to="/students"
          className="text-xs font-extrabold border border-navy-200 text-navy-800 px-4 py-2.5 rounded-xl hover:bg-navy-50"
        >
          الطلاب
        </Link>
      </div>
    </div>
  );
};
