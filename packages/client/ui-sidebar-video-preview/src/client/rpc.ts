/** Address translation and Host route URLs for video previews. */
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionOpenWorkspacePathRequest, SessionOpenWorkspacePathValue } from '@deepseek-ai/dsh-api-session-controller/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { parseFileAddress } from '@deepseek-ai/dsh-util-workspace-path'

const ROUTE = '/api/sidebar-video-preview/file'

/** Client Remote subset used by the video viewer. */
export interface VideoRemote {
  readonly session: {
    /**
     * Open one Host path in the operating system default application.
     * @param request - prepared Host path.
     * @param signal - cancellation signal.
     * @returns whether the Host accepted the open request.
     */
    openWorkspacePath(
      request: SessionOpenWorkspacePathRequest,
      signal?: AbortSignal,
    ): Promise<RemoteResult<SessionOpenWorkspacePathValue>>
  }
}

/** File identity handed to the Host route and native opener. */
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
 * @returns session and path for the Host route.
 * @throws when the address is not a file resource.
 */
export function hostFileOf(address: string, sessionId: SessionId): SessionFile {
  const parsed = parseFileAddress(address)
  if (parsed === undefined) {
    throw new Error(`ui-sidebar-video-preview: not a file address "${address}"`)
  }
  return parsed.scope === 'session'
    ? { sessionId: parsed.sessionId as SessionId, path: parsed.path }
    : { sessionId, path: parsed.path }
}

/**
 * Build the authenticated same-origin video route URL.
 * @param file - Host file identity.
 * @param revision - reload revision used to force the browser to request a fresh resource.
 * @returns relative URL for `<video>`, download, and new-window fallback.
 */
export function videoUrlOf(file: SessionFile, revision: number): string {
  const params = new URLSearchParams()
  params.set('sessionId', file.sessionId)
  params.set('path', file.path)
  params.set('v', String(revision))
  return `${ROUTE}?${params.toString()}`
}

/**
 * Read a stable download name from a Host path.
 * @param path - Host or workspace path.
 * @returns decoded basename, or a generic video name.
 */
export function downloadNameOf(path: string): string {
  const name = path.split(/[\\/]/u).filter(Boolean).at(-1)
  return name ?? 'video'
}
