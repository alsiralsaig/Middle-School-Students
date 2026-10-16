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
import { SAMPLE_RESOURCES, subjectNameById } from '@shared/sampleContent';
import type { AttachmentKind } from '@shared/types';

const KIND_LABEL: Record<AttachmentKind, string> = {
  pdf: 'ملف PDF',
  summary: 'ملخص',
  worksheet: 'ورقة عمل',
  audio: 'ملف صوتي',
  video: 'فيديو',
};

export const LibraryPage: React.FC = () => {
  const { data: items, loading } = useSimulatedData(SAMPLE_RESOURCES);
  const [kind, setKind] = useState<'all' | AttachmentKind>('all');

  const filtered = useMemo(
    () => (items ?? []).filter((r) => kind === 'all' || r.kind === kind),
    [items, kind],
  );

  const kinds: Array<'all' | AttachmentKind> = ['all', 'pdf', 'summary', 'worksheet', 'audio', 'video'];

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-navy-800">المكتبة</h1>
          <p className="text-xs text-slate-500 mt-1">
            ملفات وملخصات — العرض والتصنيف جاهزان، والرفع يتطلب تخزيناً في المرحلة القادمة.
          </p>
        </div>
        <Button disabled title="رفع الملفات يتطلب خدمة تخزين (المرحلة القادمة)">
          <Upload className="w-4 h-4" />
          رفع ملف
        </Button>
      </header>

      <NotConnectedNote>
        لا توجد أي ملفات فعلية مرفوعة. كل العناصر أدناه <strong>بيانات تجريبية</strong> وروابطها غير
        متاحة حتى يتم ربط خدمة تخزين.
      </NotConnectedNote>

      <Card>
        <div className="flex gap-2 flex-wrap mb-4">
          {kinds.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                kind === k
                  ? 'bg-navy-800 text-white border-navy-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {k === 'all' ? 'الكل' : KIND_LABEL[k]}
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
          <Table head={['العنوان', 'التصنيف', 'المادة', 'الصفحات', 'الحجم', 'التوفر', 'الحالة']}>
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70">
                <td className="py-2.5 px-3">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-navy-800">{r.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {r.available ? 'جاهز للتحميل' : 'الملف غير مرفوع'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <Badge tone="navy">{KIND_LABEL[r.kind]}</Badge>
                </td>
                <td className="py-2.5 px-3 text-slate-600">{subjectNameById(r.subjectId)}</td>
                <td className="py-2.5 px-3 nums text-slate-500">{r.pages ?? '—'}</td>
                <td className="py-2.5 px-3 nums text-slate-500">{r.size ?? '—'}</td>
                <td className="py-2.5 px-3">
                  <Badge tone={r.available ? 'green' : 'slate'}>
                    {r.available ? 'متاح' : 'غير متاح'}
                  </Badge>
                </td>
                <td className="py-2.5 px-3">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <Paperclip className="w-4 h-4 text-navy-800" />
        <span>سيُعاد استخدام نفس نماذج البيانات في تطبيق الطالب والمكتبة العامة.</span>
      </div>
    </div>
  );
};
