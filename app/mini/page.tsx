'use client'

import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import WelcomeOverlay from '@/components/mini/WelcomeOverlay'

const ProductCardMini = dynamic(() => import('@/components/ProductCardMini'), { ssr: false })

type Product = {
  id: string
  title: string
  price: number | null
  brand?: string | null
  images?: string[] | null
}

type SortKey = 'new' | 'price_asc' | 'price_desc'
type CategorySlug = 'clothing' | 'accessories' | 'sneakers' | undefined

// ВАЖНО: отделяем строгий тип для списков гендера (без undefined)
type Gender = 'men' | 'women' | 'unisex'
type GenderSlug = Gender | undefined

type ConditionSlug = 'new' | 'like_new' | 'good' | 'fair'

const CONDITION_LABELS: Record<ConditionSlug, string> = {
  new: 'Новый',
  like_new: 'Почти новый',
  good: 'Хорошее',
  fair: 'Удовлетворительное',
}

const IconChevron = (props: any) => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconSort = (props: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M6 4v16m0 0-3-3m3 3 3-3M14 6h6M12 12h8M16 18h4"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
)
const IconFilter = (props: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M4 6h16M7 12h10M10 18h4"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
)
const IconTrash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

/** Telegram WebApp helper */
function useTelegram() {
  const wa = useMemo<any>(() => (typeof window !== 'undefined' ? (window as any)?.Telegram?.WebApp : undefined), [])
  return wa
}

/** Safe areas + theme */
function useTgEnvironment() {
  const wa = useTelegram()
  const [safe, setSafe] = useState({ top: 0, bottom: 0, contentTop: 0, contentBottom: 0 })
  const [theme, setTheme] = useState<any>(() => wa?.themeParams ?? {})

  useEffect(() => {
    if (!wa) return
    try { wa.requestFullscreen?.() } catch {}

    const sa = wa.safeAreaInset || {}
    const csa = wa.contentSafeAreaInset || {}
    setSafe({
      top: Number(sa.top) || 0,
      bottom: Number(sa.bottom) || 0,
      contentTop: Number(csa.top) || 0,
      contentBottom: Number(csa.bottom) || 0,
    })

    const applyHeader = (t: any) => {
      const header = t?.header_bg_color || t?.secondary_bg_color || t?.bg_color
      const bg = t?.bg_color
      const bottom = t?.bottom_bar_bg_color || t?.bg_color
      wa.setHeaderColor?.(header)
      wa.setBackgroundColor?.(bg)
      wa.setBottomBarColor?.(bottom)
    }
    applyHeader(wa.themeParams)
    wa.enableVerticalSwipes?.()

    const onSafe = () => {
      const nsa = wa.safeAreaInset || {}
      const ncsa = wa.contentSafeAreaInset || {}
      setSafe({
        top: Number(nsa.top) || 0,
        bottom: Number(nsa.bottom) || 0,
        contentTop: Number(ncsa.top) || 0,
        contentBottom: Number(ncsa.bottom) || 0,
      })
    }
    const onTheme = () => { setTheme({ ...(wa.themeParams || {}) }); }

    wa.onEvent?.('safeAreaChanged', onSafe)
    wa.onEvent?.('contentSafeAreaChanged', onSafe)
    wa.onEvent?.('themeChanged', onTheme)

    return () => {
      wa.offEvent?.('safeAreaChanged', onSafe)
      wa.offEvent?.('contentSafeAreaChanged', onSafe)
      wa.offEvent?.('themeChanged', onTheme)
    }
  }, [wa])

  const cssVars: CSSProperties = {
    ['--safe-top' as any]: `max(${safe.top}px, env(safe-area-inset-top, 0px))`,
    ['--safe-bottom' as any]: `max(${safe.bottom}px, env(safe-area-inset-bottom, 0px))`,
    ['--content-safe-top' as any]: `${safe.contentTop}px`,
    ['--content-safe-bottom' as any]: `${safe.contentBottom}px`,
  }

  return { theme, cssVars, safe }
}

// TopBar with center title
function TopBar({ title }: { title?: string }) {
  return (
    <div
      className="fixed top-0 z-50 w-full border-b-0 shadow-none
                 bg-zinc-950 supports-[backdrop-filter]:bg-zinc-950 supports-[backdrop-filter]:backdrop-blur"
      style={{ ['--topbar-h' as any]: '56px' }}
      role="banner"
      aria-label={title ? `Заголовок: ${title}` : 'Заголовок'}
    >
      <div className="pt-[max(var(--safe-top,0px),0px)]" />
      <div className="px-3 h-12 grid items-center" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
        <div className="w-11" aria-hidden />
        {title && (
          <div className="justify-self-center text-[15px] font-semibold tracking-tight text-zinc-100 text-center">
            {title}
          </div>
        )}
        <div className="w-11" aria-hidden />
      </div>
    </div>
  )
}

function chip(val: string, active?: string) {
  return `rounded-full px-4 py-1.5 text-sm border ${
    active === val ? 'border-white text-white bg-white/10' : 'border-zinc-700/50 text-zinc-300 bg-[#232325]'
  }`
}

function MiniHome() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const wa = useTelegram()
  const { cssVars, safe } = useTgEnvironment()

  // ===== URL params =====
  const qParam = searchParams.get('q') ?? ''
  const sortParam = (searchParams.get('sort') as SortKey) || 'new'
  const categoryParam = searchParams.get('category') as CategorySlug | null

  // gender — массив строгого типа без undefined
  const genderParams = paramsToArray(searchParams, 'gender') as Gender[]

  const apparelSizesParam = paramsToArray(searchParams, 'apparel_size')
  const shoeSizesParam = paramsToArray(searchParams, 'shoe_size')
  const conditionsParam = paramsToArray(searchParams, 'condition') as ConditionSlug[]
  const priceFromParam = searchParams.get('price_from')
  const priceToParam = searchParams.get('price_to')

  // ===== Search input =====
  const [qInput, setQInput] = useState(qParam)
  useEffect(() => setQInput(qParam), [qParam])

  function applySearch(nextQ: string) {
    const val = nextQ.trim()
    if (!val) {
      const sp = new URLSearchParams(searchParams.toString())
      sp.delete('q')
      router.replace(`${pathname}?${sp.toString()}`, { scroll: true })
      return
    }
    if (val.startsWith('@')) {
      const username = val.replace(/^@+/, '').trim()
      if (username) {
        router.push(`/mini/u/${username}`)
        return
      }
    }

    const sp = new URLSearchParams(searchParams.toString())
    sp.set('q', val)
    router.replace(`${pathname}?${sp.toString()}`, { scroll: true })
  }

  // ===== Overlays state =====
  const [openSort, setOpenSort] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // ===== Welcome overlay (Telegram mini) =====
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    // показываем один раз на устройство (можно сбросить сменой версии ключа)
    const KEY = 'echo:welcomeShown:v1'
    try {
      const already = localStorage.getItem(KEY) === '1'
      if (!already) setShowWelcome(true)
    } catch {}
  }, [])

  useEffect(() => {
    const wapp = (window as any)?.Telegram?.WebApp
    if (!wapp) return
    if (showWelcome) {
      wapp.BackButton?.show?.()
      wapp.disableVerticalSwipes?.()
      const off = wapp.BackButton?.onClick?.(() => setShowWelcome(false))
      return () => {
        try { off?.() } catch {}
        wapp.BackButton?.hide?.()
        wapp.enableVerticalSwipes?.()
      }
    }
  }, [showWelcome])

  // draft filters
  const [draftCategory, setDraftCategory] = useState<CategorySlug | undefined>(categoryParam || undefined)
  const [draftGenders, setDraftGenders] = useState<Gender[]>(genderParams)
  const [draftApparelSizes, setDraftApparelSizes] = useState<string[]>(apparelSizesParam)
  const [draftShoeSizes, setDraftShoeSizes] = useState<string[]>(shoeSizesParam)
  const [draftConditions, setDraftConditions] = useState<ConditionSlug[]>(conditionsParam || [])
  const [draftPriceFrom, setDraftPriceFrom] = useState<string>(priceFromParam || '')
  const [draftPriceTo, setDraftPriceTo] = useState<string>(priceToParam || '')

  useEffect(() => {
    if (!filtersOpen) return
    setDraftCategory(categoryParam || undefined)
    setDraftGenders(genderParams)
    setDraftApparelSizes(apparelSizesParam)
    setDraftShoeSizes(shoeSizesParam)
    setDraftConditions((conditionsParam || []) as ConditionSlug[])
    setDraftPriceFrom(priceFromParam || '')
    setDraftPriceTo(priceToParam || '')
  }, [
    filtersOpen,
    categoryParam,
    genderParams.join(','),
    apparelSizesParam.join(','),
    shoeSizesParam.join(','),
    conditionsParam.join(','),
    priceFromParam,
    priceToParam,
  ])

  // ===== Data =====
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)

      let query = supabase
        .from('products')
        .select('id, title, price, brand, images, created_at, category, gender, size, condition')

      const s = qParam.trim()
      if (s) query = query.or(`title.ilike.%${s}%,brand.ilike.%${s}%`)

      if (sortParam === 'new') query = query.order('created_at', { ascending: false })
      if (sortParam === 'price_asc') query = query.order('price', { ascending: true, nullsFirst: true })
      if (sortParam === 'price_desc') query = query.order('price', { ascending: false, nullsFirst: false })

      if (categoryParam) query = query.eq('category', categoryParam)
      if (genderParams.length) query = query.in('gender', genderParams)

      if (categoryParam === 'sneakers') {
        if (shoeSizesParam.length) query = query.in('size', shoeSizesParam)
      } else {
        if (apparelSizesParam.length) query = query.in('size', apparelSizesParam)
      }

      if (conditionsParam.length) query = query.in('condition', conditionsParam)
      if (priceFromParam) query = query.gte('price', Number(priceFromParam))
      if (priceToParam) query = query.lte('price', Number(priceToParam))

      query = query.limit(60)

      const { data, error } = await query
      if (!alive) return

      if (error) {
        console.error('Supabase error:', error)
        setItems([])
      } else {
        setItems((data as Product[]) || [])
      }

      setLoading(false)
    })()

    return () => { alive = false }
  }, [
    qParam,
    sortParam,
    categoryParam,
    genderParams.join(','),
    apparelSizesParam.join(','),
    shoeSizesParam.join(','),
    conditionsParam.join(','),
    priceFromParam,
    priceToParam,
    supabase,
  ])

  // ===== Category chips =====
  const setTopCategory = (slug: Exclude<CategorySlug, undefined>) => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set('category', slug)
    if (slug === 'sneakers') sp.delete('apparel_size')
    else sp.delete('shoe_size')
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false })
  }
  const activeCategory = (categoryParam || undefined) as string | undefined

  // ===== Utils for URL params =====
  const toStrArr = <T,>(arr: readonly (T | null | undefined)[] | null | undefined): string[] =>
    (arr ?? []).filter((x): x is T => x != null).map(String)

  const setArrayParam = (sp: URLSearchParams, key: string, arr: string[] | readonly string[] | null | undefined) => {
    sp.delete(key)
    if (arr && arr.length) for (const v of arr) sp.append(key, v as string)
  }

  function setOrDelete(sp: URLSearchParams, key: string, value?: string | null) {
    if (!value) sp.delete(key)
    else sp.set(key, value)
  }

  // ===== Apply/Clear filters =====
  const applyFilters = () => {
    const sp = new URLSearchParams(searchParams.toString())

    setOrDelete(sp, 'category', draftCategory)
    setArrayParam(sp, 'gender', toStrArr<Gender>(draftGenders))

    if (draftCategory === 'sneakers') {
      setArrayParam(sp, 'shoe_size', toStrArr(draftShoeSizes))
      sp.delete('apparel_size')
    } else {
      setArrayParam(sp, 'apparel_size', toStrArr(draftApparelSizes))
      sp.delete('shoe_size')
    }

    setArrayParam(sp, 'condition', toStrArr<ConditionSlug>(draftConditions))
    setOrDelete(sp, 'price_from', (draftPriceFrom ?? '').trim() || null)
    setOrDelete(sp, 'price_to', (draftPriceTo ?? '').trim() || null)

    router.replace(`${pathname}?${sp.toString()}`, { scroll: false })
    setFiltersOpen(false)
    setOpenSort(false)
  }

  const clearFilters = () => {
    const sp = new URLSearchParams(searchParams.toString())
    ;['gender', 'apparel_size', 'shoe_size', 'condition', 'price_from', 'price_to'].forEach((k) => sp.delete(k))
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false })
    setFiltersOpen(false)
  }

  const toggleDraft = <T extends string>(arr: T[], v: T, setArr: (x: T[]) => void) => {
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  }

  // ===== BackButton / swipes =====
  const hasDirtyFilters = useMemo(() => {
    const eq = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b)
    return (
      filtersOpen && (
        !eq(draftCategory || null, categoryParam || null) ||
        !eq(draftGenders, genderParams) ||
        !eq(draftApparelSizes, apparelSizesParam) ||
        !eq(draftShoeSizes, shoeSizesParam) ||
        !eq(draftConditions, conditionsParam) ||
        (draftPriceFrom || '') !== (priceFromParam || '') ||
        (draftPriceTo || '') !== (priceToParam || '')
      )
    )
  }, [
    filtersOpen,
    draftCategory,
    categoryParam,
    draftGenders,
    genderParams,
    draftApparelSizes,
    apparelSizesParam,
    draftShoeSizes,
    shoeSizesParam,
    draftConditions,
    conditionsParam,
    draftPriceFrom,
    priceFromParam,
    draftPriceTo,
    priceToParam,
  ])

  const overlayRef = useRef<'filters' | 'sort' | null>(null)
  useEffect(() => { overlayRef.current = filtersOpen ? 'filters' : openSort ? 'sort' : null }, [filtersOpen, openSort])

  useEffect(() => {
    if (!wa) return
    const updateBack = () => { overlayRef.current ? wa.BackButton?.show?.() : wa.BackButton?.hide?.() }
    const updateSwipes = () => { overlayRef.current ? wa.disableVerticalSwipes?.() : wa.enableVerticalSwipes?.() }

    updateBack(); updateSwipes()

    const onBack = () => {
      if (overlayRef.current === 'filters') setFiltersOpen(false)
      if (overlayRef.current === 'sort') setOpenSort(false)
    }
    wa.onEvent?.('backButtonClicked', onBack)
    if (hasDirtyFilters) wa.enableClosingConfirmation?.(); else wa.disableClosingConfirmation?.()

    return () => {
      wa.offEvent?.('backButtonClicked', onBack)
      wa.disableClosingConfirmation?.()
      wa.enableVerticalSwipes?.()
      wa.BackButton?.hide?.()
    }
  }, [wa, filtersOpen, openSort, hasDirtyFilters])

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    applySearch(qInput)
  }

  // ===== Render =====
  return (
    <div
      className="min-h-[100svh] bg-zinc-950 text-zinc-100"
      style={{
        ...cssVars,
        ['--topbar-h' as any]: '48px',
        ['--topbar-total' as any]: 'calc(var(--safe-top, 0px) + var(--topbar-h, 56px))',
      }}
    >
      <TopBar title="эхо!" />

      {/* Sticky header */}
      <div
        className="sticky z-40 border-b-0 shadow-none
                   bg-zinc-950 supports-[backdrop-filter]:bg-zinc-950 supports-[backdrop-filter]:backdrop-blur"
        style={{ top: 'var(--topbar-total)' }}
      >
        {/* Поиск */}
        <div className="px-3 pt-2 pb-2">
          <div className="flex items-center gap-2 relative">
            <form onSubmit={onSearchSubmit} className="flex-1" aria-label="Поиск по товарам">
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Name or description"
                className="w-full rounded-2xl border border-zinc-700/50 bg-[#232325]/70 px-4 py-2 text-sm outline-none"
                aria-label="Строка поиска"
              />
            </form>
            <button
              onClick={() => setOpenSort((v) => !v)}
              className="h-9 w-9 grid place-items-center rounded-2xl border border-zinc-700/50 bg-[#232325]/70"
              aria-haspopup="menu"
              aria-expanded={openSort}
              aria-label="Сортировать"
            >
              <IconSort />
            </button>
            <button
              onClick={() => setFiltersOpen(true)}
              className="h-9 w-9 grid place-items-center rounded-2xl border border-zinc-700/50 bg-[#232325]/70"
              aria-label="Открыть фильтры"
            >
              <IconFilter />
            </button>

            {/* Меню сортировки */}
            {openSort && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] z-[70] min-w-40 rounded-xl border border-zinc-800 bg-zinc-950/95 shadow-none"
                role="menu"
              >
                {(['new','price_asc','price_desc'] as SortKey[]).map((k) => {
                  const label = k === 'new' ? 'Новые' : k === 'price_asc' ? 'Цена ↑' : 'Цена ↓'
                  const sp = new URLSearchParams(searchParams.toString()); sp.set('sort', k)
                  return (
                    <Link key={k} href={`${pathname}?${sp.toString()}`} scroll={false}
                      className={`block w-full text-left px-3 py-2 text-[13px] hover:bg-[#232325]/70 ${sortParam===k?'text-white':'text-zinc-300'}`}
                      onClick={() => setOpenSort(false)}
                      role="menuitemradio" aria-checked={sortParam===k}>
                      {label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chips + только здесь тень снизу */}
        <div className="px-3 pb-2 shadow-md">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" role="toolbar" aria-label="Категории">
            <button className={chip('clothing', activeCategory)}   onClick={() => setTopCategory('clothing')}   aria-pressed={activeCategory==='clothing'}>Одежда</button>
            <button className={chip('sneakers', activeCategory)}   onClick={() => setTopCategory('sneakers')}   aria-pressed={activeCategory==='sneakers'}>Кроссовки</button>
            <button className={chip('accessories', activeCategory)}onClick={() => setTopCategory('accessories')} aria-pressed={activeCategory==='accessories'}>Аксессуары</button>

            {/* Сброс мини */}
            <Link
              href="/mini"
              scroll={false}
              className="ml-auto shrink-0 h-9 w-9 grid place-items-center rounded-xl border border-zinc-700/50 bg-[#232325]/70"
              aria-label="Сбросить фильтры и перейти к мини"
            >
              <IconTrash />
            </Link>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <SkeletonGrid />
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-400">Ничего не найдено.</div>
      ) : (
        <div className="px-3 grid grid-cols-2 gap-3 pt-10 pb-20" role="list" aria-label="Список товаров">
          {items.filter(Boolean).map((p) => (
            <Link key={p.id} href={`/mini/product/${p.id}`} role="listitem" aria-label={`Открыть ${p.title}`}>
              <ProductCardMini p={p} />
            </Link>
          ))}
        </div>
      )}

      {/* Фильтры */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Фильтры">
          <button
            className="absolute inset-0 bg-black/60"
            aria-label="Закрыть фильтры"
            onClick={() => setFiltersOpen(false)}
          />
          <div
            className="absolute left-0 right-0 bottom-0 mx-auto max-h-[min(80svh,600px)] w-full
                       bg-zinc-950 border-t border-zinc-800 rounded-t-2xl p-4 flex flex-col
                       animate-[slideUp_.2s_ease-out] shadow-2xl"
            style={{ paddingBottom: 'calc(var(--safe-bottom, 0px) + 28px)' }}
            tabIndex={-1}
          >
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-zinc-700" aria-hidden />
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold tracking-tight">Фильтры</h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="h-11 w-11 grid place-items-center rounded-full bg-[#232325]/60 border border-zinc-800 text-zinc-300"
                aria-label="Закрыть"
              >
                <span className="text-lg leading-none" aria-hidden>×</span>
              </button>
            </div>

            <div className="divide-y divide-zinc-800 overflow-y-auto pr-1"
                 style={{ maxHeight: 'calc(80svh - 56px - 64px)' }}>
              {/* Категория */}
              <Accordion title="Категория" defaultOpen>
                <div className="flex flex-wrap gap-2 pt-2">
                  <SelectPill label="Одежда"      active={draftCategory === 'clothing'}    onClick={() => setDraftCategory(draftCategory === 'clothing' ? undefined : 'clothing')} />
                  <SelectPill label="Аксессуары"  active={draftCategory === 'accessories'} onClick={() => setDraftCategory(draftCategory === 'accessories' ? undefined : 'accessories')} />
                  <SelectPill label="Кроссовки"   active={draftCategory === 'sneakers'}     onClick={() => setDraftCategory(draftCategory === 'sneakers' ? undefined : 'sneakers')} />
                </div>
              </Accordion>

              {/* Гендер (multiple) */}
              <Accordion title="Гендер">
                <div className="flex flex-wrap gap-2 pt-2">
                  {([
                    { label: 'Муж', val: 'men' },
                    { label: 'Жен', val: 'women' },
                    { label: 'Юнисекс', val: 'unisex' },
                  ] as { label: string; val: Gender }[]).map(({ label, val }) => (
                    <SelectPill
                      key={val}
                      label={label}
                      active={draftGenders.includes(val)}
                      onClick={() => toggleDraft<Gender>(draftGenders, val, setDraftGenders)}
                    />
                  ))}
                </div>
              </Accordion>

              {/* Размер */}
              <Accordion title="Размер">
                {draftCategory === 'sneakers' ? (
                  <ButtonGrid
                    options={['36','37','38','39','40','41','42','43','44','45','46']}
                    selected={draftShoeSizes}
                    onToggle={(v) => toggleDraft(draftShoeSizes, v, setDraftShoeSizes)}
                  />
                ) : (
                  <ButtonGrid
                    options={['XS','S','M','L','XL','XXL']}
                    selected={draftApparelSizes}
                    onToggle={(v) => toggleDraft(draftApparelSizes, v, setDraftApparelSizes)}
                  />
                )}
              </Accordion>

              {/* Цена */}
              <Accordion title="Цена">
                <div className="flex items-center gap-2 pt-2">
                  <input
                    value={draftPriceFrom}
                    onChange={(e) => setDraftPriceFrom(e.target.value.replace(/[^\d]/g, ''))}
                    inputMode="numeric"
                    placeholder="от"
                    className="w-28 rounded-lg bg-[#232325]/70 border border-zinc-800 px-2 py-1.5 text-[13px] text-zinc-200 outline-none"
                    aria-label="Цена от"
                  />
                  <span className="text-zinc-500 text-sm" aria-hidden>—</span>
                  <input
                    value={draftPriceTo}
                    onChange={(e) => setDraftPriceTo(e.target.value.replace(/[^\d]/g, ''))}
                    inputMode="numeric"
                    placeholder="до"
                    className="w-28 rounded-lg bg-[#232325]/70 border border-zinc-800 px-2 py-1.5 text-[13px] text-zinc-200 outline-none"
                    aria-label="Цена до"
                  />
                </div>
              </Accordion>

              {/* Состояние */}
              <Accordion title="Состояние">
                <div className="flex flex-wrap gap-2 pt-2">
                  {(Object.keys(CONDITION_LABELS) as ConditionSlug[]).map((key) => (
                    <SelectPill
                      key={key}
                      label={CONDITION_LABELS[key]}
                      active={draftConditions.includes(key)}
                      onClick={() => toggleDraft<ConditionSlug>(draftConditions, key, setDraftConditions)}
                    />
                  ))}
                </div>
              </Accordion>
            </div>

            <div className="mt-4 flex gap-3 pb-[var(--safe-bottom,0px)]">
              <button
                className="flex-1 rounded-md border border-zinc-700/50 bg-[#232325]/70 text-zinc-200 py-2 h-11"
                onClick={clearFilters}
              >
                Очистить
              </button>
              <button
                className="flex-1 rounded-md border border-zinc-700/50 bg-[#232325]/70 text-zinc-200 py-2 h-11"
                onClick={applyFilters}
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome intro (показываем поверх всего) */}
      {showWelcome && (
        <WelcomeOverlay
          onClose={() => { try { localStorage.setItem('echo:welcomeShown:v1','1') } catch{} setShowWelcome(false) }}
          // кастомизация по желанию:
          // title="эхо маркет"
          // lines={[
          //   'купи или продай вещь в пару тапов',
          //   'бета — функций будет ещё очень много',
          // ]}
          // buttonText="нажать"
        />
      )}

      {/* Bottom safe space */}
      <div style={{ height: `calc(var(--safe-bottom, ${safe.bottom}px))` }} aria-hidden />
    </div>
  )
} // ← ВАЖНО: закрыли MiniHome!

function paramsToArray(params: URLSearchParams, key: string): string[] {
  const multi = params.getAll(key)
  if (multi.length > 1) return multi
  const single = params.get(key)
  if (!single) return []
  return single.split(',').map((s) => s.trim()).filter(Boolean)
}

function SkeletonGrid() {
  return (
    <div className="px-3 grid grid-cols-2 gap-3 pt-6" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square rounded-xl bg-zinc-800/60" />
          <div className="mt-2 h-3 w-4/5 rounded bg-zinc-800/60" />
          <div className="mt-2 h-3 w-2/5 rounded bg-zinc-800/60" />
        </div>
      ))}
    </div>
  )
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children?: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="py-3">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between h-11" aria-expanded={open} aria-controls={`sect-${title}`}>
        <span className="text-[15px] font-medium">{title}</span>
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          <IconChevron className="text-zinc-400" />
        </span>
      </button>
      {open && <div id={`sect-${title}`} className="pt-1">{children}</div>}
    </div>
  )
}

function ButtonGrid({ options, selected = [], onToggle }: { options: string[]; selected?: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {options.map((opt) => {
        const active = selected.includes(opt)
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`rounded-xl border px-3 py-1.5 text-[12px] h-11 min-w-11 ${active ? 'border-zinc-300 bg-zinc-200/20 text-zinc-50' : 'border-zinc-800 bg-[#232325]/70 text-zinc-300'}`}
            aria-pressed={active}
            aria-label={`Размер ${opt}${active ? ', выбран' : ''}`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function SelectPill({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[12px] h-11 min-w-11 transition ${active ? 'border-zinc-300 bg-zinc-200/20 text-zinc-50' : 'border-zinc-800 bg-[#232325]/70 text-zinc-300'}`}
      aria-pressed={!!active}
      aria-label={`${label}${active ? ' выбран' : ''}`}
    >
      {label}
    </button>
  )
}

export default function MiniPage() {
  return (
    <Suspense fallback={<SkeletonGrid />}>
      <MiniHome />
    </Suspense>
  )
}
