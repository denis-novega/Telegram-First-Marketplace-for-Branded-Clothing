'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const supabase = getSupabaseBrowser();

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setLoading(false);

    if (error) {
      setError('Ошибка: ' + error.message);
    } else {
      setSuccess(true);
      router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-8">
        <h1 className="text-center text-2xl font-semibold tracking-tight">Вход в Эхо</h1>
        <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Введите email — отправим 6-значный код
        </p>

        <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none
                       placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500
                       dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            autoComplete="email"
            required
          />

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full rounded-2xl bg-zinc-900 px-5 py-3 text-base font-medium text-white transition
                       hover:bg-zinc-800 disabled:opacity-50
                       dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {loading ? 'Отправляем…' : 'Получить код'}
          </button>
        </form>

        {error && <p className="mt-4 text-center text-sm text-red-500">{error}</p>}
        {success && (
          <p className="mt-4 text-center text-sm text-green-500">Код отправлен! Проверь почту 📩</p>
        )}
      </div>
    </div>
  );
}
