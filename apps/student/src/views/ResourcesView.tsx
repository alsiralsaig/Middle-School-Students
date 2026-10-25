import React, { useEffect, useState } from 'react';
import { ResourceItem, ResourceCategory, Subject } from '../types';
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  Award, 
  CheckCircle2, 
  Filter, 
  X,
  BookOpen,
  Share2,
  ClipboardCopy,
  ExternalLink
} from 'lucide-react';
import { PDFViewerModal } from '../components/PDFViewerModal';
import { downloadResourcePDF } from '../utils/pdfDownloader';
import { api } from '../utils/apiClient';
import { getApiBase } from '../utils/serverUrl';

interface ResourcesViewProps {
  resources: ResourceItem[];
  subjects: Subject[];
  initialSelectedResourceId?: string | null;
}

export const ResourcesView: React.FC<ResourcesViewProps> = ({
  resources,
  subjects,
  initialSelectedResourceId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewItem, setPreviewItem] = useState<ResourceItem | null>(() => {
    if (initialSelectedResourceId) {
      return resources.find((r) => r.id === initialSelectedResourceId) || null;
    }
    return null;
  });
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [reading, setReading] = useState<{ id: string; title: string } | null>(null);
  const [readingText, setReadingText] = useState<string>('');
  const [readingBusy, setReadingBusy] = useState(false);
  const [readingError, setReadingError] = useState('');
  const [serverResources,setServerResources]=useState<ResourceItem[]>([]);
  useEffect(()=>{let alive=true;api.resources().then(({resources:rows})=>{if(!alive)return;const mapped:ResourceItem[]=rows.map(r=>{let previewSummary:string[]=[];try{const parsed=typeof r.previewSummary==='string'?JSON.parse(r.previewSummary):r.previewSummary;if(Array.isArray(parsed))previewSummary=parsed.map(String);}catch{/* skip malformed summary */}const subjectId=String(r.subjectId||'');return{id:String(r.id),title:String(r.title||''),subjectId,subjectName:String(r.subjectName||'')||subjects.find(s=>s.id===subjectId)?.name||'عام',category:String(r.category||'notes') as ResourceCategory,fileType:String(r.fileType||'FILE'),filePath:typeof r.filePath==='string'?r.filePath:null,externalUrl:typeof r.externalUrl==='string'?r.externalUrl:null,hasBody:r.hasBody===true,bodyChars:Number(r.bodyChars)||0,fileSize:String(r.fileSize||''),pageCount:Number(r.pageCount)||0,author:String(r.author||''),publishYear:String(r.publishYear||''),isVerifiedCurriculum:r.isVerifiedCurriculum===true,downloadCount:Number(r.downloadCount)||0,description:String(r.description||''),previewSummary};});setServerResources(mapped);}).catch(()=>undefined);return()=>{alive=false;};},[subjects]);

  const categoryTabs: { key: ResourceCategory; label: string }[] = [
    { key: 'all', label: 'جميع الموارد' },
    { key: 'notes', label: 'مذكرات تلخيص' },
    { key: 'past_exams', label: 'امتحانات سابقة' },
    { key: 'worksheets', label: 'أوراق عمل وتدريبات' },
    { key: 'interactive_exams', label: 'اختبارات تفاعلية' },
  ];

  /**
 * نوصل بس للموارد اللي الطالب **يقدر يفتحها فعلاً**.
 *
 * ٤٥ عنصراً في القاعدة (مفاتيح إجابة) بلا ملف ولا رابط ولا نص داخلي — كانت
 * تظهر كأنها جاهزة، ولما يضغطها الطالب ما يلقى حاجة. نخفيها بدل ما نكسر ثقته.
 */
  const isOpenable = (item: ResourceItem) =>
    !!item.filePath || !!item.externalUrl || item.hasBody === true;

  const allResources=[
    ...resources,
    ...serverResources.filter(item=>!resources.some(existing=>existing.id===item.id)),
  ].filter(isOpenable);
  const filteredResources = allResources.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSubject =
      selectedSubjectId === 'all' || item.subjectId === selectedSubjectId;
    const matchesSearch =
      item.title.includes(searchQuery) ||
      item.subjectName.includes(searchQuery) ||
      item.author.includes(searchQuery) ||
      item.description.includes(searchQuery);

    return matchesCategory && matchesSubject && matchesSearch;
  });

  /** يقرأ النص الكامل من الخادم — العناصر المنشورة فقط تُعاد */
  const openReader = async (item: ResourceItem) => {
    setReading({ id: item.id, title: item.title });
    setReadingText('');
    setReadingError('');
    setReadingBusy(true);
    try {
      const res = await fetch(`${getApiBase()}/api/resources/${encodeURIComponent(item.id)}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await res.json().catch(() => null) as { resource?: { body?: string | null } } | null;
      if (!res.ok || !data?.resource) throw new Error(String(res.status));
      setReadingText(data.resource.body || 'هذا العنصر لا يحتوي نصّاً محفوظاً.');
    } catch {
      setReadingError('تعذّر تحميل النص الآن. تأكّد من الاتصال بالإنترنت وأعد المحاولة.');
    } finally {
      setReadingBusy(false);
    }
  };

  const copyReadingText = async () => {
    try {
      await navigator.clipboard.writeText(readingText);
      setDownloadToast('تم نسخ النص — تقدر تلصقه في Word مباشرة.');
      setTimeout(() => setDownloadToast(null), 4000);
    } catch {
      setDownloadToast('النسخ غير مسموح في هذا المتصفح — حدّد النص وانسخه يدوياً.');
      setTimeout(() => setDownloadToast(null), 4000);
    }
  };

  const triggerDownload = (item: ResourceItem) => {
    if(item.filePath&&(item.filePath.startsWith('https://')||item.filePath.startsWith('http://')||item.filePath.startsWith('/api/media/'))){const url=/^https?:\/\//i.test(item.filePath)?item.filePath:`${getApiBase()}${item.filePath}`;window.open(url,'_blank','noopener,noreferrer');}
    else downloadResourcePDF(item);
    setDownloadToast(`تم فتح المورد «${item.title}» للمعاينة أو التنزيل.`);
    setTimeout(() => {
      setDownloadToast(null);
    }, 4000);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-right space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-semibold">
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>المكتبة الرقمية للصف الثالث المتوسط</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              بنك المذكرات والملخصات والامتحانات
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              مكتبة إلكترونية شاملة تحتوي على ملخصات المواد، أوراق العمل التفاعلية، ونماذج امتحانات الشهادة المتوسطة السابقة للتحميل والمطالعة المباشرة.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] rounded-2xl p-4 flex items-center gap-3 self-start md:self-auto shrink-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-400/20 text-amber-900 dark:text-amber-300 flex items-center justify-center font-bold">
              PDF
            </div>
            <div className="text-right text-xs">
              <div className="font-bold text-slate-900 dark:text-white">تحميل مباشر ومجاني</div>
              <div className="text-slate-500 dark:text-slate-400">معد وفق المنهج السوداني</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Controls */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Category Segmented Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#142A46] rounded-xl overflow-x-auto">
              {categoryTabs.map((tab) => {
                const isActive = selectedCategory === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedCategory(tab.key)}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#1F3E68] text-slate-900 dark:text-white shadow-sm font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[280px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالعنوان، المادة، أو اسم المعلم..."
                className="w-full bg-slate-50 dark:bg-[#11243C] border border-slate-200 dark:border-[#1E3A60] rounded-xl py-2.5 pr-10 pl-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-900 dark:focus:border-amber-400 focus:bg-white dark:focus:bg-[#0E2036] transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Subject Pills Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 text-xs">
            <span className="text-slate-400 dark:text-slate-400 font-medium whitespace-nowrap pl-1">
              تصفية حسب المادة:
            </span>
            <button
              onClick={() => setSelectedSubjectId('all')}
              className={`px-3 py-2 min-h-[36px] inline-flex items-center rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                selectedSubjectId === 'all'
                  ? 'bg-blue-900 dark:bg-amber-400 dark:text-slate-950 text-white border-blue-900 dark:border-amber-400 font-bold'
                  : 'bg-white dark:bg-[#122844] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1E3A60] hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              كافة المواد
            </button>
            {subjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-3 py-2 min-h-[36px] inline-flex items-center rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                  selectedSubjectId === sub.id
                    ? 'bg-blue-900 dark:bg-amber-400 dark:text-slate-950 text-white border-blue-900 dark:border-amber-400 font-bold'
                    : 'bg-white dark:bg-[#122844] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1E3A60] hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Download Alert Toast */}
      {downloadToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{downloadToast}</span>
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">(محاكاة تنزيل في الواجهة)</span>
        </div>
      )}

      {/* Resources Cards Grid */}
      {filteredResources.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">لا توجد مذكرات مطابقة للبحث</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            جرّب تغيير كلمات البحث أو إلغاء تصفية المادة لعرض جميع المذكرات المتاحة.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedSubjectId('all');
            }}
            className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            إعادة تعيين البحث
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#0D1F35] rounded-2xl border border-slate-200 dark:border-[#1C3A62] hover:border-slate-300 dark:hover:border-amber-400/40 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-right"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={`p-2.5 rounded-xl font-bold text-xs border ${
                    item.externalUrl
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40'
                      : item.hasBody
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/40'
                        : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/40'
                  }`}>
                    {item.externalUrl ? 'تفاعلي' : item.hasBody ? 'نص' : 'PDF'}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-blue-900 dark:text-amber-400">
                      {item.subjectName}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug mb-2">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed mb-4">
                  {item.description}
                </p>

                {/* Metadata unboxed text */}
                <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span>إعداد: {item.author}</span>
                    <span>عام: {item.publishYear}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>الحجم: {item.fileSize}</span>
                    <span>{item.pageCount} صفحة</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 grid grid-cols-2 gap-2">
                {item.externalUrl ? (
                  <>
                    <a
                      href={item.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
                      title="افتح الاختبار التفاعلي في المتصفح — تصحيح ودرجة فورية"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>ابدأ الاختبار</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => { void navigator.clipboard?.writeText(item.externalUrl || ''); setDownloadToast('تم نسخ رابط الاختبار.'); setTimeout(() => setDownloadToast(null), 3000); }}
                      className="py-2.5 px-3 rounded-xl bg-[#0B1E36] hover:bg-[#15345B] dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px] shadow-sm"
                      title="انسخ الرابط وشاركه"
                    >
                      <Share2 className="w-4 h-4 text-amber-400 dark:text-slate-950" />
                      <span>نسخ الرابط</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => (item.hasBody ? void openReader(item) : setPreviewItem(item))}
                      className="py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-[#142A46] dark:hover:bg-[#1C3960] text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-[#21436F] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                      title={item.hasBody ? 'اقرأ النص كاملاً داخل التطبيق' : 'معاينة الملف داخل المتصفح'}
                    >
                      {item.hasBody ? <BookOpen className="w-4 h-4 text-blue-600 dark:text-amber-400" /> : <Eye className="w-4 h-4 text-blue-600 dark:text-amber-400" />}
                      <span>{item.hasBody ? 'قراءة' : 'معاينة PDF'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerDownload(item)}
                      className="py-2.5 px-3 rounded-xl bg-[#0B1E36] hover:bg-[#15345B] dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px] shadow-sm"
                      title="تحميل الملف إلى جهازك"
                    >
                      <Download className="w-4 h-4 text-amber-400 dark:text-slate-950" />
                      <span>{item.hasBody ? 'تحميل' : 'تحميل PDF'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* قارئ النصوص — المذكرات والملخصات تُقرأ داخل التطبيق بلا تنزيل */}
      {reading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReading(null); }}>
          <section role="dialog" aria-modal="true" aria-label={reading.title} dir="rtl" className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#0D1F35] shadow-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 p-4">
              <div className="text-right">
                <h2 className="text-sm font-black text-slate-900 dark:text-white leading-snug">{reading.title}</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{readingBusy ? 'جارٍ التحميل…' : `${readingText.length.toLocaleString('ar-EG')} حرف`}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => void copyReadingText()} disabled={readingBusy || !readingText} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">
                  <ClipboardCopy className="w-3.5 h-3.5" /> نسخ
                </button>
                <button type="button" onClick={() => setReading(null)} aria-label="إغلاق" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>
            <div className="overflow-y-auto p-4">
              {readingBusy ? (
                <p className="text-center text-xs text-slate-500 py-10">جارٍ تحميل النص…</p>
              ) : readingError ? (
                <p className="text-center text-xs text-red-600 py-10">{readingError}</p>
              ) : (
                <pre className="whitespace-pre-wrap break-words text-[13px] leading-8 text-slate-800 dark:text-slate-200 font-sans text-right">{readingText}</pre>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Dedicated Interactive In-Browser PDF Viewer Modal */}
      {previewItem && (
        <PDFViewerModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
};
