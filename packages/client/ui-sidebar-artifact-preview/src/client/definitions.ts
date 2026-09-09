/**
 * Right-Sidebar tab definitions for rendered file previews.
 *
 * Each definition claims only `dsh-resource://file/` addresses whose basename
 * extension matches its viewer, and each uses the `extension` band so it beats
 * the plain-text fallback while remaining replaceable by a later extension.
 */
import type { SidebarRightTabDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { parseFileAddress } from '@deepseek-ai/dsh-util-workspace-path'

/** Viewer ids and kinds this package owns. */
export const VIEWERS = {
  markdown: {
    id: '@deepseek-ai/dsh-client-ui-sidebar-artifact-preview/markdown',
    kind: 'markdown',
    patterns: ['*.md', '*.markdown'],
  },
  image: {
    id: '@deepseek-ai/dsh-client-ui-sidebar-artifact-preview/image',
    kind: 'image',
    patterns: ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.bmp', '*.avif'],
  },
  json: {
    id: '@deepseek-ai/dsh-client-ui-sidebar-artifact-preview/json',
    kind: 'json',
    patterns: ['*.json'],
  },
  csv: {
    id: '@deepseek-ai/dsh-client-ui-sidebar-artifact-preview/csv',
    kind: 'csv',
    patterns: ['*.csv', '*.tsv'],
  },
} as const

/** Viewer discriminator used inside this package. */
export type ArtifactViewer = keyof typeof VIEWERS

/**
 * The tab title for one `file:` address: its decoded basename.
 * @param address - a `file:`-shaped address.
 * @returns the decoded last path segment, or the address itself when it has none.
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
 * Whether an address is a file resource address the workspace-files Remote can read.
 * @param address - candidate resource address.
 * @returns true when the file-address grammar accepts the address.
 */
export function canOpenFile(address: string): boolean {
  return parseFileAddress(address) !== undefined
}

/**
 * Build the four artifact preview definitions in registration order.
 * @returns the definitions to register with the right Sidebar.
 */
export function artifactDefinitions(): SidebarRightTabDefinition[] {
  return Object.values(VIEWERS).map(viewer => ({
    id: viewer.id,
    kind: viewer.kind,
    patterns: viewer.patterns,
    priority: 'extension',
    canOpen: canOpenFile,
    title: basenameOf,
  }))
}
