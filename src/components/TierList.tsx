import { PlaceCard } from '@/components/PlaceCard'
import { TIER_ORDER } from '@/lib/filters'
import { TIER_LABELS, type Ingredient, type RestaurantView, type Tier } from '@/lib/site-data'

interface TierListProps {
  restaurants: RestaurantView[]
  ingredients: Ingredient[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function TierList({ restaurants, ingredients, selectedId, onSelect }: TierListProps) {
  if (restaurants.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ink/20 bg-white/50 p-6 text-sm text-ink/65" role="status">
        Niciun local nu se potrivește filtrelor. Schimbă căutarea sau resetează filtrele.
      </div>
    )
  }

  return (
    <div className="space-y-6" role="list" aria-label="Listă pe niveluri">
      {TIER_ORDER.map((tier) => {
        const group = restaurants.filter((item) => item.tier === tier)
        if (group.length === 0) return null
        return (
          <section key={tier} aria-labelledby={`nivel-${tier}`}>
            <h2 id={`nivel-${tier}`} className="mb-3 text-sm font-semibold tracking-wide uppercase">
              Nivel {tier} · {TIER_LABELS[tier as Tier]}
            </h2>
            <div className="space-y-3">
              {group.map((restaurant) => (
                <PlaceCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  ingredients={ingredients}
                  selected={selectedId === restaurant.id}
                  onSelect={() => onSelect(restaurant.id)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
