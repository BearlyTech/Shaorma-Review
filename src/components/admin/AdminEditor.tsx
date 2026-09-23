import { useEffect, useMemo, useState } from 'react'
import { PublicGuide } from '@/components/PublicGuide'
import { KebabMap } from '@/components/KebabMap'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import rawSiteData from '@/data/kebab-places.json'
import { visibleRestaurants } from '@/lib/filters'
import { maptilerKey, reverseGeocode, searchVenues, type MappedVenue } from '@/lib/maptiler'
import {
  addIngredient,
  addIngredientType,
  parseSiteData,
  referencedIngredientIds,
  referencedTypeIds,
  restaurantPublicView,
  TIERS,
  validateSiteData,
  type IngredientAssessment,
  type Restaurant,
  type Review,
  type SiteData,
  type Tier,
} from '@/lib/site-data'
import { createId, normalizeName } from '@/lib/utils'

interface PlaceDraft {
  id: string
  name: string
  address: string
  lat: string
  lng: string
  maptilerId: string
  manualTier: '' | Tier
}

interface ReviewDraft {
  id: string
  visitedAt: string
  description: string
  generalScore: string
  selectedIngredientIds: string[]
  assessments: Record<string, { typeId: string; score: string; note: string }>
}

function emptyPlace(): PlaceDraft {
  return { id: '', name: '', address: '', lat: '', lng: '', maptilerId: '', manualTier: '' }
}

function emptyReview(): ReviewDraft {
  return {
    id: createId('rev'),
    visitedAt: new Date().toISOString().slice(0, 10),
    description: '',
    generalScore: '',
    selectedIngredientIds: [],
    assessments: {},
  }
}

function restaurantToDraft(restaurant: Restaurant): PlaceDraft {
  return {
    id: restaurant.id,
    name: restaurant.name,
    address: restaurant.address,
    lat: String(restaurant.lat),
    lng: String(restaurant.lng),
    maptilerId: restaurant.maptilerId ?? '',
    manualTier: restaurant.manualTier ?? '',
  }
}

function reviewToDraft(review: Review): ReviewDraft {
  return {
    id: review.id,
    visitedAt: review.visitedAt,
    description: review.description,
    generalScore: String(review.generalScore),
    selectedIngredientIds: review.ingredients.map((item) => item.ingredientId),
    assessments: Object.fromEntries(
      review.ingredients.map((item) => [
        item.ingredientId,
        { typeId: item.typeId, score: String(item.score), note: item.note ?? '' },
      ]),
    ),
  }
}

function buildReview(draft: ReviewDraft): Review {
  const ingredients: IngredientAssessment[] = draft.selectedIngredientIds.map((ingredientId) => {
    const assessment = draft.assessments[ingredientId]
    return {
      ingredientId,
      typeId: assessment?.typeId ?? '',
      score: Number(assessment?.score),
      note: normalizeName(assessment?.note ?? '') || undefined,
    }
  })

  return {
    id: draft.id,
    visitedAt: draft.visitedAt,
    description: normalizeName(draft.description),
    generalScore: Number(draft.generalScore),
    ingredients,
  }
}

async function persist(data: SiteData) {
  const valid = validateSiteData(data)
  const response = await fetch('/api/site-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(valid),
  })
  const payload = (await response.json()) as { ok: boolean; error?: string }
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? 'Salvarea a eșuat.')
  }
  return valid
}

export default function AdminEditor() {
  const [data, setData] = useState<SiteData>(() => parseSiteData(rawSiteData))
  const [place, setPlace] = useState<PlaceDraft>(emptyPlace)
  const [review, setReview] = useState<ReviewDraft>(emptyReview)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<MappedVenue[]>([])
  const [searching, setSearching] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [newIngredient, setNewIngredient] = useState({ name: '', type: '' })
  const [newType, setNewType] = useState({ ingredientId: '', name: '' })

  const selectedRestaurant = data.restaurants.find((item) => item.id === place.id) ?? null
  const views = useMemo(() => visibleRestaurants(data, { query: '', ingredientId: '', typeId: '', minimumScore: '' }), [data])

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (search.trim().length < 2) {
        setResults([])
        return
      }
      setSearching(true)
      try {
        setResults(await searchVenues(search))
        setError(null)
      } catch (searchError) {
        setError(searchError instanceof Error ? searchError.message : 'Căutarea a eșuat.')
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => window.clearTimeout(handle)
  }, [search])

  function applyVenue(venue: MappedVenue, keepId = place.id) {
    setPlace({
      id: keepId,
      name: venue.name,
      address: venue.address,
      lat: String(venue.lat),
      lng: String(venue.lng),
      maptilerId: venue.maptilerId ?? '',
      manualTier: place.manualTier,
    })
    setStatus(`Local selectat: ${venue.name}`)
  }

  async function handleMapClick(lng: number, lat: number) {
    try {
      const venue = await reverseGeocode(lng, lat)
      applyVenue(
        venue ?? {
          name: place.name || 'Local nou',
          address: place.address || 'București',
          lat,
          lng,
          kind: 'address',
        },
      )
      setError(null)
    } catch (mapError) {
      setPlace((current) => ({ ...current, lat: String(lat), lng: String(lng) }))
      setError(mapError instanceof Error ? mapError.message : 'Geocodarea inversă a eșuat.')
    }
  }

  function loadRestaurant(restaurant: Restaurant, reviewToEdit?: Review) {
    setPlace(restaurantToDraft(restaurant))
    setReview(reviewToEdit ? reviewToDraft(reviewToEdit) : emptyReview())
    setStatus(`Editezi ${restaurant.name}`)
  }

  function toggleIngredient(ingredientId: string) {
    setReview((current) => {
      const selected = current.selectedIngredientIds.includes(ingredientId)
      const selectedIngredientIds = selected
        ? current.selectedIngredientIds.filter((id) => id !== ingredientId)
        : [...current.selectedIngredientIds, ingredientId]
      const assessments = { ...current.assessments }
      if (!selected && !assessments[ingredientId]) {
        const ingredient = data.ingredients.find((item) => item.id === ingredientId)
        assessments[ingredientId] = { typeId: ingredient?.types[0]?.id ?? '', score: '', note: '' }
      }
      return { ...current, selectedIngredientIds, assessments }
    })
  }

  function updateAssessment(ingredientId: string, patch: Partial<ReviewDraft['assessments'][string]>) {
    setReview((current) => ({
      ...current,
      assessments: {
        ...current.assessments,
        [ingredientId]: { ...{ typeId: '', score: '', note: '' }, ...current.assessments[ingredientId], ...patch },
      },
    }))
  }

  async function saveCurrent() {
    try {
      const nextReview = buildReview(review)
      const restaurant: Restaurant = {
        id: place.id || createId('loc'),
        name: normalizeName(place.name),
        address: normalizeName(place.address),
        lat: Number(place.lat),
        lng: Number(place.lng),
        maptilerId: place.maptilerId || undefined,
        manualTier: place.manualTier || null,
        isDemo: selectedRestaurant?.isDemo,
        reviews: selectedRestaurant
          ? selectedRestaurant.reviews.some((item) => item.id === nextReview.id)
            ? selectedRestaurant.reviews.map((item) => (item.id === nextReview.id ? nextReview : item))
            : [...selectedRestaurant.reviews, nextReview]
          : [nextReview],
      }

      const restaurants = selectedRestaurant
        ? data.restaurants.map((item) => (item.id === restaurant.id ? restaurant : item))
        : [...data.restaurants, restaurant]

      const saved = await persist({ ...data, restaurants })
      setData(saved)
      setPlace(restaurantToDraft(restaurant))
      setReview(emptyReview())
      setStatus('Datele au fost salvate în kebab-places.json.')
      setError(null)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Salvarea a eșuat.')
    }
  }

  async function deleteReview(restaurantId: string, reviewId: string) {
    try {
      const restaurant = data.restaurants.find((item) => item.id === restaurantId)
      if (!restaurant) return
      if (restaurant.reviews.length === 1) {
        throw new Error('Nu poți șterge ultimul review. Șterge tot localul din JSON după export, dacă e cazul.')
      }
      const restaurants = data.restaurants.map((item) =>
        item.id === restaurantId ? { ...item, reviews: item.reviews.filter((entry) => entry.id !== reviewId) } : item,
      )
      const saved = await persist({ ...data, restaurants })
      setData(saved)
      if (place.id === restaurantId) {
        setReview(emptyReview())
      }
      setStatus('Reviewul a fost șters.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Ștergerea a eșuat.')
    }
  }

  function createIngredientInline() {
    try {
      const result = addIngredient(data.ingredients, newIngredient.name, newIngredient.type)
      const next = { ...data, ingredients: result.catalog }
      setData(next)
      setReview((current) => ({
        ...current,
        selectedIngredientIds: [...current.selectedIngredientIds, result.ingredient.id],
        assessments: {
          ...current.assessments,
          [result.ingredient.id]: { typeId: result.type.id, score: '', note: '' },
        },
      }))
      setNewIngredient({ name: '', type: '' })
      setStatus(`Ingredientul „${result.ingredient.name}” a fost adăugat în catalog.`)
      setError(null)
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : 'Ingredientul nu a putut fi creat.')
    }
  }

  function createTypeInline() {
    try {
      const result = addIngredientType(data.ingredients, newType.ingredientId, newType.name)
      setData({ ...data, ingredients: result.catalog })
      setNewType({ ingredientId: newType.ingredientId, name: '' })
      setStatus(`Tipul „${result.type.name}” a fost adăugat.`)
      setError(null)
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : 'Tipul nu a putut fi creat.')
    }
  }

  function exportData() {
    const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'kebab-places.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importData(file: File) {
    try {
      const saved = await persist(parseSiteData(JSON.parse(await file.text())))
      setData(saved)
      setStatus('Backup-ul a fost importat și salvat.')
      setError(null)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Importul a eșuat.')
    }
  }

  const usedIngredients = referencedIngredientIds(data)
  const selectedView = selectedRestaurant ? restaurantPublicView(selectedRestaurant) : null

  if (preview) {
    return (
      <div>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-ink/10 bg-cream/95 px-4 py-3">
          <p className="text-sm font-medium">Previzualizare publică a datelor locale</p>
          <Button variant="secondary" onClick={() => setPreview(false)}>
            Înapoi la studio
          </Button>
        </div>
        <PublicGuide initialData={data} preview />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-ink/10 bg-white/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-paprika uppercase">Studio local</p>
            <h1 className="text-2xl font-bold">Editor de reviewuri</h1>
            <p className="text-sm text-ink/70">Doar pe serverul de dezvoltare. Salvarea scrie direct în `src/data/kebab-places.json`.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPreview(true)}>
              Previzualizare publică
            </Button>
            <Button variant="outline" onClick={exportData}>
              Exportă JSON
            </Button>
            <Label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-ink/15 bg-white px-3 text-sm">
              Importă JSON
              <input
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void importData(file)
                }}
              />
            </Label>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-3">
          <Card className="space-y-3 p-4">
            <div>
              <Label htmlFor="cautare-maptiler">Caută un local în București</Label>
              <Input
                id="cautare-maptiler"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ex. shaorma Băneasa"
              />
              <p className="mt-1 text-xs text-ink/55">
                {searching ? 'Se caută...' : 'Rezultatele includ POI-uri denumite, cu etichete în română unde există.'}
              </p>
            </div>
            <ul className="max-h-40 space-y-2 overflow-auto" aria-label="Rezultate MapTiler">
              {results.map((venue) => (
                <li key={`${venue.maptilerId}-${venue.lat}-${venue.lng}`}>
                  <button
                    type="button"
                    className="w-full rounded-md bg-ink/4 px-3 py-2 text-left text-sm hover:bg-ink/8"
                    onClick={() => applyVenue(venue)}
                  >
                    <strong>{venue.name}</strong>
                    <span className="block text-ink/60">{venue.address}</span>
                  </button>
                </li>
              ))}
              {!searching && search.trim().length >= 2 && results.length === 0 ? (
                <li className="text-sm text-ink/55">Niciun rezultat. Click pe hartă pentru geocodare inversă.</li>
              ) : null}
            </ul>
          </Card>

          <div className="h-[46vh]">
            <KebabMap
              restaurants={views}
              selectedId={place.id || null}
              mapKey={maptilerKey()}
              onSelect={(id) => {
                const restaurant = data.restaurants.find((item) => item.id === id)
                if (restaurant) loadRestaurant(restaurant)
              }}
              onMapClick={handleMapClick}
            />
          </div>
        </section>

        <section className="space-y-4">
          {error ? <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">{error}</p> : null}
          {status ? <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">{status}</p> : null}

          <Card className="space-y-3 p-4">
            <h2 className="font-semibold">Local</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="nume-local">Nume</Label>
                <Input id="nume-local" value={place.name} onChange={(event) => setPlace({ ...place, name: event.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="adresa">Adresă</Label>
                <Input id="adresa" value={place.address} onChange={(event) => setPlace({ ...place, address: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="lat">Latitudine</Label>
                <Input id="lat" value={place.lat} onChange={(event) => setPlace({ ...place, lat: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="lng">Longitudine</Label>
                <Input id="lng" value={place.lng} onChange={(event) => setPlace({ ...place, lng: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="maptiler-id">ID MapTiler</Label>
                <Input id="maptiler-id" value={place.maptilerId} onChange={(event) => setPlace({ ...place, maptilerId: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="nivel-manual">Nivel manual</Label>
                <select
                  id="nivel-manual"
                  className="h-9 w-full rounded-md border border-ink/15 bg-white/80 px-2 text-sm"
                  value={place.manualTier}
                  onChange={(event) => setPlace({ ...place, manualTier: event.target.value as PlaceDraft['manualTier'] })}
                >
                  <option value="">Automat, din ultimul review</option>
                  {TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Review</h2>
              <Button variant="ghost" size="sm" onClick={() => setReview(emptyReview())}>
                Review nou
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="data-vizita">Data vizitei</Label>
                <Input id="data-vizita" type="date" value={review.visitedAt} onChange={(event) => setReview({ ...review, visitedAt: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="nota-generala">Notă generală (1–10)</Label>
                <Input id="nota-generala" type="number" min={1} max={10} step={0.1} value={review.generalScore} onChange={(event) => setReview({ ...review, generalScore: event.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="descriere">Descriere generală</Label>
                <Textarea id="descriere" value={review.description} onChange={(event) => setReview({ ...review, description: event.target.value })} />
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Ingrediente prezente</legend>
              {data.ingredients.map((ingredient) => {
                const selected = review.selectedIngredientIds.includes(ingredient.id)
                const assessment = review.assessments[ingredient.id]
                return (
                  <div key={ingredient.id} className="rounded-md bg-ink/4 p-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" checked={selected} onChange={() => toggleIngredient(ingredient.id)} />
                      {ingredient.name}
                    </label>
                    {selected ? (
                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <select
                          className="h-9 rounded-md border border-ink/15 bg-white px-2 text-sm"
                          value={assessment?.typeId ?? ''}
                          onChange={(event) => updateAssessment(ingredient.id, { typeId: event.target.value })}
                          aria-label={`Tip ${ingredient.name}`}
                        >
                          <option value="">Alege tipul</option>
                          {ingredient.types.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          step={0.1}
                          placeholder="Notă"
                          value={assessment?.score ?? ''}
                          onChange={(event) => updateAssessment(ingredient.id, { score: event.target.value })}
                          aria-label={`Notă ${ingredient.name}`}
                        />
                        <Input
                          placeholder="Notă scurtă, opțional"
                          value={assessment?.note ?? ''}
                          onChange={(event) => updateAssessment(ingredient.id, { note: event.target.value })}
                          aria-label={`Comentariu ${ingredient.name}`}
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </fieldset>

            <div className="grid gap-2 rounded-md border border-dashed border-ink/15 p-3 md:grid-cols-[1fr_1fr_auto]">
              <Input placeholder="Ingredient nou" value={newIngredient.name} onChange={(event) => setNewIngredient({ ...newIngredient, name: event.target.value })} />
              <Input placeholder="Primul tip" value={newIngredient.type} onChange={(event) => setNewIngredient({ ...newIngredient, type: event.target.value })} />
              <Button type="button" variant="secondary" onClick={createIngredientInline}>
                Adaugă
              </Button>
            </div>

            <Button type="button" onClick={() => void saveCurrent()}>
              Salvează localul și reviewul
            </Button>
          </Card>

          {selectedView ? (
            <Card className="space-y-2 p-4">
              <h2 className="font-semibold">Reviewuri salvate</h2>
              <ul className="space-y-2 text-sm">
                {selectedView.reviews.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 rounded-md bg-ink/4 px-3 py-2">
                    <span>
                      {item.visitedAt} · {item.generalScore}
                    </span>
                    <span className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => loadRestaurant(selectedView, item)}>
                        Editează
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void deleteReview(selectedView.id, item.id)}>
                        Șterge
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card className="space-y-3 p-4">
            <h2 className="font-semibold">Catalog ingrediente</h2>
            <ul className="space-y-2 text-sm">
              {data.ingredients.map((ingredient) => {
                const usedTypes = referencedTypeIds(data, ingredient.id)
                return (
                  <li key={ingredient.id}>
                    <strong>{ingredient.name}</strong>
                    {usedIngredients.has(ingredient.id) ? ' · folosit în reviewuri' : ' · poate fi șters din JSON dacă nu îl vrei'}
                    <div className="text-ink/65">{ingredient.types.map((type) => `${type.name}${usedTypes.has(type.id) ? '' : ''}`).join(', ')}</div>
                  </li>
                )
              })}
            </ul>
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <select
                className="h-9 rounded-md border border-ink/15 bg-white px-2 text-sm"
                value={newType.ingredientId}
                onChange={(event) => setNewType({ ...newType, ingredientId: event.target.value })}
              >
                <option value="">Ingredient existent</option>
                {data.ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
              <Input placeholder="Tip nou" value={newType.name} onChange={(event) => setNewType({ ...newType, name: event.target.value })} />
              <Button type="button" variant="secondary" onClick={createTypeInline}>
                Adaugă tip
              </Button>
            </div>
          </Card>
        </section>
      </main>
    </div>
  )
}
