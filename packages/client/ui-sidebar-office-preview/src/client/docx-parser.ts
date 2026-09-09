/** DOCX conversion with a sanitized HTML result. */
import DOMPurify from 'dompurify'
import mammoth from 'mammoth/mammoth.browser.js'

/** Parsed DOCX result or a stable parse failure. */
export type DocxParseResult =
  | { readonly ok: true; readonly html: string }
  | { readonly ok: false; readonly message: string }

/**
 * Convert DOCX bytes to sanitized HTML.
 * @param buffer - complete DOCX bytes.
 * @returns sanitized document HTML or a parser failure.
 */
export async function parseDocx(buffer: ArrayBuffer): Promise<DocxParseResult> {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
    return { ok: true, html: DOMPurify.sanitize(result.value, { USE_PROFILES: { html: true } }) }
  } catch (error: unknown) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) }
  }
}
