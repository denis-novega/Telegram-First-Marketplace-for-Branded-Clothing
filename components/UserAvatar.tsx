'use client';

import Image from 'next/image';
import * as React from 'react';

function hashToHue(seed: string) {
  // простой стабильный хэш → 0..360
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

export default function UserAvatar({
  src,
  alt = 'avatar',
  seed,
  size = 48,              // px
  className = '',
  rounded = 'full',       // 'full' | 'xl'
  showInitial = true,     // показывать инициал, если нет аватара
  initialFrom,            // строка, из которой взять первую букву (username/имя)
}: {
  src?: string | null;
  alt?: string;
  seed: string;           // user_id или username — используется для стабильного цвета
  size?: number;
  className?: string;
  rounded?: 'full' | 'xl';
  showInitial?: boolean;
  initialFrom?: string | null;
}) {
  const hue = hashToHue(seed || 'echo');
  const bg = `hsl(${hue} 65% 55% / 1)`;
  const radius = rounded === 'full' ? 'rounded-full' : 'rounded-xl';

  return (
    <div
      className={`relative overflow-hidden ${radius} ${className}`}
      style={{ width: size, height: size, background: src ? undefined : bg }}
      aria-label={alt}
    >
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" sizes={`${size}px`} />
      ) : showInitial && initialFrom ? (
        <span className="absolute inset-0 grid place-items-center text-white/95 font-semibold">
          {initialFrom.trim().charAt(0).toUpperCase()}
        </span>
      ) : null}
    </div>
  );
}
