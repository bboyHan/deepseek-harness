/**
 * Address translation and Remote bindings for artifact preview reads.
 */
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {
  WorkspaceByteRange,
  WorkspaceFileBytes,
  WorkspaceFileRange,
  WorkspaceFileText,
} from '@deepseek-ai/dsh-api-workspace-files/types'
import { parseFileAddress } from '@deepseek-ai/dsh-util-workspace-path'

/** The slice of the Client Remote this package calls. */
export interface WorkspaceFilesArtifactRemote {
  readonly workspaceFiles: {
    /**
     * Read one text page.
     * @param sessionId - the session whose workspace resolves `path`.
     * @param path - workspace path, absolute or relative to the workspace root.
     * @param range - line window.
     * @param signal - cancels the call.
     * @returns the text page or Host failure.
     */
    read(
      sessionId: SessionId,
      path: string,
      range: WorkspaceFileRange,
      signal?: AbortSignal,
    ): Promise<RemoteResult<WorkspaceFileText>>
    /**
     * Read one byte window.
     * @param sessionId - the session whose workspace resolves `path`.
     * @param path - workspace path, absolute or relative to the workspace root.
     * @param range - byte window.
     * @param signal - cancels the call.
     * @returns the byte window or Host failure.
     */
    readBytes(
      sessionId: SessionId,
      path: string,
      range: WorkspaceByteRange,
      signal?: AbortSignal,
    ): Promise<RemoteResult<WorkspaceFileBytes>>
  }
}

/** Read one text page for an artifact tab. */
export type ReadArtifactText = (
  sessionId: SessionId,
  path: string,
  signal: AbortSignal,
) => Promise<RemoteResult<WorkspaceFileText>>

/** Read one byte window for an artifact tab. */
export type ReadArtifactBytes = (
  sessionId: SessionId,
  path: string,
  offset: number,
  signal: AbortSignal,
) => Promise<RemoteResult<WorkspaceFileBytes>>

/** The file one tab reads: the session the read runs under and the path handed to the Host. */
export interface SessionFile {
  /** The session whose workspace confines the read. */
  readonly sessionId: SessionId
  /** The path the Host receives. */
  readonly path: string
}

/**
 * The session and path one `dsh-resource://file/` address names.
 * @param address - a tab's file resource address.
 * @param sessionId - the seat's session, used for absolute file addresses.
 * @returns the session and path to hand the endpoint.
 */
export function hostFileOf(address: string, sessionId: SessionId): SessionFile {
  const parsed = parseFileAddress(address)
  if (parsed === undefined) {
    throw new Error(`ui-sidebar-artifact-preview: not a file address "${address}"`)
  }
  return parsed.scope === 'session'
    ? { sessionId: parsed.sessionId as SessionId, path: parsed.path }
    : { sessionId, path: parsed.path }
}

/**
 * Bind the text read to one Remote face.
 * @param remote - the Client Remote carrying the `workspaceFiles` namespace.
 * @returns the first-page read the face performs.
 */
export function createReadText(remote: WorkspaceFilesArtifactRemote): ReadArtifactText {
  return (sessionId, path, signal) => remote.workspaceFiles.read(sessionId, path, { offset: 1 }, signal)
}

/**
 * Bind the byte-window read to one Remote face.
 * @param remote - the Client Remote carrying the `workspaceFiles` namespace.
 * @returns the byte-window read the face performs.
 */
export function createReadBytes(remote: WorkspaceFilesArtifactRemote): ReadArtifactBytes {
  return (sessionId, path, offset, signal) => remote.workspaceFiles.readBytes(sessionId, path, { offset }, signal)
}
