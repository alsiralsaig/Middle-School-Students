import React, { useRef, useState } from 'react';
import { Camera, Check, KeyRound, Loader2, LogOut, Phone, User, X } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/apiClient';
import { getApiBase } from '../utils/serverUrl';
import { sessionStore, logout as logoutFromServer } from '../utils/sessionStore';
import { PasswordInput } from './PasswordInput';

/**
 * «حسابي» — صفحة الطالب الشخصية.
 *
 * لماذا أُعيدت كتابتها: كانت نافذة «حسابات الطلاب» تعرض ثلاثة حسابات تجريبية
 * (أحمد، فاطمة، عمر) بإيموجي، ويستطيع أي طالب التبديل بينها — فيرى بيانات
 * غيره ويظنّ أن المنصة مشتركة. الآن: حساب واحد فقط = صاحب الجلسة، وصورته
 * الشخصية يرفعها بنفسه بدل الإيموجي.
 */
export const AccountManagerModal: React.FC = () => {
  const { user } = useSession();
  const { activeAccount, updateActiveAccount, isAccountModalOpen, setIsAccountModalOpen } = useAccount();

  const [name, setName] = useState(user?.name || '');
  const [photo, setPhoto] = useState<string | null>(user?.avatar || null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // الرقم السري
  const [pinMode, setPinMode] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinNote, setPinNote] = useState('');

  if (!isAccountModalOpen) return null;

  const close = () => {
    setIsAccountModalOpen(false);
    setNote(''); setError(''); setPinMode(false); setPinNote('');
    setCurrentPin(''); setNewPin('');
  };

  /**
   * ضغط الصورة في المتصفح قبل الرفع: ٢٥٦×٢٥٦ JPG.
   * صورة الجوال الأصلية ٣–٥ ميجا؛ بعد هذا ~٢٥ كيلوبايت، فتُحمّل فوراً
   * ولا تُثقل القاعدة، وتكفي لعرض دائري في الهيدر.
   */
  const pickPhoto = async (file: File) => {
    setError(''); setNote('');
    if (!file.type.startsWith('image/')) {
      setError('اختر صورة من معرض الجوال');
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('read'));
        reader.readAsDataURL(file);
      });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('decode'));
        el.src = dataUrl;
      });
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      // قصّ مربّع من مركز الصورة
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      const compressed = canvas.toDataURL('image/jpeg', 0.82);
      setPhoto(compressed);
      await save({ avatar: compressed }, 'تم حفظ صورتك ✓');
    } catch {
      setError('تعذّر قراءة الصورة — جرّب صورة أخرى');
    }
  };

  const save = async (patch: { name?: string; avatar?: string }, successNote: string) => {
    setBusy(true); setError('');
    try {
      const { user: updated } = await api.updateMe(patch);
      sessionStore.setUser(updated);
      updateActiveAccount({
        ...(patch.name ? { name: patch.name } : {}),
        ...(patch.avatar ? { avatar: patch.avatar } : {}),
      });
      setNote(successNote);
    } catch (e) {
      const err = e as { status?: number; message?: string };
      setError(err.status === 401 ? 'انتهت الجلسة — سجّل دخول من جديد' : err.message || 'تعذّر الحفظ');
    } finally {
      setBusy(false);
    }
  };

  const submitName = async () => {
    if (name.trim().length < 3) { setError('الاسم ٣ أحرف على الأقل'); return; }
    if (name.trim() === user?.name) { setNote('الاسم كما هو'); return; }
    await save({ name: name.trim() }, 'تم تحديث اسمك ✓');
  };

  const submitPin = async () => {
    setPinNote(''); setError('');
    if (!/^[0-9]{4,6}$/.test(newPin)) { setPinNote('الرقم الجديد ٤ إلى ٦ أرقام'); return; }
    setPinBusy(true);
    try {
      const res = await fetch(`${getApiBase()}/api/auth/password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-App': 'student' },
        body: JSON.stringify({ currentPassword: currentPin, newPassword: newPin }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || 'تعذّر تغيير الرقم السري');
      setPinNote('تم تغيير رقمك السري ✓ — احفظه في مكان آمن');
      setCurrentPin(''); setNewPin('');
    } catch (e) {
      setPinNote(e instanceof Error ? e.message : 'تعذّر تغيير الرقم السري');
    } finally {
      setPinBusy(false);
    }
  };

  const displayedPhoto = photo || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs" dir="rtl">
      <div className="bg-[#0B1E36] border border-[#1E3A60] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* الرأس */}
        <div className="px-5 py-4 border-b border-[#1E3A60] flex items-center justify-between bg-[#08172B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">حسابي</h3>
              <p className="text-[11px] text-slate-400">بياناتك وصورتك — تظهر لك فقط</p>
            </div>
          </div>
          <button onClick={close} aria-label="إغلاق" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#162D4A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* الصورة الشخصية */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[#F1AC12]/60 bg-[#0E2440] flex items-center justify-center group"
              aria-label="تغيير الصورة الشخصية"
            >
              {displayedPhoto ? (
                <img src={displayedPhoto} alt="صورتك" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">{activeAccount.avatar && activeAccount.avatar.length <= 8 ? activeAccount.avatar : '🎓'}</span>
              )}
              <span className="absolute inset-x-0 bottom-0 h-8 bg-black/55 flex items-center justify-center gap-1 text-[10px] font-bold text-white">
                <Camera className="w-3.5 h-3.5" /> تغيير
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickPhoto(f);
                e.target.value = '';
              }}
            />
            <p className="text-[11px] text-slate-400">صورة من معرض جوالك — تُضغط تلقائياً</p>
          </div>

          {/* الاسم */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1.5">اسمك</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[44px] rounded-xl bg-[#0E2440] border border-[#1B3658] px-3.5 text-sm text-white focus:outline-none focus:border-[#F1AC12]/70"
            />
          </div>

          {/* بيانات للقراءة */}
          <div className="rounded-xl bg-[#08182B] border border-[#1A375A] p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> رقم الدخول</span>
              <span className="text-white font-bold nums" dir="ltr">{user?.phone || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-slate-400">الصف</span>
              <span className="text-white font-bold">{user?.grade || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-slate-400">المدرسة</span>
              <span className="text-white font-bold">{user?.school || '—'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={submitName}
            disabled={busy}
            className="w-full min-h-[46px] rounded-xl bg-[#F1AC12] text-[#071322] font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            حفظ التغييرات
          </button>

          {note && (
            <p className="text-[12px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2">{note}</p>
          )}
          {error && (
            <p className="text-[12px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* تغيير الرقم السري */}
          <div className="border-t border-[#1E3A60] pt-4">
            {!pinMode ? (
              <button
                type="button"
                onClick={() => setPinMode(true)}
                className="w-full min-h-[42px] rounded-xl bg-[#0E2440] border border-[#1B3658] text-[12px] font-bold text-slate-200 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" /> تغيير الرقم السري
              </button>
            ) : (
              <div className="space-y-2.5">
                <PasswordInput
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="الرقم السري الحالي"
                  inputMode="numeric"
                  className="w-full min-h-[42px] rounded-xl bg-[#0E2440] border border-[#1B3658] px-3 text-sm text-white"
                />
                <PasswordInput
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="الرقم السري الجديد (٤–٦ أرقام)"
                  inputMode="numeric"
                  className="w-full min-h-[42px] rounded-xl bg-[#0E2440] border border-[#1B3658] px-3 text-sm text-white"
                />
                {pinNote && <p className="text-[11px] text-amber-300">{pinNote}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={submitPin}
                    disabled={pinBusy}
                    className="flex-1 min-h-[40px] rounded-xl bg-emerald-600 text-white text-[12px] font-bold disabled:opacity-60"
                  >
                    {pinBusy ? 'لحظة…' : 'تأكيد التغيير'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPinMode(false); setPinNote(''); }}
                    className="px-4 min-h-[40px] rounded-xl bg-[#0E2440] border border-[#1B3658] text-[12px] text-slate-300"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* خروج */}
          <button
            type="button"
            onClick={async () => { await logoutFromServer(); close(); }}
            className="w-full min-h-[42px] rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-[12px] font-bold flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
};
