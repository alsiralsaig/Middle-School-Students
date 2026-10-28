import React from 'react';
import { Sun, CloudSun, Moon } from 'lucide-react';
import type { ShellTheme } from '../utils/theme';
import { THEME_LABEL } from '../utils/theme';

interface ThemeSwitchProps {
  theme: ShellTheme;
  onChange: (theme: ShellTheme) => void;
}

const OPTIONS: { id: ShellTheme; Icon: typeof Sun }[] = [
  { id: 'light', Icon: Sun },
  { id: 'medium', Icon: CloudSun },
  { id: 'dark', Icon: Moon },
];

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ theme, onChange }) => {
  return (
    <div
      className="flex items-center gap-0.5 rounded-lg p-0.5 border border-[var(--ssp-header-border)] bg-[var(--ssp-chip)]"
      role="radiogroup"
      aria-label="درجة الألوان"
    >
      {OPTIONS.map(({ id, Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            title={THEME_LABEL[id]}
            onClick={() => onChange(id)}
            className={`flex items-center gap-1 min-h-[28px] px-1.5 rounded-md text-[10px] font-black transition-colors ${
              active
                ? 'bg-[#F1AC12] text-[#071322]'
                : 'text-white/85 hover:text-white'
            }`}
          >
            <Icon className="w-3 h-3" />
            <span className="hidden sm:inline">{THEME_LABEL[id]}</span>
          </button>
        );
      })}
    </div>
  );
};
