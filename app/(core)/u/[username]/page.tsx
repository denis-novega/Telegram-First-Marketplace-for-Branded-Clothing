'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase';
import LikeButtonProfile from '@/components/LikeButtonProfile';
import LikeButtonProduct from '@/components/LikeButtonProduct';
import AdminVerifyToggle from '@/components/AdminVerifyToggle';

type Profile = {
  id: string;
  user_id: string;
  username: string;
  name: string | null;
  city: string | null;
  avatar?: string | null;
  created_at: string;
  bio?: string | null;
  telegram_username?: string | null;
  is_verified?: boolean | null;
};

type Product = {
  id: string;
  title: string;
  brand?: string | null;
  price: number;
  images?: string[] | null;
  created_at?: string;
  user_id?: string;
};

const supabase = getSupabaseBrowser();

export default function UserProfilePage() {
  const params = useParams();
  const username = (params?.username as string) || '';
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fmt = useMemo(
    () => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }),
    []
  );

  useEffect(() => {
    if (!username) return;

    (async () => {
      setLoading(true);
      setNotFound(false);

      // 1) профиль по @username
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error || !prof) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const p = prof as Profile;
      setProfile(p);

      // 2) товары этого пользователя
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', p.user_id)
        .order('created_at', { ascending: false });

      setItems((products || []) as Product[]);
      setLoading(false);
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-screen-2xl px-4 py-10 md:px-6">
        <SkeletonHeader />
        <div className="mt-8">
          <SkeletonGrid />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="container mx-auto max-w-screen-2xl px-4 py-10 text-center md:px-6">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-8">
          <h1 className="text-2xl font-semibold">Профиль не найден</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Пользователь @{username} отсутствует или скрыт.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-2xl bg-zinc-900 px-5 py-2.5 text-white dark:bg-white dark:text-zinc-950"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  const joined = new Date(profile.created_at);

  return (
    <div className="container mx-auto max-w-screen-2xl px-4 py-8 md:px-6">
      {/* шапка профиля */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative h-28 w-full bg-gradient-to-r from-zinc-100 to-white dark:from-zinc-900 dark:to-zinc-950 md:h-36" />

        <div className="px-4 pb-5 md:px-6">
          <div className="-mt-10 flex items-end gap-4 md:-mt-12">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-white shadow-sm dark:border-zinc-900 md:h-24 md:w-24">
              <Image
                src={profile.avatar || '/avatar-placeholder.png'}
                alt="Аватар"
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-[-0.01em] md:text-2xl">
                {profile.name || profile.username}
                {profile.is_verified && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                    ✔️ Верифицирован
                  </span>
                )}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <span>@{profile.username}</span>
                {profile.city && <span>• {profile.city}</span>}
                <span>• c {joined.toLocaleDateString('ru-RU')}</span>
              </div>
              {profile.bio && (
                <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">{profile.bio}</p>
              )}
            </div>

            <div className="ml-auto hidden items-center gap-2 md:flex">
              <LikeButtonProfile profileId={profile.id} ownerUserId={profile.user_id} />
              <AdminVerifyToggle profileId={profile.id} currentValue={!!profile.is_verified} />
              {profile.telegram_username && (
                <a
                  href={`https://t.me/${profile.telegram_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  Написать в Telegram
                </a>
              )}
            </div>
          </div>

          {/* кнопки (мобилка) */}
          <div className="mt-4 flex gap-2 md:hidden">
            <LikeButtonProfile profileId={profile.id} ownerUserId={profile.user_id} />
            {profile.telegram_username && (
              <a
                href={`https://t.me/${profile.telegram_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-2xl bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
              >
                Написать в Telegram
              </a>
            )}
          </div>

          {/* счётчики */}
          <div className="mt-5 grid grid-cols-2 gap-2 md:gap-4">
            <Stat label="Объявления" value={items.length} />
            <Stat label="Лайки" value="—" />
          </div>
        </div>
      </section>

      {/* список объявлений */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold md:text-xl">Объявления пользователя</h2>
          {items.length > 0 && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{items.length} шт.</span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="text-zinc-600 dark:text-zinc-400">Пока нет активных объявлений.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
            {items.map((p) => (
              <Link key={p.id} href={`/product/${p.id}`} className="group">
                <article className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                  {/* компактный лайк в углу карточки */}
                  <div className="absolute right-3 top-3 z-10">
                    <LikeButtonProduct productId={p.id} ownerUserId={p.user_id} compact />
                  </div>

                  <div className="relative w-full overflow-hidden">
                    <Image
                      src={p.images?.[0] || '/file.svg'}
                      alt={p.title}
                      width={1200}
                      height={900}
                      className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="space-y-1.5 p-4">
                    {p.brand ? (
                      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{p.brand}</p>
                    ) : (
                      <span className="block h-4" />
                    )}
                    <h3 className="line-clamp-1 text-base font-medium md:text-lg">{p.title}</h3>
                    <p className="text-sm font-semibold">{fmt.format(p.price || 0)}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ui helpers */

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center dark:border-zinc-800 dark:bg-zinc-900 md:p-4">
      <div className="text-xl font-semibold md:text-2xl">{value}</div>
      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 md:text-sm">{label}</div>
    </div>
  );
}

function SkeletonHeader() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="h-28 w-full animate-pulse bg-zinc-100 dark:bg-zinc-800 md:h-36" />
      <div className="px-4 pb-5 md:px-6">
        <div className="-mt-10 flex items-end gap-4 md:-mt-12">
          <div className="h-20 w-20 animate-pulse rounded-full border-4 border-white bg-zinc-200 dark:border-zinc-900 dark:bg-zinc-800 md:h-24 md:w-24" />
          <div className="flex-1">
            <div className="mb-2 h-5 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-72 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 md:gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800 md:h-20" />
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="aspect-[4/3] w-full animate-pulse bg-zinc-100 dark:bg-zinc-800" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-4 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-5 w-1/3 rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
