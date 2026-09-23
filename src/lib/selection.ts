import type { RestaurantView } from './site-data'

export function findSelectedRestaurant(
  restaurants: RestaurantView[],
  selectedId: string | null,
): RestaurantView | null {
  if (!selectedId) return null
  return restaurants.find((item) => item.id === selectedId) ?? null
}

export function nextSelectedId(
  currentId: string | null,
  nextId: string,
): string {
  return currentId === nextId ? nextId : nextId
}

export function listItemId(restaurantId: string): string {
  return `local-${restaurantId}`
}
