'use client';
import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase';
const supabase = getSupabaseBrowser();

export default function LikeButtonProfile({
  profileId,
  ownerUserId,
}: {
  profileId: string;
  ownerUserId?: string;
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [self, setSelf] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth?.user?.id;
      if (me && ownerUserId && me === ownerUserId) setSelf(true);

      if (me) {
        const { data } = await supabase
          .from('profile_likes')
          .select('profile_id')
          .eq('profile_id', profileId)
          .eq('liker_user_id', me)
          .maybeSingle();
        setLiked(!!data);
      }

      const { count } = await supabase
        .from('profile_likes')
        .select('profile_id', { count: 'exact', head: true })
        .eq('profile_id', profileId);
      setCount(count ?? 0);
    })();
  }, [profileId, ownerUserId]);

  async function toggle() {
    if (busy || self) return;
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const me = auth?.user?.id;
    if (!me) {
      window.location.href = '/auth';
      return;
    }
    if (liked) {
      await supabase.from('profile_likes').delete().eq('profile_id', profileId).eq('liker_user_id', me);
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));
    } else {
      const { error } = await supabase
        .from('profile_likes')
        .insert({ profile_id: profileId, liker_user_id: me });
      if (!error) {
        setLiked(true);
        setCount((c) => c + 1);
      }
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy || self}
      className={`rounded-2xl border px-4 py-2 text-sm transition
        ${liked ? 'border-pink-600 text-pink-600 dark:border-pink-500 dark:text-pink-400' : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'}
        ${self ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={self ? 'Нельзя лайкать свой профиль' : liked ? 'Убрать лайк' : 'Поставить лайк'}
    >
      {liked ? '❤️ Лайк' : '🤍 Лайк'} ({count})
    </button>
  );
}
