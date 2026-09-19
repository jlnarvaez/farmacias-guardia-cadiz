/**
 * Minimal SEO manager: writes document.title, standard meta tags, canonical
 * and Open Graph/Twitter tags on route change. React 19 hoists <meta> and
 * <link> rendered from components, but an imperative hook keeps everything in
 * one place and lets later writes override earlier ones deterministically.
 */

import { useEffect } from 'react'

type MetaMap = Record<string, string>

function upsertMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

export interface SeoInput {
  title: string
  description: string
  /** Absolute canonical URL for the current route. */
  canonical: string
}

export function useSeo({ title, description, canonical }: SeoInput) {
  useEffect(() => {
    document.title = title
    upsertMeta('meta[name="description"]', 'name', 'description', description)

    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title)
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description)
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical)
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website')
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'Farmacias de Guardia Cádiz')
    upsertMeta('meta[property="og:locale"]', 'property', 'og:locale', 'es_ES')

    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary')
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)

    upsertLink('canonical', canonical)
  }, [title, description, canonical])
}

export type { MetaMap }
