/** Browser-safe image helpers for artifact previews. */

/** Mime types the first-phase image viewer can display. */
const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/**
 * Infer the image media type from a file path.
 * @param path - file path or resource address.
 * @returns a browser image MIME type, or the octet-stream fallback.
 */
export function imageMimeType(path: string): string {
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream'
}

/**
 * Decode one base64 value to bytes.
 * @param value - base64-encoded bytes from the Remote endpoint.
 * @returns decoded bytes.
 */
export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

/**
 * Join byte chunks into one contiguous array.
 * @param chunks - chunks in file order.
 * @returns combined bytes.
 */
export function joinBytes(chunks: readonly Uint8Array[]): ArrayBuffer {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const buffer = new ArrayBuffer(total)
  const joined = new Uint8Array(buffer)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.byteLength
  }
  return buffer
}
