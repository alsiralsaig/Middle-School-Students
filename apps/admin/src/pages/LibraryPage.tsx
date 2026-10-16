import React, { useMemo, useState } from 'react';
import { FileText, Paperclip, Upload } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  NotConnectedNote,
  StatusBadge,
  Table,
} from '../components/ui';
import { useSimulatedData } from '../hooks/useSimulatedData';
import { RESOURCES_DATA, subjectNameById, CONTENT_STATUS } from '@shared/curriculum';
import type { ResourceCategory } from '@shared/curriculumTypes';

const CATEGORY_LABEL: Record<ResourceCategory, string> = {
  all: 'الكل',
  notes: 'مذكرات',
  textbook: 'كتاب مقرر',
  worksheets: 'أوراق عمل',
  past_exams: 'امتحانات سابقة',
};

const CATEGORIES: ResourceCategory[] = ['all', 'notes', 'textbook', 'worksheets', 'past_exams'];

export const LibraryPage: React.FC = () => {
  const { data: items, loading } = useSimulatedData(RESOURCES_DATA);
  const [category, setCategory] = useState<ResourceCategory>('all');

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
            نفس بيانات مكتبة تطبيق الطالب — العرض والتصنيف جاهزان، والرفع يتطلب تخزيناً في المرحلة
            القادمة.
          </p>
        </div>
        <Button disabled title="رفع الملفات يتطلب خدمة تخزين (المرحلة القادمة)">
          <Upload className="w-4 h-4" />
          رفع ملف
        </Button>
      </header>

      <NotConnectedNote>
        لا توجد ملفات مرفوعة فعلياً. العناصر أدناه <strong>بيانات تعريفية تجريبية</strong>، وروابط
        التحميل غير متاحة حتى يتم ربط خدمة تخزين.
      </NotConnectedNote>

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
                <td className="py-2.5 px-3 text-slate-600">{subjectNameById(r.subjectId)}</td>
                <td className="py-2.5 px-3">
                  <Badge tone="navy">{r.fileType}</Badge>
                </td>
                <td className="py-2.5 px-3 nums text-slate-500">{r.pageCount}</td>
                <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{r.fileSize}</td>
                <td className="py-2.5 px-3">
                  <Badge tone="slate">غير مرفوع</Badge>
                </td>
                <td className="py-2.5 px-3">
                  <StatusBadge status={CONTENT_STATUS} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <Paperclip className="w-4 h-4 text-navy-800" />
        <span>نفس المصدر: shared/curriculum.ts — RESOURCES_DATA</span>
      </div>
    </div>
  );
};
