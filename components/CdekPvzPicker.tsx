// components/CdekPvzPicker.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

type DeliveryValue = null | {
  mode: 'PICKUP'
  carrier: 'CDEK'
  pvz_id: string
  pvz_name: string
  city: string
  address: string
  lat: number
  lon: number
}

type Pvz = { id: string; name: string; address: string; lat: number; lon: number; type?: string }

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap()
  const keyRef = useRef('')
  useEffect(() => {
    const k = center.join(',')
    if (k !== keyRef.current) {
      keyRef.current = k
      map.setView(center, Math.max(map.getZoom(), 12), { animate: true })
    }
  }, [center, map])
  return null
}

export default function CdekPvzPicker({
  defaultCity,
  defaultValue,
  onChange,
}: {
  defaultCity?: string
  defaultValue?: { code: string; name: string; address: string; lat: number; lon: number } | null
  onChange: (v: DeliveryValue) => void
}) {
  const [cityQuery, setCityQuery] = useState('')
  const [pvz, setPvz] = useState<Pvz[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<DeliveryValue>(null)
  const [showList, setShowList] = useState(true) // ← управляем отображением списка

  // init из пропсов
  useEffect(() => {
    if (defaultCity && !cityQuery) setCityQuery(defaultCity)
  }, [defaultCity]) // eslint-disable-line

  useEffect(() => {
    if (defaultValue && !selected) {
      const v: DeliveryValue = {
        mode: 'PICKUP',
        carrier: 'CDEK',
        pvz_id: defaultValue.code,
        pvz_name: defaultValue.name,
        city: defaultCity || '',
        address: defaultValue.address,
        lat: defaultValue.lat,
        lon: defaultValue.lon,
      }
      setSelected(v)
      onChange(v)
      setShowList(false) // уже есть выбранное — список скрываем
    }
  }, [defaultValue]) // eslint-disable-line

  const fetchByCity = async () => {
    const q = cityQuery.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/cdek/pvz?city=${encodeURIComponent(q)}`, { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = await r.json()
      const items: Pvz[] = j.items || []
      setPvz(items)
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки ПВЗ')
      setPvz([])
    } finally {
      setLoading(false)
    }
  }

  // текстовый фильтр
  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase()
    const base = f ? pvz.filter(p => (p.name + ' ' + p.address).toLowerCase().includes(f)) : pvz
    return base
  }, [pvz, filter])

  const mapCenter: [number, number] = useMemo(() => {
    if (selected) return [selected.lat, selected.lon]
    if (filtered.length) return [filtered[0].lat, filtered[0].lon]
    return [55.751244, 37.618423] // Москва дефолт
  }, [filtered, selected])

  const selectPvz = (p: Pvz) => {
    const v: DeliveryValue = {
      mode: 'PICKUP',
      carrier: 'CDEK',
      pvz_id: p.id,
      pvz_name: p.name,
      city: cityQuery.trim(),
      address: p.address,
      lat: p.lat,
      lon: p.lon,
    }
    setSelected(v)
    onChange(v)
    setShowList(false) // скрываем список после выбора
  }

  return (
    <div className="space-y-3">
      {/* Город + поиск */}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Город</label>
          <input
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchByCity() }}
            placeholder="Например: Москва, Санкт-Петербург"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div className="self-end pb-[2px] flex gap-2">
          <button
            type="button"
            onClick={fetchByCity}
            disabled={loading || cityQuery.trim().length < 2}
            className="h-[38px] rounded-xl border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Найти ПВЗ
          </button>
          {selected && (
            <button
              type="button"
              onClick={() => setShowList(s => !s)}
              className="h-[38px] rounded-xl border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {showList ? 'Скрыть список' : 'Изменить выбор'}
            </button>
          )}
        </div>
      </div>

      {/* Фильтр — тоже прячем вместе со списком */}
      <div className={`${showList ? 'block' : 'hidden'}`}>
        <label className="mb-1 block text-xs text-zinc-500">Фильтр по адресу ПВЗ</label>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Например: Щёлковское, 10"
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      {/* Карта — всегда показываем */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        <MapContainer center={mapCenter} zoom={12} style={{ width: '100%', height: 320 }} scrollWheelZoom={false} attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Recenter center={mapCenter} />
          {filtered.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lon]} icon={markerIcon} eventHandlers={{ click: () => selectPvz(p) }}>
              <Popup>
                <div className="text-sm">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-zinc-500">{p.address}</div>
                  <button
                    onClick={() => selectPvz(p)}
                    className="mt-2 rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Выбрать
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Список ПВЗ — плавно сворачиваем/разворачиваем */}
      <div
        className={`rounded-xl border border-zinc-200 text-sm dark:border-zinc-700 overflow-hidden transition-all duration-300 ${
          showList ? 'max-h-64' : 'max-h-0 border-transparent'
        }`}
      >
        <div className={`${showList ? 'block' : 'hidden'}`}>
          {loading && <div className="px-3 py-2 text-zinc-500">Загрузка ПВЗ…</div>}
          {error && <div className="px-3 py-2 text-red-500">{error}</div>}
          {!loading && cityQuery.trim() && filtered.length === 0 && (
            <div className="px-3 py-2 text-zinc-500">Ничего не найдено. Измени запрос или фильтр.</div>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              className="block w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => selectPvz(p)}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-zinc-500">{p.address}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Карточка выбора (под картой) */}
      {selected && (
        <div className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-700">
          <div className="font-medium">Выбрано: {selected.pvz_name}</div>
          <div className="text-zinc-500">{selected.address}</div>
        </div>
      )}
    </div>
  )
}
