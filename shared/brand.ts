/**
 * الهوية البصرية المشتركة — مستخرجة من اللوجو والبنار الرسميين.
 *
 *   اللوجو : كحلي #002368 · ذهبي #F1AC12
 *   البنار : أزرق #054287 · ذهبي #FABC25 · فاتح #EDF0F3
 *
 * التطبيقان (الطالب والإدارة) يقرآن نفس الرموز — أي تعديل هنا ينعكس عليهما معاً.
 */

export const BRAND = {
  name: 'منصة الطالب السوداني الذكية',
  shortName: 'الطالب الذكي',
  grade: 'الصف الثالث المتوسط',
  stage: 'الشهادة المتوسطة — جمهورية السودان',

  colors: {
    /** كحلي اللوجو — العنوان والهيدر والFooter */
    navy: '#002368',
    navyDeep: '#001842',
    /** أزرق البنار — الهيرو والتدرّجات */
    blue: '#054287',
    blueDeep: '#04356E',
    blueSoft: '#EDF0F3',
    /** الذهبي الخفيف — اللمسات فقط */
    gold: '#F1AC12',
    goldLight: '#FCB91E',
    goldSoft: '#FDF6E3',
    /** محايد */
    white: '#FFFFFF',
    ink: '#0F172A',
    muted: '#64748B',
    border: '#E2E8F0',
    success: '#12805C',
    warning: '#B45309',
    danger: '#B42318',
  },

  /** مسارات الأصول المشتركة */
  assets: {
    logo: '/brand/logo.png',
    banner: '/brand/banner.jpg',
  },
} as const;

export type BrandColors = (typeof BRAND)['colors'];
