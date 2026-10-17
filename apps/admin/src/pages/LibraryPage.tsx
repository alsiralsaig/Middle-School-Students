import React, { useMemo, useState } from 'react';
import { FileText, Paperclip, Upload } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  NotConnectedNote,
  Table,
} from '../components/ui';
import type { ResourceCategory } from '@shared/curriculumTypes';
import { getApiBase } from '../lib/serverUrl';

interface LibraryRow {
  id: string;
  title: string;
  category: string;
  fileType: string;
  fileSize: string;
  pageCount: number;
  author: string | null;
  publishYear: string | null;
  description: string;
  status: string;
  downloadCount: number;
  isVerifiedCurriculum: boolean;
  subjectId: string | null;
  subjectName: string;
}

const CATEGORY_LABEL: Record<ResourceCategory, string> = {
  all: 'الكل',
  notes: 'مذكرات',
  textbook: 'كتاب مقرر',
  worksheets: 'أوراق عمل',
  past_exams: 'امتحانات سابقة',
};

const CATEGORIES: ResourceCategory[] = ['all', 'notes', 'textbook', 'worksheets', 'past_exams'];

export const LibraryPage: React.FC = () => {
  const [items, setItems] = useState<LibraryRow[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; verified: number; downloads: number } | null>(null);
  const [offline, setOffline] = useState(false);
  const [category, setCategory] = useState<ResourceCategory>('all');

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/admin/library`, {
          headers: { Accept: 'application/json', 'X-App': 'admin' },
          credentials: 'include',
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as {
          resources: LibraryRow[];
          summary: { total: number; verified: number; downloads: number };
        };
        if (!alive) return;
        setItems(data.resources);
        setSummary(data.summary);
        setOffline(false);
      } catch {
        if (alive) { setItems(null); setOffline(true); }
      }
    })();
    return () => { alive = false; };
  }, []);

  const loading = items === null && !offline;

  const filtered = useMemo(
    () => (items ?? []).filter((r) => category === 'all' || r.category === category),
    [items, category],
  );

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-navy-800">المكتبة</h1>
          <p className="text-xs text-slate-500 mt-1">
            عناصر حقيقية من قاعدة البيانات. الملفات نفسها تُرفع على خادم بقرص دائم — لا على
            Vercel (نظام ملفات للقراءة فقط).
          </p>
        </div>
        <Button disabled title="رفع الملفات يتطلب خدمة تخزين (المرحلة القادمة)">
          <Upload className="w-4 h-4" />
          رفع ملف
        </Button>
      </header>

      {summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            ['إجمالي العناصر', summary.total],
            ['موثَّقة رسمياً', summary.verified],
            ['مرّات التحميل', summary.downloads],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-lg font-black text-navy-800 nums">{value}</div>
              <div className="text-[11px] text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      {offline && (
        <NotConnectedNote>
          تعذّر الوصول إلى الخادم. احفظ عنوان الخادم الصحيح من صفحة{' '}
          <strong>الإعدادات</strong>.
        </NotConnectedNote>
      )}

      <Card>
        <div className="flex gap-2 flex-wrap mb-4">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3.5 py-2 rounded-full text-[11px] font-bold border transition-colors min-h-[36px] inline-flex items-center ${
                category === c
                  ? 'bg-navy-800 text-white border-navy-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingState label="جارٍ تحميل عناصر المكتبة…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="لا عناصر في هذا التصنيف"
            description="لم تُضف أي عناصر بعد. بعد ربط التخزين ستظهر الملفات المرفوعة هنا."
            hint="المرحلة القادمة: رفع ملفات المكتبة"
          />
        ) : (
          <Table head={['العنوان', 'المادة', 'النوع', 'الصفحات', 'الحجم', 'التوفر', 'الحالة']}>
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70">
                <td className="py-2.5 px-3">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-bold text-navy-800">{r.title}</p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{r.description}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-slate-600">{r.subjectName}</td>
                <td className="py-2.5 px-3">
                  <Badge tone="navy">{r.fileType}</Badge>
                </td>
                <td className="py-2.5 px-3 nums text-slate-500">{r.pageCount}</td>
                <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{r.fileSize}</td>
                <td className="py-2.5 px-3 nums text-slate-500">
                  {r.downloadCount} تحميل
                </td>
                <td className="py-2.5 px-3">
                  {r.isVerifiedCurriculum ? (
                    <Badge tone="green">موثَّق</Badge>
                  ) : (
                    <Badge tone="slate">{r.status === 'sample' ? 'تجريبي' : r.status}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <Paperclip className="w-4 h-4 text-navy-800" />
        <span>كل عنصر مقروء من جدول المكتبة في قاعدة البيانات.</span>
      </div>
    </div>
  );
};
