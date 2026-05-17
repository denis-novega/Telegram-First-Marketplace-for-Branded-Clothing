'use client';

import { useRouter } from 'next/navigation';
import EditForm, { type EditFormDeps } from '@/components/profile/EditForm';

export default function EditMini() {
  const router = useRouter();

  const deps: EditFormDeps = {
    // грузим профиль через наш API (кука tg_pid)
    load: async () => {
      try {
        const r = await fetch('/api/me/edit', { credentials: 'include', cache: 'no-store' });
        const j = await r.json();
        // НЕ редиректим! Просто скажем форме, что auth нет — она покажет кнопку.
        if (!j?.ok || !j.profile) return { ok: false, reason: 'NO_AUTH' };
        return { ok: true, profile: j.profile };
      } catch {
        return { ok: false, reason: 'NETWORK' };
      }
    },

    // сохраняем через service-route
    save: async (payload) => {
      try {
        const r = await fetch('/api/profile/update', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const j = await r.json();
        return j?.ok ? { ok: true } : { ok: false, error: j?.error || 'SAVE_FAILED' };
      } catch {
        return { ok: false, error: 'NETWORK' };
      }
    },

    // после успеха возвращаемся на профиль
    onSaved: () => router.replace('/mini/profile/me'),

    // ВНИМАНИЕ: больше ничего не делаем. Никаких replace здесь!
    onAuthRequired: undefined,
  };

  return <EditForm deps={deps} />;
}
