# النشر على Vercel

## لماذا فشل النشر أول مرة

المستودع **monorepo** — ثلاث حزم في مستودع واحد:

```
apps/student   تطبيق الطالب (واجهة ويب)
apps/admin     لوحة الإدارة (واجهة ويب)
apps/api       الخادم (Express + Prisma)
```

وسكربت `build` في الجذر يبني **الواجهتين معاً**، فيخرجان إلى
`apps/student/dist` و`apps/admin/dist` — ولا يوجد `dist` في الجذر.
فقال Vercel: *No Output Directory named "dist" found*.

## الإصلاح — مشروعان، لا واحد

لا يمكن لمشروع Vercel واحد أن يخدم واجهتين مختلفتين على `/`. لذا:

### ١. تطبيق الطالب — المشروع الحالي

أُضيف ملف `vercel.json` في الجذر، وهو يكفي وحده:

```json
{
  "buildCommand": "npm run build --workspace apps/student",
  "outputDirectory": "apps/student/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- `outputDirectory` → يحلّ مشكلة «لا يوجد dist»
- `rewrites` → حتى لا يُعطي `/subjects` خطأ 404 عند التحديث (توجيه SPA)
- `buildCommand` → نبني واجهة الطالب وحدها (أسرع، وأقل احتمالاً للفشل)

**لا تحتاج تغيير أي إعداد في لوحة Vercel** — الملف يكفي. أعد النشر فقط.

### ٢. لوحة الإدارة — مشروع ثانٍ

أنشئ مشروعاً جديداً على Vercel من **المستودع نفسه**، ثم في إعداداته:

| الإعداد | القيمة |
|---|---|
| Root Directory | `apps/admin` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

(ملف `apps/admin/vercel.json` موجود أصلاً فيه إعادة التوجيه.)

## ⚠️ الخادم (apps/api) — لا يعمل على Vercel

هذا أهم ما في الملف، ولا بد أن تعرفه:

| السبب | الشرح |
|---|---|
| Express | Vercel لا يشغّل خادماً دائماً — يشغّل دوال بلا خادم (serverless) |
| SQLite | نظام ملفات Vercel **مؤقت** — تُمسح قاعدة البيانات مع كل نشر |

فالواجهتان المنشورتان **ستعملان بلا حساب ولا مزامنة**، وسيظهر لهما
«الخادم غير متاح — يعمل التطبيق الآن دون اتصال». تطبيق الطالب يعمل
دون اتصال أصلاً، فستبقى المنهج والشروح وأدوات الدراسة تعمل.

### لتشغيل الخادم فعلاً

١. انقل قاعدة البيانات إلى PostgreSQL (Neon أو Supabase — مجانيان):
   غيّر `provider` في `apps/api/prisma/schema.prisma` إلى `postgresql`،
   وأعد التوليد والهجرات. الخطوات في `DATABASE.md`.

٢. انشر الخادم على خدمة تشغّل Node دائماً: **Render** أو **Railway**
   أو **Fly.io** (كلها فيها خطة مجانية).

٣. ثم في مشروع Vercel: **Settings ← Environment Variables** أضف:

   ```
   VITE_API_URL = https://your-api.onrender.com
   ```

   وأعد النشر. العميلان يقرآن هذا المتغيّر — أُضيف خصّيصاً لهذا،
   وإلا فيستخدم المسار النسبي `/backend` (للتطوير المحلي).

## الترتيب المقترح

1. **الآن**: أعد نشر مشروع الطالب الحالي — سينجح فوراً (بلا حساب)
2. ثم: أنشئ مشروع الإدارة
3. ثم: انشر الخادم + PostgreSQL، واربطهما بـ `VITE_API_URL`

## للتذكير — أوامر محلية

```bash
npm install --legacy-peer-deps     # بعد أي استعادة للقطة
npm run build                      # الواجهتان
npm run build --workspace apps/student
npm run db:reset                   # قاعدة البيانات محلياً
```
