/**
 * Central site metadata for SEO and structured data. Keep SITE_BASE_URL in
 * sync with the production origin (GitHub Pages) and `base` in
 * vite.config.ts / basename in main.tsx.
 */

export const SITE_BASE_URL = 'https://jlnarvaez.github.io'
export const SITE_BASE_PATH = '/farmacias-guardia-cadiz'

/** Absolute URL for a path relative to the app base path. */
export function siteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_BASE_URL}${SITE_BASE_PATH}${normalized === '/' ? '/' : normalized}`
}

export const SITE_NAME = 'Farmacias de Guardia Cádiz'

export const homeSeo = {
  title: 'Farmacias de guardia en Cádiz hoy | Abiertas ahora y turnos',
  description:
    'Farmacias de guardia hoy en la provincia de Cádiz, municipio a municipio: ' +
    'cuál está abierta ahora mismo, teléfonos, direcciones y la próxima en abrir. ' +
    'Datos oficiales de COF Cádiz actualizados cada pocos minutos.',
}

export function municipalitySeo(municipalityName: string) {
  return {
    title: `Farmacias de guardia hoy en ${municipalityName} | Abiertas ahora`,
    description:
      `Farmacias de guardia hoy en ${municipalityName} (Cádiz): cuál está abierta ` +
      'ahora mismo, horario de cierre, teléfono, dirección en el mapa y la próxima ' +
      'farmacia en abrir. Actualizado en tiempo real.',
  }
}

/**
 * SEO payload from the URL slug alone: used while municipality data is still
 * loading or when the id is unknown, so hooks stay unconditional.
 */
export function municipalitySeoForSlug(municipalityId: string): {
  title: string
  description: string
} {
  const known = MUNICIPALITY_NAMES[municipalityId]
  if (known) return municipalitySeo(known)
  const guessed = municipalityId
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  return municipalitySeo(guessed || 'este municipio')
}

/**
 * Canonical municipality names by normalized id. Built from the full list of
 * municipalities in the province of Cádiz; ids must match the slug generated
 * by src/domain/municipality.ts.
 */
export const MUNICIPALITY_NAMES: Record<string, string> = {
  'alcala-de-los-gazules': 'Alcalá de los Gazules',
  algeciras: 'Algeciras',
  'algar': 'Algar',
  'arcos-de-la-frontera': 'Arcos de la Frontera',
  'barrios-los': 'Los Barrios',
  'benamahoma-grazalema': 'Benamahoma (Grazalema)',
  'benaocaz': 'Benaocaz',
  'bornos': 'Bornos',
  'cadiz': 'Cádiz',
  'castellar-de-la-frontera': 'Castellar de la Frontera',
  'chiclana-de-la-frontera': 'Chiclana de la Frontera',
  'chipiona': 'Chipiona',
  'conil-de-la-frontera': 'Conil de la Frontera',
  'el-puerto-de-santa-maria': 'El Puerto de Santa María',
  'espera': 'Espera',
  'garganta-la': 'La Garganta',
  'grazalema': 'Grazalema',
  'jerez-de-la-frontera': 'Jerez de la Frontera',
  'jimena-de-la-frontera': 'Jimena de la Frontera',
  'la-linea-de-la-concepcion': 'La Línea de la Concepción',
  'medina-sidonia': 'Medina Sidonia',
  'olvera': 'Olvera',
  'paterna-de-rivera': 'Paterna de Rivera',
  'prado-del-rey': 'Prado del Rey',
  'puerto-real': 'Puerto Real',
  'puerto-serrano': 'Puerto Serrano',
  'el-gastor': 'El Gastor',
  'rota': 'Rota',
  'san-roque': 'San Roque',
  'san-fernando': 'San Fernando',
  'sanlucar-de-barrameda': 'Sanlúcar de Barrameda',
  'san-martin-del-tesorillo': 'San Martín del Tesorillo',
  'san-jose-del-valle': 'San José del Valle',
  'setenil-de-las-bodegas': 'Setenil de las Bodegas',
  'tarifa': 'Tarifa',
  'torre-alhaquime': 'Torre Alháquime',
  trebujena: 'Trebujena',
  ubrique: 'Ubrique',
  'villaluenga-del-rosario': 'Villaluenga del Rosario',
  'villamartin': 'Villamartín',
  'zahara': 'Zahara de la Sierra',
  'zahara-de-los-atunes': 'Zahara de los Atunes',
  'barbate': 'Barbate',
}
