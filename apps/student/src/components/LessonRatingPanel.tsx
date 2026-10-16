import React, { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquarePlus, Pencil, Star, Trash2 } from 'lucide-react';
import {
  FEEDBACK_TAGS,
  getFeedback,
  ratingStats,
  removeFeedback,
  saveFeedback,
  subscribeFeedback,
} from '../utils/ratingStore';
import { showToast } from '../utils/toastBus';

interface Props {
  lessonId: string;
  lessonTitle: string;
}

const MAX_COMMENT = 600;

/**
 * لوحة تقييم الدرس: نجوم + ملاحظات نصية لتحسين جودة الشرح.
 * البيانات محفوظة محلياً (المرحلة الأولى) — لا يوجد خادم بعد.
 */
export const LessonRatingPanel: React.FC<Props> = ({ lessonId, lessonTitle }) => {
  const [feedback, setFeedback] = useState(() => getFeedback(lessonId));
  const [stars, setStars] = useState<number>(feedback?.rating ?? 0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [comment, setComment] = useState(feedback?.comment ?? '');
  const [editing, setEditing] = useState(!feedback);

  useEffect(() => subscribeFeedback(() => setFeedback(getFeedback(lessonId))), [lessonId]);

  // إعادة تهيئة الحقول عند تغيير الدرس
  useEffect(() => {
    const fb = getFeedback(lessonId);
    setFeedback(fb);
    setStars(fb?.rating ?? 0);
    setComment(fb?.comment ?? '');
    setEditing(!fb);
  }, [lessonId]);

  const stats = ratingStats(lessonId, feedback);

  const handleSave = () => {
    if (stars < 1) {
      showToast({ title: 'اختر تقييماً بالنجوم أولاً', tone: 'warning' });
      return;
    }
    saveFeedback({ lessonId, rating: stars, comment: comment.trim() });
    setEditing(false);
    showToast({
      title: `تم حفظ تقييمك (${stars} من 5)`,
      message: comment.trim()
        ? 'شكراً لملاحظتك — تساعدنا على تحسين الشرح.'
        : 'يمكنك إضافة ملاحظة مكتوبة في أي وقت لتحسين الشرح.',
      tone: 'success',
    });
  };

  const handleDelete = () => {
    removeFeedback(lessonId);
    setStars(0);
    setComment('');
    setEditing(true);
    showToast({ title: 'تم حذف تقييمك وملاحظتك', tone: 'info' });
  };

  const appendTag = (tag: string) => {
    setComment((prev) => (prev.trim() ? `${prev.trim()} — ${tag}` : tag));
  };

  return (
    <section className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-5 sm:p-7 shadow-sm space-y-5 text-right">
      {/* العنوان + المتوسط */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
            <span>تقييم محتوى وشرح الدرس</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            قيّم وضوح الشرح واكتب ملاحظتك — رأيك يساعدنا على تحسين الشرح والأمثلة.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-amber-50/70 dark:bg-[#132A48] border border-amber-200/80 dark:border-amber-400/30 px-4 py-2.5 rounded-2xl self-start sm:self-auto">
          <div className="text-right">
            <div className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white text-lg">
              <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                {stats.average.toFixed(1)}
              </span>
              <span className="text-slate-400 text-xs">/ 5</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              ({stats.total} تقييماً{stats.userRating ? ' · منهم تقييمك' : ''})
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i <= Math.round(stats.average)
                    ? 'text-amber-500 fill-amber-400'
                    : 'text-slate-200 dark:text-slate-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* تقييم الطالب المحفوظ */}
      {feedback && !editing && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/50 rounded-xl p-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              تقييمك المسجل: {feedback.rating} من 5
            </span>
            <span className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70">
              {new Date(feedback.updatedAt).toLocaleDateString('ar')}
            </span>
          </div>

          {feedback.comment ? (
            <div className="bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] rounded-xl p-3.5">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                ملاحظتك:
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {feedback.comment}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              لم تضف ملاحظة مكتوبة بعد — أضفها لتساعدنا على تحسين الشرح.
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#142A46] hover:bg-amber-50 dark:hover:bg-amber-950/30 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#21436F] min-h-[44px]"
            >
              <Pencil className="w-3.5 h-3.5" />
              تعديل التقييم أو الملاحظة
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-700/40 min-h-[44px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              حذف
            </button>
          </div>
        </div>
      )}

      {/* نموذج التقييم */}
      {editing && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
              ما تقييمك لشرح «{lessonTitle}»؟
            </p>
            <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-[#122844] rounded-2xl border border-slate-200 dark:border-[#1E3A60] w-fit">
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = (hovered ?? stars) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStars(n)}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(null)}
                    aria-label={`تقييم ${n} من 5`}
                    className="p-2 sm:p-2.5 rounded-xl hover:bg-amber-100/60 dark:hover:bg-amber-400/20 transition-all hover:scale-110 active:scale-95 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Star
                      className={`w-6 h-6 sm:w-7 sm:h-7 ${
                        filled ? 'text-amber-500 fill-amber-400' : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              {stars === 0
                ? 'اضغط على النجوم لاختيار تقييمك'
                : stars >= 4
                ? 'ممتاز — يسعدنا أن الشرح واضح'
                : stars === 3
                ? 'مقبول — أخبرنا ما الذي يحتاج تحسيناً'
                : 'نأسف — اكتب ملاحظتك وسنعمل على تحسين الشرح'}
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`feedback-${lessonId}`}
              className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
            >
              <MessageSquarePlus className="w-4 h-4 text-amber-500" />
              ملاحظاتك لتحسين الشرح (اختياري)
            </label>

            <div className="flex flex-wrap gap-1.5">
              {FEEDBACK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => appendTag(tag)}
                  className="px-3 py-1.5 min-h-[32px] inline-flex items-center rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-[#142A46] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#21436F] hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>

            <textarea
              id={`feedback-${lessonId}`}
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
              rows={3}
              placeholder="مثال: القاعدة واضحة لكن أحتاج مثالاً ثالثاً على التحليل، والمرفق لا يفتح…"
              className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-amber-400 resize-y leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                {comment.length}/{MAX_COMMENT} حرف
              </span>
              <div className="flex items-center gap-2">
                {feedback && (
                  <button
                    onClick={() => {
                      setStars(feedback.rating);
                      setComment(feedback.comment);
                      setEditing(false);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#142A46] min-h-[44px]"
                  >
                    إلغاء
                  </button>
                )}
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 min-h-[44px] transition-colors"
                >
                  حفظ التقييم والملاحظة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
        المتوسط الأساسي أعلاه أرقام تجريبية للعرض. تقييمك وملاحظتك محفوظان في جهازك فقط في هذه
        المرحلة (لا يوجد خادم بعد)، وستُرسل تلقائياً عند ربط قاعدة البيانات.
      </p>
    </section>
  );
};
