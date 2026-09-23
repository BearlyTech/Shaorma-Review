import { describe, expect, it } from 'vitest'
import demoData from '@/data/kebab-places.json'
import {
  addIngredient,
  addIngredientType,
  latestReview,
  parseSiteData,
  restaurantTier,
  scoreToTier,
  validateSiteData,
  type Restaurant,
  type Review,
  type SiteData,
} from '@/lib/site-data'

const baseReview: Review = {
  id: 'r1',
  visitedAt: '2026-01-02',
  description: 'Bun.',
  generalScore: 8.2,
  ingredients: [{ ingredientId: 'carne', typeId: 'pui', score: 8.1, note: 'Suculent' }],
}

function sampleRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'loc-1',
    name: 'Shaormeria Test',
    address: 'Strada Test 1, București',
    lat: 44.43,
    lng: 26.1,
    reviews: [baseReview],
    ...overrides,
  }
}

function sampleData(overrides: Partial<SiteData> = {}): SiteData {
  return parseSiteData({
    ingredients: demoData.ingredients,
    restaurants: [sampleRestaurant()],
    ...overrides,
  })
}

describe('date and score validation', () => {
  it('accepts required calendar dates and rejects invalid ones', () => {
    expect(() =>
      validateSiteData({
        ...sampleData(),
        restaurants: [sampleRestaurant({ reviews: [{ ...baseReview, visitedAt: '2026-02-30' }] })],
      }),
    ).toThrow(/dată calendaristică/i)

    expect(() =>
      validateSiteData({
        ...sampleData(),
        restaurants: [sampleRestaurant({ reviews: [{ ...baseReview, visitedAt: '12/01/2026' }] })],
      }),
    ).toThrow()
  })

  it('enforces decimal 1-10 bounds for general and ingredient scores', () => {
    expect(() =>
      validateSiteData({
        ...sampleData(),
        restaurants: [sampleRestaurant({ reviews: [{ ...baseReview, generalScore: 10.1 }] })],
      }),
    ).toThrow()

    expect(() =>
      validateSiteData({
        ...sampleData(),
        restaurants: [
          sampleRestaurant({
            reviews: [{ ...baseReview, ingredients: [{ ingredientId: 'carne', typeId: 'pui', score: 0.9 }] }],
          }),
        ],
      }),
    ).toThrow()
  })

  it('keeps omitted ingredients absent instead of zero-rated', () => {
    const data = sampleData({
      restaurants: [sampleRestaurant({ reviews: [{ ...baseReview, ingredients: [] }] })],
    })
    expect(data.restaurants[0].reviews[0].ingredients).toEqual([])
  })
})

describe('catalog reuse and deduplication', () => {
  it('reuses existing ingredients and rejects casing or whitespace duplicates', () => {
    const data = sampleData()
    expect(() => addIngredient(data.ingredients, '  CARNE ', 'Pui')).toThrow(/există deja/)
    const created = addIngredient(data.ingredients, 'Cartofi', 'Prăjiți')
    expect(created.ingredient.name).toBe('Cartofi')
    expect(created.catalog).toHaveLength(data.ingredients.length + 1)
  })

  it('adds types to existing ingredients without duplicating them', () => {
    const data = sampleData()
    expect(() => addIngredientType(data.ingredients, 'carne', 'pui')).toThrow(/există deja/)
    const created = addIngredientType(data.ingredients, 'carne', 'Miel')
    const carne = created.catalog.find((item) => item.id === 'carne')
    expect(carne?.types.some((type) => type.name === 'Miel')).toBe(true)
  })
})

describe('tiers and latest review', () => {
  it.each([
    [10, 'S'],
    [9, 'S'],
    [8.9, 'A'],
    [8, 'A'],
    [7.9, 'B'],
    [7, 'B'],
    [6.9, 'C'],
    [6, 'C'],
    [5.9, 'D'],
    [1, 'D'],
  ] as const)('maps %s to %s', (score, tier) => {
    expect(scoreToTier(score)).toBe(tier)
  })

  it('selects the latest dated review', () => {
    const latest = latestReview([
      { ...baseReview, id: 'old', visitedAt: '2024-01-01', generalScore: 6 },
      { ...baseReview, id: 'new', visitedAt: '2026-08-01', generalScore: 9.1 },
    ])
    expect(latest.id).toBe('new')
  })

  it('uses a manual override until it is cleared', () => {
    const restaurant = sampleRestaurant({
      manualTier: 'D',
      reviews: [{ ...baseReview, generalScore: 9.4 }],
    })
    expect(restaurantTier(restaurant)).toBe('D')
    expect(restaurantTier({ ...restaurant, manualTier: null })).toBe('S')
  })
})

describe('demo dataset', () => {
  it('parses the shipped demo catalog', () => {
    const data = parseSiteData(demoData)
    expect(data.restaurants.some((item) => item.isDemo)).toBe(true)
    expect(data.ingredients.length).toBeGreaterThan(0)
  })
})
