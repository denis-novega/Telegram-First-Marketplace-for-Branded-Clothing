'use client';

import { useEffect, useMemo, useState } from 'react';

function sanitizeTg(v: string) {
  return (v || '').trim().replace(/^@+/, '').replace(/\s+/g, '');
}

export type EditFormDeps = {
  // загрузка профиля (mini: /api/me; core: supabase)
  load: () => Promise<
    | {
        ok: true;
        profile: {
          username?: string | null;
          name?: string | null;
          city?: string | null;
          telegram_username?: string | null;
          bio?: string | null;
        };
      }
    | { ok: false; reason?: string }
  >;
  // сохранение профиля (mini: /api/profile/update; core: supabase)
  save: (payload: {
    username: string;
    name: string;
    city: string;
    telegram_username: string;
    bio: string;
  }) => Promise<{ ok: true } | { ok: false; error?: string }>;
  // что делать после успеха
  onSaved: () => void;
  // что показать/сделать если юзер не авторизован
  onAuthRequired?: () => void; // опционально
};

export default function EditForm({ deps }: { deps: EditFormDeps }) {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [telegram, setTelegram] = useState('');
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  // A) флажок «нужна аутентификация»
  const [authRequired, setAuthRequired] = useState(false);

  // B) обновлённый useEffect загрузки
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      setAuthRequired(false);

      const resp = await deps.load();

      if (!alive) return;

      if (!resp.ok) {
        // профиля нет → покажем кнопку «войти через Telegram»
        setLoading(false);
        setAuthRequired(true);
        return;
      }

      const p = resp.profile || {};
      setUsername(p.username || '');
      setName(p.name || '');
      setCity(p.city || '');
      setTelegram(p.telegram_username || '');
      setBio(p.bio || '');
      setLoading(false);
    })();
    return () => {
      let _ = alive; // keep TS happy in some configs
      alive = false;
    };
  }, [deps]);

  const valid = useMemo(() => {
    const uOk = /^[a-z0-9_.]{3,20}$/i.test((username || '').trim());
    const t = sanitizeTg(telegram);
    const tgOk = t === '' || /^[a-z0-9_]{3,32}$/i.test(t);
    return uOk && tgOk && (name || '').trim().length > 0;
  }, [username, telegram, name]);

  async function handleSave() {
    if (saving || !valid) return;
    setSaving(true);
    setError('');
    setOk('');
    const resp = await deps.save({
      username: (username || '').trim(),
      name: (name || '').trim(),
      city: (city || '').trim(),
      telegram_username: sanitizeTg(telegram),
      bio: (bio || '').trim(),
    });
    setSaving(false);
    if (!resp.ok) {
      setError(resp.error || 'Ошибка сохранения');
      return;
    }
    setOk('Сохранено');
    // небольшая пауза, чтобы юзер увидел статус
    setTimeout(() => deps.onSaved(), 600);
  }

  // C) Инлайн-гейт (без редиректа) — перед основным return
  if (authRequired) {
    // Инлайн-логин: кнопка дергает /api/tg-auth, затем повторный load.
    async function loginViaTelegram() {
      try {
        // берем initData из Telegram SDK, если доступен;
        // если открыто в браузере — отправим без него: сервер сам решит (можно подсказать ошибку)
        const initData = (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) || '';
        const resp = await fetch('/api/tg-auth', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(initData ? { init_data: initData } : {}).toString(),
        });

        // после попытки логина — просто перезагрузим форму (без редиректов)
        // триггерим повторную загрузку, дернув deps.load() через смену стейта:
        // самый простой способ — принудительный reload (на dev это прозрачно)
        location.reload();
      } catch {
        // покажем мягкую ошибку — но не редиректим
        alert('Не удалось войти через Telegram. Открой через кнопку бота или попробуй ещё раз.');
      }
    }

    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="container mx-auto max-w-2xl px-4 py-12 text-center space-y-4">
          <h1 className="text-2xl font-semibold">Редактирование профиля</h1>
          <p className="text-sm text-zinc-500">
            Чтобы редактировать профиль, войдите через Telegram.
          </p>
          <button
            onClick={loginViaTelegram}
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Войти через Telegram
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <div className="h-6 w-40 bg-zinc-800/30 rounded mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-zinc-800/20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Редактирование профиля</h1>

        <div className="mt-6 grid gap-4">
          <Field label="Имя пользователя">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none
                         focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>

          <Field label="Имя">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none
                         focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>

          <Field label="Город">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none
                         focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>

          <Field label="Telegram">
            <div className="flex items-center gap-2">
              <span className="rounded-2xl border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700">@</span>
              <input
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none
                           focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </Field>

          <Field label="О себе">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none
                         focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        {ok && <p className="mt-4 text-sm text-emerald-500">{ok}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !valid}
            className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition
                       hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
          <button
            onClick={() => history.back()}
            className="rounded-2xl border border-zinc-300 px-5 py-2.5 text-sm transition hover:bg-zinc-100
                       dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Назад
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
