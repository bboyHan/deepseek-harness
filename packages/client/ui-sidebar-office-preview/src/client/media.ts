/** Browser-safe byte helpers shared by office document readers. */

/**
 * Decode one base64 response value.
 * @param value - base64-encoded bytes.
 * @returns decoded bytes.
 */
export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

/**
 * Join byte windows into one ArrayBuffer.
 * @param chunks - byte windows in file order.
 * @returns one contiguous buffer.
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
