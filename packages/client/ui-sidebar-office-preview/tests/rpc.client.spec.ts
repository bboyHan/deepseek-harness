import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceFileBytes } from '@deepseek-ai/dsh-api-workspace-files/types'
import type { WorkspaceFilesOfficeRemote } from '../src/client/rpc.ts'
import { createReadBytes, hostFileOf } from '../src/client/rpc.ts'
import { okBytes, PATH, SESSION } from './fixtures.client.ts'

const CURRENT = 'current' as SessionId

describe('office preview RPC helpers', () => {
  it('translates session and absolute resource addresses', () => {
    expect(hostFileOf('dsh-resource://file/session/s%2F1/work/a%20b.docx', CURRENT)).toEqual({ sessionId: 's/1', path: 'work/a b.docx' })
    expect(hostFileOf('dsh-resource://file/absolute/C:/work/report.xlsx', CURRENT)).toEqual({ sessionId: CURRENT, path: 'C:/work/report.xlsx' })
    expect(() => hostFileOf('sidebar://guide', CURRENT)).toThrow('not a file address')
  })

  it('binds offset reads to the workspace-files Remote', async () => {
    const readBytes = vi.fn<WorkspaceFilesOfficeRemote['workspaceFiles']['readBytes']>(() => Promise.resolve(okBytes(4, 'data', true)))
    const remote: WorkspaceFilesOfficeRemote = { workspaceFiles: { readBytes } }
    const signal = new AbortController().signal
    const result = await createReadBytes(remote)(SESSION, PATH, 4, signal)
    expect(result).toEqual(okBytes(4, 'data', true))
    expect(readBytes).toHaveBeenCalledWith(SESSION, PATH, { offset: 4 }, signal)
    if (!result.ok) throw new Error('expected a successful byte read')
    const bytes: WorkspaceFileBytes = result.value
    expect(bytes.offset).toBe(4)
  })
})
