/** Right-Sidebar tab definition for unified diff and patch files. */
import type { SidebarRightTabDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { parseFileAddress } from '@deepseek-ai/dsh-util-workspace-path'

/** The tab kind this package owns. */
export const PATCH_PREVIEW_KIND = 'patch'

/** This implementation's identity in the tab system. */
export const PATCH_PREVIEW_ID = '@deepseek-ai/dsh-client-ui-sidebar-patch-preview'

/**
 * The tab title for one file resource address.
 * @param address - a file resource address.
 * @returns the decoded basename, or the address when it has no basename.
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
 * Build the patch preview definition.
 * @returns the definition to register with the right Sidebar.
 */
export function patchDefinition(): SidebarRightTabDefinition {
  return {
    id: PATCH_PREVIEW_ID,
    kind: PATCH_PREVIEW_KIND,
    patterns: ['*.diff', '*.patch', '*.udiff'],
    priority: 'extension',
    canOpen: address => parseFileAddress(address) !== undefined,
    title: basenameOf,
  }
}
