/**
 * Builders for JSON-LD structured data: WebSite/WebPage graphs for the home
 * and MedicalClinic entries per on-duty pharmacy.
 */

import {
  SITE_NAME,
  SITE_BASE_URL,
  SITE_BASE_PATH,
  municipalitySeo,
} from '../lib/seo'
import type { Pharmacy } from '../domain/types'
import type { MunicipalityAvailability } from '../domain/availability'

export function municipalityWebPageGraph(
  municipalityName: string,
  municipalityId: string,
) {
  const seo = municipalitySeo(municipalityName)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: seo.title,
        description: seo.description,
        url: `${SITE_BASE_URL}${SITE_BASE_PATH}/municipio/${municipalityId}`,
        inLanguage: 'es-ES',
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: `${SITE_BASE_URL}${SITE_BASE_PATH}/`,
        },
      },
    ],
  }
}

function mapsUrlFor(pharmacy: Pharmacy): string | null {
  return pharmacy.coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${pharmacy.coordinates.lat},${pharmacy.coordinates.lng}`
    : null
}

export function pharmacyGraph(
  pharmacy: Pharmacy,
  status: 'openNow' | 'onCallNow' | 'opensSoon',
  closesAt?: string,
) {
  const mapsUrl = mapsUrlFor(pharmacy)
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: pharmacy.pharmacyName,
    address: {
      '@type': 'PostalAddress',
      streetAddress: pharmacy.address,
      addressLocality: pharmacy.municipalityName,
      addressRegion: 'Cádiz',
      addressCountry: 'ES',
    },
    telephone: pharmacy.phone || undefined,
    ...(mapsUrl ? { hasMap: mapsUrl } : {}),
    ...(pharmacy.coordinates
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: pharmacy.coordinates.lat,
            longitude: pharmacy.coordinates.lng,
          },
        }
      : {}),
    medicalSpecialty: 'https://schema.org/Pharmacy',
    ...(status === 'openNow' && closesAt
      ? {
          openingHoursSpecification: [
            {
              '@type': 'OpeningHoursSpecification',
              description: `Guardia: abierta ahora, cierra a las ${closesAt}.`,
            },
          ],
        }
      : {}),
  }
}

export function availabilitySummaryGraph(entry: MunicipalityAvailability) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: municipalitySeo(entry.municipality.name).title,
    url: `${SITE_BASE_URL}${SITE_BASE_PATH}/municipio/${entry.municipality.id}`,
    about: {
      '@type': 'ItemList',
      numberOfItems:
        entry.openNow.length + entry.onCallNow.length + entry.upcoming.length,
      itemListElement: [
        ...entry.openNow.map((pharmacy: Pharmacy, index: number) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: pharmacy.pharmacyName,
        })),
        ...entry.onCallNow.map((pharmacy: Pharmacy, index: number) => ({
          '@type': 'ListItem',
          position: entry.openNow.length + index + 1,
          name: pharmacy.pharmacyName,
        })),
        ...entry.upcoming.map(({ pharmacy }, index: number) => ({
          '@type': 'ListItem',
          position: entry.openNow.length + entry.onCallNow.length + index + 1,
          name: pharmacy.pharmacyName,
        })),
      ],
    },
  }
}
