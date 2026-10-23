import React, { useEffect, useMemo, useState } from 'react';
import { InAppFileViewer, ViewerFile, resolveFileUrl } from './InAppFileViewer';
import { SubjectFileRow } from './SubjectFileRow';
import { subjectVisual } from '../utils/subjectVisuals';
import { warmPdfEngine } from '../utils/pdfEngine';
import {
  fileBadge,
  formatBytes,
  guessMime,
  listOfflineFiles,
  removeOfflineFile,
  saveOfflineFile,
} from '../utils/offlineFiles';

interface AttachmentLike {
  id: string;
  title: string;
  type?: string;
  size?: string;
  pages?: number;
  url?: string | null;
  filePath?: string | null;
  kind?: string;
  mimeType?: string | null;
  originalName?: string | null;
}

interface Props {
  attachments: AttachmentLike[];
  subjectId: string;
  subjectName: string;
}

/**
 * مرفقات الدرس — تفتح **داخل التطبيق** بدل التاب الخارجي،
 * ويمكن تحميلها للاستخدام بدون إنترنت.
 */
export const LessonAttachments: React.FC<Props> = ({ attachments, subjectId, subjectName }) => {
  const visual = subjectVisual(subjectId, subjectName);
  const [viewing, setViewing] = useState<ViewerFile | null>(null);
  const [offlineUrls, setOfflineUrls] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState('');

  const files = useMemo(
    () =>
      attachments
        .filter((a) => !!(a.filePath || a.url))
        .map<ViewerFile>((a) => ({
          title: a.title,
          url: a.filePath || a.url || '',
          mimeType: a.mimeType,
          kind: a.kind || a.type,
          sizeLabel: a.size || undefined,
        })),
    [attachments],
  );

  const refresh = async () => {
    const rows = await listOfflineFiles();
    setOfflineUrls(new Set(rows.map((r) => r.url)));
  };

  useEffect(() => {
    void refresh();
  }, []);

  const download = async (file: ViewerFile) => {
    const absolute = resolveFileUrl(file.url);
    setProgress((p) => ({ ...p, [absolute]: 1 }));
    setNotice('');
    try {
      await saveOfflineFile(
        {
          url: absolute,
          title: file.title,
          mimeType: guessMime(absolute, file.mimeType),
          kind: file.kind || null,
          sizeLabel: file.sizeLabel || null,
          subjectId,
          subjectName,
        },
        (p) => setProgress((prev) => ({ ...prev, [absolute]: p })),
      );
      await refresh();
      warmPdfEngine();
      setNotice(`تم تحميل «${file.title}» — يفتح من تبويب «بدون نت» في المادة.`);
    } catch (e) {
      setNotice(e instanceof Error ? `تعذّر التحميل: ${e.message}` : 'تعذّر التحميل.');
    } finally {
      setProgress((p) => {
        const next = { ...p };
        delete next[absolute];
        return next;
      });
    }
  };

  if (files.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-[12px] font-semibold text-slate-500 dark:border-[#25476F] dark:text-slate-400">
        لا توجد مرفقات لهذا الدرس بعد.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {notice && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          {notice}
        </p>
      )}

      {files.map((f, i) => {
        const absolute = resolveFileUrl(f.url);
        const mime = guessMime(absolute, f.mimeType);
        return (
          <SubjectFileRow
            key={`${absolute}-${i}`}
            title={f.title}
            subtitle={f.sizeLabel || undefined}
            badge={fileBadge(mime)}
            accent={visual.accent}
            offline={offlineUrls.has(absolute)}
            downloading={progress[absolute] !== undefined}
            progress={progress[absolute] || 0}
            onOpen={() => setViewing(f)}
            onDownload={() => void download(f)}
            onRemove={
              offlineUrls.has(absolute)
                ? () => {
                    void removeOfflineFile(absolute).then(refresh);
                  }
                : undefined
            }
          />
        );
      })}

      {viewing && <InAppFileViewer file={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

export default LessonAttachments;
