/**
 * بيانات تجريبية مشتركة (Sample Content) — المرحلة الأولى.
 *
 * ⚠️ تنبيه مهم: كل ما هنا **محتوى تجريبي للعرض فقط**، ولم تتم مطابقته بعد
 * مع المنهج السوداني المعتمد للصف الثالث المتوسط.
 * لذلك كل عنصر يحمل status: 'sample'، والواجهات ملزمة بوسمه للطالب.
 *
 * تُستخدم في:
 *   - تطبيق الطالب: عرض المقررات والدروس
 *   - تطبيق الإدارة: جداول إدارة المحتوى (للتجربة فقط، بلا حفظ)
 */
import type {
  Lesson,
  ResourceItem,
  SampleActivity,
  SampleStudent,
  Subject,
} from './types';

const attachment = (
  id: string,
  title: string,
  kind: 'summary' | 'worksheet' | 'pdf' | 'audio' | 'video',
  pages?: number,
  size?: string
) => ({ id, title, kind, pages, size, available: false });

export const SAMPLE_SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'الرياضيات',
    nameEn: 'Mathematics',
    code: 'MATH-09',
    description: 'الجبر، المعادلات، الهندسة، نظرية فيثاغورس، والإحصاء والاحتمالات.',
    icon: '📐',
    accent: 'blue',
    status: 'sample',
    units: [
      {
        id: 'math-u1',
        subjectId: 'math',
        number: 1,
        title: 'الوحدة الأولى: المقادير الجبرية',
        description: 'تحليل المقادير الجبرية وحل المعادلات الخطية.',
        lessons: [
          {
            id: 'math-l1',
            subjectId: 'math',
            unitId: 'math-u1',
            number: 1,
            title: 'تحليل الفرق بين مربعين',
            durationMinutes: 35,
            summary:
              'إتقان قاعدة الفرق بين مربعين واستخدامها في تبسيط المقادير وحل المعادلات.',
            objectives: [
              'التعرف على صورة الفرق بين مربعين: س² − ص² = (س − ص)(س + ص)',
              'تطبيق القاعدة في تبسيط الكسور الجبرية',
            ],
            sections: [
              {
                id: 'math-l1-s1',
                title: 'مفهوم التحليل الجبري',
                paragraphs: [
                  'التحليل الجبري هو كتابة المقدار في صورة حاصل ضرب عاملين أو أكثر، وهو الأساس لحل المعادلات من الدرجة الثانية وتبسيط المقادير النسبية.',
                ],
                keyPoints: [
                  'العامل المشترك الأكبر هو أول خطوة في أي مسألة تحليل',
                  'مجموع المربعين لا يُحلَّل في مجموعة الأعداد الحقيقية',
                ],
                rule: 'س² − ص² = (س − ص)(س + ص)',
                example: {
                  question: 'حلّل: ٤س² − ٩',
                  solution: '٤س² = (٢س)² و ٩ = ٣²، إذن ٤س² − ٩ = (٢س − ٣)(٢س + ٣).',
                },
              },
            ],
            attachments: [
              attachment('math-l1-a1', 'ملخص الدرس', 'summary', 2, '—'),
              attachment('math-l1-a2', 'تمارين إضافية', 'worksheet', 3, '—'),
            ],
            status: 'sample',
          },
          {
            id: 'math-l2',
            subjectId: 'math',
            unitId: 'math-u1',
            number: 2,
            title: 'المقدار الثلاثي',
            durationMinutes: 35,
            summary: 'تحليل المقدار الثلاثي البسيط في صورة س² + ب س + ج.',
            objectives: [
              'إيجاد عددين حاصل ضربهما ج ومجموعهما ب',
              'مراعاة إشارات الحدود عند التحليل',
            ],
            sections: [
              {
                id: 'math-l2-s1',
                title: 'طريقة التحليل',
                paragraphs: [
                  'نبحث عن عددين حاصل ضربهما يساوي الحد المطلق (ج) ومجموعهما الجبري يساوي معامل الحد الأوسط (ب)، مع مراعاة إشارة الحد الأخير.',
                ],
                rule: 'س² + ب س + ج = (س + م)(س + ن) حيث م ن = ج و م + ن = ب',
                example: {
                  question: 'حلّل: س² − ٥س + ٦',
                  solution: 'العددان (−٢) و(−٣): حاصل ضربهما +٦ ومجموعهما −٥، إذن = (س − ٢)(س − ٣).',
                },
              },
            ],
            attachments: [attachment('math-l2-a1', 'ملخص الدرس', 'summary', 2, '—')],
            status: 'sample',
          },
        ],
      },
      {
        id: 'math-u2',
        subjectId: 'math',
        number: 2,
        title: 'الوحدة الثانية: الهندسة',
        description: 'نظرية فيثاغورس وتطبيقاتها في المثلث القائم.',
        lessons: [
          {
            id: 'math-l3',
            subjectId: 'math',
            unitId: 'math-u2',
            number: 1,
            title: 'نظرية فيثاغورس',
            durationMinutes: 40,
            summary: 'استخدام نظرية فيثاغورس في إيجاد أطوال أضلاع المثلث القائم.',
            objectives: [
              'صياغة النظرية: (الوتر)² = (الضلع الأول)² + (الضلع الثاني)²',
              'تطبيق النظرية في مسائل واقعية',
            ],
            sections: [
              {
                id: 'math-l3-s1',
                title: 'صياغة النظرية',
                paragraphs: [
                  'في المثلث القائم الزاوية، مربع طول الوتر يساوي مجموع مربعي طولي الضلعين القائمين.',
                ],
                rule: 'ج² = أ² + ب²',
                example: {
                  question: 'مثلث قائم ضلعاه ٣ سم و٤ سم، أوجد الوتر.',
                  solution: 'ج² = ٣² + ٤² = ٩ + ١٦ = ٢٥، إذن الوتر = ٥ سم.',
                },
              },
            ],
            attachments: [attachment('math-l3-a1', 'ملخص النظرية', 'summary', 1, '—')],
            status: 'sample',
          },
        ],
      },
    ],
  },

  {
    id: 'science',
    name: 'العلوم',
    nameEn: 'Science',
    code: 'SCI-09',
    description: 'الكيمياء والفيزياء والأحياء وفق منهج الصف الثالث المتوسط.',
    icon: '🔬',
    accent: 'emerald',
    status: 'sample',
    units: [
      {
        id: 'sci-u1',
        subjectId: 'science',
        number: 1,
        title: 'الوحدة الأولى: الروابط الكيميائية',
        description: 'الروابط الأيونية والتساهمية وتكافؤ العناصر.',
        lessons: [
          {
            id: 'sci-l1',
            subjectId: 'science',
            unitId: 'sci-u1',
            number: 1,
            title: 'الروابط الأيونية والتساهمية',
            durationMinutes: 40,
            summary: 'التفريق بين الرابطة الأيونية والتساهمية وخصائص كل منهما.',
            objectives: [
              'شرح كيف تنشأ الرابطة الأيونية بانتقال الإلكترونات',
              'شرح كيف تنشأ الرابطة التساهمية بمشاركة الإلكترونات',
            ],
            sections: [
              {
                id: 'sci-l1-s1',
                title: 'الرابطة الأيونية',
                paragraphs: [
                  'تنشأ بين ذرة فلز تفقد إلكتروناً وذرة لافلز تكسبه، فتتكوّن أيونات موجبة وسالبة تتجاذب كهربائياً.',
                ],
                keyPoints: ['تحدث غالباً بين الفلزات واللافلزات', 'مركباتها صلبة بلورية وذات درجات انصهار عالية'],
              },
              {
                id: 'sci-l1-s2',
                title: 'الرابطة التساهمية',
                paragraphs: [
                  'تنشأ بمشاركة زوج أو أكثر من الإلكترونات بين ذرتي لافلزين للوصول إلى التركيب الإلكتروني المستقر.',
                ],
                keyPoints: ['تحدث بين ذرات اللافلزات', 'قد تكون أحادية أو ثنائية أو ثلاثية'],
              },
            ],
            attachments: [attachment('sci-l1-a1', 'ملخص الدرس', 'summary', 2, '—')],
            status: 'sample',
          },
        ],
      },
      {
        id: 'sci-u2',
        subjectId: 'science',
        number: 2,
        title: 'الوحدة الثانية: قوانين الحركة',
        description: 'قوانين نيوتن للحركة وتطبيقاتها.',
        lessons: [
          {
            id: 'sci-l2',
            subjectId: 'science',
            unitId: 'sci-u2',
            number: 1,
            title: 'قوانين نيوتن الثلاثة',
            durationMinutes: 40,
            summary: 'صياغة قوانين نيوتن للحركة مع أمثلة من الحياة اليومية.',
            objectives: ['صياغة القانون الأول (القصور الذاتي)', 'صياغة القانون الثاني: ق = ك × ت'],
            sections: [
              {
                id: 'sci-l2-s1',
                title: 'القانون الثاني',
                paragraphs: [
                  'تسارع الجسم يتناسب طردياً مع القوة المؤثرة وعكسياً مع كتلته.',
                ],
                rule: 'القوة = الكتلة × التسارع (ق = ك ت)',
              },
            ],
            attachments: [attachment('sci-l2-a1', 'ملخص القوانين', 'summary', 1, '—')],
            status: 'sample',
          },
        ],
      },
    ],
  },

  {
    id: 'arabic',
    name: 'اللغة العربية',
    nameEn: 'Arabic',
    code: 'ARB-09',
    description: 'النحو والصرف والبلاغة والنصوص الأدبية.',
    icon: '📖',
    accent: 'gold',
    status: 'sample',
    units: [
      {
        id: 'arb-u1',
        subjectId: 'arabic',
        number: 1,
        title: 'الوحدة الأولى: الممنوع من الصرف',
        description: 'تعريف الممنوع من الصرف وأسبابه وعلامات إعرابه.',
        lessons: [
          {
            id: 'arb-l1',
            subjectId: 'arabic',
            unitId: 'arb-u1',
            number: 1,
            title: 'الممنوع من الصرف',
            durationMinutes: 35,
            summary: 'التعرف على الأسماء الممنوعة من الصرف وإعرابها بالفتحة نيابة عن الكسرة.',
            objectives: ['حصر أسباب المنع من الصرف', 'إعراب الاسم الممنوع من الصرف في الجملة'],
            sections: [
              {
                id: 'arb-l1-s1',
                title: 'علامة إعرابه',
                paragraphs: [
                  'الاسم الممنوع من الصرف يُجرّ بالفتحة نيابة عن الكسرة، ولا يُنوَّن، إلا إذا أُضيف أو دخلت عليه «ال».',
                ],
                rule: 'يُجرّ بالفتحة ولا يُنوَّن',
                example: {
                  question: 'مررتُ بمدارسَ جديدةً.',
                  solution: '«مدارس» ممنوع من الصرف (صيغة منتهى الجموع) مجرور بالفتحة.',
                },
              },
            ],
            attachments: [attachment('arb-l1-a1', 'ملخص القاعدة', 'summary', 1, '—')],
            status: 'sample',
          },
        ],
      },
    ],
  },

  {
    id: 'islamic',
    name: 'التربية الإسلامية',
    nameEn: 'Islamic Studies',
    code: 'ISL-09',
    description: 'القرآن الكريم وعلومه، الفقه، والسيرة النبوية.',
    icon: '🕌',
    accent: 'teal',
    status: 'sample',
    units: [
      {
        id: 'isl-u1',
        subjectId: 'islamic',
        number: 1,
        title: 'الوحدة الأولى: أحكام التجويد',
        description: 'أحكام النون الساكنة والتنوين.',
        lessons: [
          {
            id: 'isl-l1',
            subjectId: 'islamic',
            unitId: 'isl-u1',
            number: 1,
            title: 'الإظهار والإدغام والإقلاب والإخفاء',
            durationMinutes: 30,
            summary: 'التفريق بين الأحكام الأربعة للنون الساكنة والتنوين مع الأمثلة.',
            objectives: ['تعريف كل حكم وحروفه', 'تلاوة الأمثلة تلاوة صحيحة'],
            sections: [
              {
                id: 'isl-l1-s1',
                title: 'حروف كل حكم',
                paragraphs: [
                  'الإظهار ستة حروف حلقية، والإدغام ستة أحرف في كلمة «يرملون»، والإقلاب حرف واحد وهو الباء، وما بقي من الحروف فهو إخفاء.',
                ],
                keyPoints: ['الإظهار: إخراج الحرف بلا غنة', 'الإقلاب: قلب النون ميماً مع الغنة'],
              },
            ],
            attachments: [attachment('isl-l1-a1', 'جدول الأحكام', 'summary', 1, '—')],
            status: 'sample',
          },
        ],
      },
    ],
  },

  {
    id: 'social',
    name: 'الدراسات الاجتماعية',
    nameEn: 'Social Studies',
    code: 'SOC-09',
    description: 'التاريخ والجغرافيا والتربية الوطنية.',
    icon: '🗺️',
    accent: 'violet',
    status: 'sample',
    units: [
      {
        id: 'soc-u1',
        subjectId: 'social',
        number: 1,
        title: 'الوحدة الأولى: الثورة المهدية',
        description: 'أسباب الثورة المهدية ومراحلها ونتائجها.',
        lessons: [
          {
            id: 'soc-l1',
            subjectId: 'social',
            unitId: 'soc-u1',
            number: 1,
            title: 'أسباب الثورة المهدية',
            durationMinutes: 35,
            summary: 'تحليل الأسباب السياسية والاقتصادية والاجتماعية للثورة المهدية.',
            objectives: ['تعداد أسباب الثورة', 'ربط الأسباب بالنتائج التاريخية'],
            sections: [
              {
                id: 'soc-l1-s1',
                title: 'الأسباب العامة',
                paragraphs: [
                  'ترجع الثورة إلى أسباب سياسية واقتصادية واجتماعية تراكمت في عهد الحكم التركي المصري، تلاها فساد إداري وضرائب باهظة.',
                ],
                keyPoints: ['الضرائب المجحفة', 'ضعف الإدارة وفقدان الأمن'],
              },
            ],
            attachments: [attachment('soc-l1-a1', 'ملخص الدرس', 'summary', 1, '—')],
            status: 'sample',
          },
        ],
      },
    ],
  },

  {
    id: 'english',
    name: 'اللغة الإنجليزية',
    nameEn: 'English',
    code: 'ENG-09',
    description: 'المفردات والقواعد والقراءة والتعبير الكتابي.',
    icon: '🔤',
    accent: 'cyan',
    status: 'sample',
    units: [
      {
        id: 'eng-u1',
        subjectId: 'english',
        number: 1,
        title: 'Unit 1: Daily Routines',
        description: 'Talking about daily routines using the simple present tense.',
        lessons: [
          {
            id: 'eng-l1',
            subjectId: 'english',
            unitId: 'eng-u1',
            number: 1,
            title: 'The Simple Present Tense',
            durationMinutes: 30,
            summary: 'استخدام المضارع البسيط للتعبير عن العادات والروتين اليومي.',
            objectives: ['تكوين جمل مثبتة ومنفية في المضارع البسيط', 'استخدام ظروف التكرار'],
            sections: [
              {
                id: 'eng-l1-s1',
                title: 'القاعدة',
                paragraphs: [
                  'يُستخدم المضارع البسيط للتعبير عن العادات والحقائق، ويُضاف (s) للفعل مع المفرد الغائب.',
                ],
                rule: 'Subject + verb(s) + complement',
                example: {
                  question: 'He …… (go) to school every day.',
                  solution: 'He goes to school every day.',
                },
              },
            ],
            attachments: [attachment('eng-l1-a1', 'Grammar Summary', 'summary', 1, '—')],
            status: 'sample',
          },
        ],
      },
    ],
  },

  {
    id: 'ict',
    name: 'تكنولوجيا المعلومات',
    nameEn: 'ICT',
    code: 'ICT-09',
    description: 'أساسيات الحاسوب والإنترنت ومهارات المعالجة.',
    icon: '💻',
    accent: 'rose',
    status: 'sample',
    units: [
      {
        id: 'ict-u1',
        subjectId: 'ict',
        number: 1,
        title: 'الوحدة الأولى: أساسيات الحاسوب',
        description: 'مكوّنات الحاسوب وأنظمة التشغيل.',
        lessons: [
          {
            id: 'ict-l1',
            subjectId: 'ict',
            unitId: 'ict-u1',
            number: 1,
            title: 'مكوّنات الحاسوب',
            durationMinutes: 30,
            summary: 'التفريق بين المكوّنات المادية والبرمجية وأدوار كل منها.',
            objectives: ['تصنيف وحدات الإدخال والإخراج', 'تسمية أجزاء وحدة المعالجة'],
            sections: [
              {
                id: 'ict-l1-s1',
                title: 'المكوّنات المادية',
                paragraphs: [
                  'تشمل وحدات الإدخال (لوحة المفاتيح، الفأرة) والإخراج (الشاشة، الطابعة) ووحدة المعالجة والذاكرة.',
                ],
                keyPoints: ['الذاكرة العشوائية RAM تفقد محتواها عند إطفاء الجهاز'],
              },
            ],
            attachments: [attachment('ict-l1-a1', 'ملخص الدرس', 'summary', 1, '—')],
            status: 'sample',
          },
        ],
      },
    ],
  },

  {
    id: 'civics',
    name: 'التربية الوطنية',
    nameEn: 'Civics',
    code: 'CIV-09',
    description: 'المواطنة، الحقوق والواجبات، والنظام الدستوري.',
    icon: '🇸🇩',
    accent: 'navy',
    status: 'sample',
    units: [
      {
        id: 'civ-u1',
        subjectId: 'civics',
        number: 1,
        title: 'الوحدة الأولى: الحقوق والواجبات',
        description: 'مفهوم المواطنة وما يترتب عليها من حقوق وواجبات.',
        lessons: [
          {
            id: 'civ-l1',
            subjectId: 'civics',
            unitId: 'civ-u1',
            number: 1,
            title: 'مفهوم المواطنة',
            durationMinutes: 30,
            summary: 'التعرف على الحقوق والواجبات المتبادلة بين المواطن والدولة.',
            objectives: ['تعريف المواطنة', 'تعداد ثلاث حقوق وثلاث واجبات'],
            sections: [
              {
                id: 'civ-l1-s1',
                title: 'الحقوق والواجبات',
                paragraphs: [
                  'المواطنة علاقة قانونية واجتماعية بين الفرد والدولة، تقوم على حقوق يتمتع بها وواجبات يؤديها.',
                ],
                keyPoints: ['احترام القانون واجب أساسي', 'المشاركة المجتمعية حق وواجب'],
              },
            ],
            attachments: [attachment('civ-l1-a1', 'ملخص الدرس', 'summary', 1, '—')],
            status: 'sample',
          },
        ],
      },
    ],
  },
];

export const SAMPLE_RESOURCES: ResourceItem[] = [
  { id: 'res-1', title: 'مذكرة الرياضيات — الوحدة الأولى', subjectId: 'math', kind: 'summary', pages: 12, size: '—', available: false, status: 'sample' },
  { id: 'res-2', title: 'مذكرة العلوم — الروابط الكيميائية', subjectId: 'science', kind: 'summary', pages: 10, size: '—', available: false, status: 'sample' },
  { id: 'res-3', title: 'ورقة عمل النحو — الممنوع من الصرف', subjectId: 'arabic', kind: 'worksheet', pages: 4, size: '—', available: false, status: 'sample' },
  { id: 'res-4', title: 'نموذج امتحان تجريبي — العلوم', subjectId: 'science', kind: 'pdf', pages: 6, size: '—', available: false, status: 'sample' },
  { id: 'res-5', title: 'ملخص قوانين نيوتن', subjectId: 'science', kind: 'summary', pages: 3, size: '—', available: false, status: 'sample' },
];

/** إحصاءات سريعة للوحة الإدارة */
export const contentStats = () => {
  const subjects = SAMPLE_SUBJECTS.length;
  const units = SAMPLE_SUBJECTS.reduce((a, s) => a + s.units.length, 0);
  const lessons = SAMPLE_SUBJECTS.reduce(
    (a, s) => a + s.units.reduce((b, u) => b + u.lessons.length, 0),
    0
  );
  return { subjects, units, lessons, resources: SAMPLE_RESOURCES.length };
};

/** صف درس مُثرى باسم المادة والوحدة — يُستخدم في جداول لوحة الإدارة */
export interface LessonRow {
  id: string;
  subjectId: string;
  unitId: string;
  number: number;
  title: string;
  durationMinutes: number;
  summary: string;
  objectives: string[];
  sections: Lesson['sections'];
  attachments: Lesson['attachments'];
  status: Lesson['status'];
  subjectName: string;
  unitTitle: string;
}

export const allLessons = (): LessonRow[] =>
  SAMPLE_SUBJECTS.flatMap((s) =>
    s.units.flatMap((u) =>
      u.lessons.map((l) => ({ ...l, subjectName: s.name, unitTitle: u.title })),
    ),
  );

/** أسماء المواد للبحث بالمعرف */
export const subjectNameById = (id: string) =>
  SAMPLE_SUBJECTS.find((s) => s.id === id)?.name ?? '—';

/* ============================================================
 * بيانات تجريبية للوحة الإدارة (طلاب + أنشطة)
 * ⚠️ ليست بيانات حقيقية — تُعرض لتجربة الواجهة فقط،
 *    ولا يوجد تسجيل دخول أو تتبّع تقدّم في هذه المرحلة.
 * ============================================================ */

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
