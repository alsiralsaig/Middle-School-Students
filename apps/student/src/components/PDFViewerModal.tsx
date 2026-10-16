import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  ChevronRight, 
  ChevronLeft, 
  Maximize2, 
  Minimize2, 
  FileText, 
  CheckCircle2, 
  BookOpen, 
  Sparkles, 
  Layers, 
  Share2, 
  Copy, 
  Check,
  Search,
  School,
  GraduationCap
} from 'lucide-react';
import { ResourceItem } from '../types';
import { RESOURCE_DOCUMENTS, ResourceDocument, PDFPageContent } from '../data/resourcePagesData';
import { downloadResourcePDF, printResourceDocument } from '../utils/pdfDownloader';

interface PDFViewerModalProps {
  item: ResourceItem;
  onClose: () => void;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ item, onClose }) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('single');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Retrieve rich document data or fallback
  const docData: ResourceDocument = RESOURCE_DOCUMENTS[item.id] || {
    resourceId: item.id,
    documentTitle: item.title,
    subjectName: item.subjectName,
    author: item.author,
    publishYear: item.publishYear,
    pageCount: 4,
    totalChapters: 4,
    pages: [
      {
        pageNumber: 1,
        title: item.title,
        subtitle: `المادة: ${item.subjectName} · المنهج السوداني`,
        sections: [
          {
            type: 'box',
            content: `منصة الطالب السوداني الذكية · الصف الثالث المتوسط\n${item.description}`,
          },
          {
            heading: 'محتويات المذكرة',
            type: 'text',
            points: item.previewSummary,
          },
        ],
      },
    ],
  };

  const totalPages = docData.pages.length;

  // Keyboard navigation (Escape to close, Arrows for page)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (currentPage < totalPages) setCurrentPage((p) => p + 1);
      } else if (e.key === 'ArrowRight') {
        if (currentPage > 1) setCurrentPage((p) => p - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, onClose]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 15, 175));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 15, 60));
  const handleResetZoom = () => setZoomLevel(100);
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleDownload = () => {
    downloadResourcePDF(item);
    setDownloadSuccessToast(true);
    setTimeout(() => setDownloadSuccessToast(false), 3500);
  };

  const handlePrint = () => {
    printResourceDocument(item);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const jumpToPage = (pageNum: number) => {
    setCurrentPage(pageNum);
    if (viewMode === 'continuous' && pageRefs.current[pageNum - 1]) {
      pageRefs.current[pageNum - 1]?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col overflow-hidden text-slate-100 select-none">
      
      {/* Top PDF Reader Toolbar */}
      <header className="h-14 sm:h-16 bg-[#0E1E34] border-b border-slate-700/60 px-3 sm:px-6 flex items-center justify-between gap-2 shrink-0 z-20 shadow-md">
        
        {/* Document Info & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-black text-xs shrink-0 shadow-inner">
            PDF
          </div>
          <div className="min-w-0 text-right">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {item.title}
            </h2>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400">
              <span className="text-amber-400 font-semibold">{item.subjectName}</span>
              <span>•</span>
              <span>{item.author}</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">{item.fileSize}</span>
            </div>
          </div>
        </div>

        {/* Center: Pagination & Zoom Controls */}
        <div className="flex items-center gap-1 sm:gap-2 bg-[#091524] px-2 sm:px-3 py-1.5 rounded-2xl border border-slate-800">
          {/* Previous Page (RTL: right arrow goes to previous page) */}
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage <= 1}
            title="الصفحة السابقة"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Page Indicator */}
          <div className="text-xs font-mono font-bold text-slate-200 px-1 sm:px-2 flex items-center gap-1">
            <span>{currentPage}</span>
            <span className="text-slate-500">/</span>
            <span>{totalPages}</span>
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage >= totalPages}
            title="الصفحة التالية"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-700/60 mx-1 hidden sm:block" />

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 60}
            title="تصغير العرض"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer hidden sm:block"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom Level Indicator */}
          <button
            type="button"
            onClick={handleResetZoom}
            title="إعادة ضبط الحجم (100%)"
            className="text-[11px] font-mono text-amber-300 hover:text-amber-200 px-1.5 py-0.5 rounded cursor-pointer hidden sm:block font-bold"
          >
            {zoomLevel}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 175}
            title="تكبير العرض"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer hidden sm:block"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-700/60 mx-1 hidden md:block" />

          {/* Rotate Button */}
          <button
            type="button"
            onClick={handleRotate}
            title="تدوير الصفحة"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer hidden md:block"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Right / Left Actions: Print, Download, Close */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Toggle Sidebar */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'إخفاء الفهرس والمصغرات' : 'إظهار الفهرس والمصغرات'}
            className={`p-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hidden lg:flex items-center gap-1 ${
              isSidebarOpen ? 'bg-slate-800 text-amber-300' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>الصفحات</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            title="طباعة صفحات المذكرة كاملة بتنسيق ورقي A4"
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">طباعة</span>
          </button>

          {/* Real PDF Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            title="تنزيل ملف PDF إلى جهازك"
            className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>تنزيل PDF</span>
          </button>

          {/* Close Modal */}
          <button
            type="button"
            onClick={onClose}
            title="إغلاق المعاينة"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-900/60 text-slate-300 hover:text-white transition-colors cursor-pointer mr-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Workspace Area (Sidebar + Canvas) */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Sidebar: Page Thumbnails & Index */}
        {isSidebarOpen && (
          <aside className="w-64 bg-[#091524] border-l border-slate-800/80 flex flex-col shrink-0 hidden lg:flex z-10">
            <div className="p-3 border-b border-slate-800 text-right">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                فهرس ومصغرات المذكرة ({totalPages} صفحات)
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
              {docData.pages.map((p) => (
                <div
                  key={p.pageNumber}
                  onClick={() => jumpToPage(p.pageNumber)}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer text-right group ${
                    currentPage === p.pageNumber
                      ? 'bg-blue-900/40 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                      : 'bg-[#0E1E34] border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className={`font-mono font-bold ${currentPage === p.pageNumber ? 'text-amber-300' : 'text-slate-400'}`}>
                      صفحة {p.pageNumber}
                    </span>
                    {currentPage === p.pageNumber && (
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </div>

                  {/* Thumbnail Preview Miniature Card */}
                  <div className="w-full h-24 bg-white text-slate-900 rounded-lg p-2 text-[8px] leading-tight overflow-hidden shadow-inner flex flex-col justify-between border border-slate-300 select-none">
                    <div className="font-bold border-b border-slate-200 pb-1 text-blue-950 truncate">
                      {p.title}
                    </div>
                    <div className="text-slate-600 line-clamp-3">
                      {p.sections[0]?.content || p.sections[0]?.heading || 'المحتوى التعليمي الرسمي'}
                    </div>
                    <div className="text-[7px] text-slate-400 flex justify-between pt-1 border-t border-slate-100">
                      <span>الشهادة المتوسطة</span>
                      <span>ص {p.pageNumber}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-1.5 truncate group-hover:text-slate-200">
                    {p.title}
                  </p>
                </div>
              ))}
            </div>

            {/* Sidebar Footer Metadata */}
            <div className="p-3 bg-[#0B1A2E] border-t border-slate-800 text-[11px] text-slate-400 text-right space-y-1">
              <div className="flex items-center justify-between">
                <span>تاريخ النشر:</span>
                <span className="text-slate-200 font-semibold">{item.publishYear}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>الاعتماد:</span>
                <span className="text-emerald-400 font-semibold">منهاج قومي معتمد 🇸🇩</span>
              </div>
            </div>
          </aside>
        )}

        {/* Center: Scrollable A4 Document Sheet Viewport */}
        <main 
          ref={containerRef}
          className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center justify-start bg-slate-900/80 dark:bg-[#071322]"
        >
          {/* Active Page View (Single mode or current page) */}
          <div 
            className="transition-transform duration-200 ease-out flex flex-col items-center"
            style={{
              transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'top center',
            }}
          >
            {docData.pages
              .filter((p) => viewMode === 'continuous' || p.pageNumber === currentPage)
              .map((page, idx) => (
                <div
                  key={page.pageNumber}
                  ref={(el) => { pageRefs.current[idx] = el; }}
                  className="w-[320px] sm:w-[540px] md:w-[680px] lg:w-[760px] min-h-[460px] sm:min-h-[800px] md:min-h-[960px] bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-12 mb-8 relative border border-slate-300 flex flex-col justify-between select-text"
                >
                  {/* Watermark in Background */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                    <span className="text-8xl sm:text-9xl font-black text-slate-900 rotate-[-30deg]">
                      السودان
                    </span>
                  </div>

                  {/* Page Top Header */}
                  <div>
                    <div className="flex items-center justify-between border-b-2 border-blue-900 pb-3 mb-6 text-right">
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-extrabold text-blue-950">
                          منصة الطالب السوداني الذكية · الشهادة المتوسطة
                        </div>
                        <div className="text-[11px] sm:text-xs text-slate-600 font-medium">
                          منصة المنهاج القومي للشهادة المتوسطة · {docData.subjectName}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-left text-[10px] sm:text-xs text-slate-600">
                          <span className="font-bold block text-blue-900">إعداد المنصة</span>
                          <span>ص {page.pageNumber} من {totalPages}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-sm shadow-sm">
                          🇸🇩
                        </div>
                      </div>
                    </div>

                    {/* Page Title & Subtitle Banner */}
                    <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-right">
                      <h3 className="text-base sm:text-xl font-black text-slate-900 mb-1">
                        {page.title}
                      </h3>
                      {page.subtitle && (
                        <p className="text-xs sm:text-sm text-slate-600 font-medium">
                          {page.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Sections Rendering */}
                    <div className="space-y-5 text-right">
                      {page.sections.map((section, sIdx) => (
                        <div key={sIdx} className="space-y-2">
                          {section.heading && (
                            <h4 className="text-sm sm:text-base font-extrabold text-blue-900 border-r-4 border-amber-500 pr-3 my-2">
                              {section.heading}
                            </h4>
                          )}

                          {/* Box type */}
                          {section.type === 'box' && (
                            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-sm">
                              {section.content}
                            </div>
                          )}

                          {/* Formula type */}
                          {section.type === 'formula' && (
                            <div className="p-4 rounded-2xl bg-blue-50 border-r-4 border-blue-700 text-blue-950 font-mono text-xs sm:text-sm shadow-sm font-bold whitespace-pre-line">
                              {section.content}
                            </div>
                          )}

                          {/* Table type */}
                          {section.type === 'table' && section.tableData && (
                            <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm my-3">
                              <table className="w-full text-right text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-900 font-black">
                                    {section.tableData.headers.map((h, hIdx) => (
                                      <th key={hIdx} className="p-2.5 sm:p-3 border-l border-slate-200 last:border-0">
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {section.tableData.rows.map((row, rIdx) => (
                                    <tr 
                                      key={rIdx}
                                      className={`border-b border-slate-200 last:border-0 hover:bg-blue-50/40 ${
                                        rIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                                      }`}
                                    >
                                      {row.map((cell, cIdx) => (
                                        <td key={cIdx} className="p-2.5 sm:p-3 border-l border-slate-200 last:border-0 text-slate-800">
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Solved Question type */}
                          {section.type === 'question' && section.questionData && (
                            <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 bg-white shadow-sm space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <span className="text-xs sm:text-sm font-black text-blue-900">
                                  {section.questionData.qNumber}
                                </span>
                                {section.questionData.marks && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                                    {section.questionData.marks}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                                {section.questionData.question}
                              </p>

                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-700">
                                <span className="font-extrabold text-blue-950 block">خطوات الحل التفصيلية:</span>
                                {section.questionData.steps.map((st, stepIdx) => (
                                  <div key={stepIdx} className="flex items-start gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                                    <span>{st}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-black flex items-center justify-between">
                                <span>{section.questionData.finalAnswer}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950">
                                  إجابة نموذجية معتمدة
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Text / Points */}
                          {section.content && section.type !== 'box' && section.type !== 'formula' && (
                            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                              {section.content}
                            </p>
                          )}

                          {section.points && (
                            <ul className="space-y-1.5 pr-4 text-xs sm:text-sm text-slate-700 list-disc marker:text-amber-500">
                              {section.points.map((pt, pIdx) => (
                                <li key={pIdx}>{pt}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Page Bottom Footer */}
                  <div className="pt-6 mt-8 border-t border-slate-200 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
                    <div>
                      <span>المؤلف: {docData.author}</span>
                      <span className="mx-2">•</span>
                      <span>العام الدراسي: {docData.publishYear}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-700">
                      <span>الصفحة {page.pageNumber} من {totalPages}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </main>
      </div>

      {/* Download Success Floating Notification */}
      {downloadSuccessToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <Check className="w-5 h-5 text-emerald-200" />
          <div className="text-right text-xs">
            <div className="font-bold">تم بدء تحميل ملف PDF بنجاح!</div>
            <div className="text-emerald-100 text-[11px]">يمكنك الآن مراجعة المذكرة بدون إنترنت على جهازك.</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFViewerModal;
