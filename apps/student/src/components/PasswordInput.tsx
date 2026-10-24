import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * حقل كلمة مرور عليه «عين» تُظهر/تُخفي ما كُتب.
 * الطفل يكتب رقماً سرياً من ٤ أرقام — لو غلط في خانة ما يعرفها إلا إذا شافها.
 */
type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
  toggleClassName?: string;
};

export const PasswordInput: React.FC<Props> = ({ className = '', toggleClassName = '', ...rest }) => {
  const [show, setShow] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const visible = show || pressed;

  return (
    <div className="relative">
      <input
        {...rest}
        type={visible ? 'text' : 'password'}
        className={`${className} pl-11`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? 'إخفاء' : 'إظهار'}
        title={visible ? 'إخفاء' : 'إظهار'}
        onClick={() => setShow((v) => !v)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        className={`absolute left-1.5 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ${toggleClassName}`}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};
