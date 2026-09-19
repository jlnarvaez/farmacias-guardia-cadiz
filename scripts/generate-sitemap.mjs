/**
 * Build-time SEO artifacts generator. Writes into dist/ after `vite build`:
 *
 * - sitemap.xml: home plus one URL per municipality. The municipality list is
 *   fetched from the same public COF Cádiz endpoint the app uses; if the
 *   network is unavailable it falls back to the static province list.
 * - 404.html: copy of index.html used as SPA fallback on GitHub Pages so
 *   deep links like /municipio/sanlucar-de-barrameda resolve instead of 404.
 */

import { readFile, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '..', 'dist')

const SITE_BASE_URL = 'https://jlnarvaez.github.io'
const SITE_BASE_PATH = '/farmacias-guardia-cadiz'

const ENDPOINT =
  'https://www.cofcadiz.es/wp-json/vcomm/v1/farmacias/guardia?estilo=completo&limit=1000'

const FALLBACK_NAMES = [
  'Alcalá de los Gazules',
  'Algeciras',
  'Algar',
  'Arcos de la Frontera',
  'Benalup-Casas Viejas',
  'Benaocaz',
  'Benamahoma (Grazalema)',
  'Bornos',
  'Cádiz',
  'Castellar de la Frontera',
  'Chiclana de la Frontera',
  'Chipiona',
  'Conil de la Frontera',
  'El Gastor',
  'El Puerto de Santa María',
  'Espera',
  'Grazalema',
  'Jerez de la Frontera',
  'Jimena de la Frontera',
  'La Línea de la Concepción',
  'Los Barrios',
  'Medina Sidonia',
  'Olvera',
  'Paterna de Rivera',
  'Prado del Rey',
  'Puerto Real',
  'Puerto Serrano',
  'Rota',
  'San Fernando',
  'San José del Valle',
  'San Martín del Tesorillo',
  'San Roque',
  'Sanlúcar de Barrameda',
  'Setenil de las Bodegas',
  'Tarifa',
  'Torre Alháquime',
  'Trebujena',
  'Ubrique',
  'Villaluenga del Rosario',
  'Villamartín',
  'Zahara de la Sierra',
]

/** Same slug rules as src/domain/municipality.ts (toMunicipalityId). */
function toMunicipalityId(rawName) {
  let name = rawName.trim()
  const article = /^(.+),\s*(el|la|los|las)$/i.exec(name)
  if (article) name = `${article[2].toLowerCase()} ${article[1].trim()}`
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function fetchMunicipalityNames() {
  try {
    const response = await fetch(ENDPOINT, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw new Error(`status ${response.status}`)
    const payload = await response.json()
    const records = Array.isArray(payload.informacion) ? payload.informacion : []
    const names = new Set()
    for (const record of records) {
      const contacts = Array.isArray(record.contactos_profesionales)
        ? record.contactos_profesionales
        : []
      const raw = contacts.find((c) => c?.municipio)?.municipio ?? record.zona_guardia
      if (typeof raw === 'string' && raw.trim()) names.add(raw.trim())
    }
    if (names.size === 0) throw new Error('empty municipality list')
    console.log(`sitemap: ${names.size} municipalities from COF endpoint`)
    return [...names]
  } catch (cause) {
    console.warn(`sitemap: COF endpoint unavailable (${cause.message}); using static fallback`)
    return null
  }
}

async function main() {
  const rawNames = (await fetchMunicipalityNames()) ?? FALLBACK_NAMES

  // Reorder "Barrios, Los" style names and dedupe by id.
  const byId = new Map()
  for (const raw of rawNames) {
    let name = raw.trim().replace(/\s+/g, ' ')
    const article = /^(.+),\s*(el|la|los|las)$/i.exec(name)
    if (article) name = `${article[2].toLowerCase()} ${article[1].trim()}`
    name = name.charAt(0).toUpperCase() + name.slice(1)
    byId.set(toMunicipalityId(name), name)
  }

  const today = new Date().toISOString().slice(0, 10)
  const base = `${SITE_BASE_URL}${SITE_BASE_PATH}`

  const urls = [
    { loc: `${base}/`, changefreq: 'hourly', priority: '1.0' },
    ...[...byId.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([id, name]) => ({
        loc: `${base}/municipio/${id}/`,
        changefreq: 'hourly',
        priority: '0.8',
        name,
      })),
  ]

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) =>
      [
        '  <url>',
        `    <loc>${url.loc}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${url.changefreq}</changefreq>`,
        `    <priority>${url.priority}</priority>`,
        url.name ? `    <!-- ${url.name} -->` : null,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    '</urlset>',
    '',
  ].join('\n')

  await writeFile(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8')
  await copyFile(path.join(distDir, 'index.html'), path.join(distDir, '404.html'))
  console.log(
    `sitemap: wrote ${urls.length} URLs; 404.html SPA fallback created`,
  )
}

main()
