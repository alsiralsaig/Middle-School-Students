import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  X, 
  RotateCcw, 
  Bot, 
  User, 
  Copy, 
  Check, 
  ChevronDown, 
  MessageCircle,
  HelpCircle,
  BookOpen,
  AlertCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Lesson, Subject } from '../types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
}

interface LessonChatWidgetProps {
  lesson: Lesson;
  subject: Subject;
}

export const LessonChatWidget: React.FC<LessonChatWidgetProps> = ({
  lesson,
  subject,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize messages with lesson-specific greeting
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'initial-greeting',
      sender: 'assistant',
      text: `مرحباً بك يا بطل! 🇸🇩✨\nأنا معلمك الذكي لدرس «**${lesson.title}**» في مادة **${subject.name}**.\n\nتفضل بطرح أي سؤال أو نقطة غير واضحة في هذا الدرس، أو اختر أحد الأسئلة المقترحة أدناه للبدء فوراً!`,
      timestamp: 'الآن',
    },
  ]);

  // When lesson changes, reset or update welcome message
  useEffect(() => {
    setMessages([
      {
        id: `greeting-${lesson.id}`,
        sender: 'assistant',
        text: `مرحباً بك مجدداً يا بطل! 🇸🇩✨\nأنا جاهز لمساعدتك في درس «**${lesson.title}**» (${subject.name}). اسألني عن أي قانون أو مفهوم أو مسألة في هذا الدرس وأنا أجاوبك خطوة بخطوة.`,
        timestamp: 'الآن',
      },
    ]);
  }, [lesson.id, lesson.title, subject.name]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when widget opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  const quickPrompts = [
    `لخص لي درس "${lesson.title}" في 3 نقاط رئيسية`,
    `ما هي أهم القوانين والمفاهيم في هذا الدرس؟`,
    `أعطني سؤالاً اختبارياً متوقعاً في الشهادة المتوسطة عن هذا الدرس مع خطوات الحل النموذجية`,
    `اشرح لي هذا الدرس بأسلوب مبسط جداً مع مثال من الحياة اليومية في السودان`,
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const questionText = (textToSend || inputText).trim();
    if (!questionText || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: questionText,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputText('');
    setIsLoading(true);

    // Build comprehensive lesson context
    const sectionsText = lesson.sections
      ?.map((sec, i) => `[قسم ${i + 1}: ${sec.title}]\n${sec.content}\n${sec.formulaOrRule ? `القاعدة أو القانون: ${sec.formulaOrRule}` : ''}\n${sec.example ? `مثال تطبيقي: ${sec.example.question} -> الحل: ${sec.example.solution}` : ''}`)
      .join('\n\n') || '';

    const summaryText = lesson.summary || '';
    const keyRulesText = lesson.keyRules?.join(' | ') || '';
    const examTipsText = lesson.examTips?.join(' | ') || '';

    const lessonContext = `
عنوان الدرس: ${lesson.title}
المادة: ${subject.name}
المرحلة: الصف الثالث المتوسط - المنهج السوداني
الوحدة: ${lesson.unitId || ''}

أقسام وشروحات الدرس:
${sectionsText}

ملخص الدرس:
${summaryText}

القواعد الأساسية:
${keyRulesText}

إرشادات وتوجيهات الامتحانات:
${examTipsText}
`.trim();

    try {
      const response = await fetch('/api/gemini/lesson-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: lesson.title,
          subjectName: subject.name,
          lessonContext,
          question: questionText,
          history: messages.slice(-4),
        }),
      });

      if (!response.ok) {
        throw new Error(`خطأ في استجابة الخادم (${response.status})`);
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: `gemini-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'تمت معالجة سؤالك، لكن لم يرد نص محدد.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Error querying lesson chat:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `عذراً يا بطل! المساعد مش متاح حالياً. جرّب تاني بعد شوية وتأكد من الإنترنت.`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        sender: 'assistant',
        text: `تم مسح سجل المحادثة. أنا جاهز لإجابة أي سؤال جديد حول درس «**${lesson.title}**».`,
        timestamp: 'الآن',
      },
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button (when widget is closed) */}
      {!isOpen && (
        <div className="fixed bottom-20 sm:bottom-8 left-4 sm:left-8 z-40 print:hidden">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2 sm:gap-3 px-0 sm:px-5 py-0 sm:py-3.5 w-14 h-14 sm:w-auto sm:h-auto justify-center rounded-full bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20 backdrop-blur-md"
            aria-label="افتح مساعد الدرس الذكي"
          >
            {/* Animated Ping Glow */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
            </span>

            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>

            <div className="hidden text-right sm:block">
              <div className="flex items-center gap-1.5 leading-tight">
                <span>اسأل عن هذا الدرس</span>
              </div>
              <p className="text-[10px] text-blue-100 font-normal hidden sm:block truncate max-w-[150px]">
                {lesson.title}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Floating Chat Widget Window */}
      {isOpen && (
        <div 
          className={`fixed z-50 print:hidden transition-all duration-200 ${
            isExpanded
              ? 'inset-3 sm:inset-6 md:inset-12'
              : 'bottom-20 sm:bottom-6 left-3 sm:left-6 w-[360px] sm:w-[420px] max-w-[94vw] h-[580px] max-h-[82vh]'
          }`}
        >
          <div className="w-full h-full flex flex-col rounded-3xl bg-white dark:bg-[#0B1A2E] border border-slate-200 dark:border-[#1E3A60] shadow-2xl overflow-hidden backdrop-blur-xl">
            
            {/* Widget Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-sky-900 text-white flex items-center justify-between shrink-0 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-inner">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0 text-right">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white truncate">معلم الدرس الذكي</h3>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 font-medium">
                      متصل
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate max-w-[200px] sm:max-w-[240px]">
                    {lesson.title} ({subject.name})
                  </p>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  title="مسح المحادثة"
                  className="p-1.5 rounded-xl hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'تصغير' : 'تكبير النافذة'}
                  className="p-1.5 rounded-xl hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer hidden sm:block"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="إغلاق"
                  className="p-1.5 rounded-xl hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Suggestions Horizontal Bar */}
            <div className="px-3 py-2 bg-slate-50 dark:bg-[#071322] border-b border-slate-200 dark:border-[#162E4D] overflow-x-auto flex gap-1.5 no-scrollbar shrink-0 text-xs">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading}
                  className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white dark:bg-[#0F243E] hover:bg-blue-50 dark:hover:bg-[#18365D] border border-slate-200 dark:border-[#1E3A60] text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Messages Chat Stream */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-right bg-slate-50/50 dark:bg-[#091524]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${
                    msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : msg.isError
                        ? 'bg-red-500 text-white'
                        : 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`group relative max-w-[85%] rounded-2xl p-3 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-700 text-white rounded-tl-sm'
                        : msg.isError
                        ? 'bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 rounded-tr-sm'
                        : 'bg-white dark:bg-[#10243C] border border-slate-200 dark:border-[#1E3A60] text-slate-800 dark:text-slate-100 rounded-tr-sm'
                    }`}
                  >
                    {/* Message Text with simple formatting support */}
                    <div className="whitespace-pre-wrap break-words">
                      {msg.text}
                    </div>

                    {/* Footer inside bubble */}
                    <div
                      className={`mt-1.5 flex items-center justify-between text-[10px] gap-2 pt-1 border-t ${
                        msg.sender === 'user'
                          ? 'border-white/20 text-blue-100'
                          : 'border-slate-100 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>{msg.timestamp}</span>

                      {msg.sender === 'assistant' && (
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-500 cursor-pointer flex items-center gap-1"
                          title="نسخ الإجابة"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>نسخ</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="bg-white dark:bg-[#10243C] border border-slate-200 dark:border-[#1E3A60] rounded-2xl rounded-tr-sm p-3 shadow-sm text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 rounded-full bg-sky-600 animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                    <span>بجهّز ليك الإجابة…</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Area */}
            <div className="p-3 bg-white dark:bg-[#0B1A2E] border-t border-slate-200 dark:border-[#162E4D] shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`اسأل عن أي نقطة في "${lesson.title}"...`}
                    disabled={isLoading}
                    className="w-full pl-3 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#11233B] border border-slate-200 dark:border-[#1E3A60] focus:border-blue-500 focus:bg-white dark:focus:bg-[#0D1F35] text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="px-4 py-2.5 rounded-2xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:cursor-not-allowed shrink-0 min-w-[44px]"
                  title="إرسال"
                >
                  <Send className="w-4 h-4 rotate-180" />
                </button>
              </form>

              {/* Informational Subtext */}
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>إجابات فورية مخصصة للمنهج السوداني</span>
                <span className="text-amber-500 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  جاهز للمساعدة
                </span>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
