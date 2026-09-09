/** Address translation and Remote bindings for SVG preview reads. */
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceByteRange, WorkspaceFileBytes } from '@deepseek-ai/dsh-api-workspace-files/types'
import { parseFileAddress } from '@deepseek-ai/dsh-util-workspace-path'

/** Client Remote subset used by the SVG viewer. */
export interface WorkspaceFilesSvgRemote {
  readonly workspaceFiles: {
    /**
     * Read one raw byte window.
     * @param sessionId - session whose workspace resolves the path.
     * @param path - absolute or session-relative file path.
     * @param range - bounded byte range.
     * @param signal - cancellation signal.
     * @returns bytes or a typed Remote failure.
     */
    readBytes(
      sessionId: SessionId,
      path: string,
      range: WorkspaceByteRange,
      signal?: AbortSignal,
    ): Promise<RemoteResult<WorkspaceFileBytes>>
  }
}

/** Read one byte window for an SVG tab. */
export type ReadSvgBytes = (
  sessionId: SessionId,
  path: string,
  offset: number,
  signal: AbortSignal,
) => Promise<RemoteResult<WorkspaceFileBytes>>

/** File identity handed to the Host. */
export interface SessionFile {
  /** Session whose workspace confines the read. */
  readonly sessionId: SessionId
  /** Path the Host receives. */
  readonly path: string
}

/**
 * Translate a file resource address into the Host request.
 * @param address - file resource address.
 * @param sessionId - current session for absolute addresses.
 * @returns session and path for the Remote.
 * @throws when the address is not a file resource.
 */
export function hostFileOf(address: string, sessionId: SessionId): SessionFile {
  const parsed = parseFileAddress(address)
  if (parsed === undefined) {
    throw new Error(`ui-sidebar-svg-preview: not a file address "${address}"`)
  }
  return parsed.scope === 'session'
    ? { sessionId: parsed.sessionId as SessionId, path: parsed.path }
    : { sessionId, path: parsed.path }
}

/**
 * Bind byte reads to one Remote face.
 * @param remote - client Remote namespace containing workspace file byte reads.
 * @returns byte read function used by the SVG face.
 */
export function createReadBytes(remote: WorkspaceFilesSvgRemote): ReadSvgBytes {
  return (sessionId, path, offset, signal) => remote.workspaceFiles.readBytes(sessionId, path, { offset }, signal)
}
