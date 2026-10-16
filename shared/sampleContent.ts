/**
 * بيانات تجريبية للوحة الإدارة فقط (طلاب + أنشطة).
 *
 * ⚠️ محتوى المنهج الحقيقي يعيش في `shared/curriculum.ts`
 *    وهو المصدر الوحيد المشترك بين تطبيق الطالب وتطبيق الإدارة.
 *
 * هذه البيانات للعرض والتجربة — لا توجد حسابات حقيقية في المرحلة الأولى.
 */
import type { SampleActivity, SampleStudent } from './types';

export const SAMPLE_STUDENTS: SampleStudent[] = [
  { id: 'stu-01', name: 'محمد أحمد', grade: 'الثالث المتوسط — ف أ', lastActivity: 'قبل ساعتين', progressPercent: 62, status: 'sample' },
  { id: 'stu-02', name: 'فاطمة عمر', grade: 'الثالث المتوسط — ف ب', lastActivity: 'أمس', progressPercent: 45, status: 'sample' },
  { id: 'stu-03', name: 'عبدالله يوسف', grade: 'الثالث المتوسط — ف أ', lastActivity: 'قبل ٣ أيام', progressPercent: 28, status: 'sample' },
  { id: 'stu-04', name: 'رنا الصادق', grade: 'الثالث المتوسط — ف ج', lastActivity: 'قبل أسبوع', progressPercent: 12, status: 'sample' },
];

export const SAMPLE_ACTIVITIES: SampleActivity[] = [
  { id: 'act-01', action: 'عرض درس', detail: 'تحليل الفرق بين مربعين — الرياضيات', time: 'قبل ١٠ دقائق' },
  { id: 'act-02', action: 'فتح مادة', detail: 'العلوم — الوحدة الأولى: الروابط الكيميائية', time: 'قبل ٢٥ دقيقة' },
  { id: 'act-03', action: 'بحث في المكتبة', detail: 'نموذج امتحان تجريبي — العلوم', time: 'قبل ساعة' },
  { id: 'act-04', action: 'زيارة الصفحة الرئيسية', detail: 'منصة الطالب السوداني الذكية', time: 'قبل ساعتين' },
];
