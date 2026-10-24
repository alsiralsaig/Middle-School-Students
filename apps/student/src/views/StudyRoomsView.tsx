import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Clock, GraduationCap, MessageSquare, Send, Sparkles, Users } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { StudentAvatar } from '../components/StudentAvatar';
import { getApiBase } from '../utils/serverUrl';

/**
 * المذاكرة الجماعية — صفحة مستقلة.
 *
 * ما تغيّر: كانت الصفحة تعرض رسائل مكتوبة مسبقاً و«٥٧ طالباً متصلين» وتردّ على
 * الطالب بردود وهمية بعد ثانيتين — أي محادثة لا يراها أحد. الآن الرسائل تُحفظ
 * في قاعدة البيانات عبر `/api/study/...` ويراها كل من يفتح الغرفة، وعدّاد
 * المتصلين محسوب من نشاط حقيقي في آخر ٣٠ دقيقة، والتحديث كل ٧ ثوانٍ.
 */

interface RoomMeta {
  id: string;
  title: string;
  subjectName: string;
  topic: string;
  description: string;
  pinnedNote: string;
  tags: string[];
  accent: string;
}

const ROOMS: RoomMeta[] = [
  {
    id: 'room-math',
    title: 'غرفة الرياضيات',
    subjectName: 'الرياضيات',
    topic: 'فيثاغورس، الجبر، وهندسة الدائرة',
    description: 'ناقش المسائل الصعبة خطوة بخطوة مع زملائك — اكتب خطوتك وخلي غيرك يكمّل.',
    pinnedNote: 'مسألة اليوم: في مثلث قائم الوتر ١٠ سم وأحد الضلعين ٦ سم — ما مساحة المثلث؟',
    tags: ['#فيثاغورس', '#حل_مسائل'],
    accent: 'from-blue-600 to-indigo-700',
  },
  {
    id: 'room-science',
    title: 'غرفة العلوم',
    subjectName: 'العلوم',
    topic: 'نيوتن، التفاعلات، وأجهزة الجسم',
    description: 'قوانين الحركة، معادلات التكافؤ، ورسومات أجهزة جسم الإنسان.',
    pinnedNote: 'تنبيه: راجع الفرق بين الرابطة الأيونية والتساهمية مع مثال لكل واحدة.',
    tags: ['#نيوتن', '#كيمياء'],
    accent: 'from-emerald-600 to-teal-700',
  },
  {
    id: 'room-arabic',
    title: 'غرفة اللغة العربية',
    subjectName: 'اللغة العربية',
    topic: 'النحو، البلاغة، والممنوع من الصرف',
    description: 'إعراب مشترك وتدريبات على الحال والتمييز.',
    pinnedNote: 'أعرب: «سافرتُ إلى مساجدَ أثريةٍ» — واذكر سبب منع (مساجد) من الصرف.',
    tags: ['#نحو', '#إعراب'],
    accent: 'from-amber-600 to-orange-700',
  },
  {
    id: 'room-general',
    title: 'غرفة المراجعة الشاملة',
    subjectName: 'كل المواد',
    topic: 'التحضير للامتحانات والنصائح',
    description: 'ملتقى طلاب الصف الثالث متوسط من كل ولايات السودان.',
    pinnedNote: 'اكتب هنا خطتك للمراجعة النهاردة — وخلّي غيرك يستفيد.',
    tags: ['#مذاكرة_جماعية', '#امتحانات'],
    accent: 'from-purple-600 to-fuchsia-700',
  },
];

interface Message {
  id: string;
  userId: string;
  name: string;
  avatar: string | null;
  state: string | null;
  body: string;
  createdAt: string;
}

interface RoomStat {
  roomId: string;
  online: number;
  messages: number;
  lastMessageAt: string | null;
}

const POLL_MS = 7000;

/** «قبل ٣ دقائق» بدل التاريخ الخام */
function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'الآن';
  if (min < 60) return `قبل ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `قبل ${hr} ساعة`;
  return `قبل ${Math.floor(hr / 24)} يوم`;
}

export const StudyRoomsView: React.FC<{ onBackToDashboard?: () => void }> = ({ onBackToDashboard }) => {
  const { user } = useSession();
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [stats, setStats] = useState<RoomStat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  /** موجّه السؤال للمدرّس الذكي بدل زملاء الغرفة */
  const [toTeacher, setToTeacher] = useState(false);
  const [teacherBusy, setTeacherBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeRoom = useMemo(() => ROOMS.find((r) => r.id === activeRoomId) || null, [activeRoomId]);
  const statOf = (id: string) => stats.find((s) => s.roomId === id);
  const totalOnline = stats.reduce((n, s) => n + s.online, 0);

  /* إحصاءات الغرف — تُحدَّث كل ٣٠ ثانية */
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/study/rooms`, { credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as { rooms: RoomStat[] };
      setStats(data.rooms);
    } catch {
      /* الشبكة غير متاحة — نُبقي آخر إحصاء */
    }
  }, []);

  useEffect(() => {
    void loadStats();
    const t = setInterval(() => void loadStats(), 30_000);
    return () => clearInterval(t);
  }, [loadStats]);

  /* رسائل الغرفة المفتوحة — تحميل ثم تحديث دوري */
  const loadMessages = useCallback(async (roomId: string, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/study/rooms/${roomId}/messages`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { messages: Message[] };
      setMessages(data.messages);
      setError('');
    } catch {
      if (!quiet) setError('تعذّر تحميل رسائل الغرفة — تأكد من اتصال الإنترنت');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }
    void loadMessages(activeRoomId);
    const t = setInterval(() => void loadMessages(activeRoomId, true), POLL_MS);
    return () => clearInterval(t);
  }, [activeRoomId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeRoomId]);

  /** سؤال للمدرّس الذكي — بيرد بالعامية السودانية مع سياق من المنهج */
  const askTeacher = async (body: string) => {
    if (!activeRoomId || teacherBusy) return;
    setTeacherBusy(true);
    setError('');
    // تظهر رسالة الطالب فوراً كأنها أُرسلت (تُحفظ فعلياً في الخادم)
    const pending: Message = {
      id: `pending-${Date.now()}`,
      userId: user?.id || 'me',
      name: user?.name || 'أنت',
      avatar: user?.avatar ?? null,
      state: null,
      body,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, pending]);
    setText('');
    try {
      const res = await fetch(`${getApiBase()}/api/study/rooms/${activeRoomId}/teacher`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-App': 'student' },
        body: JSON.stringify({ question: body }),
      });
      const data = (await res.json().catch(() => null)) as
        | { messages?: [Message, Message]; error?: string }
        | null;
      if (!res.ok || !data?.messages) throw new Error(data?.error || 'الأستاذ ما ردّ — جرّب تاني');
      // نستبدل الرسالة المؤقتة بالرسالتين المحفوظتين
      setMessages((prev) => [...prev.filter((m) => m.id !== pending.id), ...(data.messages as Message[])]);
      setToTeacher(false);
      void loadStats();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== pending.id));
      setText(body);
      setError(err instanceof Error ? err.message : 'الأستاذ ما ردّ — جرّب تاني');
    } finally {
      setTeacherBusy(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !activeRoomId || sending || teacherBusy) return;
    // «يا أستاذ» أو «@» في أول الرسالة ⟹ يروح للمدرّس تلقائياً
    if (toTeacher || /^(@|يا\s*أ?ستاذ)/.test(body)) {
      await askTeacher(body.replace(/^(@|يا\s*أ?ستاذ)\s*/, ''));
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${getApiBase()}/api/study/rooms/${activeRoomId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-App': 'student' },
        body: JSON.stringify({ text: body }),
      });
      const data = (await res.json().catch(() => null)) as { message?: Message; error?: string } | null;
      if (!res.ok || !data?.message) throw new Error(data?.error || 'تعذّر إرسال الرسالة');
      setMessages((prev) => [...prev, data.message as Message]);
      setText('');
      void loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  /* ==================== قائمة الغرف ==================== */
  if (!activeRoom) {
    return (
      <div className="space-y-5 text-right">
        <div className="bg-gradient-to-r from-[#0B2A5B] via-[#0B1E36] to-[#071322] rounded-3xl p-6 sm:p-7 border border-[#1C3659] relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F1AC12]/15 border border-[#F1AC12]/30 text-[#F1AC12] text-[11px] font-bold">
            <Users className="w-3.5 h-3.5" /> المذاكرة الجماعية
          </div>
          <h1 className="mt-3 text-xl sm:text-2xl font-black text-white">غرف المذاكرة — الصف الثالث متوسط</h1>
          <p className="mt-1.5 text-[12px] sm:text-[13px] text-slate-300 leading-relaxed max-w-xl">
            اختار غرفة واكتب سؤالك. رسالتك تظهر لكل الطلاب اللي فاتحين نفس الغرفة، وحد ما يرد عليك
            تلقائياً — الردود من زملائك الحقيقيين.
          </p>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#F1AC12]/10 border border-[#F1AC12]/25 px-3 py-2">
            <GraduationCap className="w-4 h-4 text-[#F1AC12] shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-100 leading-relaxed">
              في كل غرفة <strong>الأستاذ</strong> موجود: اكتب سؤالك واضغط «اسأل المدرس» — يرد عليك
              بالعامية السودانية من المنهج نفسه. ده <strong>مساعدة إضافية</strong>، وأستاذك في
              المدرسة هو المرجع في التصحيح والدرجات.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className={`w-2 h-2 rounded-full ${totalOnline > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {totalOnline > 0 ? `${totalOnline} طالباً نشطاً الآن` : 'ما في حد متصل حالياً'}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{ROOMS.length} غرف</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {ROOMS.map((room) => {
            const st = statOf(room.id);
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => setActiveRoomId(room.id)}
                className="text-right rounded-2xl bg-[#0B1E36] border border-[#1C3659] hover:border-[#F1AC12]/50 transition-colors p-4 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${room.accent} flex items-center justify-center shrink-0`}>
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0E2440] border border-[#27446C] text-slate-300">
                    {room.subjectName}
                  </span>
                </div>
                <h2 className="mt-2.5 text-sm font-black text-white">{room.title}</h2>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{room.description}</p>
                <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-400" /> {st?.online ?? 0} متصل
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-sky-400" /> {st?.messages ?? 0} رسالة
                  </span>
                  {st?.lastMessageAt && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" /> {timeAgo(st.lastMessageAt)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {onBackToDashboard && (
          <button
            type="button"
            onClick={onBackToDashboard}
            className="text-[11px] font-bold text-slate-400 hover:text-white inline-flex items-center gap-1.5"
          >
            <ArrowRight className="w-3.5 h-3.5" /> رجوع للواجهة
          </button>
        )}
      </div>
    );
  }

  /* ==================== غرفة مفتوحة ==================== */
  const roomStat = statOf(activeRoom.id);

  return (
    <div className="space-y-3 text-right">
      <div className="rounded-2xl bg-[#0B1E36] border border-[#1C3659] overflow-hidden flex flex-col h-[calc(100vh-11rem)] min-h-[420px]">
        {/* رأس الغرفة */}
        <div className="px-4 py-3 border-b border-[#1C3659] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setActiveRoomId(null)}
              aria-label="رجوع للغرف"
              className="w-9 h-9 rounded-lg bg-[#0E2440] border border-[#1B3658] flex items-center justify-center shrink-0"
            >
              <ArrowRight className="w-4 h-4 text-slate-300" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white truncate">{activeRoom.title}</h2>
              <p className="text-[10px] text-slate-400 truncate">
                {roomStat?.online ?? 0} متصل الآن · {activeRoom.topic}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#F1AC12] bg-[#F1AC12]/10 border border-[#F1AC12]/30 rounded-full px-2 py-1 shrink-0 inline-flex items-center gap-1">
            <GraduationCap className="w-3 h-3" /> الأستاذ موجود
          </span>
        </div>

        {/* الموضوع المثبّت */}
        <div className="px-4 py-2 bg-[#F1AC12]/10 border-b border-[#F1AC12]/20 text-[11px] text-amber-200 flex items-start gap-2 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-[#F1AC12] shrink-0 mt-0.5" />
          <span className="leading-relaxed">{activeRoom.pinnedNote}</span>
        </div>

        {/* الرسائل */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#071322]">
          {loading && <p className="text-center text-[11px] text-slate-500 py-6">جارٍ تحميل الرسائل…</p>}
          {!loading && messages.length === 0 && (
            <div className="text-center py-10 px-6 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-[12px] text-slate-400">الغرفة فاضية — ابدأ أنت أول رسالة.</p>
              <p className="text-[10px] text-slate-500">مثال: «من يشرح لي فيثاغورس بمثال بسيط؟»</p>
            </div>
          )}
          {messages.map((m) => {
            const isTeacher = m.userId === 'teacher';
            const mine = !isTeacher && m.userId === user?.id;
            if (isTeacher) {
              return (
                <div key={m.id} className="flex items-start gap-2">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F1AC12] to-[#c98d0b] flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4 text-[#071322]" />
                  </span>
                  <div className="max-w-[88%] space-y-1 text-right">
                    <div className="flex items-center gap-1.5 text-[10px] px-1">
                      <span className="font-black text-[#F1AC12]">الأستاذ</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{timeAgo(m.createdAt)}</span>
                    </div>
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-[12.5px] leading-relaxed whitespace-pre-line bg-[#12233B] border border-[#F1AC12]/35 text-amber-50">
                      {m.body}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className={`flex items-start gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                <StudentAvatar avatar={m.avatar} name={m.name} className="w-8 h-8" textClassName="text-[12px]" />
                <div className={`max-w-[82%] space-y-1 ${mine ? 'text-left' : 'text-right'}`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                    <span className="font-bold text-slate-200">{mine ? 'أنت' : m.name}</span>
                    {m.state && <><span>•</span><span className="text-amber-400">{m.state}</span></>}
                    <span>•</span>
                    <span>{timeAgo(m.createdAt)}</span>
                  </div>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed whitespace-pre-line ${
                      mine
                        ? 'bg-[#1E4E8C] text-white rounded-tl-sm'
                        : 'bg-[#0E2440] border border-[#1C3659] text-slate-100 rounded-tr-sm'
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })}
          {teacherBusy && (
            <div className="flex items-center gap-2 text-[11px] text-[#F1AC12] px-1">
              <span className="w-6 h-6 rounded-full bg-[#F1AC12]/20 flex items-center justify-center">
                <GraduationCap className="w-3.5 h-3.5" />
              </span>
              الأستاذ بيكتب…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* الإدخال */}
        <form onSubmit={send} className="p-2.5 border-t border-[#1C3659] bg-[#0B1E36] shrink-0">
          {error && <p className="text-[10.5px] text-red-300 mb-1.5 px-1">{error}</p>}
          {toTeacher && (
            <div className="mb-1.5 px-1 flex items-center justify-between gap-2">
              <span className="text-[10.5px] text-[#F1AC12] font-bold inline-flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" /> سؤالك رايح للأستاذ — مساعدة، مش بديل عن معلمك
              </span>
              <button
                type="button"
                onClick={() => setToTeacher(false)}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                إلغاء
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 600))}
              placeholder="اكتب رسالتك لزملائك…"
              className="flex-1 min-h-[44px] rounded-xl bg-[#0E2440] border border-[#1B3658] px-3.5 text-[13px] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F1AC12]/70"
            />
            <button
              type="button"
              onClick={() => {
                if (text.trim()) void askTeacher(text.trim());
                else setToTeacher(true);
              }}
              disabled={teacherBusy || sending}
              title="اسأل المدرس"
              aria-label="اسأل المدرس"
              className={`h-11 px-3 rounded-xl text-[11px] font-black flex items-center gap-1.5 shrink-0 disabled:opacity-50 ${
                toTeacher || text.trim()
                  ? 'bg-[#F1AC12] text-[#071322]'
                  : 'bg-[#0E2440] border border-[#F1AC12]/40 text-[#F1AC12]'
              }`}
            >
              <GraduationCap className="w-4 h-4" /> المدرس
            </button>
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label="إرسال"
              className="w-11 h-11 rounded-xl bg-[#122B4A] border border-[#27446C] text-slate-200 flex items-center justify-center disabled:opacity-50 shrink-0"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
