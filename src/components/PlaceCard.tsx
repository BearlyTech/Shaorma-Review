import * as Accordion from '@radix-ui/react-accordion'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatDate, formatScore } from '@/lib/format'
import { listItemId } from '@/lib/selection'
import type { Ingredient, RestaurantView, Review } from '@/lib/site-data'
import { cn } from '@/lib/utils'

const TIER_TONES: Record<string, string> = {
  S: 'bg-gold text-ink',
  A: 'bg-emerald-700 text-white',
  B: 'bg-sky-800 text-white',
  C: 'bg-amber-700 text-white',
  D: 'bg-stone-600 text-white',
}

function reviewIngredients(review: Review, ingredients: Ingredient[]) {
  return review.ingredients.map((assessment) => {
    const ingredient = ingredients.find((item) => item.id === assessment.ingredientId)
    const type = ingredient?.types.find((item) => item.id === assessment.typeId)
    return { assessment, ingredient, type }
  })
}

interface PlaceCardProps {
  restaurant: RestaurantView
  ingredients: Ingredient[]
  selected: boolean
  onSelect: () => void
}

export function PlaceCard({ restaurant, ingredients, selected, onSelect }: PlaceCardProps) {
  const older = restaurant.reviews.filter((review) => review.id !== restaurant.latest.id)

  return (
    <Card
      id={listItemId(restaurant.id)}
      className={cn(
        'scroll-mt-4 cursor-pointer p-4 transition-shadow',
        selected ? 'ring-2 ring-paprika shadow-md' : 'hover:shadow-md',
      )}
    >
      <article>
        <button type="button" className="w-full text-left" onClick={onSelect} aria-pressed={selected}>
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">{restaurant.name}</h3>
              <p className="text-sm text-ink/65">{restaurant.address}</p>
            </div>
            <div className="flex items-center gap-2">
              {restaurant.isDemo ? <Badge>Date demo</Badge> : null}
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', TIER_TONES[restaurant.tier])}>
                Nivel {restaurant.tier}
              </span>
            </div>
          </div>
          <p className="text-sm">
            Ultima notă: <strong>{formatScore(restaurant.latest.generalScore)}</strong>
            {restaurant.manualTier ? (
              <span className="ml-2 text-ink/55">
                (automat {restaurant.autoTier}, suprascris manual)
              </span>
            ) : null}
          </p>
          <p className="mt-2 text-sm leading-6">{restaurant.latest.description}</p>
          <p className="mt-2 text-xs text-ink/55">Vizită: {formatDate(restaurant.latest.visitedAt)}</p>
        </button>

        <ul className="mt-3 space-y-1 text-sm">
          {reviewIngredients(restaurant.latest, ingredients).map(({ assessment, ingredient, type }) => (
            <li key={`${restaurant.id}-${assessment.ingredientId}`}>
              <strong>{ingredient?.name ?? 'Ingredient'}</strong>
              {type ? ` · ${type.name}` : ''} · {formatScore(assessment.score)}
              {assessment.note ? <span className="text-ink/60"> — {assessment.note}</span> : null}
            </li>
          ))}
          {restaurant.latest.ingredients.length === 0 ? (
            <li className="text-ink/50">Niciun ingredient notat în ultimul review.</li>
          ) : null}
        </ul>

        {older.length > 0 ? (
          <Accordion.Root type="single" collapsible className="mt-3">
            <Accordion.Item value="istoric">
              <Accordion.Header>
                <Accordion.Trigger className="text-sm font-medium text-paprika underline-offset-2 hover:underline">
                  Istoric reviewuri ({older.length})
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="mt-2 space-y-3">
                {older.map((review) => (
                  <div key={review.id} className="rounded-md bg-ink/4 p-3 text-sm">
                    <p className="font-medium">
                      {formatDate(review.visitedAt)} · {formatScore(review.generalScore)}
                    </p>
                    <p className="mt-1">{review.description}</p>
                    <ul className="mt-2 space-y-1">
                      {reviewIngredients(review, ingredients).map(({ assessment, ingredient, type }) => (
                        <li key={`${review.id}-${assessment.ingredientId}`}>
                          {ingredient?.name} {type ? `(${type.name})` : ''} · {formatScore(assessment.score)}
                          {assessment.note ? ` — ${assessment.note}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        ) : null}
      </article>
    </Card>
  )
}
