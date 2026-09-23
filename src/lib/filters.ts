import type { RestaurantView, SiteData } from './site-data'
import { restaurantPublicView } from './site-data'

export interface PlaceFilters {
  query: string
  ingredientId: string
  typeId: string
  minimumScore: string
}

export const EMPTY_FILTERS: PlaceFilters = {
  query: '',
  ingredientId: '',
  typeId: '',
  minimumScore: '',
}

export function hasActiveFilters(filters: PlaceFilters): boolean {
  return Boolean(filters.query.trim() || filters.ingredientId || filters.typeId || filters.minimumScore)
}

function searchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('ro-RO')
}

export function restaurantMatchesFilters(restaurant: RestaurantView, filters: PlaceFilters): boolean {
  const query = searchText(filters.query)
  if (query) {
    const haystack = searchText(
      [
        restaurant.name,
        restaurant.address,
        restaurant.latest.description,
        ...restaurant.latest.ingredients.flatMap((item) => [item.note ?? '']),
      ].join(' '),
    )
    if (!haystack.includes(query)) return false
  }

  if (filters.ingredientId) {
    const assessment = restaurant.latest.ingredients.find((item) => item.ingredientId === filters.ingredientId)
    if (!assessment) return false
    if (filters.typeId && assessment.typeId !== filters.typeId) return false
    if (filters.minimumScore) {
      const minimum = Number(filters.minimumScore)
      if (!Number.isFinite(minimum) || assessment.score < minimum) return false
    }
  }

  return true
}

export function visibleRestaurants(data: SiteData, filters: PlaceFilters): RestaurantView[] {
  return data.restaurants
    .map(restaurantPublicView)
    .filter((restaurant) => restaurantMatchesFilters(restaurant, filters))
    .sort((a, b) => {
      if (a.latest.generalScore === b.latest.generalScore) {
        return a.name.localeCompare(b.name, 'ro-RO')
      }
      return b.latest.generalScore - a.latest.generalScore
    })
}

export const TIER_ORDER = ['S', 'A', 'B', 'C', 'D'] as const
