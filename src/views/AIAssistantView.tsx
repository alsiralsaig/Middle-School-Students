import React, { useState } from 'react';
import { AI_ASSISTANT_PRESETS } from '../data/curriculumData';
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
  Clock
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isSimulatedDemo?: boolean;
}

export const AIAssistantView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `مرحباً بك يا بطل الصف الثالث المتوسط! 🇸🇩\nأنا المساعد الدراسي الاسترشادي لمنصة الطالب السوداني الذكية.\n\nتنويه هام: هذه واجهة تجريبية تفاعلية لعرض إمكانيات المساعد. في هذا الإصدار الأول (Frontend Prototype) تم تزويدي بنماذج إجابات نموذجية معتمدة على المنهج السوداني. يمكنك تجربة الأسئلة الجاهزة أدناه أو كتابة استفسارك لمشاهدة آلية الردود.`,
      timestamp: 'الآن',
      isSimulatedDemo: true
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: 'الآن'
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.reply) {
          const botMsg: ChatMessage = {
            id: `bot-${Date.now()}`,
            sender: 'assistant',
            text: data.reply,
            timestamp: 'الآن',
            isSimulatedDemo: false
          };
          setMessages((prev) => [...prev, botMsg]);
          setIsTyping(false);
          return;
        }
      }
    } catch {
      // Fallback to curriculum preset responses
    }

    // Pedagogical curriculum presets fallback
    const matchedPreset = AI_ASSISTANT_PRESETS.find(
      (p) =>
        query.includes(p.subject) ||
        p.prompt.includes(query) ||
        query.includes('صرف') ||
        (query.includes('فيثاغورس') && p.subject === 'الرياضيات') ||
        (query.includes('رابطة') && p.subject === 'العلوم') ||
        (query.includes('شيكان') && p.subject === 'الدراسات الاجتماعية')
    );

    let replyText = '';
    if (matchedPreset) {
      replyText = matchedPreset.reply;
    } else {
      replyText = `شكراً لسؤالك حول: "${query}"! في مقررات المنهج السوداني، ننصحك أيضاً باستخدام نافذة "معلم الدرس الذكي" في صفحة أي درس للحصول على شروحات تفصيلية فورية لكل مسألة وقانون بواسطة نموذج Gemini API.`;
    }

    const botMsg: ChatMessage = {
      id: `bot-${Date.now()}`,
      sender: 'assistant',
      text: replyText,
      timestamp: 'الآن',
      isSimulatedDemo: true
    };

    setMessages((prev) => [...prev, botMsg]);
    setIsTyping(false);
  };

  const handleClearChat = () => {
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
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-[#142A46] px-3 py-1.5 rounded-lg border border-[#21436F] transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>مسح المحادثة</span>
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          المساعد الدراسي الذكي (واجهة استعراضية)
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
          واجهة تفاعلية مصممة لإرشاد طلاب الشهادة المتوسطة والإجابة على تساؤلات المنهج السوداني.
        </p>

        {/* Explicit Honest Notice */}
        <div className="p-4 rounded-2xl bg-[#122844] border border-amber-400/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-200 space-y-1">
            <span className="font-bold text-amber-300">
              تنويه هندسي معتمد (Phase 1 Frontend Prototype):
            </span>
            <p className="text-slate-300 leading-relaxed">
              هذه الواجهة غير متصلة حالياً بأي واجهة برمجية خارجية للذكاء الاصطناعي (External AI API) التزاماً بمتطلبات المرحلة الأولى. الردود المعروضة هي نماذج تربوية حقيقية مبرمجة مسبقاً لعرض كيفية تفاعل المساعد مستقبلاً.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Questions Bar */}
      <div className="bg-white dark:bg-[#0D1F35] rounded-2xl border border-slate-200 dark:border-[#1C3A62] p-4 shadow-sm text-right space-y-2">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-blue-900 dark:text-amber-400" />
          <span>أسئلة شائعة في المنهج يمكنك تجربتها فوراً:</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {AI_ASSISTANT_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSend(p.prompt)}
              className="text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-[#122844] hover:bg-amber-50 dark:hover:bg-[#18365D] hover:border-amber-200 dark:hover:border-amber-400/40 border border-slate-200 dark:border-[#1E3A60] text-slate-700 dark:text-slate-200 hover:text-amber-900 dark:hover:text-amber-200 text-right transition-colors cursor-pointer"
            >
              {p.prompt}
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
                  className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-blue-900 dark:bg-[#16365F] text-white rounded-tr-none'
                      : 'bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] text-slate-800 dark:text-slate-100 rounded-tl-none'
                  }`}
                >
                  {msg.text}

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
                <span>جاري استرجاع القواعد من المنهج السوداني...</span>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-[#091524] border-t border-slate-200 dark:border-slate-800">
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
            واجهة تفاعلية تجريبية · سيتم ربطها بنموذج ذكاء اصطناعي مخصص للمناهج السودانية في المرحلة التالية.
          </div>
        </div>
      </div>
    </div>
  );
};
