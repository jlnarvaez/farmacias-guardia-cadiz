/**
 * Renders JSON-LD structured data into the document head. React 19 hoists
 * <script> tags rendered inside components to the head automatically.
 */

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe; escaping "<" prevents </script> breaks.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
