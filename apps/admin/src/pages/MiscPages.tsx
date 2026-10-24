import React from 'react';
import { AtSign, CheckCircle2, KeyRound, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { BarChart3, Database, RotateCcw, Server, Settings as SettingsIcon, Users } from 'lucide-react';
import {
  getApiBase,
  setApiBase,
  clearApiBase,
  hasCustomApiBase,
  getDefaultApiBase,
} from '../lib/serverUrl';
import { EmptyState, NotConnectedNote, Table } from '../components/ui';

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

interface ActivitySummary {
  totalMinutes: number;
  totalSessions: number;
  completedLessons: number;
  students: number;
  examAttempts: number;
  averageScore: number;
  averageMinutesPerStudent: number;
}

interface ActivityDay {
  day: string;
  minutes: number;
  sessions: number;
}

interface RecentAttempt {
  id: string;
  student: string;
  exam: string;
  score: number;
  total: number;
  percent: number;
  finished: boolean;
  at: string;
}

export const ActivitiesPage: React.FC = () => {
  const [summary, setSummary] = React.useState<ActivitySummary | null>(null);
  const [days, setDays] = React.useState<ActivityDay[]>([]);
  const [attempts, setAttempts] = React.useState<RecentAttempt[]>([]);
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/admin/activity`, {
          headers: { Accept: 'application/json', 'X-App': 'admin' },
          credentials: 'include',
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as {
          summary: ActivitySummary;
          days: ActivityDay[];
          recentAttempts: RecentAttempt[];
        };
        if (!alive) return;
        setSummary(data.summary);
        setDays(data.days);
        setAttempts(data.recentAttempts);
        setOffline(false);
      } catch {
        if (alive) { setSummary(null); setOffline(true); }
      }
    })();
    return () => { alive = false; };
  }, []);

  const maxMinutes = Math.max(1, ...days.map((d) => d.minutes));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-black text-navy-800">الأنشطة والتقارير</h1>
        <p className="text-xs text-slate-500 mt-1">
          كل رقم مقروء من جداول الجلسات والتقدّم ومحاولات الاختبارات.
        </p>
      </header>

      {offline && (
        <NotConnectedNote>
          تعذّر الوصول إلى الخادم. احفظ عنوان الخادم الصحيح من صفحة{' '}
          <strong>الإعدادات</strong>.
        </NotConnectedNote>
      )}

      {summary === null && !offline && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['دقائق الدراسة', summary.totalMinutes],
              ['الجلسات', summary.totalSessions],
              ['دروس مكتملة', summary.completedLessons],
              ['متوسط النتيجة', `${summary.averageScore}%`],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-white border border-slate-200 rounded-2xl p-3">
                <div className="text-lg font-black text-navy-800 nums">{value}</div>
                <div className="text-[11px] text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <h2 className="text-sm font-black text-navy-800 mb-3">
              دقائق الدراسة حسب اليوم
            </h2>
            {days.length === 0 ? (
              <p className="text-xs text-slate-500">لا جلسات مسجّلة بعد.</p>
            ) : (
              <div className="space-y-1.5">
                {days.map((d) => (
                  <div key={d.day} className="flex items-center gap-3">
                    <span className="nums text-[10px] text-slate-500 w-20 shrink-0">{d.day}</span>
                    <div className="flex-1 h-4 rounded bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded bg-navy-800"
                        style={{ width: `${Math.round((d.minutes / maxMinutes) * 100)}%` }}
                      />
                    </div>
                    <span className="nums text-[10px] text-slate-600 w-16 text-left">
                      {d.minutes} د
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <h2 className="text-sm font-black text-navy-800 mb-3">
              آخر محاولات الاختبارات
            </h2>
            {attempts.length === 0 ? (
              <p className="text-xs text-slate-500">لا محاولات بعد.</p>
            ) : (
              <Table head={['الطالب', 'الاختبار', 'النتيجة', 'النسبة']}>
                {attempts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-bold text-navy-800">{a.student}</td>
                    <td className="py-2.5 px-3 text-slate-600">{a.exam}</td>
                    <td className="py-2.5 px-3 nums text-slate-500">
                      {a.score}/{a.total}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={
                          a.percent >= 50
                            ? 'nums text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700'
                            : 'nums text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700'
                        }
                      >
                        {a.percent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <BarChart3 className="w-4 h-4 text-navy-800" />
            <span>لا أرقام مقدَّرة — كل ما سبق محسوب من قاعدة البيانات.</span>
          </div>
        </>
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

/* ============================ أمن الحساب ============================ */

const adminHeaders = { 'Content-Type': 'application/json', Accept: 'application/json', 'X-App': 'admin' } as const;

/** بيانات الدخول: البريد والهاتف — كلاهما يصلح للدخول */
export const LoginContactCard: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [loaded, setLoaded] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [isError, setIsError] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/auth/me`, { headers: adminHeaders, credentials: 'include' });
        const data = (await res.json()) as { user?: { email?: string | null; phone?: string | null } };
        setEmail(data.user?.email || '');
        setPhone(data.user?.phone || '');
      } catch {
        /* تجاهل: الحقول تبقى فارغة */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setNote(''); setIsError(false);
    if (!email.trim() && !phone.trim()) { setIsError(true); setNote('لازم يبقى واحد منهم على الأقل للدخول.'); return; }
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setIsError(true); setNote('صيغة البريد غير صحيحة.'); return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${getApiBase()}/api/auth/me`, {
        method: 'PATCH', headers: adminHeaders, credentials: 'include',
        body: JSON.stringify({ email: email.trim().toLowerCase(), phone: phone.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; user?: { email?: string | null; phone?: string | null } } | null;
      if (!res.ok) throw new Error(data?.error || String(res.status));
      setEmail(data?.user?.email || '');
      setPhone(data?.user?.phone || '');
      setNote('تم الحفظ — تقدر تدخل بالبريد أو بالهاتف.');
    } catch (e) {
      setIsError(true);
      setNote(e instanceof Error ? e.message : 'تعذّر الحفظ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AtSign className="w-4 h-4 text-navy-800" />
        <h2 className="text-sm font-black text-navy-800">بيانات الدخول</h2>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        الهاتف والبريد يشتغلان كمعرّفين للدخول — أي واحد فيهم وكلمة المرور.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-[11px] font-bold text-slate-700">
          رقم الهاتف
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            disabled={!loaded}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-navy-800 focus:outline-none disabled:bg-slate-50"
          />
        </label>
        <label className="space-y-1 text-[11px] font-bold text-slate-700">
          البريد الإلكتروني
          <input
            type="email"
            autoComplete="email"
            value={email}
            disabled={!loaded}
            placeholder="مثال: name@gmail.com"
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-navy-800 focus:outline-none disabled:bg-slate-50"
          />
        </label>
      </div>
      {note && (
        <p className={`text-[11px] rounded-xl px-3 py-2 border ${isError ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>{note}</p>
      )}
      <button type="submit" disabled={busy || !loaded} className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-700 disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <AtSign className="w-4 h-4" />} حفظ بيانات الدخول
      </button>
    </form>
  );
};

/** تغيير كلمة مرور المدير الحالي */
export const PasswordChangeCard: React.FC = () => {
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [isError, setIsError] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setNote(''); setIsError(false);
    if (next.length < 8) { setIsError(true); setNote('كلمة المرور الجديدة ٨ أحرف على الأقل.'); return; }
    if (next !== confirm) { setIsError(true); setNote('التأكيد لا يطابق كلمة المرور الجديدة.'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${getApiBase()}/api/auth/password`, {
        method: 'POST', headers: adminHeaders, credentials: 'include',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => null) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || String(res.status));
      setNote('تم تغيير كلمة المرور — استخدمها في الدخول القادم.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e) {
      setIsError(true);
      setNote(e instanceof Error ? e.message : 'تعذّر تغيير كلمة المرور');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-navy-800" />
        <h2 className="text-sm font-black text-navy-800">تغيير كلمة المرور</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['كلمة المرور الحالية', current, setCurrent, 'current-password'],
          ['الجديدة (٨ أحرف أو أكثر)', next, setNext, 'new-password'],
          ['تأكيد الجديدة', confirm, setConfirm, 'new-password'],
        ].map(([label, value, setter, auto]) => (
          <label key={label as string} className="space-y-1 text-[11px] font-bold text-slate-700">
            {label as string}
            <input
              type="password"
              autoComplete={auto as string}
              value={value as string}
              onChange={(e) => (setter as (v: string) => void)(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-navy-800 focus:outline-none"
            />
          </label>
        ))}
      </div>
      {note && (
        <p className={`text-[11px] rounded-xl px-3 py-2 border ${isError ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>{note}</p>
      )}
      <button type="submit" disabled={busy || !current || !next} className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-700 disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} حفظ كلمة المرور
      </button>
    </form>
  );
};

interface ResetRow {
  id: string; identifier: string; status: string; createdAt: string;
  userName: string; userPhone: string | null; userEmail: string | null; userRole: string;
}

/** طلبات «نسيت كلمة المرور» — المدير يُصدر كلمة مؤقتة ويبلّغها للطالب */
export const PasswordRequestsCard: React.FC = () => {
  const [rows, setRows] = React.useState<ResetRow[] | null>(null);
  const [busy, setBusy] = React.useState('');
  const [issued, setIssued] = React.useState<{ password: string; who: string } | null>(null);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/admin/password-requests`, { headers: adminHeaders, credentials: 'include' });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json() as { requests: ResetRow[] };
      setRows(data.requests);
      setError('');
    } catch {
      setRows([]);
      setError('تعذّر تحميل الطلبات — تحقّق من الاتصال بالخادم.');
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const act = async (id: string, action: 'issue' | 'dismiss') => {
    setBusy(id);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/password-requests/${id}/${action}`, {
        method: 'POST', headers: adminHeaders, credentials: 'include',
      });
      const data = await res.json().catch(() => null) as { tempPassword?: string; user?: { name: string } } | null;
      if (!res.ok) throw new Error(String(res.status));
      if (action === 'issue' && data?.tempPassword) {
        setIssued({ password: data.tempPassword, who: data.user?.name || 'المستخدم' });
      }
      await load();
    } catch {
      setError('تعذّر تنفيذ العملية.');
    } finally {
      setBusy('');
    }
  };

  const pending = (rows ?? []).filter((r) => r.status === 'pending');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-navy-800" />
          <h2 className="text-sm font-black text-navy-800">طلبات استعادة كلمة المرور</h2>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50">
          <RefreshCw className="w-3.5 h-3.5" /> تحديث
        </button>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        الطالب يضغط «نسيت كلمة المرور» فيدخل طلبه هنا. أصدر له كلمة مؤقتة وأبلغه بها (واتساب)، ويغيّرها بعد الدخول.
        {pending.length > 0 && <span className="font-bold text-amber-700"> — عندك {pending.length} طلب معلّق.</span>}
      </p>

      {issued && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-1">
          <p className="text-[11px] font-bold text-emerald-900">كلمة المرور المؤقتة لـ {issued.who}:</p>
          <p className="nums text-lg font-black tracking-widest text-emerald-900">{issued.password}</p>
          <p className="text-[10px] text-emerald-700">تُعرض مرة واحدة فقط — انسخها الآن وأرسلها للمستخدم.</p>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

      {rows === null ? (
        <p className="text-[11px] text-slate-500">جارٍ التحميل…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="لا طلبات" description="لما يطلب أحد استعادة كلمة المرور بيظهر طلبه هنا." />
      ) : (
        <Table head={['المستخدم', 'المعرّف', 'الحالة', 'التاريخ', 'إجراء']}>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3">
                <p className="font-bold text-navy-800">{r.userName}</p>
                <p className="text-[10px] text-slate-400">{r.userRole === 'admin' ? 'إدارة' : 'طالب'}</p>
              </td>
              <td className="py-2.5 px-3 nums text-slate-600">{r.identifier}</td>
              <td className="py-2.5 px-3">
                {r.status === 'pending' ? <span className="text-[11px] font-bold text-amber-700">معلّق</span>
                  : r.status === 'issued' ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> صدرت</span>
                    : <span className="text-[11px] text-slate-500">مغلق</span>}
              </td>
              <td className="py-2.5 px-3 text-[11px] text-slate-500 whitespace-nowrap">{String(r.createdAt).slice(0, 10)}</td>
              <td className="py-2.5 px-3">
                {r.status === 'pending' ? (
                  <div className="flex gap-1.5">
                    <button type="button" disabled={busy === r.id} onClick={() => void act(r.id, 'issue')} className="rounded-lg bg-navy-800 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-navy-700 disabled:opacity-50">
                      {busy === r.id ? '…' : 'إصدار كلمة مؤقتة'}
                    </button>
                    <button type="button" disabled={busy === r.id} onClick={() => void act(r.id, 'dismiss')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                      إغلاق
                    </button>
                  </div>
                ) : <span className="text-[10px] text-slate-400">—</span>}
              </td>
            </tr>
          ))}
        </Table>
      )}
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

      <LoginContactCard />

      <PasswordChangeCard />

      <PasswordRequestsCard />

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
