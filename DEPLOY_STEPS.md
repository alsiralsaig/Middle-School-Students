# خطوات النشر — Neon + Vercel

## ✅ حالة التنفيذ

| الخطوة | الحالة |
|---|---|
| ١. إنشاء قاعدة Neon | ✅ **مُنفَّذة** |
| ٢. إنشاء الجداول | ✅ **مُنفَّذة** |
| ٣. تعبئة المنهج | ✅ **مُنفَّذة** |
| ٤. نشر الخادم على Vercel | ⬜ خطوتك |
| ٥. نشر الواجهتين | ⬜ خطوتك |
| ٦. ربط التطبيق | ⬜ خطوتك |

**قاعدة البيانات الحية:**
```
المشروع:  ssp (wandering-block-36711338)
المنطقة:  aws-eu-central-1 (Frankfurt)
الإصدار:  PostgreSQL 17
القاعدة:  neondb · المالك neondb_owner
المحتوى:  ١٦ جدولاً · ٨ مواد · ١٣ وحدة · ٢٣ درساً · ٦ عناصر مكتبة
```

الخطوات ١–٣ أدناه **مكتملة ومُختبَرة** — لا حاجة إلى إعادتها. ابدأ من
الخطوة ٤، وستحتاج رابط الاتصال من لوحة Neon (انظر «رابط الاتصال» أدناه).

---

## رابط الاتصال

انسخه من لوحة Neon: المشروع `ssp` ← Connection details.

> ⚠️ **اختر Pooled connection لا Direct.** Vercel يفتح اتصالات كثيرة
> والرابط المباشر ينفد. الرابط المجمَّع يمتاز بـ `-pooler` في اسم المضيف:
> ```
> postgresql://neondb_owner:...@ep-proud-sky-b9muzobg-pooler.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require
> ```
> لا تحفظه في ملف داخل المستودع — ضعه في متغيّرات بيئة Vercel فقط.

---

## ما بقي

**لماذا PostgreSQL؟** منصات الاستضافة المجانية تمحو القرص عند كل إعادة تشغيل،
فلا يصلح ملف SQLite. وPostgreSQL مدعوم أصلاً في Prisma **بلا أي محوّل**
(driver adapter)، والهجرات تعمل مباشرة.

> ✅ **جاهز ومُختبَر:** المخطط محوَّل إلى PostgreSQL، وهجرة جديدة مولَّدة،
> والمنهج مبذور، ودورة التحرير تعمل بالكامل على قاعدة PostgreSQL حقيقية.

---

## ١. أنشئ قاعدة Neon — ✅ مُنفَّذة

١. <https://neon.tech> ← حساب جديد (بلا بطاقة ائتمان)
٢. «Create Project» ← الاسم `ssp` ← المنطقة الأقرب (Frankfurt)
٣. انسخ **رابط الاتصال** — ويجب أن يكون **Pooled** لا المباشر

> ⚠️ **Pooled لا Direct.** Vercel يفتح اتصالات كثيرة، والرابط المباشر ينفد.
> الرابط المجمَّع يمتاز بـ `-pooler` في اسم المضيف:
> ```
> postgresql://user:pass@ep-cool-name-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
> ```

---

## ٢. أنشئ الجداول — ✅ مُنفَّذة

الهجرة **جاهزة في المستودع** — لا حاجة إلى توليد شيء:

```bash
cd apps/api
DATABASE_URL="الرابط_المنسوخ" npx prisma migrate deploy
```

يجب أن ترى: `All migrations have been successfully applied.`

---

## ٣. املأ المنهج — ✅ مُنفَّذة

```bash
DATABASE_URL="الرابط_المنسوخ" npx tsx prisma/seed.ts
```

يجب أن ترى: `📚 المواد: 8 · الوحدات: 13 · الدروس: 23`

والحسابات التجريبية:
- مدير → `1000000000` / `admin12345`
- طالب → `900000000` / `student123`

---

## ٤. انشر الخادم على Vercel — ⬜ خطوتك

١. «Add New» ← «Project» ← اختر المستودع
٢. **Root Directory** = `apps/api`
٣. Vercel يكتشف Express تلقائياً (دعم رسمي منذ أغسطس ٢٠٢٦) — لا ضبط إضافي
٤. أضف متغيّرات البيئة:

```
DATABASE_URL = الرابط Pooled من Neon
JWT_SECRET   = ولّده: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
NODE_ENV     = production
BLOB_READ_WRITE_TOKEN = رمز Blob من Vercel Storage (لرفع الملفات الدائم)
```

قبل النشر، أنشئ Blob Store من Vercel Storage وانسخ رمز القراءة والكتابة إلى
`BLOB_READ_WRITE_TOKEN`. الرفع في الإنتاج يستخدم التخزين الدائم؛ إن غاب الرمز
سيرفض الرفع بدلاً من حفظ ملفات مؤقتة قد تختفي عند إعادة تشغيل Vercel.

اختبارات بعد النشر:
```bash
curl https://your-api.vercel.app/api/subjects
curl -i https://your-api.vercel.app/api/admin/exams/test
```
يجب أن يردّ الأول JSON فيه المواد، والثاني `401` بلا تسجيل دخول (أي أن مسار
تفاصيل الامتحان موجود ومحمي). إذا أعاد الثاني `404` فأعد نشر **مشروع API**
ذو Root Directory=`apps/api`؛ نشر لوحة الإدارة وحدها لا يحدّث الخادم.

---

## ٥. انشر الواجهتين — ⬜ خطوتك

لكل واحدة مشروع منفصل:

| المشروع | Root Directory | المتغيّر |
|---|---|---|
| تطبيق الطالب | `apps/student` | `VITE_API_URL = رابط الخادم` |
| لوحة الإدارة | `apps/admin` | `VITE_API_URL = رابط الخادم` |

> `vercel.json` موجود في الجذر وفي `apps/admin` أصلاً — لا ضبط يدوي.

---

## ٦. اربط التطبيق — ⬜ خطوتك

الرابط يُضبط من داخل التطبيق — **بلا إعادة بناء**:

- **الطالب:** تفتح نافذة «عنوان الخادم» تلقائياً أول تشغيل، أو عبر `#server`
- **الإدارة:** الإعدادات ← بطاقة «عنوان الخادم»

اكتب الرابط ← **«اختبار الاتصال»** ← **حفظ**.

---

## للتطوير المحلي

تحتاج قاعدة PostgreSQL محلية (أو **فرع تطوير على Neon** — وهو الأسهل):

```bash
# فرع تطوير على Neon — مجاني، ومعزول عن الإنتاج
turso --help 2>/dev/null   # لا — هذا لـ Turso، تجاهله
# استخدم واجهة Neon: Branches ← Create branch ← dev
```

أو محلياً:
```bash
sudo apt-get install postgresql
sudo service postgresql start
sudo -u postgres createdb ssp_dev
export DATABASE_URL="postgresql://postgres@localhost:5432/ssp_dev?schema=public"
npx prisma migrate deploy && npx tsx prisma/seed.ts
```

---

## ملاحظات

- **التطبيق يعمل بلا خادم أيضاً** — يقرأ المنهج من نسخة مضمّنة. لكن
  تعديلات الإدارة وحسابات الطلاب تحتاج الخادم.
- **نسخ Neon الاحتياطية:** المجاني فيه استعادة لأي لحظة في آخر ٦ ساعات.
- **Vercel Hobby** لغير التجاري فقط — إن أضفت اشتراكات أو إعلانات فانتقل إلى Pro.

---

## الترتيب السريع

```
١–٣  ✅ مُنفَّذة — القاعدة حية وفيها المنهج
٤.  Vercel ← ٣ مشاريع + متغيّرات البيئة
٥.  التطبيق ← اكتب الرابط · اختبار · حفظ
```
