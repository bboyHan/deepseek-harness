/** Byte helpers used by the SVG reader. */

/**
 * Decode one base64 byte window returned by the workspace Remote.
 * @param data - base64-encoded bytes.
 * @returns decoded bytes.
 */
export function base64ToBytes(data: string): Uint8Array {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

/**
 * Join byte windows without changing their order or contents.
 * @param chunks - byte windows in source order.
 * @returns one byte array containing every chunk.
 */
export function joinBytes(chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}
