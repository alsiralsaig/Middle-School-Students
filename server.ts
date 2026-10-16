import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Shared Gemini client with telemetry header
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  });

  // Dedicated endpoint for in-lesson student questions
  app.post('/api/gemini/lesson-chat', async (req, res) => {
    try {
      const { lessonTitle, subjectName, lessonContext, question, history } = req.body;

      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'السؤال مطلوب' });
      }

      if (!process.env.GEMINI_API_KEY) {
        // High quality educational pedagogical fallback if API key is not yet set
        return res.json({
          reply: `أهلاً بك يا بطل! تلقيت سؤالك حول درس "${lessonTitle || 'الدرس'}" في مادة ${subjectName || 'المنهج'}:\n\n` +
            `"${question}"\n\n` +
            `💡 **نصيحة تعليمية سريعة:**\n` +
            `• راجع المفاهيم والقوانين الأساسية في تبويب الشرح التفصيلي للدرس.\n` +
            `• اربط كل خطوة حل بالمعطيات والمطلوب بدقة.\n\n` +
            `*(ملاحظة: يمكنك إضافة مفتاح GEMINI_API_KEY في لوحة الإعدادات لتمكين الردود اللحظية الكاملة والذكية من نموذج Gemini 3.8 Flash)*`,
        });
      }

      const promptContext = `أنت معلم سوداني خبير ومحبوب لمرحلة التعليم العام والصف الثالث المتوسط والشهادة السودانية.
أنت تجيب الطالب الذي يتصفح حالياً هذا الدرس تحديداً:
- المادة: ${subjectName || 'المقرر الدراسي'}
- عنوان الدرس: ${lessonTitle || 'الدرس الحالي'}
- محتوى وسياق الدرس الحالي للمرجع:
${lessonContext ? `"""\n${lessonContext}\n"""` : 'مقرر المنهج السوداني'}

تعليمات صارمة للإجابة:
1. أجب باللغة العربية الفصحى الواضحة وبأسلوب تربوي لطيف ومشجع (استخدم عبارات مثل: يا بطل، أحسنت السؤال، ممتاز، خطوة بخطوة).
2. اجعل الشرح مركزاً ومباشراً ومرتبطاً بدرس "${lessonTitle}".
3. إذا كان السؤال عن مسألة رياضية أو قاعدة نحوية أو تجربة علمية، قم بحلها وتوضيحها خطوة بخطوة.
4. استخدم تنسيق Markdown أنيق مع نقاط وعناوين واضحة لسهولة القراءة على الهاتف والحاسوب.
5. لا تتجاوز حدود المنهج وتجنب الإطالة غير المفيدة.`;

      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      // Add relevant past messages if provided
      if (Array.isArray(history) && history.length > 0) {
        history.slice(-4).forEach((msg) => {
          if (msg.sender === 'user' && msg.text) {
            contents.push({ role: 'user', parts: [{ text: msg.text }] });
          } else if (msg.sender === 'assistant' && msg.text) {
            contents.push({ role: 'model', parts: [{ text: msg.text }] });
          }
        });
      }

      // Append current user prompt with pedagogical instructions
      contents.push({
        role: 'user',
        parts: [
          {
            text: `${promptContext}\n\nسؤال الطالب الحالي: ${question}`,
          },
        ],
      });

      let replyText = '';
      
      // Try primary model (gemini-3.8-flash), fallback to gemini-3.1-flash-lite on transient 503
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
        });
        replyText = response.text || '';
      } catch (primaryErr: any) {
        console.warn('Primary model error, attempting fallback to gemini-3.1-flash-lite:', primaryErr?.message);
        try {
          const fallbackResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents,
          });
          replyText = fallbackResponse.text || '';
        } catch (secondaryErr: any) {
          console.error('All Gemini model calls failed:', secondaryErr?.message);
          // Educational intelligent fallback based on lesson context
          replyText = `أهلاً بك يا بطل! 🇸🇩\nبخصوص سؤالك عن درس «${lessonTitle}» في مادة ${subjectName}:\n\n` +
            `📌 **نصيحة تعليمية استرشادية:**\n` +
            `• يُركز هذا الدرس على المفاهيم والقواعد الموضحة في الشرح التفصيلي.\n` +
            `• راجع القواعد الأساسية والأمثلة التطبيقية المحلولة خطوة بخطوة في قسم المذكرة.\n` +
            `• يرجى إعادة طرح السؤال بعد ثوانٍ قليلة حيث يمر خادم الذكاء الاصطناعي بلحظة ضغط مؤقتة.`;
        }
      }

      const reply = replyText || 'عذراً يا بطل، لم أتمكن من صياغة إجابة في الوقت الحالي. يرجى إعادة طرح السؤال بصيغة أخرى.';
      return res.json({ reply });
    } catch (error: any) {
      console.error('Error in lesson chat API:', error);
      return res.status(200).json({
        reply:
          'عذراً يا بطل، واجهنا بطء مؤقت في الشبكة. يرجى النقر على زر الإرسال مرة أخرى لإعادة المحاولة.',
      });
    }
  });

  // General AI assistant chat endpoint
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { prompt, subject } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'السؤال مطلوب' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          reply: `أهلاً بك يا بطل! وصل سؤالك في مادة ${subject || 'المنهج السوداني'}. يرجى تزويد المنصة بمفتاح GEMINI_API_KEY للاستفادة الكاملة من نموذج Gemini 3.8 Flash.`,
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `أنت المساعد الدراسي الذكي لمنصة المنهج السوداني للشهادة المتوسطة. ساعد الطالب في سؤاله التعليمي بأسلوب تربوي مبسط ودقيق وداعم:\n\nالسؤال: ${prompt}`,
              },
            ],
          },
        ],
      });

      return res.json({ reply: response.text || '' });
    } catch (error: any) {
      console.error('Error in general chat:', error);
      return res.status(500).json({
        error: error.message || 'خطأ في معالجة الطلب',
        reply: 'عذراً، حدث خطأ مؤقت أثناء الاتصال بـ Gemini API.',
      });
    }
  });

  // Setup Vite in Dev or serve static in Prod
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
