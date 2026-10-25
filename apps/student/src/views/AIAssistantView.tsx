import React, { useState, useRef, useEffect } from 'react';
import { AI_ASSISTANT_PRESETS, useSubjects } from '../data/curriculumData';
import { getApiBase } from '../utils/serverUrl';
import { 
  Sparkles, 
  Send, 
  AlertCircle, 
  Bot, 
  User, 
  RotateCcw, 
  HelpCircle, 
  BookOpen, 
  CheckCircle2,
  Clock,
  Mic,
  Square,
  Volume2,
  VolumeX
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isSimulatedDemo?: boolean;
}

export const AIAssistantView: React.FC = () => {
  // المادة المختارة: تُغذّي الخادم بحدود المنهج فيتجنّب النموذج الإجابات العامة
  const subjects = useSubjects();
  const [activeSubject, setActiveSubject] = useState('');

  /**
   * اقتراحات المادة المختارة وحدها.
   *
   * ليه: كان الاختيار بيتغيّر شكله بس، والقائمة تفضل تعرض أسئلة كل المواد —
   * فطالب يختار «اللغة العربية» ويجد سؤال فيثاغورس وشيكان. الآن التصفية فعلية،
   * والمقارنة تتم بعد تطبيع الاسم (أ/ا، ة/ه) عشان تسميات قاعدة البيانات تختلف.
   */
  const normalizeSubject = (name: string) =>
    name
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ')
      .trim();
  const presetsForSubject = activeSubject
    ? AI_ASSISTANT_PRESETS.filter((p) =>
        ((p as { subjects?: string[] }).subjects ?? [p.subject]).some(
          (name) => normalizeSubject(name) === normalizeSubject(activeSubject),
        ),
      )
    : AI_ASSISTANT_PRESETS;
  /** لو مادة ما عندهـا اقتراحات جاهزة، نولّد أسئلة على نفس المادة بدل قائمة فاضية */
  const genericPrompts = activeSubject
    ? [
        `اشرح لي أهم قاعدة في منهج ${activeSubject} للصف الثالث المتوسط بأمثلة`,
        `لخص لي أهم نقاط ${activeSubject} المقررة قبل الامتحان`,
        `أعطني أسئلة تدريبية على ${activeSubject} مع الحل`,
      ]
    : [];
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `مرحباً بك يا بطل الصف الثالث المتوسط! 🇸🇩\nأنا المساعد الدراسي الاسترشادي لمنصة الطالب السوداني الذكية.\n\nاسألني أي سؤال دراسي — شرح، تلخيص، تدريب، أو مفاهيم المنهج السوداني. اضغط على الأسئلة الجاهزة أدناه أو اكتب استفسارك مباشرة.`,
      timestamp: 'الآن',
      isSimulatedDemo: true
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  /** أسماء الدروس التي استُخدمت كمصدر للإجابة */
  const [sources, setSources] = useState<string[]>([]);

  /* ═══ الصوت: تسجيل بالميك + قراءة الردود صوتياً ═══ */
  const [voiceOut, setVoiceOut] = useState<boolean>(() => {
    try { return localStorage.getItem('ssp.aiVoiceOut') === '1'; } catch { return false; }
  });
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spokenRef = useRef<string>('');
  /** يمنع تكرار رسالة الميكروفون لو الطالب ضغط الزر أكثر من مرة */
  const micBusyRef = useRef(false);
  const micErrorAtRef = useRef(0);

  /** قراءة الرد صوتياً (صوت عربي إن وُجد) */
  const speak = (text: string) => {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[#*_•\-]/g, ' ').slice(0, 600));
      const voices = window.speechSynthesis.getVoices();
      const ar = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ar'));
      if (ar) u.voice = ar;
      u.lang = ar ? ar.lang : 'ar-SA';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch { /* القراءة الصوتية غير متاحة — الرد النصي يبقى ظاهراً */ }
  };

  /* نطق آخر رد جديد عند تفعيل الصوت */
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (voiceOut && last && last.sender === 'assistant' && spokenRef.current !== last.id) {
      spokenRef.current = last.id;
      speak(last.text);
    }
  }, [messages, voiceOut]);

  const toggleVoiceOut = () => {
    const nv = !voiceOut;
    setVoiceOut(nv);
    try { localStorage.setItem('ssp.aiVoiceOut', nv ? '1' : '0'); } catch { /* تجاهل */ }
    if (!nv) { try { window.speechSynthesis?.cancel(); } catch { /* تجاهل */ } }
  };

  const cleanupRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRef.current = null;
    setRecording(false);
  };

  const startRecording = async () => {
    if (recording || micBusyRef.current) return;
    micBusyRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => { void sendVoice(new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })); };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => {
        setRecSeconds((sec) => {
          if (sec >= 44) { stopRecording(); return sec; }
          return sec + 1;
        });
      }, 1000);
    } catch {
      // رسالة واحدة فقط: لو الطالب ضغط الزر مرتين أو رجعت نفس المشكلة خلال دقيقة
      const now = Date.now();
      if (now - micErrorAtRef.current > 60_000) {
        micErrorAtRef.current = now;
        setMessages((prev) => [
          ...prev,
          {
            id: `mic-err-${now}`,
            sender: 'assistant',
            text: 'ما قدرتش أفتح الميكروفون 🎙️\nاسمح بالوصول للميكروفون من إعدادات التطبيق وحاول تاني، أو اكتب سؤالك في الصندوق تحت.',
            timestamp: 'الآن',
            isError: true,
          },
        ]);
      }
    } finally {
      micBusyRef.current = false;
    }
  };

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
    cleanupRecording();
  };

  /** إرسال الرسالة للخادم — المساعد يفهم العامية ويرد بها */
  const sendVoice = async (blob: Blob) => {
    if (!blob.size) return;
    if (blob.size > 650_000) {
      setMessages((prev) => [...prev, {
        id: `mic-long-${Date.now()}`,
        sender: 'assistant',
        text: 'التسجيل طويل شوية — اذكر سؤالك في أقل من دقيقة يا بطل 🙏',
        timestamp: 'الآن',
        isError: true,
      }]);
      return;
    }
    const userMsg: ChatMessage = {
      id: `voice-${Date.now()}`,
      sender: 'user',
      text: '🎙️ سؤال صوتي — باللهجة السودانية',
      timestamp: 'الآن',
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error('read-fail'));
        fr.readAsDataURL(blob);
      });
      const res = await fetch(`${getApiBase()}/api/ai/voice`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-App': 'student' },
        body: JSON.stringify({ audio: dataUrl, mimeType: blob.type, subject: activeSubject || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data?.reply;
        if (reply) {
          setMessages((prev) => [...prev, {
            id: `bot-${Date.now()}`,
            sender: 'assistant',
            text: String(reply),
            timestamp: 'الآن',
          }]);
          setIsTyping(false);
          return;
        }
        if (data?.unconfigured) {
          setMessages((prev) => [...prev, {
            id: `bot-${Date.now()}`,
            sender: 'assistant',
            text: 'المساعد الصوتي يحتاج تفعيل مفتاح الذكاء الاصطناعي على الخادم — جرّب تاني بعد شوية 🙏',
            timestamp: 'الآن',
            isError: true,
          }]);
          setIsTyping(false);
          return;
        }
      }
      throw new Error(String(res.status));
    } catch (e) {
      const status = (e as { message?: string }).message;
      setMessages((prev) => [...prev, {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: status === '404'
          ? 'الإجابة الصوتية تحتاج تحديث بسيط في الخادم — جرّب الكتابة لحد ما الإدارة تفعّلها 🙏'
          : 'تعذّر إرسال الصوت — تأكد من الإنترنت وحاول تاني 🙏',
        timestamp: 'الآن',
        isError: true,
      }]);
      setIsTyping(false);
    }
  };

  /**
   * إرسال السؤال — الرد يصل **متدفّقاً** كلمة بكلمة (stream).
   * الفائدة: الطالب يشوف الإجابة تبدأ في أقل من ثانية بدل ما ينتظر الرد كامل،
   * وهذا نفس أسلوب تطبيق «مساعد الشهادة السودانية» الذي طلب المالك تفعيله.
   */
  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: 'الآن',
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);
    setSources([]);

    const history = messages
      .filter((m) => m.id !== 'welcome')
      .slice(-6)
      .map((m) => ({ sender: m.sender === 'user' ? 'user' : 'assistant', text: m.text }));

    const botId = `bot-${Date.now()}`;
    let appended = false;
    let acc = '';

    /** يضيف/يحدّث فقاعة المساعد أثناء وصول الكلمات */
    const pushChunk = (piece: string) => {
      acc += piece;
      if (!appended) {
        appended = true;
        setMessages((prev) => [
          ...prev,
          { id: botId, sender: 'assistant', text: acc, timestamp: 'الآن', isSimulatedDemo: false },
        ]);
      } else {
        setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, text: acc } : m)));
      }
    };

    try {
      const res = await fetch(`${getApiBase()}/api/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-App': 'student' },
        body: JSON.stringify({ prompt: query, history, stream: true, subject: activeSubject || undefined }),
      });

      if (!res.ok) {
        // حد الاستخدام أو الضغط — نعرض رسالة الخادم كما هي
        const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
        setMessages((prev) => [
          ...prev,
          {
            id: botId,
            sender: 'assistant',
            text: data.reply || data.error || 'المساعد مشغول حالياً، جرّب تاني بعد شوية 🙏',
            timestamp: 'الآن',
          },
        ]);
        setIsTyping(false);
        return;
      }

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // أول سطر قد يكون معلومات المصادر — نخفيه عن الطالب
          if (buffer.startsWith('[[')) {
            const nl = buffer.indexOf('\n');
            if (nl === -1) continue;
            const meta = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            const m = /^\[\[sources:(.*)\]\]$/.exec(meta.trim());
            if (m) setSources(m[1].split('|').map((x) => x.trim()).filter(Boolean));
          }
          if (buffer) {
            const out = buffer;
            buffer = '';
            pushChunk(out);
          }
        }
        if (acc.trim()) {
          setIsTyping(false);
          if (voiceOut) speak(acc);
          return;
        }
      }
    } catch {
      /* نكمل للاحتياط المحلي */
    }

    // احتياط: ردود محلية جاهزة (تعمل بلا إنترنت أو لو الخدمة متوقفة)
    const matchedPreset = AI_ASSISTANT_PRESETS.find(
      (p) =>
        query.includes(p.subject) ||
        p.prompt.includes(query) ||
        (query.includes('فيثاغورس') && p.subject === 'الرياضيات') ||
        (query.includes('رابطة') && p.subject === 'العلوم') ||
        (query.includes('شيكان') &&
          (((p as { subjects?: string[] }).subjects ?? []).includes('التاريخ') || p.subject === 'التاريخ')),
    );

    const replyText =
      matchedPreset?.reply ||
      `سؤالك: «${query}»\n\nما قدرت أوصل لخدمة المساعد الآن. جرّب:\n• افتح تبويب «الدروس» واقرأ شرح الدرس والقواعد.\n• أو اضغط تبويب «التفاعلية» في المادة وجرّب الأسئلة.\n• وأعد السؤال بعد شوية لو النت رجع.`;

    setMessages((prev) => [
      ...prev,
      {
        id: appended ? `${botId}-fallback` : botId,
        sender: 'assistant',
        text: replyText,
        timestamp: 'الآن',
        isSimulatedDemo: !matchedPreset,
      },
    ]);
    setIsTyping(false);
  };

  const handleClearChat = () => {
    setSources([]);
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: `تمت إعادة تهيئة المحادثة. اختر أي سؤال من الأسئلة المقترحة أدناه للبدء!`,
        timestamp: 'الآن',
        isSimulatedDemo: true
      }
    ]);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner / Disclaimer */}
      <div className="bg-[#0B1E36] text-white rounded-3xl p-6 sm:p-8 border border-[#1C3A62] shadow-sm text-right space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>المساعد التعليمي الذكي - الصف الثالث المتوسط</span>
          </div>
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-[#142A46] px-3 py-2 min-h-[36px] rounded-lg border border-[#21436F] transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>مسح المحادثة</span>
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          المساعد الدراسي الذكي 🇸🇩
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
          واجهة تفاعلية مصممة لإرشاد طلاب الشهادة المتوسطة والإجابة على تساؤلات المنهج السوداني.
        </p>

        {/* الصوت: قراءة الردود */}
        <div className="p-4 rounded-2xl bg-[#122844] border border-amber-400/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Mic className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs text-slate-200 leading-relaxed">
              <span className="font-bold text-amber-300">اتكلم بالسوداني:</span>
              <span className="text-slate-300"> دوس على الميك وسلّم سؤالك صوتي — وأنا بردّ عليك صوتياً وباللهجة السودانية.</span>
            </div>
          </div>
          <button
            onClick={toggleVoiceOut}
            title={voiceOut ? 'إيقاف القراءة الصوتية' : 'قراءة الردود صوتياً'}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
              voiceOut
                ? 'bg-amber-400/20 border-amber-400/60 text-amber-300'
                : 'bg-[#0E2440] border-[#21436F] text-slate-400 hover:text-slate-200'
            }`}
          >
            {voiceOut ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Preset Questions Bar */}
      <div className="bg-white dark:bg-[#0D1F35] rounded-2xl border border-slate-200 dark:border-[#1C3A62] p-4 shadow-sm text-right space-y-2">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-blue-900 dark:text-amber-400" />
          <span>أسئلة شائعة في المنهج يمكنك تجربتها فوراً:</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1 border-b border-slate-100 dark:border-[#1C3A62] pb-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 self-center ml-1">المادة:</span>
          {['', ...subjects.map((s) => s.name)].map((name) => (
            <button
              key={name || 'all'}
              type="button"
              onClick={() => setActiveSubject(name)}
              className={`text-[11px] py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                activeSubject === name
                  ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-400/20 dark:border-amber-400/50 dark:text-amber-200 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-[#122844] dark:border-[#1E3A60] dark:text-slate-300'
              }`}
            >
              {name || 'كل المواد'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {(activeSubject ? presetsForSubject : AI_ASSISTANT_PRESETS).map((p) => (
            <button
              key={p.id}
              onClick={() => handleSend(p.prompt)}
              className="text-[12.5px] font-semibold py-2 px-3 rounded-xl bg-slate-50 dark:bg-[#122844] hover:bg-amber-50 dark:hover:bg-[#18365D] hover:border-amber-200 dark:hover:border-amber-400/40 border border-slate-300 dark:border-[#2A4A72] text-slate-900 dark:text-slate-100 hover:text-amber-900 dark:hover:text-amber-200 text-right transition-colors cursor-pointer"
            >
              {p.prompt}
            </button>
          ))}
          {activeSubject && presetsForSubject.length < 2 && genericPrompts.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="text-[12.5px] font-semibold py-2 px-3 rounded-xl bg-slate-50 dark:bg-[#122844] hover:bg-amber-50 dark:hover:bg-[#18365D] hover:border-amber-200 dark:hover:border-amber-400/40 border border-slate-300 dark:border-[#2A4A72] text-slate-900 dark:text-slate-100 hover:text-amber-900 dark:hover:text-amber-200 text-right transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Box */}
      <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] shadow-sm flex flex-col h-[520px] overflow-hidden">
        {/* Messages scroll area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-right ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-blue-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold'
                      : 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-bold'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[87%] sm:max-w-[75%] p-4 rounded-2xl text-[13px] sm:text-[15px] font-semibold leading-[1.9] whitespace-pre-wrap ${
                    isUser
                      ? 'bg-blue-900 dark:bg-[#16365F] text-white rounded-tr-none'
                      : 'bg-slate-50 dark:bg-[#122844] border border-slate-300 dark:border-[#2A4A72] text-slate-900 dark:text-slate-50 rounded-tl-none'
                  }`}
                >
                  {msg.text.replace(/\*\*/g, '').replace(/^[ \t]*[-*]\s+/gm, '• ')}

                  {!isUser && sources.length > 0 && msg.id === messages[messages.length - 1]?.id && (
                    <div className="mt-2 border-t border-slate-200/60 pt-2 text-[10px] text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                      <span className="font-bold">من منهجك: </span>
                      {sources.join(' · ')}
                    </div>
                  )}

                  {msg.isSimulatedDemo && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-400">
                      <span>نموذج إرشادي للمنهج السوداني</span>
                      <span>{msg.timestamp}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 text-right">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] p-4 rounded-2xl text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>المساعد بجهّز الجواب…</span>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-[#091524] border-t border-slate-200 dark:border-slate-800">
          {recording && (
            <div className="mb-2 flex items-center justify-center gap-2 text-[12px] font-bold text-red-400">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              بتسجل… {recSeconds} ثانية — دوس ⏹ لو خلصت سؤالك
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب سؤالك في الرياضيات، النحو، العلوم، أو التاريخ..."
              className="flex-1 bg-white dark:bg-[#10243C] border border-slate-300 dark:border-[#1E3A60] rounded-xl py-3 px-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-900 dark:focus:border-amber-400 focus:ring-1 focus:ring-blue-900 dark:focus:ring-amber-400"
            />
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              title={recording ? 'إيقاف وإرسال' : 'سؤال صوتي'}
              className={`p-3 rounded-xl flex items-center justify-center transition-all cursor-pointer min-h-[44px] min-w-[44px] ${
                recording
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                  : 'bg-[#122844] text-amber-400 border border-[#21436F] hover:border-amber-400/50'
              }`}
            >
              {recording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`p-3 rounded-xl flex items-center justify-center transition-all cursor-pointer min-h-[44px] min-w-[44px] ${
                inputText.trim()
                  ? 'bg-blue-900 dark:bg-amber-400 text-white dark:text-slate-950 hover:bg-blue-800 dark:hover:bg-amber-300 shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5 rotate-180" />
            </button>
          </form>
          <div className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
            مساعد ذكي مربوط بمنهجك — الإجابة تُكتب لحظياً، ومن كتبك ودروسك.
          </div>
        </div>
      </div>
    </div>
  );
};
