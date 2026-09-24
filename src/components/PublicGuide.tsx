import { useMemo, useState } from 'react'
import { FiltersBar } from '@/components/FiltersBar'
import { KebabMap } from '@/components/KebabMap'
import { TierList } from '@/components/TierList'
import rawSiteData from '@/data/kebab-places.json'
import { EMPTY_FILTERS, type PlaceFilters, visibleRestaurants } from '@/lib/filters'
import { maptilerKey } from '@/lib/maptiler'
import { findSelectedRestaurant, listItemId } from '@/lib/selection'
import { parseSiteData, type SiteData } from '@/lib/site-data'

interface PublicGuideProps {
  initialData?: SiteData
  preview?: boolean
}

export function PublicGuide({ initialData, preview = false }: PublicGuideProps) {
  const [filters, setFilters] = useState<PlaceFilters>(EMPTY_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, error } = useMemo(() => {
    try {
      return { data: parseSiteData(initialData ?? rawSiteData), error: null }
    } catch (loadError) {
      return {
        data: null,
        error: loadError instanceof Error ? loadError.message : 'Datele site-ului sunt invalide.',
      }
    }
  }, [initialData])

  const restaurants = useMemo(() => (data ? visibleRestaurants(data, filters) : []), [data, filters])
  const visibleSelectedId = findSelectedRestaurant(restaurants, selectedId)?.id ?? null

  function selectPlace(id: string) {
    setSelectedId(id)
    document.getElementById(listItemId(id))?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4">
          {error}
        </p>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p role="status">Se încarcă ghidul...</p>
      </main>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-paprika uppercase">Shaorma.review</p>
            <h1 className="text-2xl font-bold md:text-3xl">Ghid kebab București</h1>
            <p className="max-w-2xl text-sm text-ink/70">
              Reviewuri personale, notate pe ingrediente. Ultimul review decide nota afișată și nivelul, dacă nu există o suprascriere manuală.
            </p>
          </div>
          {preview ? <p className="text-sm font-medium text-paprika">Previzualizare locală</p> : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
        <FiltersBar filters={filters} ingredients={data.ingredients} onChange={setFilters} />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:items-start">
          <div className="h-[42vh] lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]">
            <KebabMap
              restaurants={restaurants}
              selectedId={visibleSelectedId}
              mapKey={maptilerKey()}
              onSelect={selectPlace}
            />
          </div>
          <TierList
            restaurants={restaurants}
            ingredients={data.ingredients}
            selectedId={visibleSelectedId}
            onSelect={selectPlace}
          />
        </div>
      </main>
    </div>
  )
}
