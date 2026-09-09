/** Right-Sidebar definitions for office document previews. */
import type { SidebarRightTabDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { parseFileAddress } from '@deepseek-ai/dsh-util-workspace-path'

/** Office viewers owned by this package. */
export const VIEWERS = {
  pdf: {
    id: '@deepseek-ai/dsh-client-ui-sidebar-office-preview/pdf',
    kind: 'office-pdf',
    patterns: ['*.pdf'],
  },
  docx: {
    id: '@deepseek-ai/dsh-client-ui-sidebar-office-preview/docx',
    kind: 'office-docx',
    patterns: ['*.docx'],
  },
  xlsx: {
    id: '@deepseek-ai/dsh-client-ui-sidebar-office-preview/xlsx',
    kind: 'office-xlsx',
    patterns: ['*.xlsx'],
  },
} as const

/** Office viewer discriminator. */
export type OfficeViewer = keyof typeof VIEWERS

/**
 * The tab title for one file address.
 * @param address - file resource address.
 * @returns decoded basename, or the original address without a basename.
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
 * Check whether an address can be read by the workspace file Remote.
 * @param address - candidate resource address.
 * @returns whether the address names a file resource.
 */
export function canOpenFile(address: string): boolean {
  return parseFileAddress(address) !== undefined
}

/**
 * Build all office tab definitions in registration order.
 * @returns definitions for PDF, DOCX, and XLSX.
 */
export function officeDefinitions(): SidebarRightTabDefinition[] {
  return Object.values(VIEWERS).map(viewer => ({
    id: viewer.id,
    kind: viewer.kind,
    patterns: viewer.patterns,
    priority: 'extension',
    canOpen: canOpenFile,
    title: basenameOf,
  }))
}
