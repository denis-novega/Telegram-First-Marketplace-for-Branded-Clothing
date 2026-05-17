'use client';

import { useEffect, useMemo } from 'react';

type Props = {
  onClose: () => void;
  title?: string;
  lines?: string[];
  buttonText?: string;
};

export default function WelcomeOverlay({
  onClose,
  title = 'Добро пожаловать в Эхо Маркет',
  lines = [
    'Покупайте и продавайте вещи быстро и удобно.',
    'Сервис сейчас в открытой бета-версии — мы активно добавляем новые возможности.',
  ],
  buttonText = 'Открыть Эхo',
}: Props) {
  // Телеграм тема → акцент (синий)
  const accent = useAccentColor();

  // ESC закрывает
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center bg-black/65"
      role="dialog" aria-modal="true" aria-label="Добро пожаловать"
      onClick={onClose}
    >
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes rise    { from { transform: translateY(10px); opacity: .0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes glow    { 0%,100% { opacity:.8 } 50% { opacity:1 } }
        @keyframes pulseBg { 0%,100% { transform: scale(1); opacity:.12 } 50% { transform: scale(1.06); opacity:.2 } }
      `}</style>

      {/* backdrop click closes, card click stops */}
      <div
        className="relative w-[min(92vw,560px)] rounded-2xl border border-zinc-800 bg-[#0f0f10]/95 shadow-[0_10px_40px_rgba(0,0,0,.45)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'rise .22s ease-out' }}
      >
        {/* Акцентные «ауры» */}
        <div
          className="pointer-events-none absolute -inset-20 blur-3xl"
          style={{ background: `radial-gradient(800px 400px at 50% -20%, ${accent} 0%, transparent 60%)`, animation: 'pulseBg 6s ease-in-out infinite' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -inset-10 blur-[72px] opacity-80"
          style={{ background: `radial-gradient(600px 300px at 110% 120%, ${accent} 0%, transparent 55%)` }}
          aria-hidden
        />

        {/* Контент */}
        <div className="relative p-6 sm:p-8">
          {/* мини-логотип */}
          <div className="mb-2 inline-flex select-none items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 16px ${accent}` }}
              aria-hidden
            />
            <span className="text-zinc-300 tracking-wide text-xs uppercase">эхо!</span>
          </div>

          <h1 className="text-2xl sm:text-[28px] font-semibold leading-tight text-zinc-50">
            {title}
          </h1>

          <div className="mt-3 space-y-1.5">
            {lines.map((t, i) => (
              <p
                key={i}
                className="text-sm sm:text-[15px] text-zinc-300/95"
                style={{ animation: `fadeIn .25s ease-out ${0.08 + i * 0.12}s both, rise .25s ease-out ${0.08 + i * 0.12}s both` }}
              >
                {t}
              </p>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center">
            <button
              onClick={onClose}
              className="relative inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-[15px] font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-0"
              style={{
                background: accent,
                boxShadow: `0 6px 24px ${toShadow(accent, .45)}, inset 0 -2px 0 rgba(0,0,0,.2)`,
                animation: 'glow 2.2s ease-in-out infinite',
              }}
              autoFocus
              aria-label={buttonText}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Берём кнопку/акцент из Telegram themeParams, иначе — системный синий */
function useAccentColor() {
  return useMemo(() => {
    const wa = (typeof window !== 'undefined' ? (window as any)?.Telegram?.WebApp : undefined);
    const t = wa?.themeParams || {};
    // приоритет: button_color → hint_color → link_color → fallback
    const c = t.button_color || t.hint_color || t.link_color || '#3b82f6'; // Tailwind blue-500
    return normalizeColor(c);
  }, []);
}

/** Нормализуем Telegram hex/int в css-цвет */
function normalizeColor(c: any): string {
  if (!c) return '#3b82f6';
  if (typeof c === 'number') {
    const hex = '#' + c.toString(16).padStart(6, '0');
    return hex;
  }
  // ожидаем #rrggbb или rgb/rgba — пропускаем как есть
  return String(c);
}

function toShadow(hex: string, a = 0.35) {
  // конвертируем #rrggbb → rgba
  if (/^#([0-9a-f]{6})$/i.test(hex)) {
    const m = hex.match(/^#(..)(..)(..)$/i)!;
    const r = parseInt(m[1], 16);
    const g = parseInt(m[2], 16);
    const b = parseInt(m[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return 'rgba(59,130,246,.35)'; // fallback blue-500
}
