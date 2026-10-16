import React, { useState } from 'react';
import { Subject } from '../types';
import { 
  ShieldCheck, 
  PlusCircle, 
  Upload, 
  Database, 
  FileText, 
  CheckCircle2, 
  Layers, 
  BookOpen, 
  Edit3, 
  Trash2, 
  AlertCircle,
  Eye,
  X
} from 'lucide-react';

interface AdminDashboardViewProps {
  subjects: Subject[];
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ subjects }) => {
  const [activeTab, setActiveTab] = useState<'lessons' | 'upload' | 'database'>('lessons');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Form states for Add Lesson Modal
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState(subjects[0]?.id || 'math');
  const [newUnit, setNewUnit] = useState('الوحدة الأولى');
  const [newDuration, setNewDuration] = useState('35');
  const [newSummary, setNewSummary] = useState('');

  const handleAddLessonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionNotice(`تم حفظ مسودة الدرس "${newTitle}" بنجاح في الواجهة الأمامية!`);
    setShowAddModal(false);
    setNewTitle('');
    setNewSummary('');
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleAction = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="bg-[#0B1E36] text-white rounded-3xl p-6 sm:p-8 border border-[#193557] shadow-lg text-right space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>لوحة المعلم ومسؤول المحتوى التعليمي</span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة درس جديد للمنهج</span>
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          إدارة مناهج الصف الثالث المتوسط
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
          واجهة إدارة المحتوى المجهزة للربط مع قاعدة البيانات السحابية ونظام التخزين في المراحل القادمة.
        </p>

        {/* Phase 1 Scope Clarification */}
        <div className="p-4 rounded-2xl bg-[#122846] border border-amber-400/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-200 space-y-1">
            <span className="font-bold text-amber-300">
              جاهزية الهندسة البرمجية (Database Ready):
            </span>
            <p className="text-slate-300 leading-relaxed">
              تمت هيكلة الحقول ونماذج البيانات (Data Models) لتتوافق مباشرة مع قواعد البيانات ومخازن ملفات الـ PDF السحابية دون الحاجة لإعادة كتابة الواجهة عند الانتقال للمرحلة التالية.
            </p>
          </div>
        </div>
      </div>

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-bold">(إشعار تجريبي)</span>
        </div>
      )}

      {/* Admin KPIs Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0D1F35] p-5 rounded-2xl border border-slate-200 dark:border-[#1C3A62] shadow-sm text-right">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">المواد المقررة</div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">8 مواد</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">المنهج السوداني 2026</div>
        </div>

        <div className="bg-white dark:bg-[#0D1F35] p-5 rounded-2xl border border-slate-200 dark:border-[#1C3A62] shadow-sm text-right">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">الوحدات التعليمية</div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">28 وحدة</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">فهرسة كاملة</div>
        </div>

        <div className="bg-white dark:bg-[#0D1F35] p-5 rounded-2xl border border-slate-200 dark:border-[#1C3A62] shadow-sm text-right">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">إجمالي الدروس</div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">128 درساً</div>
          <div className="text-[11px] text-blue-700 dark:text-amber-400 mt-1">جاهزة للمراجعة</div>
        </div>

        <div className="bg-white dark:bg-[#0D1F35] p-5 rounded-2xl border border-slate-200 dark:border-[#1C3A62] shadow-sm text-right">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">المذكرات والملفات</div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">46 ملف PDF</div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">امتحانات وملخصات</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-[#142A46] rounded-xl w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('lessons')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'lessons'
              ? 'bg-white dark:bg-[#1F3E68] text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          جدول مراجعة الدروس والمقررات
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-white dark:bg-[#1F3E68] text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          منطقة رفع المذكرات والملفات
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'database'
              ? 'bg-white dark:bg-[#1F3E68] text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          خطة ربط قاعدة البيانات السحابية
        </button>
      </div>

      {/* Tab 1: Lessons Review Table */}
      {activeTab === 'lessons' && (
        <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-right">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                قائمة الدروس الجاهزة والمسودات
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                يمكن للمعلم تدقيق الشروحات، إضافة أمثلة، أو تعديل المرفقات
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-900 dark:text-amber-300 bg-blue-50 dark:bg-[#142D50] px-3 py-1.5 rounded-lg border border-blue-100 dark:border-[#1F416E]">
              عرض المواد
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-[#0A182B] text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-bold">
                <tr>
                  <th className="p-4">المادة</th>
                  <th className="p-4">عنوان الدرس</th>
                  <th className="p-4">الوحدة</th>
                  <th className="p-4">المدة</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {subjects.flatMap((s) =>
                  s.units.flatMap((u) =>
                    u.lessons.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-[#122844] transition-colors">
                        <td className="p-4 font-bold text-blue-900 dark:text-amber-400">{s.name}</td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">{l.title}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">{u.title}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-mono">{l.durationMinutes} دقيقة</td>
                        <td className="p-4">
                          <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-800/50 font-semibold">
                            معتمد ونشط
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleAction(`تم فتح نافذة تحرير الدرس: ${l.title}`)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1C3A62] text-slate-600 dark:text-slate-400 hover:text-blue-900 dark:hover:text-amber-400 cursor-pointer"
                              title="تعديل الدرس"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAction(`معاينة مسودة الدرس: ${l.title}`)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1C3A62] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                              title="معاينة"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Resource Upload Zone */}
      {activeTab === 'upload' && (
        <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-8 shadow-sm text-right space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              رفع مذكرات وملفات PDF جديدة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              اسحب وأفلت مذكرات وملخصات المعلمين لتجهيزها ونشرها للطلاب
            </p>
          </div>

          <div
            onClick={() => handleAction('تم استدعاء محاكي منتقي الملفات في الواجهة.')}
            className="border-2 border-dashed border-slate-300 dark:border-[#21436F] hover:border-blue-900 dark:hover:border-amber-400 rounded-3xl p-10 text-center space-y-3 bg-slate-50/50 dark:bg-[#122844]/60 hover:bg-blue-50/20 dark:hover:bg-[#16365F]/40 transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-amber-400/20 text-blue-900 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-white">
              اضغط لاختيار ملف PDF أو اسحب الملف هنا
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              الحد الأقصى الموصى به: 25 ميغابايت لكل مذكرة (PDF, DOCX)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-[#152B4A] border border-amber-200 dark:border-amber-400/30 text-amber-900 dark:text-amber-200 text-xs">
            <span className="font-bold block mb-1">ملاحظة فنية:</span>
            في المرحلة الأولى تم بناء واجهة الرفع بدون إرسال إلى خادم خارجي. عند اعتماد المرحلة الثانية سيتم ربط زر الرفع بخدمة Firebase Storage أو Cloud Storage المباشرة.
          </div>
        </div>
      )}

      {/* Tab 3: Database & Future Schema Blueprint */}
      {activeTab === 'database' && (
        <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-8 shadow-sm text-right space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-amber-400/20 text-blue-900 dark:text-amber-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                مخطط هيكل قاعدة البيانات السحابية (Phase 2 Blueprint)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                المخطط الهيكلي الجاهز للربط الفوري في المرحلة القادمة
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] space-y-2">
              <div className="font-bold text-blue-900 dark:text-amber-400 text-sm">مجموعة subjects</div>
              <p className="text-slate-600 dark:text-slate-300">
                تخزين المواد، الأكواد، ترتيب المنهج، وتصنيف العلوم الإنسانية والتطبيقية.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] space-y-2">
              <div className="font-bold text-blue-900 dark:text-amber-400 text-sm">مجموعة lessons</div>
              <p className="text-slate-600 dark:text-slate-300">
                شروحات الدروس، القواعد الذهبية، المسائل المحلولة، وروابط ملفات الـ PDF.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] space-y-2">
              <div className="font-bold text-blue-900 dark:text-amber-400 text-sm">مجموعة student_progress</div>
              <p className="text-slate-600 dark:text-slate-300">
                سجل إنجاز الطالب، الدروس المكتملة، درجات الاختبارات، وتتابع الأيام.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0D1F35] rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-[#1C3A62] animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-[#0B1E36] text-white flex items-center justify-between text-right">
              <h3 className="text-base font-bold">إضافة درس جديد إلى المنهج</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLessonSubmit} className="p-6 overflow-y-auto space-y-4 text-right text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">عنوان الدرس</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: نظرية فيثاغورس في المثلث القائم"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#1E3A60] bg-white dark:bg-[#10243C] text-slate-900 dark:text-white focus:outline-none focus:border-blue-900 dark:focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">المادة</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#1E3A60] focus:outline-none focus:border-blue-900 dark:focus:border-amber-400 bg-white dark:bg-[#10243C] text-slate-900 dark:text-white"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">الوحدة المقررة</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#1E3A60] bg-white dark:bg-[#10243C] text-slate-900 dark:text-white focus:outline-none focus:border-blue-900 dark:focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">مدة الدرس المقترحة (بالدقائق)</label>
                <input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#1E3A60] bg-white dark:bg-[#10243C] text-slate-900 dark:text-white focus:outline-none focus:border-blue-900 dark:focus:border-amber-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">موجز الشرح والأهداف</label>
                <textarea
                  rows={3}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="اكتب أهداف الدرس ومفاهيمه الرئيسية..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#1E3A60] bg-white dark:bg-[#10243C] text-slate-900 dark:text-white focus:outline-none focus:border-blue-900 dark:focus:border-amber-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-[#1E3A60] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#142A46] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950 text-white font-bold cursor-pointer shadow-md"
                >
                  حفظ مسودة الدرس
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
