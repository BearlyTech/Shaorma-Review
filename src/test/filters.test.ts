import { describe, expect, it } from 'vitest'
import { restaurantMatchesFilters, visibleRestaurants } from '@/lib/filters'
import { restaurantPublicView, type Restaurant } from '@/lib/site-data'

const restaurant: Restaurant = {
  id: 'loc-1',
  name: 'Shaormeria Nord',
  address: 'Băneasa, București',
  lat: 44.49,
  lng: 26.07,
  reviews: [
    {
      id: 'old',
      visitedAt: '2025-01-01',
      description: 'Mai slab.',
      generalScore: 6.2,
      ingredients: [{ ingredientId: 'sos', typeId: 'picant', score: 9 }],
    },
    {
      id: 'new',
      visitedAt: '2026-05-01',
      description: 'Lipie bună și carne de pui.',
      generalScore: 8.4,
      ingredients: [{ ingredientId: 'carne', typeId: 'pui', score: 8.6, note: 'Rumenită' }],
    },
  ],
}

const view = restaurantPublicView(restaurant)

describe('public filters', () => {
  it('filters against the latest review only', () => {
    expect(
      restaurantMatchesFilters(view, { query: '', ingredientId: 'sos', typeId: '', minimumScore: '' }),
    ).toBe(false)
    expect(
      restaurantMatchesFilters(view, { query: '', ingredientId: 'carne', typeId: 'pui', minimumScore: '8.5' }),
    ).toBe(true)
    expect(
      restaurantMatchesFilters(view, { query: '', ingredientId: 'carne', typeId: 'pui', minimumScore: '9' }),
    ).toBe(false)
  })

  it('matches text search on name and latest description', () => {
    expect(restaurantMatchesFilters(view, { query: 'baneasa', ingredientId: '', typeId: '', minimumScore: '' })).toBe(true)
    expect(restaurantMatchesFilters(view, { query: 'slab', ingredientId: '', typeId: '', minimumScore: '' })).toBe(false)
  })

  it('sorts visible restaurants by latest general score', () => {
    const weaker: Restaurant = {
      ...restaurant,
      id: 'loc-2',
      name: 'Alt local',
      lat: 44.4,
      lng: 26.2,
      reviews: [{ ...restaurant.reviews[1], id: 'r2', generalScore: 7.1, ingredients: [] }],
    }
    const visible = visibleRestaurants(
      { ingredients: [], restaurants: [restaurant, weaker] },
      { query: '', ingredientId: '', typeId: '', minimumScore: '' },
    )
    expect(visible.map((item) => item.id)).toEqual(['loc-1', 'loc-2'])
  })
})
