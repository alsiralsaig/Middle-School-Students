# خطوات النشر — افعلها بالترتيب

الهدف في النهاية: **رابط خادم واحد** تضعه داخل تطبيق الأندرويد، فيعمل كل شيء.

```
Neon          ← قاعدة البيانات   (مجاني دائم)
Vercel        ← الواجهتان والخادم (مجاني لغير التجاري)
تطبيق الأندرويد ← يقرأ المنهج من قاعدة البيانات
```

---

## ١. قاعدة البيانات على Neon — ٣ دقائق

١. اذهب إلى <https://neon.tech> وافتح حساباً (لا يطلب بطاقة)
٢. «Create Project» ← الاسم `ssp` ← المنطقة اختَر الأقرب (Frankfurt)
٣. من لوحة المشروع انسخ **رابط الاتصال** — وانتبه إلى نسخة **Pooled connection**
   (يبدأ عادةً بـ `-pooler` في اسم المضيف)

> ⚠️ **Pooled لا Direct.** Vercel يفتح اتصالات كثيرة، والرابط المباشر ينفد.

الرابط يبدو هكذا:
```
postgresql://user:pass@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

---

## ٢. تبديل Prisma إلى PostgreSQL — من عندك في المستودع

في `apps/api/prisma/schema.prisma` بدّل:

```prisma
datasource db {
  provider = "sqlite"      // ← احذف
  provider = "postgresql"  // ← ضع هذا
  url      = env("DATABASE_URL")
}
```

ثم طبّق الجداول على Neon:

```bash
cd apps/api
DATABASE_URL="الرابط_الذي_نسخته" npx prisma migrate deploy
DATABASE_URL="الرابط_الذي_نسخته" npx prisma db seed   # إن وُجد بذور
```

---

## ٣. جعل الخادم قابلاً للتصدير — تعديل صغير

في `apps/api/src/index.ts` غيّر نهاية الملف من:

```ts
app.listen(PORT, () => console.log('...'));
```

إلى:

```ts
export default app;                              // لـ Vercel
if (!process.env.VERCEL) {                       // للتطوير المحلي
  app.listen(PORT, () => console.log('...'));
}
```

---

## ٤. النشر على Vercel — ثلاثة مشاريع

لكل مشروع: «Add New» ← «Project» ← اختر المستودع ← **Root Directory**

| # | المشروع | Root Directory | الإعداد |
|---|---|---|---|
| ١ | تطبيق الطالب | `apps/student` | Build: `npm run build` · Output: `dist` |
| ٢ | لوحة الإدارة | `apps/admin` | Build: `npm run build` · Output: `dist` |
| ٣ | الخادم | `apps/api` | Vercel يكتشف Express تلقائياً |

> الجذور `vercel.json` و `apps/admin/vercel.json` موجودة في المستودع أصلاً،
> فلا تحتاج إلى ضبط `outputDirectory` يدوياً.

### متغيّرات البيئة

**في مشروع الخادم (٣):**
```
DATABASE_URL = الرابط من Neon (Pooled)
JWT_SECRET   = ولّده: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
NODE_ENV     = production
```

**في مشروعي الواجهتين (١ و ٢):**
```
VITE_API_URL = https://ssp-api.vercel.app     ← رابط مشروع الخادم
```

احفظ الرابط — **هذا هو ما ستضعه داخل التطبيق**.

اختباره:
```bash
curl https://ssp-api.vercel.app/api/subjects
```
يجب أن يردّ بـ JSON فيه المواد.

---

## ٥. ضبط العنوان داخل التطبيق — مرة واحدة

- **تطبيق الطالب:** تفتح نافذة «عنوان الخادم» تلقائياً أول تشغيل
- **لوحة الإدارة:** الإعدادات ← بطاقة «عنوان الخادم»

اكتب الرابط، اضغط **«اختبار الاتصال»**، ثم **حفظ**.

يُحفظ العنوان على الجهاز — فلا إعادة بناء ولا إعادة تحميل عند تغييره.

---

## بديل: Render بدل Vercel للخادم

إن أردت استخداماً تجارياً أو رفع ملفات على القرص:

١. <https://render.com> ← «New» ← «Web Service» ← اربط المستودع
٢. Root Directory: `apps/api`
٣. Build: `npm install && npm run build`
٤. Start: `node dist/index.js`
٥. أضف `DATABASE_URL` و `JWT_SECRET` في «Environment»

> ⚠️ النسخة المجانية **تنام بعد ١٥ دقيقة** — أول طلب يأخذ نحو دقيقة.
> ⚠️ قاعدة Postgres المجانية على Render **تنتهي بعد ٣٠ يوماً** — استخدم Neon.

---

## تذكير التثبيت على الأندرويد

إن رفض الجهاز التثبيت:
- فعّل **«السماح من مصادر غير معروفة»** للمتصفح أو مدير الملفات
- أو عطّل **Play Protect** مؤقتاً أثناء التثبيت

السبب: التطبيق موقّع بمفتاح تطوير، لا مفتاح متجر Google.

---

## ترتيب سريع

```
١. Neon  ← أنشئ القاعدة · انسخ الرابط Pooled
٢. Prisma ← postgresql + migrate deploy
٣. index.ts ← export default app
٤. Vercel ← ٣ مشاريع + المتغيّرات
٥. التطبيق ← اكتب الرابط · اختبار · حفظ
```
