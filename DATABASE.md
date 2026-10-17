# قاعدة البيانات — دليل التشغيل والصيانة

كل الأوامر من مجلد `apps/api` إن لم يُذكر غير ذلك.

```
cd apps/api
```

---

## ١. الحالة الحالية

| البند | الحالة |
|---|---|
| محرّك التطوير | SQLite (`prisma/dev.db`) |
| عدد النماذج | ١٤ |
| الهجرات (migrations) | ✅ `20261017000000_init_2026_10` · `20261017000100_subject_syllabus` · `20261017000200_access_codes` |
| النسخ الاحتياطي | ✅ `npm run db:backup` / `db:restore` |
| حارس بيئة الإنتاج | ✅ يمنع الإقلاع بسرّ JWT افتراضي |
| الانتقال إلى PostgreSQL | ⚠️ مهيَّأ وموثَّق، لم يُنفَّذ بعد |

**تحقّق سريع:**

```bash
npm run db:status     # يجب أن يقول: Database schema is up to date!
```

---

## ٢. الأوامر

| الأمر | ما يفعله |
|---|---|
| `npm run db:generate` | يولّد عميل Prisma بعد أي تعديل على `schema.prisma` |
| `npm run db:migrate` | ينشئ هجرة جديدة من تعديلات المخطط (وضع التطوير) |
| `npm run db:deploy` | يطبّق الهجرات المعلَّقة (يُستعمل في الإنتاج) |
| `npm run db:status` | يعرض حالة الهجرات |
| `npm run db:push` | ⚠️ يفرض المخطط على القاعدة **بلا هجرة** — للتجارب السريعة فقط |
| `npm run db:seed` | يعبّئ المحتوى والبيانات التجريبية |
| `npm run db:reset` | يحذف القاعدة، يطبّق الهجرات، ثم يعبّئها |
| `npm run db:studio` | واجهة مرئية لتصفّح البيانات |
| `npm run db:backup` | نسخة احتياطية مؤرَّخة في `prisma/backups/` |
| `npm run db:backups` | قائمة النسخ المتاحة |
| `npm run db:restore -- <ملف>` | استعادة نسخة |

### قاعدة ذهبية

> **لا تستعمل `db:push` بعد الآن إلا للتجارب التي ستُحذف.**
> كل تغيير في المخطط يمرّ بهجرة:
> ```
> عدّل prisma/schema.prisma
> npm run db:migrate -- --name وصف_التغيير
> ```

---

## ٣. النسخ الاحتياطي

```bash
npm run db:backup              # → prisma/backups/dev-YYYYMMDD-HHMMSS.db
npm run db:backups             # يعرض النسخ
npm run db:restore -- dev-20261016-224217.db
```

**كيف يعمل:** مع SQLite يستدعي `VACUUM INTO` (نسخة متسقة حتى لو كانت القاعدة
مفتوحة في عملية أخرى، على عكس `cp`)، وإن لم تتوفر الأداة نفّذها عبر عميل
Prisma نفسه. مع PostgreSQL يستعمل `pg_dump` / `pg_restore`.

يُبقي آخر **١٠ نسخ** ويحذف الأقدم تلقائياً، ومجلد `prisma/backups/` مستثنى
من Git (`*.db` في `.gitignore`).

---

## ٤. حارس الإنتاج

`src/lib/envCheck.ts` يُستدعى في أول سطر تنفيذي من `src/index.ts`:

| الحالة | النتيجة |
|---|---|
| `NODE_ENV=production` و`JWT_SECRET` لم يتغيّر | ⛔ **يوقف الخادم** برسالة واضحة |
| `NODE_ENV=production` وطول السرّ أقل من ٣٢ | ⛔ يوقف الخادم |
| `NODE_ENV=production` و`DATABASE_URL` من نوع `file:` | ⚠️ تحذير فقط |
| وضع التطوير | ⚠️ تحذير فقط، ولا يوقف |

**توليد سرّ صالح:**

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## ٥. الانتقال إلى PostgreSQL

المخطط **خالٍ من أي حقل `Json` أو مصفوفة `String[]`**، فالانتقال نظيف ولا
يحتاج إعادة كتابة.

١. أنشئ قاعدة وأنشئ `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/sudan_platform?schema=public"
```

٢. غيّر سطراً واحداً في `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"     // كان "sqlite"
  url      = env("DATABASE_URL")
}
```

٣. احذف هجرات SQLite وابنِ هجرة أولى للإنتاج (المخطط واحد، لكن صياغة SQL
تختلف بين المحرّكين):

```bash
# أضف ترحيلاً جديداً بعد تعديل schema.prisma:
#  ١) ولّد SQL تفاضلياً من قاعدة البيانات الحالية إلى المخطط الجديد
prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/<طابع_زمني>_<اسم>/migration.sql
printf 'provider = "sqlite"\n' > prisma/migrations/<طابع_زمني>_<اسم>/migration_lock.toml
#  ٢) طبّقه
npm run db:deploy
#  ٣) ولّد الأنواع ثم تحقّق
npx prisma generate && npm run lint

# ⚠️ `prisma migrate dev` يرفض العمل هنا (انحراف قديم) ويطلب إعادة تعيين
#    قاعدة البيانات. استخدم `migrate diff` أعلاه بدلاً منه.

# إعادة بناء من الصفر (تحذف البيانات!):
rm -rf prisma/migrations
npm run db:migrate -- --name init_postgres
```

٤. إن أردت نقل البيانات التجريبية: صدّرها من SQLite ثم استوردها، أو ببساطة
أعد التعبئة:

```bash
npm run db:seed
```

> **تنبيه:** قاعدة SQLite مناسبة للتطوير والعرض التجريبي فقط. لا تصلح لعدة
> مستخدمين يكتبون في وقت واحد، ولا للنسخ الاحتياطي المتكرر أثناء التشغيل.
> انتقل إلى PostgreSQL قبل أي إطلاق فعلي.

---

## ٦. فروق يجب تذكّرها

- **الإصدار:** المشروع على Prisma **٦**. استعمل السكربتات (`npm run …`) ولا
  تستعمل `npx prisma` مباشرة — قد يجلب npx إصداراً أحدث (٧) يرفض صياغة
  `url` داخل `datasource` ويفشل بخطأ `P1012`.
- **المصفوفات:** SQLite لا يدعمها، لذا حقول مثل `learningObjectives` و
  `sections` مخزَّنة كنص JSON ويُقرأ عبر `JSON.parse`.
- **`LessonRating`** عليه قيد `@@unique([userId, lessonId])` — تقييم واحد
  لكل طالب لكل درس.
- **`lessonsCount: null`** يُرسَل عبر الواجهة كـ `0` بعد التحويل، لذا اعتمدنا
  `themesCount` للمواد التي لا يرقّم كتابها دروسه.

## رموز الدخول (AccessCode)

الإدارة تُصدر رمزاً، ويستخدمه الطالب **مرة واحدة** عند إنشاء حسابه في تطبيق
الطالب. الرمز ليس مطلوباً عند كل دخول — فقط عند التسجيل.

| العمود | المعنى |
|---|---|
| `code` | ٦ خانات فريدة، من أبجدية بلا الحروف المُلتبسة (`O/0`, `I/1`, `L`, `U`) |
| `studentName` / `phone` | اختياريان. إن حُدِّد `phone` فلا يقبل الرمز إلا من يسجّل به |
| `status` | `active` · `used` · `revoked` |
| `usedById` / `usedAt` | من استخدمه ومتى — يظهر في شاشة «رموز الدخول» |
| `expiresAt` | تاريخ الانتهاء (يُحدَّد بالأيام عند التوليد) |

**المسارات** (كلها وراء `requireAdmin`، أي دور مدير + رمز صادر عن لوحة الإدارة):

```
GET  /api/admin/codes           قائمة الرموز مع من استخدمها
POST /api/admin/codes           توليد (count حتى ٥٠، studentName، phone، grade، days)
POST /api/admin/codes/:id/revoke   إلغاء رمز لم يُستخدم
```

و`POST /api/auth/register` صار يشترط حقلاً `accessCode` صالحاً غير مستخدم.

**حساب الإدارة التجريبي:** الهاتف `1000000000` · كلمة المرور `admin12345`
(يُدخل من **لوحة الإدارة** فقط — تطبيق الطالب يرفضه).

**حساب طالب تجريبي:** الهاتف `900000000` · كلمة المرور `student123`
