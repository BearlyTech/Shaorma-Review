import { PlaceCard } from '@/components/PlaceCard'
import type { Ingredient, RestaurantView } from '@/lib/site-data'

interface ReviewListProps {
  restaurants: RestaurantView[]
  ingredients: Ingredient[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ReviewList({ restaurants, ingredients, selectedId, onSelect }: ReviewListProps) {
  if (restaurants.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ink/20 bg-white/50 p-6 text-sm text-ink/65" role="status">
        Niciun local nu se potrivește filtrelor. Schimbă căutarea sau resetează filtrele.
      </div>
    )
  }

  return (
    <div className="space-y-3" role="list" aria-label="Reviewuri">
      {restaurants.map((restaurant) => (
        <PlaceCard
          key={restaurant.id}
          restaurant={restaurant}
          ingredients={ingredients}
          selected={selectedId === restaurant.id}
          onSelect={() => onSelect(restaurant.id)}
        />
      ))}
    </div>
  )
}
