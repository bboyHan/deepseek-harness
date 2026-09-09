import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { createReadBytes, hostFileOf } from '../src/client/rpc.ts'

describe('SVG preview RPC bindings', () => {
  it('maps session and absolute file addresses', () => {
    expect(hostFileOf('dsh-resource://file/session/s-2/a.svg', 'current' as SessionId)).toEqual({ sessionId: 's-2', path: 'a.svg' })
    expect(hostFileOf('dsh-resource://file/absolute/C:/work/a.svg', 'current' as SessionId)).toEqual({ sessionId: 'current', path: 'C:/work/a.svg' })
    expect(() => hostFileOf('dsh-resource://file/shared/team/a.svg', 'current' as SessionId)).toThrow('not a file address')
  })

  it('binds byte offsets to the workspace Remote', async () => {
    const readBytes = vi.fn().mockResolvedValue({ ok: true, value: {} })
    const read = createReadBytes({ workspaceFiles: { readBytes } })
    await read('s-1' as SessionId, 'a.svg', 12, new AbortController().signal)
    expect(readBytes).toHaveBeenCalledWith('s-1', 'a.svg', { offset: 12 }, expect.any(AbortSignal))
  })
})
