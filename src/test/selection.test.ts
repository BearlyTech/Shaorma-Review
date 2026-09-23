import { describe, expect, it } from 'vitest'
import { findSelectedRestaurant, listItemId } from '@/lib/selection'
import { restaurantPublicView, type Restaurant } from '@/lib/site-data'

const restaurant: Restaurant = {
  id: 'loc-42',
  name: 'Local 42',
  address: 'București',
  lat: 44.4,
  lng: 26.1,
  reviews: [
    {
      id: 'r1',
      visitedAt: '2026-01-01',
      description: 'Ok',
      generalScore: 7,
      ingredients: [],
    },
  ],
}

describe('list-map selection', () => {
  it('resolves a selected restaurant for map and list sync', () => {
    const views = [restaurantPublicView(restaurant)]
    expect(findSelectedRestaurant(views, 'loc-42')?.name).toBe('Local 42')
    expect(findSelectedRestaurant(views, 'missing')).toBeNull()
    expect(listItemId('loc-42')).toBe('local-loc-42')
  })
})
