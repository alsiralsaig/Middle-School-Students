import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  FileText,
  FlaskConical,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { Badge, Card, NotConnectedNote, StatusBadge } from '../components/ui';
import { useSimulatedData } from '../hooks/useSimulatedData';
import { SAMPLE_SUBJECTS, contentStats } from '@shared/sampleContent';
import { BRAND } from '@shared/brand';

const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: number | string;
  hint?: string;
  tone?: string;
}> = ({ icon: Icon, label, value, hint, tone = 'text-navy-800' }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
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
  </div>
);

export const OverviewPage: React.FC = () => {
  const { data: subjects, loading } = useSimulatedData(SAMPLE_SUBJECTS);
  const stats = contentStats();

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

      <NotConnectedNote>
        هذه لوحة <strong>تحضيرية للمرحلة الأولى</strong>: تعرض بيانات تجريبية فقط، ولا يوجد حفظ أو رفع
        ملفات أو حسابات مستخدمين إلا بعد ربط قاعدة البيانات في المرحلة القادمة.
      </NotConnectedNote>

      {/* إحصاءات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="المواد" value={stats.subjects} />
        <StatCard icon={Layers} label="الوحدات" value={stats.units} />
        <StatCard icon={FlaskConical} label="الدروس" value={stats.lessons} hint="كلها تجريبية" />
        <StatCard icon={FileText} label="عناصر المكتبة" value={stats.resources} hint="غير متاحة للتحميل" />
      </div>

      {/* حالة المحتوى */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="المواد وحالة المحتوى" subtitle="مصدر البيانات: shared/sampleContent.ts">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(subjects ?? []).map((s) => {
                const lessons = s.units.reduce((a, u) => a + u.lessons.length, 0);
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <span className="text-lg w-8 text-center">{s.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-navy-800 truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {s.units.length} وحدة · {lessons} درس
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="جاهزية المرحلة القادمة" subtitle="ما يحتاج ربطاً بخادم أو قاعدة بيانات">
          <ul className="space-y-2.5">
            {[
              { label: 'حفظ وتعديل المحتوى', ready: false },
              { label: 'رفع ملفات المكتبة (PDF)', ready: false },
              { label: 'حسابات الطلاب وتتبع التقدّم', ready: false },
              { label: 'تصحيح الامتحانات آلياً', ready: false },
              { label: 'عرض المحتوى للطلاب', ready: true },
            ].map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-700">{item.label}</span>
                {item.ready ? (
                  <Badge tone="green">
                    <CheckCircle2 className="w-3 h-3" /> جاهز
                  </Badge>
                ) : (
                  <Badge tone="slate">غير متصل</Badge>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 rounded-xl p-3">
            <TrendingUp className="w-4 h-4 text-navy-800" />
            <span>الهيكل الحالي يسمح بإضافة الخادم لاحقاً دون إعادة بناء الواجهات.</span>
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
      </div>
    </div>
  );
};
