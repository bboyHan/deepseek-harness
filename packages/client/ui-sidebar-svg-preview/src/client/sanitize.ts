/** SVG sanitization used before creating a browser Blob URL. */
import DOMPurify from 'dompurify'

/** Result of validating and sanitizing one SVG document. */
export type SanitizedSvg =
  | { readonly ok: true; readonly value: string; readonly warnings: readonly SvgWarning[] }
  | { readonly ok: false; readonly code: 'unsafe-content' | 'invalid-document'; readonly message: string }

/** Non-fatal SVG content changes applied before rendering. */
export type SvgWarning = 'active-content-removed' | 'external-resources-removed' | 'external-resources-loaded'

const fragmentOnly = /^#[A-Za-z_][A-Za-z0-9_.:-]*$/
const externalHttp = /^https?:\/\//i
const forbiddenTags = new Set(['script', 'foreignobject', 'iframe', 'object', 'embed'])
const urlFunction = /url\(\s*(['"]?)(.*?)\1\s*\)/gi
const cssImport = /@import\b[^;]*(?:;|$)/gi
const unsafeCss = /(?:expression\s*\(|-moz-binding\s*:|javascript\s*:)/i

function safeReference(value: string, externalResourcePolicy: 'strip' | 'allow'): boolean {
  const reference = value.trim()
  return fragmentOnly.test(reference) || (externalResourcePolicy === 'allow' && externalHttp.test(reference))
}

function hasDisallowedUrlFunction(value: string, externalResourcePolicy: 'strip' | 'allow'): boolean {
  for (const match of value.matchAll(urlFunction)) {
    if (!safeReference(match[2] ?? '', externalResourcePolicy)) return true
  }
  return false
}

interface SanitizedCss {
  readonly value: string
  readonly changed: boolean
  readonly removed: boolean
  readonly external: boolean
}

function sanitizeCss(value: string, externalResourcePolicy: 'strip' | 'allow'): SanitizedCss {
  let changed = false
  let external = false
  const withoutImports = value.replace(cssImport, () => {
    changed = true
    return ''
  })
  if (unsafeCss.test(withoutImports)) return { value: '', changed: true, removed: true, external: false }
  const sanitized = withoutImports.replace(urlFunction, (match, _quote: string, reference: string) => {
    if (safeReference(reference, externalResourcePolicy)) {
      if (externalHttp.test(reference.trim())) external = true
      return match
    }
    changed = true
    return 'none'
  })
  return { value: sanitized, changed, removed: false, external }
}

/**
 * Remove active SVG content and apply the external-reference policy before
 * creating a Blob URL. The rendered result is still passed through an image
 * element, never inserted into the HTML document.
 * @param source - decoded SVG text.
 * @param externalResourcePolicy - whether HTTP(S) references remain in the output.
 * @returns a safe SVG string or a validation failure.
 */
export function sanitizeSvg(source: string, externalResourcePolicy: 'strip' | 'allow' = 'allow'): SanitizedSvg {
  if (!/<svg(?:\s|>)/i.test(source)) {
    return { ok: false, code: 'invalid-document', message: 'document has no svg root' }
  }
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml')
  if (
    parsed.querySelector('parsererror') !== null
    || parsed.documentElement.nodeName.toLowerCase() !== 'svg'
    || parsed.doctype !== null
  ) {
    return { ok: false, code: 'invalid-document', message: 'document is not a valid svg' }
  }
  const warnings = new Set<SvgWarning>()
  const elements = [parsed.documentElement, ...Array.from(parsed.documentElement.querySelectorAll('*'))]
  for (const element of elements) {
    if (forbiddenTags.has(element.localName.toLowerCase())) {
      element.remove()
      warnings.add('active-content-removed')
      continue
    }
    if (element.localName.toLowerCase() === 'style') {
      const css = sanitizeCss(element.textContent, externalResourcePolicy)
      if (css.removed || css.value.trim() === '') {
        element.remove()
        warnings.add('active-content-removed')
      } else {
        element.textContent = css.value
        if (css.changed) warnings.add('external-resources-removed')
        if (css.external) warnings.add('external-resources-loaded')
      }
      continue
    }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name)
        warnings.add('active-content-removed')
        continue
      }
      if (name === 'style') {
        const css = sanitizeCss(attribute.value, externalResourcePolicy)
        if (css.removed || css.value.trim() === '') {
          element.removeAttribute(attribute.name)
          warnings.add('active-content-removed')
        } else {
          attribute.value = css.value
          if (css.changed) warnings.add('external-resources-removed')
          if (css.external) warnings.add('external-resources-loaded')
        }
        continue
      }
      if ((name === 'href' || name === 'xlink:href') && !safeReference(attribute.value, externalResourcePolicy)) {
        element.removeAttribute(attribute.name)
        warnings.add('external-resources-removed')
        continue
      }
      if ((name === 'href' || name === 'xlink:href') && externalHttp.test(attribute.value.trim())) {
        warnings.add('external-resources-loaded')
      }
      if (hasDisallowedUrlFunction(attribute.value, externalResourcePolicy)) {
        const css = sanitizeCss(attribute.value, externalResourcePolicy)
        if (css.value.trim() === '') element.removeAttribute(attribute.name)
        else attribute.value = css.value
        warnings.add('external-resources-removed')
      }
    }
  }
  const sanitized = DOMPurify.sanitize(parsed.documentElement.outerHTML, {
    USE_PROFILES: { svg: true },
    ADD_TAGS: ['use'],
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed'],
  })
  const root = new DOMParser().parseFromString(sanitized, 'image/svg+xml').documentElement
  if (root.nodeName.toLowerCase() !== 'svg' || root.querySelector('parsererror') !== null) {
    return { ok: false, code: 'invalid-document', message: 'document is not a valid svg' }
  }
  return { ok: true, value: sanitized, warnings: [...warnings] }
}
