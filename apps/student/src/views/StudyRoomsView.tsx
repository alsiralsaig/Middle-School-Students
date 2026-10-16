import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Send, 
  Pin, 
  Sparkles, 
  BookOpen, 
  ArrowRight, 
  Smile, 
  CheckCircle2, 
  HelpCircle, 
  User, 
  Clock, 
  Search, 
  Filter, 
  Flame, 
  School, 
  MapPin, 
  Paperclip,
  Share2
} from 'lucide-react';
import { StudyRoom, StudyRoomMessage } from '../types';
import { useAccount } from '../context/AccountContext';

const INITIAL_ROOMS: StudyRoom[] = [
  {
    id: 'room-math',
    title: 'غرفة مراجعة الرياضيات وتطبيقات فيثاغورس',
    subjectId: 'math',
    subjectName: 'الرياضيات',
    topic: 'نظرية فيثاغورس وتحليل المقادير الجبرية',
    activeCount: 14,
    description: 'غرفة مذاكرة تفاعلية مخصصة لمناقشة مسائل الجبر، إثباتات الدائرة، ومسائل فيثاغورس الوزارية.',
    pinnedNote: '📌 مسألة اليوم للمناقشة: في المثلث القائم (أ ب ج)، إذا كان الوتر ١٠ سم والضلع الأول ٦ سم، ما هي مساحة المثلث؟ شارك خطوتك في المحادثة!',
    iconBg: 'bg-blue-600',
    tags: ['#الرياضيات', '#فيثاغورس', '#حل_مسائل', '#امتحانات_الشهادة'],
  },
  {
    id: 'room-science',
    title: 'مختبر العلوم وقوانين نيوتن والتفاعلات',
    subjectId: 'science',
    subjectName: 'العلوم',
    topic: 'الفيزياء، الكيمياء، وأجهزة جسم الإنسان',
    activeCount: 9,
    description: 'مساحة طلابية لمراجعة معادلات التكافؤ الكيميائي، قوانين الحركة، ورسومات أجهزة الجسم المقررة.',
    pinnedNote: '📌 تنبيه المذاكرة: ركّزوا الليلة على الفرق بين الرابطة الأيونية والرابطة التساهمية مع ذكر مثال لكل منهما.',
    iconBg: 'bg-emerald-600',
    tags: ['#العلوم', '#قوانين_نيوتن', '#كيمياء', '#الدورة_الدموية'],
  },
  {
    id: 'room-arabic',
    title: 'ديوان لغة الضاد ومذاكرة النحو والبلاغة',
    subjectId: 'arabic',
    subjectName: 'اللغة العربية',
    topic: 'الممنوع من الصرف، الحال، والتمييز',
    activeCount: 12,
    description: 'مناقشة أسرار الإعراب، علامات الجر بالفتحة، والتفريق الدقيق بين التمييز الملحوظ والملفوظ.',
    pinnedNote: '📌 تدريب إعرابي مشترك: «سافرتُ إلى مساجدَ أثريةٍ». من يعرب (مساجد) إعراباً تاماً مع ذكر السبب؟',
    iconBg: 'bg-amber-600',
    tags: ['#اللغة_العربية', '#النحو', '#الممنوع_من_الصرف', '#إعراب'],
  },
  {
    id: 'room-general',
    title: 'غرفة المراجعة القومية الشاملة للشهادة المتوسطة',
    subjectId: 'general',
    subjectName: 'المراجعة الشاملة',
    topic: 'جميع المواد المقررة والتحضير للامتحانات',
    activeCount: 22,
    description: 'ملتقى مفتوح لطلاب الصف الثالث المتوسط من جميع ولايات السودان لتبادل النصائح وأوراق الامتحانات.',
    pinnedNote: '📌 جدول اليوم: تبدأ المذاكرة الجماعية لورقة الدراسات الاجتماعية وأحداث الثورة المهدية في تمام الساعة 7 مساءً.',
    iconBg: 'bg-purple-600',
    tags: ['#الشهادة_المتوسطة', '#مذاكرة_جماعية', '#السودان', '#كل_المواد'],
  },
];

const INITIAL_MESSAGES: Record<string, StudyRoomMessage[]> = {
  'room-math': [
    {
      id: 'm-1',
      roomId: 'room-math',
      senderName: 'محمد الفاتح',
      senderAvatar: '👨‍🎓',
      senderState: 'ولاية الخرطوم',
      text: 'السلام عليكم يا شباب، بخصوص مسألة فيثاغورس المثبتة: الضلع الثاني = √(١٠٠ - ٣٦) = √٦٤ = ٨ سم!',
      timestamp: 'منذ 10 دقائق',
      reactions: { '👍': 5, '💡': 3 },
    },
    {
      id: 'm-2',
      roomId: 'room-math',
      senderName: 'فاطمة الزهراء',
      senderAvatar: '🧕',
      senderState: 'ولاية الجزيرة',
      text: 'ممتاز يا محمد! وبناءً عليه المساحة = ½ × ٨ × ٦ = ٢٤ سم². هل خطواتي صحيحة؟',
      timestamp: 'منذ 7 دقائق',
      reactions: { '👏': 6, '🇸🇩': 4 },
    },
    {
      id: 'm-3',
      roomId: 'room-math',
      senderName: 'عمر صديق',
      senderAvatar: '👨‍🎓',
      senderState: 'ولاية البحر الأحمر',
      text: 'صحيحة 100%! وأهم نقطة ألا ننسى وحدة القياس (سم²) لأن لجان الامتحانات تخصم نصف درجة عليها.',
      timestamp: 'منذ 3 دقائق',
      reactions: { '💡': 4 },
    },
  ],
  'room-science': [
    {
      id: 's-1',
      roomId: 'room-science',
      senderName: 'رؤى عبد الله',
      senderAvatar: '👩‍🎓',
      senderState: 'ولاية نهر النيل',
      text: 'مساء الخير، هل قانون نيوتن الثاني ق = ك × ت دائماً يُقاس بالنيوتن؟',
      timestamp: 'منذ 15 دقيقة',
    },
    {
      id: 's-2',
      roomId: 'room-science',
      senderName: 'أحمد التوم',
      senderAvatar: '👨‍🎓',
      senderState: 'ولاية كسلا',
      text: 'نعم يا رؤى! ١ نيوتن = ١ كجم × ١ م/ث². هذا السؤال تكرر في امتحان ولاية الجزيرة العام الماضي.',
      timestamp: 'منذ 11 دقيقة',
      reactions: { '👍': 4 },
    },
  ],
  'room-arabic': [
    {
      id: 'a-1',
      roomId: 'room-arabic',
      senderName: 'سارة مأمون',
      senderAvatar: '🧕',
      senderState: 'ولاية سنار',
      text: 'إعراب مساجدَ: اسم مجرور بـ (إلى) وعلامة جره الفتحة نيابة عن الكسرة لأنه ممنوع من الصرف (صيغة منتهى الجموع)!',
      timestamp: 'منذ 8 دقائق',
      reactions: { '👏': 7, '💡': 2 },
    },
  ],
  'room-general': [
    {
      id: 'g-1',
      roomId: 'room-general',
      senderName: 'إبراهيم علي',
      senderAvatar: '👨‍🎓',
      senderState: 'ولاية القضارف',
      text: 'بالتوفيق لكل طلاب الشهادة المتوسطة في جميع أنحاء السودان! منصة ممتازة ومذاكرتنا سوا بتشجعنا جداً 🇸🇩💪',
      timestamp: 'منذ 20 دقيقة',
      reactions: { '🇸🇩': 12, '❤️': 8 },
    },
  ],
};

interface StudyRoomsViewProps {
  onBackToDashboard?: () => void;
}

export const StudyRoomsView: React.FC<StudyRoomsViewProps> = ({ onBackToDashboard }) => {
  const { activeAccount } = useAccount();

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, StudyRoomMessage[]>>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeRoom = INITIAL_ROOMS.find((r) => r.id === activeRoomId) || null;
  const currentMessages = activeRoomId ? messages[activeRoomId] || [] : [];

  // Auto scroll to latest message
  useEffect(() => {
    if (activeRoomId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeRoomId]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeRoomId) return;

    const newMessage: StudyRoomMessage = {
      id: `msg-${Date.now()}`,
      roomId: activeRoomId,
      senderName: activeAccount.name || 'طالب متميز',
      senderAvatar: activeAccount.avatar || '👨‍🎓',
      senderState: activeAccount.state || 'السودان',
      text: inputText.trim(),
      timestamp: 'الآن',
      isSelf: true,
      reactions: {},
    };

    setMessages((prev) => ({
      ...prev,
      [activeRoomId]: [...(prev[activeRoomId] || []), newMessage],
    }));

    setInputText('');

    // Simulate smart peer feedback in study room after a short delay
    setTimeout(() => {
      const peerReplies = [
        'أحسنت يا بطل! ملاحظة ممتازة ودقيقة للمنهج.',
        'شكراً لمشاركتك المفيدة، فلنواصل حل بقية التمارين معاً.',
        'فكرة رائعة! سأقوم بتدوين هذه النقطة في مذكرتي فوراً 📝',
      ];
      const randomReply = peerReplies[Math.floor(Math.random() * peerReplies.length)];

      const peerMsg: StudyRoomMessage = {
        id: `peer-${Date.now()}`,
        roomId: activeRoomId,
        senderName: 'عثمان عبد الله',
        senderAvatar: '👨‍🎓',
        senderState: 'ولاية الخرطوم',
        text: randomReply,
        timestamp: 'الآن',
        reactions: { '👍': 1 },
      };

      setMessages((prev) => ({
        ...prev,
        [activeRoomId]: [...(prev[activeRoomId] || []), peerMsg],
      }));
    }, 2500);
  };

  const handleSendReaction = (msgId: string, emoji: string) => {
    if (!activeRoomId) return;
    setMessages((prev) => {
      const roomMsgs = prev[activeRoomId] || [];
      const updated = roomMsgs.map((m) => {
        if (m.id === msgId) {
          const reactions = { ...(m.reactions || {}) };
          reactions[emoji] = (reactions[emoji] || 0) + 1;
          return { ...m, reactions };
        }
        return m;
      });
      return { ...prev, [activeRoomId]: updated };
    });
  };

  const handleQuickQuestion = (qText: string) => {
    setInputText(qText);
  };

  const quickPrompts = [
    'من يشرح لي هذه النقطة خطوة بخطوة؟',
    'ما هو القانون الرياضي المعتمد لهذه المسألة؟',
    'هل هذا السؤال متوقع في امتحانات الشهادة المتوسطة؟',
    'أنا جاهز لحل المسألة التالية معاً 🇸🇩',
  ];

  const filteredRooms = INITIAL_ROOMS.filter((room) => {
    const matchesSearch =
      room.title.includes(searchQuery) ||
      room.topic.includes(searchQuery) ||
      room.subjectName.includes(searchQuery);
    const matchesTag = selectedTag === 'all' || room.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-6 text-right">
      
      {/* ======================= VIEW 1: ROOMS DIRECTORY ======================= */}
      {!activeRoom && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-amber-400/20">
            <div className="max-w-2xl space-y-3 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
                <Users className="w-4 h-4 text-amber-400" />
                <span>مساحات المذاكرة الجماعية التفاعلية · الشهادة المتوسطة</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black">
                غرف المذاكرة الافتراضية للطلاب 🇸🇩
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                انضم إلى غرف المذاكرة المخصصة لمواد الشهادة المتوسطة، وناقش المسائل والقوانين الصعبة مع زملائك من مختلف ولايات السودان عبر بيئة دراسية محفزة وآمنة.
              </p>
            </div>

            {/* Quick stats banner */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>57 طالباً متصلين الآن في الغرف</span>
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-amber-300">4 غرف دراسية نشطة</span>
              </div>

              {onBackToDashboard && (
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة للوحة التحكم</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Tags Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="ابحث عن غرفة مادة أو موضوع معين..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-white dark:bg-[#0D1F35] border border-slate-200 dark:border-[#1E3A60] text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              {['all', '#الرياضيات', '#العلوم', '#النحو', '#الشهادة_المتوسطة'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedTag === tag
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-[#142A46] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {tag === 'all' ? 'جميع الغرف' : tag}
                </button>
              ))}
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1E3A60] p-6 flex flex-col justify-between hover:shadow-xl hover:border-amber-400/50 transition-all text-right group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl ${room.iconBg} text-white flex items-center justify-center font-bold text-xl shadow-md group-hover:scale-105 transition-transform`}>
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          {room.subjectName}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                          {room.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{room.activeCount} متصل</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {room.description}
                  </p>

                  {/* Pinned Note preview */}
                  {room.pinnedNote && (
                    <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                      {room.pinnedNote}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {room.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#142A46] text-slate-600 dark:text-slate-300 font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    مناقشات تفاعلية فورية
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveRoomId(room.id)}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    <span>دخول الغرفة</span>
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================= VIEW 2: ACTIVE ROOM LIVE CHAT ======================= */}
      {activeRoom && (
        <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1E3A60] shadow-xl overflow-hidden flex flex-col h-[780px] max-h-[85vh] animate-in fade-in duration-200">
          
          {/* Room Top Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between gap-4 shrink-0 border-b border-amber-400/20">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setActiveRoomId(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                title="مغادرة الغرفة والعودة للدليل"
              >
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-white truncate">
                    {activeRoom.title}
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 font-bold hidden sm:inline">
                    {activeRoom.activeCount + 1} متصل الآن
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/80 truncate max-w-sm sm:max-w-md">
                  الموضوع: {activeRoom.topic}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-300 font-bold hidden md:inline">
                أنت تشارك كـ: <span className="text-amber-400">{activeAccount.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveRoomId(null)}
                className="px-3.5 py-1.5 rounded-xl border border-white/20 hover:bg-white/10 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                خروج
              </button>
            </div>
          </div>

          {/* Pinned Topic Banner */}
          {activeRoom.pinnedNote && (
            <div className="px-4 py-2.5 bg-amber-500/10 dark:bg-amber-400/15 border-b border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 truncate">
                <Pin className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">{activeRoom.pinnedNote}</span>
              </div>
              <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full shrink-0">
                مثبّت للنقاش
              </span>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/60 dark:bg-[#071322]">
            {currentMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.isSelf ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 shadow-sm ${
                    msg.isSelf
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-[#142A46] border border-slate-200 dark:border-[#1E3A60] text-slate-900 dark:text-white'
                  }`}
                >
                  {msg.senderAvatar}
                </div>

                {/* Content Bubble */}
                <div className={`max-w-[85%] sm:max-w-[75%] space-y-1.5 ${msg.isSelf ? 'text-left' : 'text-right'}`}>
                  {/* Sender metadata */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {msg.senderName}
                    </span>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-amber-400">{msg.senderState}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Bubble body */}
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                      msg.isSelf
                        ? 'bg-blue-700 text-white rounded-tl-sm text-right'
                        : 'bg-white dark:bg-[#0D1F35] border border-slate-200 dark:border-[#1C3A62] text-slate-800 dark:text-slate-100 rounded-tr-sm text-right'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Reactions Pill Display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {Object.entries(msg.reactions).map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                              msg.isSelf
                                ? 'bg-white/20 border-white/30 text-white'
                                : 'bg-slate-100 dark:bg-[#142A46] border-slate-200 dark:border-[#1E3A60] text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{count}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Reactions Bar below others' messages */}
                  {!msg.isSelf && (
                    <div className="flex items-center gap-1 px-1">
                      {['👍', '💡', '👏', '🇸🇩', '❓'].map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => handleSendReaction(msg.id, em)}
                          className="px-1.5 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-[11px] transition-colors cursor-pointer"
                          title={`تفاعل بـ ${em}`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-4 py-2 bg-slate-100 dark:bg-[#091524] border-t border-slate-200 dark:border-[#162E4D] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickQuestion(prompt)}
                className="whitespace-nowrap px-3 py-1 rounded-xl bg-white dark:bg-[#10243C] hover:bg-amber-50 dark:hover:bg-[#18365D] border border-slate-200 dark:border-[#1E3A60] text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-all cursor-pointer shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Bottom Message Input Box */}
          <div className="p-3 sm:p-4 bg-white dark:bg-[#0D1F35] border-t border-slate-200 dark:border-[#162E4D] shrink-0">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="اكتب رسالتك أو استفسارك وشاركه مع زملائك في الغرفة..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-[#11233B] border border-slate-200 dark:border-[#1E3A60] text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0"
              >
                <span>إرسال</span>
                <Send className="w-4 h-4 rotate-180" />
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
};

export default StudyRoomsView;
