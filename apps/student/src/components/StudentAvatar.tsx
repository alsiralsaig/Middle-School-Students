import React from 'react';

/**
 * صورة الطالب: إن رفع صورة حقيقية (data URL أو رابط) تُعرض الصورة،
 * وإلا يظهر الحرف الأول من اسمه في دائرة. لا إيموجي ولا صور تجريبية.
 */
export const StudentAvatar: React.FC<{
  avatar?: string | null;
  name?: string | null;
  className?: string;
  textClassName?: string;
}> = ({ avatar, name, className = 'w-10 h-10', textClassName = 'text-sm' }) => {
  const isImage = typeof avatar === 'string' && /^(data:image\/|https?:\/\/)/.test(avatar);
  const letter = (name || '').trim().charAt(0) || 'ط';

  return (
    <span
      className={`${className} rounded-full overflow-hidden bg-[#0E2440] border border-[#27446C] inline-flex items-center justify-center shrink-0`}
    >
      {isImage ? (
        <img src={avatar as string} alt={name ? `صورة ${name}` : 'صورتك'} className="w-full h-full object-cover" />
      ) : (
        <span className={`${textClassName} font-black text-[#F1AC12]`}>{letter}</span>
      )}
    </span>
  );
};
