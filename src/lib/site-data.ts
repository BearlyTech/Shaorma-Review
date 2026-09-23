import { z } from 'zod'
import { haversineMeters, namesMatch, normalizeName } from './utils'

export const TIERS = ['S', 'A', 'B', 'C', 'D'] as const
export type Tier = (typeof TIERS)[number]

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const ingredientTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
})

export const ingredientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  types: z.array(ingredientTypeSchema).min(1),
})

export const ingredientAssessmentSchema = z.object({
  ingredientId: z.string().min(1),
  typeId: z.string().min(1),
  score: z.number().min(1).max(10),
  note: z.string().trim().max(280).optional(),
})

export const reviewSchema = z.object({
  id: z.string().min(1),
  visitedAt: z.string().regex(DATE_PATTERN, 'Data vizitei trebuie să fie YYYY-MM-DD.'),
  description: z.string().trim().min(1, 'Descrierea generală este obligatorie.'),
  generalScore: z.number().min(1).max(10),
  ingredients: z.array(ingredientAssessmentSchema),
})

export const restaurantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  maptilerId: z.string().min(1).optional(),
  manualTier: z.enum(TIERS).nullable().optional(),
  isDemo: z.boolean().optional(),
  reviews: z.array(reviewSchema).min(1, 'Fiecare local trebuie să aibă cel puțin un review.'),
})

export const siteDataSchema = z.object({
  ingredients: z.array(ingredientSchema),
  restaurants: z.array(restaurantSchema),
})

export type IngredientType = z.infer<typeof ingredientTypeSchema>
export type Ingredient = z.infer<typeof ingredientSchema>
export type IngredientAssessment = z.infer<typeof ingredientAssessmentSchema>
export type Review = z.infer<typeof reviewSchema>
export type Restaurant = z.infer<typeof restaurantSchema>
export type SiteData = z.infer<typeof siteDataSchema>

export const TIER_LABELS: Record<Tier, string> = {
  S: 'Excepțional',
  A: 'Foarte bun',
  B: 'Bun',
  C: 'Acceptabil',
  D: 'Slab',
}

export function isValidVisitDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function isScoreInRange(score: number): boolean {
  return Number.isFinite(score) && score >= 1 && score <= 10
}

export function scoreToTier(score: number): Tier {
  if (score >= 9) return 'S'
  if (score >= 8) return 'A'
  if (score >= 7) return 'B'
  if (score >= 6) return 'C'
  return 'D'
}

export function latestReview(reviews: Review[]): Review {
  return [...reviews].sort((a, b) => {
    if (a.visitedAt === b.visitedAt) return a.id.localeCompare(b.id)
    return a.visitedAt < b.visitedAt ? 1 : -1
  })[0]
}

export function restaurantTier(restaurant: Restaurant): Tier {
  if (restaurant.manualTier) return restaurant.manualTier
  return scoreToTier(latestReview(restaurant.reviews).generalScore)
}

export function restaurantPublicView(restaurant: Restaurant) {
  const latest = latestReview(restaurant.reviews)
  return {
    ...restaurant,
    latest,
    tier: restaurantTier(restaurant),
    autoTier: scoreToTier(latest.generalScore),
  }
}

export type RestaurantView = ReturnType<typeof restaurantPublicView>

function assertUniqueIds(ids: string[], label: string) {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`${label} duplicat: ${id}`)
    }
    seen.add(id)
  }
}

export function findDuplicateIngredientName(ingredients: Ingredient[], name: string, excludeId?: string) {
  return ingredients.find((item) => item.id !== excludeId && namesMatch(item.name, name))
}

export function findDuplicateTypeName(types: IngredientType[], name: string, excludeId?: string) {
  return types.find((item) => item.id !== excludeId && namesMatch(item.name, name))
}

export function formatSiteDataError(error: unknown): string {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0]
    const path = issue?.path.join('.') ?? ''
    if (path.endsWith('name')) return 'Numele este obligatoriu.'
    if (path.endsWith('address')) return 'Adresa este obligatorie.'
    if (path.includes('visitedAt')) return 'Data vizitei trebuie să fie o dată validă (YYYY-MM-DD).'
    if (path.includes('description')) return 'Descrierea generală este obligatorie.'
    if (path.includes('generalScore') || path.endsWith('score')) return 'Notele trebuie să fie numere între 1 și 10.'
    if (path.includes('lat') || path.includes('lng')) return 'Coordonatele sunt invalide.'
    if (path.includes('ingredients') && path.includes('types')) return 'Fiecare ingredient trebuie să aibă cel puțin un tip.'
    if (path.includes('reviews')) return 'Completează data, descrierea și nota reviewului.'
    return issue?.message || 'Datele nu sunt valide.'
  }
  if (error instanceof SyntaxError) return 'JSON-ul nu este valid.'
  if (error instanceof Error) return error.message
  return 'Datele nu au putut fi validate.'
}

export function validateSiteData(input: unknown): SiteData {
  let parsed: SiteData
  try {
    parsed = siteDataSchema.parse(input)
  } catch (error) {
    throw new Error(formatSiteDataError(error))
  }

  for (const ingredient of parsed.ingredients) {
    if (findDuplicateIngredientName(parsed.ingredients, ingredient.name, ingredient.id)) {
      throw new Error(`Ingredientul „${ingredient.name}” există deja în catalog.`)
    }
    for (const type of ingredient.types) {
      if (findDuplicateTypeName(ingredient.types, type.name, type.id)) {
        throw new Error(`Tipul „${type.name}” este duplicat pentru ${ingredient.name}.`)
      }
    }
  }

  assertUniqueIds(parsed.ingredients.map((item) => item.id), 'ID ingredient')
  assertUniqueIds(parsed.restaurants.map((item) => item.id), 'ID local')

  for (const restaurant of parsed.restaurants) {
    if (!Number.isFinite(restaurant.lat) || !Number.isFinite(restaurant.lng)) {
      throw new Error(`Coordonate invalide pentru ${restaurant.name}.`)
    }
    assertUniqueIds(restaurant.reviews.map((item) => item.id), `ID review ${restaurant.name}`)

    for (const review of restaurant.reviews) {
      if (!isValidVisitDate(review.visitedAt)) {
        throw new Error(`Data reviewului ${review.id} nu este o dată calendaristică validă.`)
      }
      if (!isScoreInRange(review.generalScore)) {
        throw new Error(`Nota generală trebuie să fie între 1 și 10.`)
      }

      const seenIngredients = new Set<string>()
      for (const assessment of review.ingredients) {
        if (seenIngredients.has(assessment.ingredientId)) {
          throw new Error(`Ingredientul ${assessment.ingredientId} apare de două ori în același review.`)
        }
        seenIngredients.add(assessment.ingredientId)

        const ingredient = parsed.ingredients.find((item) => item.id === assessment.ingredientId)
        if (!ingredient) {
          throw new Error(`Reviewul referă un ingredient inexistent: ${assessment.ingredientId}.`)
        }
        if (!ingredient.types.some((type) => type.id === assessment.typeId)) {
          throw new Error(`Tipul ${assessment.typeId} nu aparține ingredientului ${ingredient.name}.`)
        }
        if (!isScoreInRange(assessment.score)) {
          throw new Error(`Nota ingredientului trebuie să fie între 1 și 10.`)
        }
      }
    }
  }

  for (let i = 0; i < parsed.restaurants.length; i += 1) {
    for (let j = i + 1; j < parsed.restaurants.length; j += 1) {
      const left = parsed.restaurants[i]
      const right = parsed.restaurants[j]
      const samePoi = left.maptilerId && left.maptilerId === right.maptilerId
      const sameSpot = haversineMeters(left, right) < 15
      const sameName = namesMatch(left.name, right.name) && namesMatch(left.address, right.address)
      if (samePoi || sameSpot || sameName) {
        throw new Error(`Localurile „${left.name}” și „${right.name}” par duplicate.`)
      }
    }
  }

  return parsed
}

export function parseSiteData(input: unknown): SiteData {
  return validateSiteData(input)
}

export function referencedIngredientIds(data: SiteData): Set<string> {
  const ids = new Set<string>()
  for (const restaurant of data.restaurants) {
    for (const review of restaurant.reviews) {
      for (const assessment of review.ingredients) {
        ids.add(assessment.ingredientId)
      }
    }
  }
  return ids
}

export function referencedTypeIds(data: SiteData, ingredientId: string): Set<string> {
  const ids = new Set<string>()
  for (const restaurant of data.restaurants) {
    for (const review of restaurant.reviews) {
      for (const assessment of review.ingredients) {
        if (assessment.ingredientId === ingredientId) {
          ids.add(assessment.typeId)
        }
      }
    }
  }
  return ids
}

export function addIngredient(
  catalog: Ingredient[],
  name: string,
  typeName: string,
): { catalog: Ingredient[]; ingredient: Ingredient; type: IngredientType } {
  const cleanName = normalizeName(name)
  const cleanType = normalizeName(typeName)
  if (!cleanName) throw new Error('Numele ingredientului este obligatoriu.')
  if (!cleanType) throw new Error('Adaugă cel puțin un tip pentru ingredient.')
  if (findDuplicateIngredientName(catalog, cleanName)) {
    throw new Error(`Ingredientul „${cleanName}” există deja.`)
  }

  const type = { id: `type-${crypto.randomUUID?.() ?? `${Date.now()}`}`, name: cleanType }
  const ingredient: Ingredient = {
    id: `ing-${crypto.randomUUID?.() ?? `${Date.now()}`}`,
    name: cleanName,
    types: [type],
  }

  return { catalog: [...catalog, ingredient], ingredient, type }
}

export function addIngredientType(catalog: Ingredient[], ingredientId: string, typeName: string) {
  const cleanType = normalizeName(typeName)
  if (!cleanType) throw new Error('Numele tipului este obligatoriu.')

  const next = catalog.map((ingredient) => {
    if (ingredient.id !== ingredientId) return ingredient
    if (findDuplicateTypeName(ingredient.types, cleanType)) {
      throw new Error(`Tipul „${cleanType}” există deja pentru ${ingredient.name}.`)
    }
    return {
      ...ingredient,
      types: [...ingredient.types, { id: `type-${crypto.randomUUID?.() ?? `${Date.now()}`}`, name: cleanType }],
    }
  })

  const ingredient = next.find((item) => item.id === ingredientId)
  if (!ingredient) throw new Error('Ingredientul nu a fost găsit.')
  const type = ingredient.types[ingredient.types.length - 1]
  return { catalog: next, ingredient, type }
}
