import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl'
import { useEffect, useRef } from 'react'
import { formatScore } from '@/lib/format'
import { BUCHAREST, maptilerStyleUrl } from '@/lib/maptiler'
import type { RestaurantView } from '@/lib/site-data'

interface KebabMapProps {
  restaurants: RestaurantView[]
  selectedId: string | null
  mapKey: string
  onSelect: (id: string) => void
  onMapClick?: (lng: number, lat: number) => void
}

export function KebabMap({ restaurants, selectedId, mapKey, onSelect, onMapClick }: KebabMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const onSelectRef = useRef(onSelect)
  const onMapClickRef = useRef(onMapClick)

  useEffect(() => {
    onSelectRef.current = onSelect
    onMapClickRef.current = onMapClick
  })

  useEffect(() => {
    if (!containerRef.current || !mapKey) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: maptilerStyleUrl(mapKey),
      center: [BUCHAREST.lng, BUCHAREST.lat],
      zoom: BUCHAREST.zoom,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
    map.on('click', (event) => {
      onMapClickRef.current?.(event.lngLat.lng, event.lngLat.lat)
    })
    mapRef.current = map

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [mapKey])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = restaurants.map((restaurant) => {
      const element = document.createElement('button')
      element.type = 'button'
      element.className = `kebab-marker ${selectedId === restaurant.id ? 'is-selected' : ''}`
      element.setAttribute('aria-label', `Deschide ${restaurant.name} pe hartă`)
      element.style.cssText = [
        'width:18px',
        'height:18px',
        'border-radius:999px',
        'border:2px solid #fffaf3',
        `background:${selectedId === restaurant.id ? '#c2410c' : '#2a211b'}`,
        'box-shadow:0 0 0 1px rgb(31 22 17 / 0.25)',
        'cursor:pointer',
        selectedId === restaurant.id ? 'transform:scale(1.25)' : '',
      ].join(';')

      const popup = new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
        `<strong>${restaurant.name}</strong><br/><span>${restaurant.address}</span><br/>Notă ${formatScore(restaurant.latest.generalScore)} · Nivel ${restaurant.tier}`,
      )

      const marker = new maplibregl.Marker({ element })
        .setLngLat([restaurant.lng, restaurant.lat])
        .setPopup(popup)
        .addTo(map)

      element.addEventListener('click', (event) => {
        event.stopPropagation()
        onSelectRef.current(restaurant.id)
      })

      if (selectedId === restaurant.id) {
        marker.togglePopup()
      }

      return marker
    })
  }, [restaurants, selectedId])

  useEffect(() => {
    const map = mapRef.current
    const selected = restaurants.find((item) => item.id === selectedId)
    if (!map || !selected) return
    map.flyTo({ center: [selected.lng, selected.lat], zoom: 15, essential: true })
  }, [restaurants, selectedId])

  if (!mapKey) {
    return (
      <div className="flex h-full min-h-72 items-center justify-center rounded-lg border border-dashed border-ink/20 bg-white/60 p-6 text-sm text-ink/70" role="status">
        Lipsește `VITE_MAPTILER_KEY`. Adaugă cheia în `.env` pentru a afișa harta.
      </div>
    )
  }

  return (
    <div className="h-full min-h-72 overflow-hidden rounded-lg border border-ink/10">
      <div ref={containerRef} className="h-full min-h-72" aria-label="Hartă kebab București" />
    </div>
  )
}
