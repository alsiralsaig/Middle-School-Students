# خادم منصة الطالب السوداني الذكية — `apps/api`

خدمة مستقلة (Express + Prisma) تضيف **قاعدة بيانات حقيقية ومصادقة** للمشروع
دون المساس بهيكل التطبيقين الأساسيين (`apps/student` و `apps/admin`).

- المنفذ: **5000**
- قاعدة البيانات: **SQLite** للتطوير (`prisma/dev.db`) — و **PostgreSQL** للإنتاج بتغيير سطر واحد
- الجلسات: كوكي `HttpOnly` + JWT (صلاحيتها ٣٠ يوماً)، وأدوار `student` / `admin`

> ⚠️ كل المحتوى في قاعدة البيانات موسوم بـ `status: "sample"` حتى تُراجَع النصوص
> مقابل وثيقة المنهج الرسمية. لا توجد أي مادة موسومة «معتمدة».

---

## التشغيل لأول مرة

```bash
# من جذر المستودع
npm install --legacy-peer-deps

# إنشاء قاعدة البيانات من المخطط + تعبئتها من ملفات shared/content
npm run api:push     # = prisma db push
npm run api:seed     # = tsx prisma/seed.ts

# تشغيل الخادم
npm run dev:api
```

الخادم: <http://localhost:5000> — فحص الصحة: <http://localhost:5000/api/health>

### أوامر مفيدة

| الأمر | الوصف |
|---|---|
| `npm run dev:api` | تشغيل الخادم مع إعادة التحميل التلقائي |
| `npm run api:push` | مزامنة المخطط مع قاعدة البيانات |
| `npm run api:seed` | إعادة تعبئة البيانات (يحذف القديم أولاً) |
| `npm run db:studio --workspace apps/api` | واجهة Prisma Studio لتصفّح البيانات |
| `npm run db:reset --workspace apps/api` | حذف القاعدة وإعادة إنشائها وتعبئتها |
| `npm run lint --workspace apps/api` | فحص الأنواع (`tsc --noEmit`) |

---

## حسابات تجريبية

| الدور | الهاتف | كلمة المرور |
|---|---|---|
| مدير | `1000000000` | `admin12345` |
| طالب | `900000000` | `student123` |

---

## نقاط النهاية (Endpoints)

### عامة

| الطريقة | المسار | الوصف |
|---|---|---|
| GET | `/api/health` | فحص صحة الخادم |
| GET | `/api/subjects` | كل المواد مع الوحدات والدروس |
| GET | `/api/lessons/:id` | درس واحد بكل أقسامه |
| GET | `/api/resources` | ملفات المكتبة |
| GET | `/api/ratings?lessonId=` | التقييمات (يُعلّم تقييم المستخدم بـ `mine`) |
| GET | `/api/exams` | قائمة الاختبارات |
| GET | `/api/exams/:id/questions` | أسئلة الاختبار **بدون** الإجابات الصحيحة |

### الحساب

| الطريقة | المسار | الوصف |
|---|---|---|
| POST | `/api/auth/register` | `{name, phone\|email, password, grade?, school?}` |
| POST | `/api/auth/login` | `{identifier, password}` |
| POST | `/api/auth/logout` | حذف الكوكي |
| GET | `/api/auth/me` | بيانات الحساب الحالي |
| PATCH | `/api/auth/me` | تحديث الاسم/المدرسة/الولاية/الصورة الرمزية |

تحديد: ٣٠ محاولة / ١٠ دقائق لكل IP على مسارات الحساب.

### تتطلّب تسجيل الدخول

| الطريقة | المسار | الوصف |
|---|---|---|
| GET/POST | `/api/progress` | تقدّم الطالب (مكتمل، محفوظ، ثوانٍ) |
| POST/DELETE | `/api/ratings` | إضافة/حذف تقييم ١–٥ نجوم |
| GET/POST | `/api/focus` | جلسات التركيز (سجلّ الأيام + الدقائق) |
| GET/POST/DELETE | `/api/planner`, `/api/planner/:id`, `/api/planner/group/:groupId` | التقويم الدراسي |
| POST | `/api/exams/:id/submit` | تسليم الإجابات → النتيجة مع الشرح |
| GET | `/api/attempts` | محاولاتي السابقة |
| POST | `/api/ai/chat` | محادثة المساعد الذكي |
| POST | `/api/ai/lesson-chat` | سؤال داخل درس مع سياق الدرس |
| POST | `/api/uploads/resource` | رفع ملف للمكتبة (`multipart/form-data`، حقل `file`) |
| POST | `/api/sync` | مزامنة بيانات localStorage (آخر كتابة تنتصر) |

### الإدارة فقط

| الطريقة | المسار | الوصف |
|---|---|---|
| DELETE | `/api/uploads/resource/:id` | حذف ملف ومرفوعه من القرص |

---

## المزامنة دون اتصال

`POST /api/sync` يستقبل ما خزّنه الطالب في المتصفح ويطبّق قاعدة
**آخر كتابة تنتصر**، ثم يردّ بالحالة النهائية من الخادم:

```jsonc
// الطلب
{
  "progress": [{ "lessonId": "arb-l1", "completed": true, "secondsSpent": 900, "updatedAt": "2026-10-16T10:00:00Z" }],
  "ratings":  [{ "lessonId": "arb-l1", "rating": 5, "comment": "ممتاز", "createdAt": "2026-10-16T10:00:00Z" }],
  "focus":    { "log": { "2026-10-15": 3, "2026-10-16": 2 } },
  "planner":  [{ "id": "evt-1", "title": "مراجعة علوم", "date": "2026-10-22", "time": "20:00", "type": "review" }]
}

// الرد: الحالة الكاملة بعد الدمج (progress, ratings, focus.log, planner)
```

- التقدّم والتقييمات: يُطبّق العميل إن كان `updatedAt` أحدث من الخادم.
- جلسات التركيز: **دمج بأكبر قيمة** لكل يوم (لا تُحذف جلسة).
- التقويم: يُزامَن بمعرّف العميل (`upsert`).

---

## الرفع

- المجلد: `/uploads` في جذر المستودع (يُنشأ تلقائياً، ومستثنى من Git).
- الأنواع المسموحة: PDF و Word و JPEG/PNG/WebP.
- الحجم الأقصى: ٢٠ ميغابايت للملف.

---

## الذكاء الاصطناعي

المفتاح `GEMINI_API_KEY` يُقرأ على الخادم فقط ولا يصل للمتصفح أبداً.
بدونه تردّ نقاط `/api/ai/*` بردّ تعليمي بديل (`offline: true`) ولا يتعطّل شيء.
التحديد: ٢٠ طلباً / ١٠ دقائق لكل مستخدم، وسقف يومي ٢٠٠٠ طلب.

---

## الربط من واجهة الطالب

الواجهة (`apps/student`) لا تستدعي `localhost` مباشرة — تستخدم المسار النسبي
`/backend` ويقوم خادم التطوير بتحويله:

```ts
// apps/student/vite.config.ts
proxy: {
  '/backend': { target: 'http://127.0.0.1:5000', changeOrigin: true,
                rewrite: (p) => p.replace(/^\/backend/, '') },
  '/uploads': { target: 'http://127.0.0.1:5000', changeOrigin: true },
}
```

> ⚠️ في `apps/student/server.ts` صار تحليل JSON مقصوراً على `/api` حتى لا
> يستهلك جسم الطلب قبل وصوله إلى الوكيل (وإلا تتجمد طلبات POST).

**في الإنتاج** لا يعمل الوكيل — يجب تمرير `/backend` و `/uploads` من خادم
الواجهة (Nginx/Express) إلى الخدمة على المنفذ 5000، أو تشغيلهما على نطاق واحد.

### ما يزامَن تلقائياً

| البيانات | المخزن المحلي | القاعدة |
|---|---|---|
| الدروس المكتملة والمحفوظة | `sudanese_platform_accounts` | آخر كتابة تنتصر |
| التقييمات والملاحظات | `ssp_lesson_feedback_v1` | آخر كتابة تنتصر |
| جلسات التركيز | `ssp_focus_log_v1` | دمج بأكبر قيمة لكل يوم |
| مواعيد التقويم | `ssp_planner_events_v1` | يُزامَن بمعرّف العميل |

كل ذلك **اختياري**: بدون حساب أو عند انقطاع الخادم تبقى المنصة تعمل كاملة من
المتصفح، وتظهر حالة الاتصال في بطاقة «حساب المنصة».

## للإنتاج

1. أنشئ قاعدة PostgreSQL وبدّل `provider` في `prisma/schema.prisma` إلى `postgresql`.
2. ولّد سرّاً عشوائياً طويلاً وضعه في `JWT_SECRET`.
3. اضبط `NODE_ENV=production` و `CLIENT_ORIGIN` على نطاق الواجهة (الكوكي يصير `secure`).
4. شغّل: `npm run db:generate && npm run db:push && npm run db:seed` ثم ابدأ الخادم.
