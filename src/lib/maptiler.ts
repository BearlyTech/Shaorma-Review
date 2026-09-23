export const BUCHAREST = {
  lat: 44.4268,
  lng: 26.1025,
  zoom: 12,
  bbox: [25.96, 44.35, 26.27, 44.54] as [number, number, number, number],
}

export interface GeocodingFeature {
  id: string
  place_name?: string
  text?: string
  center?: [number, number]
  place_type?: string[]
  properties?: {
    name?: string
    ref?: string
  }
  context?: Array<{ id?: string; text?: string }>
}

export interface GeocodingResponse {
  features?: GeocodingFeature[]
}

export interface MappedVenue {
  maptilerId?: string
  name: string
  address: string
  lat: number
  lng: number
  kind: string
}

export function maptilerKey(): string {
  return import.meta.env.VITE_MAPTILER_KEY?.trim() ?? ''
}

export function maptilerStyleUrl(key = maptilerKey()): string {
  return `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key)}`
}

function contextAddress(feature: GeocodingFeature): string {
  const parts = (feature.context ?? [])
    .map((item) => item.text)
    .filter((item): item is string => Boolean(item))
  return parts.join(', ')
}

export function mapGeocodingFeature(feature: GeocodingFeature): MappedVenue | null {
  const lng = feature.center?.[0]
  const lat = feature.center?.[1]
  if (lng === undefined || lat === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const name = feature.properties?.name || feature.text || feature.place_name || 'Local nenumit'
  const address = feature.place_name && feature.place_name !== name ? feature.place_name : contextAddress(feature)

  return {
    maptilerId: feature.id || feature.properties?.ref,
    name,
    address: address || 'București',
    lat,
    lng,
    kind: feature.place_type?.[0] ?? 'poi',
  }
}

export function buildForwardSearchUrl(query: string, key = maptilerKey()): string {
  const params = new URLSearchParams({
    key,
    language: 'ro',
    limit: '8',
    proximity: `${BUCHAREST.lng},${BUCHAREST.lat}`,
    bbox: BUCHAREST.bbox.join(','),
    fuzzyMatch: 'true',
  })
  return `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?${params.toString()}`
}

export function buildReverseGeocodeUrl(lng: number, lat: number, key = maptilerKey()): string {
  const params = new URLSearchParams({
    key,
    language: 'ro',
    types: 'poi,address',
    limit: '1',
  })
  return `https://api.maptiler.com/geocoding/${lng},${lat}.json?${params.toString()}`
}

export async function searchVenues(query: string, key = maptilerKey()): Promise<MappedVenue[]> {
  if (!key) throw new Error('Lipsește cheia MapTiler.')
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const response = await fetch(buildForwardSearchUrl(trimmed, key))
  if (!response.ok) {
    throw new Error('Căutarea MapTiler a eșuat.')
  }
  const payload = (await response.json()) as GeocodingResponse
  return (payload.features ?? []).map(mapGeocodingFeature).filter((item): item is MappedVenue => item !== null)
}

export async function reverseGeocode(lng: number, lat: number, key = maptilerKey()): Promise<MappedVenue | null> {
  if (!key) throw new Error('Lipsește cheia MapTiler.')
  const response = await fetch(buildReverseGeocodeUrl(lng, lat, key))
  if (!response.ok) {
    throw new Error('Geocodarea inversă MapTiler a eșuat.')
  }
  const payload = (await response.json()) as GeocodingResponse
  const feature = payload.features?.[0]
  return feature ? mapGeocodingFeature(feature) : null
}
