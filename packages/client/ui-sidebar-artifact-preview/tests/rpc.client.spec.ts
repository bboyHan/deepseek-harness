import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { createReadBytes, createReadText, hostFileOf } from '../src/client/rpc.ts'
import type { WorkspaceFilesArtifactRemote } from '../src/client/rpc.ts'
import { okBytes, okText, PATH, SESSION } from './fixtures.client.ts'

const SEAT = 'seat-session' as SessionId

describe('artifact preview rpc helpers', () => {
  it('translates session and absolute file addresses into the Host read request', () => {
    expect(hostFileOf('dsh-resource://file/session/s%2F1/work/a%20b.md', SEAT)).toEqual({ sessionId: 's/1', path: 'work/a b.md' })
    expect(hostFileOf('dsh-resource://file/absolute/etc/hosts', SEAT)).toEqual({ sessionId: SEAT, path: '/etc/hosts' })
    expect(hostFileOf('dsh-resource://file/absolute/C:/w/a.md', SEAT)).toEqual({ sessionId: SEAT, path: 'C:/w/a.md' })
    expect(() => hostFileOf('sidebar://guide', SEAT)).toThrow('not a file address')
  })

  it('binds first text page and byte-window reads to the workspaceFiles Remote namespace', async () => {
    const read = vi.fn<WorkspaceFilesArtifactRemote['workspaceFiles']['read']>(() => Promise.resolve(okText('hello')))
    const readBytes = vi.fn<WorkspaceFilesArtifactRemote['workspaceFiles']['readBytes']>(() => Promise.resolve(okBytes(3, 'abc', true)))
    const remote: WorkspaceFilesArtifactRemote = { workspaceFiles: { read, readBytes } }
    const signal = new AbortController().signal
    await expect(createReadText(remote)(SESSION, PATH, signal)).resolves.toEqual(okText('hello'))
    await expect(createReadBytes(remote)(SESSION, PATH, 3, signal)).resolves.toEqual(okBytes(3, 'abc', true))
    expect(read).toHaveBeenCalledWith(SESSION, PATH, { offset: 1 }, signal)
    expect(readBytes).toHaveBeenCalledWith(SESSION, PATH, { offset: 3 }, signal)
  })
})
