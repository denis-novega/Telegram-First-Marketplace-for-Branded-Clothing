// echo-core/app/mini/product/[id]/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import CoreProductPage from '../../../(core)/product/[id]/page';

function goBackSmart() {
  // 1) если есть история внутри Mini App — обычный back
  if (typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back();
    return;
  }
  // 2) иначе пробуем вернуть в последнюю «ленту» с фильтрами
  const last = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('mini:lastFeedURL')
    : null;

  if (last) {
    window.location.replace(last);
  } else {
    // 3) финальный фоллбэк — на главную мини-ленты
    window.location.replace('/mini');
  }
}

export default function MiniProductPage() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wa = (window as any)?.Telegram?.WebApp;

    // === Нативная кнопка "Назад" в шапке Telegram ===
    // Появляется только в Mini App; в браузере не мешает
    try {
      const backBtn = wa?.BackButton;
      if (backBtn?.show && backBtn?.onClick) {
        backBtn.show();
        const off = backBtn.onClick(goBackSmart);
        // Чистим по уходу со страницы
        return () => {
          try { off?.(); } catch {}
          try { backBtn.hide?.(); } catch {}
        };
      }
    } catch {}

    return;
  }, []);

  // === Свайп-назад от левого края (мягкий fallback) ===
  useEffect(() => {
    const el = rootRef.current ?? document.body;
    let tracking = false, startX = 0, startY = 0;

    const onPointerDown = (e: PointerEvent) => {
      // стартуем жест, только если палец у левого края (<= 24px)
      if (e.clientX > 24) return;
      tracking = true;
      startX = e.clientX;
      startY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!tracking) return;
      const dx = e.clientX - startX;
      const dy = Math.abs(e.clientY - startY);
      tracking = false;
      // горизонтальный смах вправо на 60px — назад
      if (dx > 60 && dy < 40) goBackSmart();
    };

    el.addEventListener('pointerdown', onPointerDown, { passive: true });
    el.addEventListener('pointerup', onPointerUp, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  return (
    <div ref={rootRef}>
      <CoreProductPage />
    </div>
  );
}
