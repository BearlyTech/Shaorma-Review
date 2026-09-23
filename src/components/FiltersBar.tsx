import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EMPTY_FILTERS, hasActiveFilters, type PlaceFilters } from '@/lib/filters'
import type { Ingredient } from '@/lib/site-data'

interface FiltersBarProps {
  filters: PlaceFilters
  ingredients: Ingredient[]
  onChange: (filters: PlaceFilters) => void
}

export function FiltersBar({ filters, ingredients, onChange }: FiltersBarProps) {
  const selectedIngredient = ingredients.find((item) => item.id === filters.ingredientId)

  return (
    <section aria-label="Filtre publice" className="grid gap-3 rounded-lg border border-ink/10 bg-white/70 p-3 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]">
      <div className="space-y-1">
        <Label htmlFor="cautare">Căutare</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-ink/35" aria-hidden />
          <Input
            id="cautare"
            value={filters.query}
            onChange={(event) => onChange({ ...filters, query: event.target.value })}
            placeholder="Nume, adresă sau descriere"
            className="pl-8"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ingredient">Ingredient</Label>
        <select
          id="ingredient"
          className="h-9 w-full rounded-md border border-ink/15 bg-white/80 px-2 text-sm"
          value={filters.ingredientId}
          onChange={(event) => onChange({ ...filters, ingredientId: event.target.value, typeId: '', minimumScore: filters.minimumScore })}
        >
          <option value="">Toate</option>
          {ingredients.map((ingredient) => (
            <option key={ingredient.id} value={ingredient.id}>
              {ingredient.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="tip">Tip</Label>
        <select
          id="tip"
          className="h-9 w-full rounded-md border border-ink/15 bg-white/80 px-2 text-sm disabled:opacity-50"
          value={filters.typeId}
          disabled={!selectedIngredient}
          onChange={(event) => onChange({ ...filters, typeId: event.target.value })}
        >
          <option value="">Oricare</option>
          {selectedIngredient?.types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="nota-minima">Notă minimă</Label>
        <Input
          id="nota-minima"
          type="number"
          min={1}
          max={10}
          step={0.1}
          disabled={!filters.ingredientId}
          value={filters.minimumScore}
          onChange={(event) => onChange({ ...filters, minimumScore: event.target.value })}
          placeholder="ex. 8,5"
        />
      </div>
      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          disabled={!hasActiveFilters(filters)}
          onClick={() => onChange(EMPTY_FILTERS)}
          aria-label="Resetează filtrele"
        >
          <X className="size-4" />
          Resetează
        </Button>
      </div>
    </section>
  )
}
