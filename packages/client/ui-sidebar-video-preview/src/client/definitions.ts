/** Right-Sidebar definition for video file previews. */
import type { SidebarRightTabDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { parseFileAddress } from '@deepseek-ai/dsh-util-workspace-path'

/** The video viewer owned by this package. */
export const VIEWER = {
  id: '@deepseek-ai/dsh-client-ui-sidebar-video-preview/video',
  kind: 'video',
  patterns: ['*.mp4', '*.m4v', '*.webm', '*.ogv', '*.ogg', '*.mov', '*.mkv', '*.avi', '*.wmv', '*.flv', '*.3gp'],
} as const

/**
 * Return the decoded final path segment used as the tab title.
 * @param address - file resource address.
 * @returns decoded basename, or the original address when no basename exists.
 */
export function basenameOf(address: string): string {
  const name = address.slice(address.lastIndexOf('/') + 1)
  if (name === '') return address
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

/**
 * Check whether an address is a readable file resource address.
 * @param address - candidate resource address.
 * @returns whether the address names a file resource.
 */
export function canOpenFile(address: string): boolean {
  return parseFileAddress(address) !== undefined
}

/**
 * Build the video tab definition.
 * @returns the single video tab definition in registration form.
 */
export function videoDefinitions(): SidebarRightTabDefinition[] {
  return [{
    id: VIEWER.id,
    kind: VIEWER.kind,
    patterns: VIEWER.patterns,
    priority: 'extension',
    canOpen: canOpenFile,
    title: basenameOf,
  }]
}
