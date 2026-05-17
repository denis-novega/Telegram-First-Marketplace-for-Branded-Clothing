'use client'

import { useEffect, useRef } from 'react'

// подключим Leaflet динамически через CDN (без types), чтобы не тащить веса в бандл заранее
declare global {
  interface Window { L: any }
}

export default function LeafletMap({
  center = [55.75, 37.61],
  markers = [],
  zoom = 12,
}: {
  center?: [number, number]
  zoom?: number
  markers: { id: string; lat: number; lon: number; label?: string; onClick?: () => void }[]
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  useEffect(() => {
    let cancelled = false

    async function load() {
      // leafet css
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(css)

      // leaflet js
      await new Promise<void>((res) => {
        const s = document.createElement('script')
        s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        s.onload = () => res()
        document.body.appendChild(s)
      })
      if (cancelled || !ref.current) return
      const L = (window as any).L

      mapRef.current = L.map(ref.current).setView(center, zoom)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(mapRef.current)

      markers.forEach((m) => {
        const marker = L.marker([m.lat, m.lon]).addTo(mapRef.current)
        if (m.label) marker.bindPopup(m.label)
        if (m.onClick) marker.on('click', m.onClick)
      })
    }
    load()
    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, []) // инициализация один раз

  // при смене маркеров перерисуем поверх
  useEffect(() => {
    const L = (window as any).L
    if (!L || !mapRef.current) return
    // грубо: пересоздадим слой маркеров
    // (для MVP ок; потом можно хранить слой и синхронно обновлять)
    mapRef.current.eachLayer((layer: any) => {
      // оставим base tileLayer
      if (!layer.getAttribution) {
        try { mapRef.current.removeLayer(layer) } catch {}
      }
    })
    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lon]).addTo(mapRef.current)
      if (m.label) marker.bindPopup(m.label)
      if (m.onClick) marker.on('click', m.onClick)
    })
    mapRef.current.setView(center)
  }, [center[0], center[1], markers.map(m => m.id).join(',')])

  return <div ref={ref} className="h-72 w-full" />
}
