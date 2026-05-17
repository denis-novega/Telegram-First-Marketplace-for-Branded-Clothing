'use client';
import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase';
const supabase = getSupabaseBrowser();

export default function AdminVerifyToggle({
  profileId,
  currentValue,
}: {
  profileId: string;
  currentValue: boolean;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [value, setValue] = useState(currentValue);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', uid)
        .maybeSingle();
      setIsAdmin(!!data);
    })();
  }, []);

  async function toggle() {
    if (!isAdmin || busy) return;
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    const { error } = await supabase
      .from('profiles')
      .update({
        is_verified: !value,
        verified_at: !value ? new Date().toISOString() : null,
        verified_by: !value ? uid : null,
      })
      .eq('id', profileId);

    if (!error) setValue(!value);
    setBusy(false);
  }

  if (!isAdmin) return null;

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-2xl px-4 py-2 text-sm transition border
        ${value ? 'border-green-600 text-green-700 dark:border-green-500 dark:text-green-400' : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
      title={value ? 'Снять верификацию' : 'Выдать верификацию'}
    >
      {busy ? 'Сохраняем…' : value ? '✔️ Верифицирован' : 'Выдать верификацию'}
    </button>
  );
}
