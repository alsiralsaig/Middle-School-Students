import React from 'react';
import { BarChart3, Database, RotateCcw, Server, Settings as SettingsIcon, Users } from 'lucide-react';
import {
  getApiBase,
  setApiBase,
  clearApiBase,
  hasCustomApiBase,
  getDefaultApiBase,
} from '../lib/serverUrl';
import { EmptyState, NotConnectedNote, Table } from '../components/ui';
import { useSimulatedData } from '../hooks/useSimulatedData';
import { SAMPLE_ACTIVITIES } from '@shared/sampleContent';

/* ============================ الطلاب ============================ */

interface StudentRow {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  grade: string;
  school: string;
  state: string;
  lastActivity: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  studyMinutes: number;
  examAttempts: number;
  status: string;
}

interface StudentsSummary {
  total: number;
  active: number;
  idle: number;
  totalLessons: number;
  averageProgress: number;
}

export const StudentsPage: React.FC = () => {
  const [rows, setRows] = React.useState<StudentRow[] | null>(null);
  const [summary, setSummary] = React.useState<StudentsSummary | null>(null);
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/admin/students`, {
          headers: { Accept: 'application/json', 'X-App': 'admin' },
          credentials: 'include',
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as {
          students: StudentRow[];
          summary: StudentsSummary;
        };
        if (!alive) return;
        setRows(data.students);
        setSummary(data.summary);
        setOffline(false);
      } catch {
        if (alive) {
          setRows(null);
          setOffline(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-black text-navy-800">الطلاب</h1>
        <p className="text-xs text-slate-500 mt-1">
          حسابات حقيقية من قاعدة البيانات، وتقدّم كل طالب محسوب من دروسه
          المكتملة وجلسات دراسته.
        </p>
      </header>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['إجمالي الطلاب', summary.total],
            ['نشطون هذا الأسبوع', summary.active],
            ['خاملون', summary.idle],
            ['متوسط الإكمال', `${summary.averageProgress}%`],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="bg-white border border-slate-200 rounded-2xl p-3"
            >
              <div className="text-lg font-black text-navy-800 nums">{value}</div>
              <div className="text-[11px] text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      {offline && (
        <NotConnectedNote>
          تعذّر الوصول إلى الخادم — لا يمكن عرض الطلاب. احفظ عنوان الخادم
          الصحيح من صفحة <strong>الإعدادات</strong>.
        </NotConnectedNote>
      )}

      {!offline && rows === null && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {rows !== null && rows.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl">
          <EmptyState
            title="لا يوجد طلاب مسجّلون"
            description="يظهر الطلاب هنا بعد إنشاء حساب بتسجيل الدخول أو برمز دخول."
            hint="رموز الدخول ← أنشئ رمزاً وشاركه مع الطالب"
          />
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <Table
            head={[
              '#',
              'الاسم',
              'الصف',
              'الدروس',
              'وقت الدراسة',
              'آخر نشاط',
              'الإكمال',
              'الحالة',
            ]}
          >
            {rows.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/70">
                <td className="py-2.5 px-3 nums text-slate-500">{s.code}</td>
                <td className="py-2.5 px-3 font-bold text-navy-800">{s.name}</td>
                <td className="py-2.5 px-3 text-slate-600">{s.grade}</td>
                <td className="py-2.5 px-3 nums text-slate-500">
                  {s.completedLessons}/{s.totalLessons}
                </td>
                <td className="py-2.5 px-3 nums text-slate-500">
                  {s.studyMinutes} د
                </td>
                <td className="py-2.5 px-3 text-slate-500">{s.lastActivity}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-navy-800"
                        style={{ width: `${s.progressPercent}%` }}
                      />
                    </div>
                    <span className="nums text-[10px] text-slate-500">
                      {s.progressPercent}%
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <span
                    className={
                      s.status === 'active'
                        ? 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700'
                        : 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500'
                    }
                  >
                    {s.status === 'active' ? 'نشط' : 'خامل'}
                  </span>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Users className="w-4 h-4 text-navy-800" />
          <span>
            كل رقم في هذا الجدول محسوب من قاعدة البيانات — لا قيم تجريبية.
          </span>
        </div>
      )}
    </div>
  );
};

/* ============================ الأنشطة والتقارير ============================ */

export const ActivitiesPage: React.FC = () => {
  const { data: activities, loading } = useSimulatedData(SAMPLE_ACTIVITIES);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-black text-navy-800">الأنشطة والتقارير</h1>
        <p className="text-xs text-slate-500 mt-1">
          سجل تجريبي يوضّح شكل التقارير بعد ربط قاعدة البيانات.
        </p>
      </header>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (activities ?? []).length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl">
          <EmptyState
            title="لا توجد أنشطة مسجّلة"
            description="لا يوجد تتبّع فعلي للنشاط في هذه المرحلة — ستُسجَّل الأحداث تلقائياً بعد ربط الخادم."
            hint="المرحلة القادمة: سجل الأنشطة"
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <ul className="divide-y divide-slate-100">
            {(activities ?? []).map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-gold-100 grid place-items-center shrink-0">
                  <BarChart3 className="w-4 h-4 text-gold-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-navy-800">{a.action}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{a.detail}</p>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">{a.time}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/* ============================ الإعدادات ============================ */

export const ServerUrlCard: React.FC = () => {
  const [value, setValue] = React.useState('');
  const [state, setState] = React.useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [msg, setMsg] = React.useState('');

  React.useEffect(() => {
    setValue(hasCustomApiBase() ? getApiBase() : '');
  }, []);

  const test = async () => {
    const base = value.trim().replace(/\/+$/, '');
    if (!base) { setState('fail'); setMsg('اكتب العنوان أولاً'); return; }
    setState('testing'); setMsg('');
    try {
      const res = await fetch(`${base}/api/admin/lessons`, {
        headers: { Accept: 'application/json', 'X-App': 'admin' },
        credentials: 'include',
      });
      if (res.status === 401 || res.status === 403) {
        setState('ok');
        setMsg('✅ الخادم يردّ — لكن تحتاج تسجيل دخول بصلاحية الإدارة');
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { lessons?: unknown[] };
      setState('ok');
      setMsg(`✅ الاتصال ناجح — ${data.lessons?.length ?? 0} درساً في قاعدة البيانات`);
    } catch {
      setState('fail');
      setMsg('❌ تعذّر الوصول. تأكد من العنوان وأن الخادم يعمل.');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Server className="w-4 h-4 text-navy-800" />
        <h2 className="text-sm font-black text-navy-800">عنوان الخادم</h2>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        يحفظ التطبيق هذا العنوان على جهازك، فيمكن تغييره بلا إعادة بناء اللوحة.
      </p>

      <input
        type="url"
        dir="ltr"
        value={value}
        onChange={(e) => { setValue(e.target.value); setState('idle'); setMsg(''); }}
        placeholder="https://my-api.onrender.com"
        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none text-left"
      />

      <p className="text-[11px] text-slate-400">
        الافتراضي: <span dir="ltr" className="font-mono">{getDefaultApiBase()}</span>
      </p>

      {msg && (
        <p className={`text-xs font-bold ${state === 'fail' ? 'text-red-600' : 'text-emerald-700'}`}>
          {msg}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={test}
          disabled={state === 'testing'}
          className="flex-1 py-2 rounded-xl border border-navy-800 text-navy-800 text-xs font-bold hover:bg-navy-50 disabled:opacity-50"
        >
          {state === 'testing' ? 'جارٍ الاختبار…' : 'اختبار الاتصال'}
        </button>
        <button
          onClick={() => { setApiBase(value); setState('idle'); setMsg('✅ حُفظ العنوان'); }}
          className="flex-1 py-2 rounded-xl bg-navy-800 text-white text-xs font-black hover:bg-navy-700"
        >
          حفظ
        </button>
        <button
          onClick={() => { clearApiBase(); setValue(''); setState('idle'); setMsg('أُعيد العنوان الافتراضي'); }}
          aria-label="إعادة الافتراضي"
          className="px-3 py-2 rounded-xl border border-slate-300 text-slate-500 hover:bg-slate-50"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const rows = [
    ['اسم المنصة', 'منصة الطالب السوداني الذكية'],
    ['الصف المستهدف', 'الصف الثالث المتوسط — الشهادة المتوسطة'],
    ['اللغة والاتجاه', 'العربية · RTL'],
    ['هوية الألوان', 'كحلي #002368 · ذهبي #F1AC12'],
    ['قاعدة البيانات', 'غير متصلة (المرحلة القادمة)'],
    ['خدمة الحسابات', 'غير متصلة'],
    ['تخزين الملفات', 'غير متصل'],
    ['مساعد الذكاء الاصطناعي', 'غير متصل'],
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-black text-navy-800">الإعدادات</h1>
        <p className="text-xs text-slate-500 mt-1">
          إعدادات العرض والهوية — القيم تُقرأ من الحزمة المشتركة shared/brand.ts.
        </p>
      </header>

      <ServerUrlCard />

      <NotConnectedNote>
        حفظ الإعدادات <strong>غير مُفعّل</strong>: لا توجد قاعدة بيانات. القيم أدناه للعرض فقط.
      </NotConnectedNote>

      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <ul className="divide-y divide-slate-100">
          {rows.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between gap-3 py-3">
              <span className="text-xs text-slate-600">{k}</span>
              <span className="text-xs font-bold text-navy-800 text-left">{v}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <Database className="w-4 h-4 text-navy-800" />
        <span>عند ربط الخادم ستُقرأ هذه القيم من لوحة التحكم بدل الحزمة الثابتة.</span>
      </div>
    </div>
  );
};

export { SettingsIcon };
