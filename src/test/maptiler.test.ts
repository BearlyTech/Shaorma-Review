import { describe, expect, it } from 'vitest'
import { buildForwardSearchUrl, buildReverseGeocodeUrl, mapGeocodingFeature } from '@/lib/maptiler'

describe('geocoding mapping', () => {
  it('maps a named POI to venue fields', () => {
    const venue = mapGeocodingFeature({
      id: 'poi.123',
      text: 'Shaormeria Băneasa',
      place_name: 'Șos. București-Ploiești 42D, București',
      center: [26.0781, 44.4942],
      place_type: ['poi'],
      properties: { name: 'Shaormeria Băneasa' },
    })

    expect(venue).toEqual({
      maptilerId: 'poi.123',
      name: 'Shaormeria Băneasa',
      address: 'Șos. București-Ploiești 42D, București',
      lat: 44.4942,
      lng: 26.0781,
      kind: 'poi',
    })
  })

  it('returns null without coordinates', () => {
    expect(mapGeocodingFeature({ id: 'x', text: 'Fără punct' })).toBeNull()
  })

  it('builds Bucharest-biased search and reverse URLs', () => {
    const forward = buildForwardSearchUrl('shaorma', 'test-key')
    expect(forward).toContain('/geocoding/shaorma.json')
    expect(forward).toContain('language=ro')
    expect(forward).toContain('proximity=26.1025%2C44.4268')
    expect(buildReverseGeocodeUrl(26.1, 44.4, 'test-key')).toContain('types=poi%2Caddress')
  })
})
