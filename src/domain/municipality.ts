/**
 * Municipality name normalization: strips accents, lowercases, fixes the
 * "Apellido, El" article ordering used by the API, and produces stable ids.
 */

const ACCENTS = /[\u0300-\u036f]/g

/** Remove diacritics and lowercase, e.g. "Cádiz" -> "cadiz". */
export function foldCase(value: string): string {
  return value.normalize('NFD').replace(ACCENTS, '').toLowerCase()
}

const ARTICLE_SUFFIX_PATTERN = /^(.+),\s*(el|la|los|las)$/i

/**
 * Reorder names like "Barrios, Los" to "Los Barrios". Returns null when the
 * input does not use the inverted article form.
 */
export function moveToArticleFirst(value: string): string | null {
  const match = ARTICLE_SUFFIX_PATTERN.exec(value.trim())
  if (!match) return null
  return `${match[2].toLowerCase()} ${match[1].trim()}`
}

const ALIASES: Record<string, string> = {
  // "Benamahoma" and "Benamahoma (Grazalema)" both map to the same place.
  benamahoma: 'benamahoma-grazalema',
  'benamahoma-grazalema': 'benamahoma-grazalema',
}

/**
 * Produce the canonical id for a municipality name. Handles accent folding,
 * case, article order and known aliases (e.g. guard zones vs municipalities).
 */
export function toMunicipalityId(rawName: string): string {
  let name = rawName.trim()

  const reordered = moveToArticleFirst(name)
  if (reordered) name = reordered

  const folded = foldCase(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return ALIASES[folded] ?? folded
}

/**
 * Human friendly display name from a raw API municipality: fixes article
 * order and collapses extra whitespace, keeping original capitalization.
 */
export function toMunicipalityDisplayName(rawName: string): string {
  let name = rawName.trim().replace(/\s+/g, ' ')
  const reordered = moveToArticleFirst(name)
  if (reordered) name = reordered.charAt(0).toUpperCase() + reordered.slice(1)
  return name
}
