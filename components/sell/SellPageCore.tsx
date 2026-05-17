// components/sell/SellPageCore.tsx
'use client';

import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import Image from 'next/image';
import { getSupabaseBrowser } from '@/lib/supabase';

export type Category = 'clothing' | 'sneakers' | 'accessories';
export type Gender = 'men' | 'women' | 'unisex';
export type Condition = 'new' | 'like_new' | 'good' | 'fair';

export type SellPageDeps = {
  ensureAuthed: () => Promise<void>;
  submit: (payload: {
    title: string;
    price: number;
    brand?: string | null;
    category?: Category | null;
    gender?: Gender | null;
    size?: string | null;
    condition?: Condition | null;
    images: string[];
    description?: string | null;
  }) => Promise<void>;
  onSuccessRedirect: (url: string) => void;
  uploadFile?: (file: File) => Promise<string>;
};

// простая задержка ввода
function useDebounced<T>(value: T, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// безопасное имя файла для Storage
function sanitizeFilename(name: string) {
  const dot = name.lastIndexOf('.');
  const base = dot > -1 ? name.slice(0, dot) : name;
  const ext = dot > -1 ? name.slice(dot).toLowerCase() : '';
  const safeBase =
    (base
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._\-\s]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .slice(0, 80)) || 'file';
  const safeExt = ext.replace(/[^a-z0-9.]/g, '') || '.jpg';
  return `${safeBase}${safeExt}`;
}

type Preview = {
  id: string;      // стабильный ключ для dnd
  file: File;
  url: string;     // objectURL
};

export default function SellPageCore({ deps }: { deps: SellPageDeps }) {
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    deps.ensureAuthed().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Базовое
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<Condition>('good');
  const [description, setDescription] = useState('');

  // Фильтры/категория
  const [category, setCategory] = useState<Category>('clothing');
  const [gender, setGender] = useState<Gender>('unisex');
  const [apparelSize, setApparelSize] = useState('');
  const [shoeSize, setShoeSize] = useState('');

  // Автокомплит бренда
  const [brandQuery, setBrandQuery] = useState('');
  const [brandOptions, setBrandOptions] = useState<any[]>([]);
  const [brandOpen, setBrandOpen] = useState(false);
  const debounced = useDebounced(brandQuery, 200);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!debounced) {
        setBrandOptions([]);
        return;
      }
      try {
        const r = await fetch(`/api/brand-search?q=${encodeURIComponent(debounced)}`);
        const j = await r.json();
        if (alive) setBrandOptions(j.items || []);
      } catch {
        if (alive) setBrandOptions([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [debounced]);

  // Фото — drag&drop + превью + сортировка + удаление
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragFromIndexRef = useRef<number | null>(null);

  // формат цены
  const fmt = useMemo(
    () =>
      new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0,
      }),
    []
  );

  // универсальное добавление файлов (из input/dnd)
  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;

    const onlyImages = arr.filter((f) => f.type.startsWith('image/'));
    const deduped = onlyImages.filter((f) => {
      // простая дедупликация по name+size (нормально для локального UX)
      return !previews.some((p) => p.file.name === f.name && p.file.size === f.size);
    });

    if (!deduped.length) return;

    const next: Preview[] = deduped.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      url: URL.createObjectURL(file),
    }));

    setPreviews((old) => {
      const merged = [...old, ...next].slice(0, 8); // лимит 8
      // если превысили лимит — подчистим лишние objectURL
      if (old.length + next.length > 8) {
        next.slice(8 - old.length).forEach((p) => URL.revokeObjectURL(p.url));
      }
      return merged;
    });

    // сбрасываем value, чтобы можно было выбрать тот же файл снова
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files || []);
  };

  // dnd контейнер
  const onDragOverZone = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const onDragLeaveZone = (e: React.DragEvent) => {
    // игнорируем уход на дочерние
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragActive(false);
  };
  const onDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  };

  // удаление одной
  const removeAt = (idx: number) => {
    setPreviews((arr) => {
      const copy = [...arr];
      const [removed] = copy.splice(idx, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return copy;
    });
  };

  // очистить все
  const clearAll = () => {
    setPreviews((arr) => {
      arr.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // сортировка (html5 drag & drop без либ)
  const onItemDragStart = (idx: number) => () => {
    dragFromIndexRef.current = idx;
  };
  const onItemDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
  };
  const onItemDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragFromIndexRef.current;
    dragFromIndexRef.current = null;
    if (from === null || from === idx) return;
    setPreviews((arr) => {
      const copy = [...arr];
      const [moved] = copy.splice(from, 1);
      copy.splice(idx, 0, moved);
      return copy;
    });
  };

  // сабмит
  const validate = () => {
    if (!title.trim()) return 'Укажи название';
    if (!price || isNaN(Number(price)) || Number(price) <= 0) return 'Укажи корректную цену';
    if (!brand.trim()) return 'Укажи бренд';
    if (category === 'clothing' && !apparelSize.trim()) return 'Размер одежды обязателен';
    if (category === 'sneakers' && !shoeSize.trim()) return 'Размер кроссовок обязателен';
    return '';
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await deps.ensureAuthed().catch(() => {});

      // userId (для path)
      let userId: string | 'anon' = 'anon';
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) userId = data.user.id;
      } catch {}

      const bucket = 'product-images';
      let imageUrls: string[] = [];

      if (previews.length > 0) {
        const files = previews.map((p) => p.file);

        if (deps.uploadFile) {
          const uploads = files.map(async (file) => {
            const url = await deps.uploadFile!(file);
            if (!url) throw new Error('Ошибка загрузки изображения');
            return url;
          });
          imageUrls = await Promise.all(uploads);
        } else {
          const uploads = files.map(async (file) => {
            const safeName = sanitizeFilename(file.name);
            const filePath = `${userId}/${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}-${safeName}`;

            const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || 'image/jpeg',
              });

            if (uploadError) {
              console.error('[sell] upload error', uploadError);
              throw new Error('Ошибка загрузки изображения');
            }

            const { data: pub } = supabase.storage.from(bucket).getPublicUrl(filePath);
            return pub?.publicUrl || '';
          });

          imageUrls = await Promise.all(uploads);
        }
      }

      const size =
        category === 'clothing' ? apparelSize || null : category === 'sneakers' ? shoeSize || null : null;

      await deps.submit({
        title: title.trim(),
        price: Number(price),
        brand: brand.trim(),
        category,
        gender,
        size,
        condition,
        images: imageUrls,
        description: (description || '').trim() || null,
      });

      // чистим objectURL после успешной загрузки
      clearAll();

      const isMini = typeof window !== 'undefined' && !!(window as any).Telegram?.WebApp;
      deps.onSuccessRedirect(isMini ? '/mini/sell/success' : '/sell/success');
    } catch (err: any) {
      setError(err?.message || 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-screen-lg px-4 pb-12 pt-24 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold md:text-3xl">Выставить товар</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Заполни карточку и прикрепи фото. После модерации товар появится в ленте.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Фото */}
        <section className="md:col-span-1">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Фотографии</h2>
              {previews.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline-offset-2 hover:underline"
                >
                  Очистить все
                </button>
              )}
            </div>

            {/* Dropzone */}
            <div
              onDragOver={onDragOverZone}
              onDragLeave={onDragLeaveZone}
              onDrop={onDropZone}
              className={[
                'mt-3 rounded-2xl border border-dashed p-4 text-center transition',
                dragActive
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800',
              ].join(' ')}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleSelectFiles}
                className="hidden"
              />
              <div className="text-sm text-zinc-600 dark:text-zinc-300">
                Перетащи сюда или{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="underline underline-offset-2 hover:no-underline"
                >
                  выбери
                </button>{' '}
                до 8 фото
              </div>
              <div className="mt-1 text-xs text-zinc-400">Поддерживается сортировка перетаскиванием</div>
            </div>

            {/* Preview grid */}
            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {previews.map((p, idx) => (
                  <div
                    key={p.id}
                    className="group relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700"
                    draggable
                    onDragStart={onItemDragStart(idx)}
                    onDragOver={onItemDragOver(idx)}
                    onDrop={onItemDrop(idx)}
                    title="Перетащи, чтобы изменить порядок"
                  >
                    <Image
                      src={p.url}
                      alt={`preview-${idx}`}
                      width={400}
                      height={400}
                      className="aspect-square w-full object-cover"
                    />
                    {/* Delete — видно всегда, удобно на мобиле */}
                    <button
                      type="button"
                      onClick={() => removeAt(idx)}
                      className="absolute right-1 top-1 rounded-lg bg-black/65 px-2 py-1 text-xs text-white"
                      title="Удалить"
                      aria-label="Удалить фото"
                    >
                      ✕
                    </button>
                    {/* Позиция */}
                    <div className="pointer-events-none absolute left-1 top-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Форма */}
        <section className="md:col-span-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Название</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Напр., Supreme Box Logo Hoodie"
                  className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-4 py-2.5 text-sm outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/80"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Цена</label>
                <input
                  inputMode="numeric"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="₽"
                  className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-3 py-2.5 text-sm outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/80"
                />
                {price && !isNaN(Number(price)) && Number(price) > 0 && (
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {fmt.format(Number(price))}
                  </div>
                )}
              </div>

              {/* Бренд — автодополнение */}
              <div className="relative">
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Бренд</label>
                <input
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    setBrandQuery(e.target.value);
                    setBrandOpen(true);
                  }}
                  onFocus={() => setBrandOpen(true)}
                  onBlur={() => setTimeout(() => setBrandOpen(false), 150)}
                  placeholder="Напр., Nike"
                  className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-4 py-2.5 text-sm outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/80"
                  autoComplete="off"
                />

                {brandOpen && brandOptions.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                    {brandOptions.map((b: any) => (
                      <button
                        key={b.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setBrand(b.name);
                          setBrandOpen(false);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title={b.synonyms?.join(', ')}
                      >
                        {b.name}
                        {!!b.synonyms?.length && (
                          <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                            ({b.synonyms.slice(0, 2).join(', ')})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Категория</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/80"
                >
                  <option value="clothing">Одежда</option>
                  <option value="sneakers">Кроссовки</option>
                  <option value="accessories">Аксессуары</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Пол</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/80"
                >
                  <option value="unisex">Унисекс</option>
                  <option value="men">Мужское</option>
                  <option value="women">Женское</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Состояние</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as Condition)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/80"
                >
                  <option value="new">Новое</option>
                  <option value="like_new">Как новое</option>
                  <option value="good">Хорошее</option>
                  <option value="fair">Удовлетворительное</option>
                </select>
              </div>

              {category === 'clothing' && (
                <div>
                  <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                    Размер (одежда)
                  </label>
                  <select
                    value={apparelSize}
                    onChange={(e) => setApparelSize(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/80"
                  >
                    <option value="">Выбери…</option>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
              )}

              {category === 'sneakers' && (
                <div>
                  <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                    Размер (кроссовки, EU)
                  </label>
                  <input
                    value={shoeSize}
                    onChange={(e) => setShoeSize(e.target.value)}
                    placeholder="Напр., 42"
                    className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-4 py-2.5 text-sm outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/80"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Состояние, комплектация, дефекты, замеры…"
                  rows={5}
                  className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-4 py-2.5 text-sm outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900/80"
                />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    window.history.back();
                  } catch {}
                }}
                className="rounded-2xl border border-zinc-300 px-4 py-2 text-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {loading ? 'Публикация…' : 'Опубликовать'}
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
