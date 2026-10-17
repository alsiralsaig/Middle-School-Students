import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Ticket,
  XCircle,
} from 'lucide-react';
import { Badge, Card, EmptyState, Table } from '../components/ui';
import { codesApi, type AccessCode } from '../lib/adminApi';

const STATUS: Record<string, { label: string; tone: 'green' | 'amber' | 'slate' }> = {
  active: { label: 'صالح', tone: 'green' },
  used: { label: 'مستخدم', tone: 'slate' },
  revoked: { label: 'مُلغى', tone: 'amber' },
};

const fmt = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
};

/**
 * «رموز الدخول» — الإدارة تولّد رمزاً، وتُعطيه للطالب، فيستخدمه **مرة واحدة**
 * عند إنشاء حسابه في تطبيق الطالب.
 *
 * لماذا هذه الشاشة: تطبيق الطالب مخصّص للطلاب، والإدارة هي من يأذن بالدخول.
 * والجدول يبيّن من استخدم كل رمز ومتى — حتى تعرف الإدارة بالضبط من دخل.
 */
const CodesPage: React.FC = () => {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  /* نموذج التوليد */
  const [count, setCount] = useState(1);
  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [grade, setGrade] = useState('');
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await codesApi.list();
      setCodes(r.codes);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر تحميل الرموز');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await codesApi.create({
        count,
        studentName: studentName.trim() || undefined,
        phone: phone.trim() || undefined,
        grade: grade.trim() || undefined,
        days,
      });
      setStudentName('');
      setPhone('');
      await load();
      setError('');
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'تعذّر توليد الرمز');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    try {
      await codesApi.revoke(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر إلغاء الرمز');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1800);
    } catch {
      setError('تعذّر النسخ — انسخ الرمز يدوياً');
    }
  };

  const stats = {
    active: codes.filter((c) => c.status === 'active').length,
    used: codes.filter((c) => c.status === 'used').length,
    revoked: codes.filter((c) => c.status === 'revoked').length,
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* الترويسة */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-navy-800">رموز الدخول</h1>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed max-w-xl">
            تولّد الإدارة رمزاً لكل طالب، ويدخله الطالب <strong>مرة واحدة</strong> وهو ينشئ
            حسابه في تطبيق الطالب. بعدها يدخل بهاتفه وكلمة المرور بلا رمز.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-800 border border-slate-300 rounded-xl px-3 py-2 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-[10px] font-bold text-emerald-700">صالح</p>
          <p className="text-2xl font-black text-emerald-800 nums">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-bold text-slate-600">مستخدم</p>
          <p className="text-2xl font-black text-slate-700 nums">{stats.used}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-[10px] font-bold text-amber-700">مُلغى</p>
          <p className="text-2xl font-black text-amber-800 nums">{stats.revoked}</p>
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* توليد */}
      <Card
        title="توليد رمز جديد"
        subtitle={count > 1 ? 'دفعة رموز غير موجّهة' : 'إن تركت الاسم والهاتف فارغين، يصلح الرمز لأول طالب يستخدمه'}
        action={<KeyRound className="w-4 h-4 text-slate-400" />}
      >
        <form onSubmit={generate} className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">العدد</span>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm nums focus:border-navy-800 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">اسم الطالب (اختياري)</span>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="محمد أحمد"
              disabled={count > 1}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none disabled:bg-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">الهاتف (يخصّص الرمز)</span>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912345678"
              disabled={count > 1}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm nums focus:border-navy-800 focus:outline-none disabled:bg-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">الصف (اختياري)</span>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="الثالث المتوسط"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">صالح (يوم)</span>
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Math.min(365, Math.max(1, Number(e.target.value) || 30)))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm nums focus:border-navy-800 focus:outline-none"
            />
          </label>

          <div className="sm:col-span-2 lg:col-span-5">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 bg-navy-800 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl hover:bg-navy-700 disabled:opacity-60 cursor-pointer"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {count > 1 ? `توليد ${count} رموز` : 'توليد الرمز'}
            </button>
          </div>
        </form>
      </Card>

      {/* الجدول */}
      <Card title="الرموز المُصدَرة" subtitle="من استخدم كل رمز، ومتى">
        {loading && codes.length === 0 ? (
          <div className="py-12 grid place-items-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : codes.length === 0 ? (
          <EmptyState
            title="لا توجد رموز بعد"
            description="ولّد أول رمز ليتمكّن طالب من إنشاء حسابه في تطبيق الطالب."
            hint="كل رمز يصلح لطالب واحد ولمرة واحدة"
          />
        ) : (
          <Table head={['الرمز', 'الطالب', 'الحالة', 'استُخدم بواسطة', 'الصلاحية', '']}>
            {codes.map((c) => {
              const st = STATUS[c.status] ?? STATUS.active;
              return (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void copy(c.code)}
                        title="نسخ الرمز"
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
                      >
                        <span className="font-mono font-black text-sm tracking-[0.15em] nums">
                          {c.code}
                        </span>
                        {copied === c.code ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-500" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-xs">
                    <p className="font-bold text-navy-800">{c.studentName || '—'}</p>
                    {c.phone && <p className="text-slate-400 nums text-[10px]">{c.phone}</p>}
                    {c.grade && <p className="text-slate-400 text-[10px]">{c.grade}</p>}
                  </td>
                  <td className="py-3 px-3">
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </td>
                  <td className="py-3 px-3 text-xs">
                    {c.status === 'used' ? (
                      <>
                        <p className="font-bold text-navy-800">{c.usedByName || '—'}</p>
                        <p className="text-[10px] text-slate-400">{fmt(c.usedAt)}</p>
                      </>
                    ) : (
                      <span className="text-slate-400">لم يُستخدم بعد</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-500 nums">
                    {fmt(c.expiresAt)}
                  </td>
                  <td className="py-3 px-3 text-left">
                    {c.status === 'active' && (
                      <button
                        onClick={() => void revoke(c.id)}
                        disabled={busy}
                        title="إلغاء الرمز"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg disabled:opacity-60 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        إلغاء
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <p className="text-[10px] text-slate-400 leading-relaxed">
        <Ticket className="w-3 h-3 inline ml-1" />
        الرمز مطلوب عند <strong>إنشاء الحساب فقط</strong>. الطالب الذي أنشأ حسابه يدخل بعدها
        بهاتفه وكلمة المرور، ولا يحتاج رمزاً جديداً.
      </p>
    </div>
  );
};

export default CodesPage;
