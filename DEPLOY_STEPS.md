# خطوات النشر — قاعدة البيانات تبقى SQLite

**لماذا Turso لا Neon؟** لأن المشروع مبني على SQLite، وTurso هي **SQLite نفسها**
(نسخة متوافقة تماماً) لكن مستضافة. فلا يتغيّر المخطط ولا أي سطر استعلام،
ولا حاجة إلى تحويل إلى PostgreSQL.

```
Turso   ← قاعدة SQLite مستضافة   (مجانية: ٥ جيجا · ٥٠٠ مليون قراءة/شهر)
Vercel  ← الواجهتان والخادم      (مجاني لغير التجاري)
التطبيق ← يقرأ المنهج من قاعدة البيانات
```

> الكود **جاهز سلفاً**: إن وُجد `TURSO_DATABASE_URL` استخدم Turso، وإلا
> استخدم ملف SQLite المحلي كما هو. لا تحتاج إلى تعديل أي شيء لتبديل الوضعين.

---

## ١. أنشئ قاعدة Turso — ٣ دقائق

```bash
# ثبّت الأداة
curl -sSfL https://get.tur.so/install.sh | bash

# سجّل الدخول وافتح قاعدة
turso auth signup          # أو turso auth login إن كان لديك حساب
turso db create ssp

# الرابط والرمز
turso db show ssp --url     # → libsql://ssp-username.turso.io
turso db tokens create ssp  # → رمز طويل
```

المجاني يكفي: ٥ جيجا، ٥٠٠ مليون قراءة و١٠ ملايين كتابة شهرياً، **بلا بطاقة ائتمان**.

---

## ٢. انسخ المخطط إلى Turso

أدوات الهجرة في Prisma لا تتحدث `libsql://` مباشرة، فنولّد SQL ثم نطبّقه:

```bash
cd apps/api

# ١. ولّد SQL المخطط
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/schema.sql

# ٢. طبّقه
turso db shell ssp < /tmp/schema.sql
```

تحقّق:
```bash
turso db shell ssp ".tables"
```

---

## ٣. املأ البيانات (المنهج والحسابات)

```bash
cd apps/api
export TURSO_DATABASE_URL="libsql://ssp-username.turso.io"
export TURSO_AUTH_TOKEN="الرمز_من_الخطوة_١"

npx tsx prisma/seed.ts
```

يجب أن ترى: `📚 المواد: 8 · الوحدات: 13 · الدروس: 23`

---

## ٤. انشر الخادم

### Vercel (مجاني، لغير التجاري)

١. «Add New» ← «Project» ← اختر المستودع ← Root Directory = `apps/api`
٢. Vercel يكتشف Express تلقائياً (دعم رسمي منذ أغسطس ٢٠٢٦)
٣. أضف متغيّرات البيئة:
```
TURSO_DATABASE_URL = libsql://ssp-username.turso.io
TURSO_AUTH_TOKEN   = الرمز
JWT_SECRET         = node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
NODE_ENV           = production
```

### Render (بديل — إن أردت استخداماً تجارياً)

١. «New» ← «Web Service» ← اربط المستودع
٢. Root Directory: `apps/api` · Build: `npm install && npm run build` · Start: `node dist/index.js`
٣. نفس المتغيّرات أعلاه

> ⚠️ النسخة المجانية على Render **تنام بعد ١٥ دقيقة** — أول طلب يأخذ نحو دقيقة.

---

## ٥. انشر الواجهتين

لكل واحدة مشروع منفصل على Vercel:

| المشروع | Root Directory | المتغيّر |
|---|---|---|
| تطبيق الطالب | `apps/student` | `VITE_API_URL = رابط الخادم` |
| لوحة الإدارة | `apps/admin` | `VITE_API_URL = رابط الخادم` |

> `vercel.json` في الجذر وفي `apps/admin` موجود أصلاً، فلا ضبط يدوي.

اختبار:
```bash
curl https://your-api.vercel.app/api/subjects
```
يجب أن يردّ JSON فيه ٨ مواد.

---

## ٦. ضبط العنوان داخل التطبيق

الرابط مفتوح الآن داخل التطبيق — لا يحتاج إعادة بناء:

- **الطالب:** تفتح نافذة «عنوان الخادم» تلقائياً أول تشغيل (أو `#server`)
- **الإدارة:** الإعدادات ← بطاقة «عنوان الخادم»

اكتب الرابط ← **«اختبار الاتصال»** ← **حفظ**.

---

## ملاحظات

- **التطبيق يعمل بدون خادم أيضاً** — يقرأ المنهج من نسخة مضمّنة. لكن
  تعديلات الإدارة وحسابات الطلاب تحتاج الخادم.
- **النسخ الاحتياطي:** مجانية Turso فيها استعادة ليوم واحد. صدّر نسخة دورياً:
  ```bash
  turso db shell ssp ".dump" > backup-$(date +%F).sql
  ```
- **إن أردت PostgreSQL لاحقاً** فالتحويل ممكن، لكن لا داعي له الآن.

---

## الترتيب السريع

```
١. turso db create ssp          ← أنشئ القاعدة
٢. migrate diff + turso shell    ← انسخ المخطط
٣. tsx prisma/seed.ts            ← املأ المنهج
٤. Vercel (٣ مشاريع)             ← انشر
٥. التطبيق ← اكتب الرابط         ← اربط
```
