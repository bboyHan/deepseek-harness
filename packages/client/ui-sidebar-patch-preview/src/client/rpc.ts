/** Address translation and Remote bindings for patch preview reads. */
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceFileText } from '@deepseek-ai/dsh-api-workspace-files/types'
import { parseFileAddress } from '@deepseek-ai/dsh-util-workspace-path'

/** The Remote face needed by the patch preview. */
export interface WorkspaceFilesPatchRemote {
  readonly workspaceFiles: {
    /**
     * Read one text page.
     * @param sessionId - the Session whose workspace resolves `path`.
     * @param path - workspace path, absolute or relative to the workspace root.
     * @param range - line window.
     * @param signal - cancels the call.
     * @returns the text page or Host failure.
     */
    read(
      sessionId: SessionId,
      path: string,
      range: { readonly offset?: number; readonly limit?: number },
      signal?: AbortSignal,
    ): Promise<RemoteResult<WorkspaceFileText>>
  }
}

/** The file one tab reads. */
export interface SessionFile {
  /** The Session whose workspace confines the read. */
  readonly sessionId: SessionId
  /** The path the Host receives. */
  readonly path: string
}

/** Bound first-page text read used by the patch face. */
export type ReadPatchText = (
  sessionId: SessionId,
  path: string,
  signal: AbortSignal,
) => Promise<RemoteResult<WorkspaceFileText>>

/**
 * Translate a file resource address into the Host read arguments.
 * @param address - a tab's file resource address.
 * @param sessionId - the seat's Session, used for absolute file addresses.
 * @returns the Session and path to hand to the endpoint.
 */
export function hostFileOf(address: string, sessionId: SessionId): SessionFile {
  const parsed = parseFileAddress(address)
  if (parsed === undefined) {
    throw new Error(`ui-sidebar-patch-preview: not a file address "${address}"`)
  }
  return parsed.scope === 'session'
    ? { sessionId: parsed.sessionId as SessionId, path: parsed.path }
    : { sessionId, path: parsed.path }
}

/**
 * Bind the first-page read to one Remote face.
 * @param remote - the Client Remote carrying the workspace-files namespace.
 * @returns the read used by the preview face.
 */
export function createReadText(remote: WorkspaceFilesPatchRemote): ReadPatchText {
  return (sessionId, path, signal) => remote.workspaceFiles.read(sessionId, path, { offset: 1 }, signal)
}
