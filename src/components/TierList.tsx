import { TIER_ORDER } from '@/lib/filters'
import { formatScore } from '@/lib/format'
import { TIER_LABELS, type RestaurantView, type Tier } from '@/lib/site-data'
import { cn } from '@/lib/utils'

const TIER_BLOCK: Record<Tier, string> = {
  S: 'bg-[#f87171] text-ink',
  A: 'bg-[#fdba74] text-ink',
  B: 'bg-[#fde047] text-ink',
  C: 'bg-[#fef08a] text-ink',
  D: 'bg-[#d9f99d] text-ink',
}

interface TierListProps {
  restaurants: RestaurantView[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function TierList({ restaurants, selectedId, onSelect }: TierListProps) {
  return (
    <div className="bg-transparent" role="list" aria-label="Listă pe niveluri">
      {TIER_ORDER.map((tier) => {
        const group = restaurants.filter((item) => item.tier === tier)
        return (
          <section
            key={tier}
            aria-labelledby={`nivel-${tier}`}
            className="flex min-h-16 border-b border-ink/10 last:border-b-0"
            role="listitem"
          >
            <h2
              id={`nivel-${tier}`}
              className={cn(
                'flex w-12 shrink-0 items-center justify-center text-lg font-bold',
                TIER_BLOCK[tier],
              )}
            >
              {tier}
              <span className="sr-only"> · {TIER_LABELS[tier]}</span>
            </h2>
            <div className="flex min-w-0 flex-1 flex-wrap content-center items-center gap-2 p-2">
              {group.length === 0 ? (
                <p className="px-1 text-xs text-ink/40">Niciun local</p>
              ) : (
                group.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    type="button"
                    onClick={() => onSelect(restaurant.id)}
                    aria-pressed={selectedId === restaurant.id}
                    title={`${restaurant.name} · ${formatScore(restaurant.latest.generalScore)}`}
                    className={cn(
                      'max-w-full rounded-full bg-white px-2.5 py-1 text-left text-ink shadow-sm transition-shadow',
                      selectedId === restaurant.id
                        ? 'ring-2 ring-paprika ring-offset-1 ring-offset-cream'
                        : 'hover:shadow-md',
                    )}
                  >
                    <span className="block truncate text-xs font-medium">{restaurant.name}</span>
                    <span className="block text-[11px] text-ink/55">
                      {formatScore(restaurant.latest.generalScore)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
