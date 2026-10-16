import React, { useState } from 'react';
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
  Share2
} from 'lucide-react';

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

  const categoryTabs: { key: ResourceCategory; label: string }[] = [
    { key: 'all', label: 'جميع الموارد' },
    { key: 'notes', label: 'مذكرات تلخيص' },
    { key: 'past_exams', label: 'امتحانات سابقة' },
    { key: 'worksheets', label: 'أوراق عمل وتدريبات' },
  ];

  const filteredResources = resources.filter((item) => {
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

  const triggerDownload = (item: ResourceItem) => {
    setDownloadToast(`جاري تنزيل ملف "${item.title}" بصيغة ${item.fileType}...`);
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
              className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
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
                  <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold text-xs border border-red-100 dark:border-red-900/40">
                    PDF
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
                <button
                  onClick={() => setPreviewItem(item)}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#142A46] hover:bg-slate-200 dark:hover:bg-[#1C3960] text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                >
                  <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>معاينة المذكرة</span>
                </button>

                <button
                  onClick={() => triggerDownload(item)}
                  className="py-2.5 px-3 rounded-xl bg-[#0B1E36] hover:bg-[#15345B] dark:bg-[#18365D] dark:hover:bg-[#204473] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>تنزيل PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resource Direct Reading Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0D1F35] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-[#1C3A62] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-[#0B1E36] text-white flex items-center justify-between gap-4 text-right">
              <div>
                <span className="text-xs text-amber-300 font-bold block mb-1">
                  معاينة مقتطفات المذكرة · {previewItem.subjectName}
                </span>
                <h3 className="text-base sm:text-lg font-bold leading-tight">
                  {previewItem.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-2 rounded-xl bg-[#173155] text-slate-300 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-right">
              <div className="bg-slate-50 dark:bg-[#122844] p-4 rounded-2xl border border-slate-200 dark:border-[#1E3A60] space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="font-bold">المؤلف: {previewItem.author}</span>
                  <span>الصفحات: {previewItem.pageCount} صفحة</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>العام الدراسي: {previewItem.publishYear}</span>
                  <span>حجم الملف: {previewItem.fileSize}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  عن هذه المذكرة الدراسية:
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {previewItem.description}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                  أبرز المحاور والموضوعات التي تتناولها المذكرة:
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  {previewItem.previewSummary.map((line, idx) => (
                    <li
                      key={idx}
                      className="p-3 rounded-xl bg-blue-50/60 dark:bg-[#142C4D] border border-blue-100 dark:border-[#1F416E] flex items-start gap-2.5 text-slate-800 dark:text-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-blue-900 dark:text-amber-400 mt-0.5 shrink-0" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-[#152B4A] border border-amber-200 dark:border-amber-400/30 text-amber-900 dark:text-amber-200 text-xs">
                <span className="font-bold block mb-1">تنبيه الطالب:</span>
                تم إعداد هذا المحتوى وتدقيقه ليتطابق تماماً مع امتحانات الشهادة المتوسطة في ولايات السودان المختلفة.
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#091524] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#1E3A60] text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#142A46] transition-colors cursor-pointer"
              >
                إغلاق المعاينة
              </button>
              <button
                onClick={() => {
                  triggerDownload(previewItem);
                  setPreviewItem(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4 text-amber-300 dark:text-slate-950" />
                <span>تنزيل المذكرة كاملة (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
