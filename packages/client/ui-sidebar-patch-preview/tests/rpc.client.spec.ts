import { describe, expect, it, vi } from 'vitest'
import type { WorkspaceFileText } from '@deepseek-ai/dsh-api-workspace-files/types'
import { createReadText, hostFileOf } from '../src/client/rpc.ts'
import { ADDRESS, PATH, SESSION } from './fixtures.client.ts'

describe('patch preview rpc bindings', () => {
  it('translates session and absolute file addresses', () => {
    expect(hostFileOf(ADDRESS, SESSION)).toEqual({ sessionId: SESSION, path: PATH })
    expect(hostFileOf('dsh-resource://file/absolute/C:/work/change.patch', SESSION)).toEqual({
      sessionId: SESSION,
      path: 'C:/work/change.patch',
    })
    expect(() => hostFileOf('sidebar://guide', SESSION)).toThrow('not a file address')
  })

  it('binds a first-page read with the expected range', async () => {
    const value = {} as WorkspaceFileText
    const read = vi.fn(async () => ({ ok: true as const, value }))
    const signal = new AbortController().signal
    await expect(createReadText({ workspaceFiles: { read } })(SESSION, PATH, signal)).resolves.toEqual({ ok: true, value })
    expect(read).toHaveBeenCalledWith(SESSION, PATH, { offset: 1 }, signal)
  })
})
