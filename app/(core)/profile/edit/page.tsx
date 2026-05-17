'use client';

import { useEffect, useState, useMemo } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const supabase = getSupabaseBrowser();

// лениво грузим пикер ПВЗ (с картой)
const CdekPvzPicker = dynamic(() => import('@/components/CdekPvzPicker'), { ssr: false });

function sanitizeTg(v: string) {
  return v.trim().replace(/^@+/, '').replace(/\s+/g, '');
}

// Тип того, что реально лежит в profiles.default_delivery (json-колонка)
type DeliveryJson = {
  mode: 'PICKUP';
  carrier: 'CDEK';
  pvz_id: string;
  pvz_name: string;
  city: string;
  address: string;
  lat: number;
  lon: number;
};

// Узкая проверка, что json – это наш DeliveryJson
function isDeliveryJson(v: unknown): v is DeliveryJson {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    o['carrier'] === 'CDEK' &&
    typeof o['pvz_id'] === 'string' &&
    typeof o['pvz_name'] === 'string' &&
    typeof o['address'] === 'string'
  );
}

type DefaultDelivery = DeliveryJson | null;

export default function EditProfilePage() {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [telegram, setTelegram] = useState('');
  const [bio, setBio] = useState('');
  const [defaultDelivery, setDefaultDelivery] = useState<DefaultDelivery>(null);

  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const valid = useMemo(() => {
    const uOk = /^[a-z0-9_.]{3,20}$/i.test(username);
    const t = sanitizeTg(telegram);
    const tgOk = t === '' || /^[a-z0-9_]{3,32}$/i.test(t);
    return uOk && tgOk && name.trim().length > 0;
  }, [username, telegram, name]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        router.replace('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) {
        setError('Профиль не найден');
        return;
      }

      setUsername(data.username || '');
      setName(data.name || '');
      setCity(data.city || '');
      setTelegram(data.telegram_username || '');
      setBio((data as any).bio || ''); // bio может отсутствовать в типах — подстрахуемся

      // подтягиваем сохранённый ПВЗ (если есть и валидный json)
      const dd = (data as any).default_delivery as unknown;
      if (isDeliveryJson(dd)) {
        setDefaultDelivery({
          mode: 'PICKUP',
          carrier: 'CDEK',
          pvz_id: dd.pvz_id,
          pvz_name: dd.pvz_name,
          city: dd.city,
          address: dd.address,
          lat: dd.lat,
          lon: dd.lon,
        });
      } else {
        setDefaultDelivery(null);
      }
    })();
  }, [router]);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setOk('');

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      setError('Сессия истекла.');
      setLoading(false);
      return;
    }

    const payload: Record<string, any> = {
      username: username.trim(),
      name: name.trim(),
      city: city.trim(),
      telegram_username: sanitizeTg(telegram),
      bio: bio.trim(),
      // сохраняем/очищаем default_delivery (json)
      default_delivery: defaultDelivery ? defaultDelivery : null,
    };

    const { error } = await supabase.from('profiles').update(payload).eq('user_id', user.id);

    if (error) {
      setError('Ошибка сохранения: ' + error.message);
    } else {
      setOk('Сохранено');
      setTimeout(() => router.replace('/profile/me'), 800);
    }
    setLoading(false);
  };

  // для CdekPvzPicker нужно сформировать defaultValue из нашего defaultDelivery
  const pickerDefault =
    defaultDelivery
      ? {
          code: defaultDelivery.pvz_id,
          name: defaultDelivery.pvz_name,
          address: defaultDelivery.address,
          lat: defaultDelivery.lat,
          lon: defaultDelivery.lon,
        }
      : null;

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
                           focus:ring-2 focus:ring-indigo-500 dark:border-зinc-700 dark:bg-зinc-900"
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

          {/* ПВЗ СДЭК по умолчанию */}
          <div className="pt-2">
            <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-400">
              Пункт выдачи СДЭК (по умолчанию)
            </label>

            <div className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
              <CdekPvzPicker
                defaultCity={city || 'Москва'}
                defaultValue={pickerDefault}
                onChange={(pvz: DeliveryJson | null) => {
                  if (!pvz) {
                    setDefaultDelivery(null);
                    return;
                  }
                  setDefaultDelivery({
                    mode: 'PICKUP',
                    carrier: 'CDEK',
                    pvz_id: pvz.pvz_id,
                    pvz_name: pvz.pvz_name,
                    city: (city || '').trim(),
                    address: pvz.address,
                    lat: pvz.lat ?? 0,
                    lon: pvz.lon ?? 0,
                  });
                }}
              />

              <div className="mt-3 flex items-center justify-between">
                {defaultDelivery ? (
                  <div className="text-sm">
                    <div className="font-medium">{defaultDelivery.pvz_name}</div>
                    <div className="text-zinc-500">{defaultDelivery.address}</div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">ПВЗ не выбран.</p>
                )}

                {defaultDelivery && (
                  <button
                    type="button"
                    onClick={() => setDefaultDelivery(null)}
                    className="ml-3 rounded--xl border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100
                               dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Сбросить ПВЗ
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        {ok && <p className="mt-4 text-sm text-emerald-500">{ok}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading || !valid}
            className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition
                       hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {loading ? 'Сохранение…' : 'Сохранить'}
          </button>
          <button
            onClick={() => history.back()}
            className="rounded-2xl border border-zinc-300 px-5 py-2.5 text-sm transition hover:bg-зinc-100
                       dark:border-zinc-700 dark:hover:bg-зinc-800"
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
