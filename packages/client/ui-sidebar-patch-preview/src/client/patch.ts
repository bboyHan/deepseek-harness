/** Parser and display model for first-page unified diff content. */
import type { DiffHunk } from '@deepseek-ai/dsh-client-ui-primitives'

/** One parsed patch page. */
export interface ParsedPatch {
  /** File hunks in source order. */
  readonly diffs: DiffHunk[]
  /** Number of file sections found in the page. */
  readonly files: number
  /** Number of hunks retained in the page. */
  readonly hunks: number
  /** Added content lines retained in the page. */
  readonly added: number
  /** Removed content lines retained in the page. */
  readonly removed: number
  /** Whether the parser stopped at its configured hunk limit. */
  readonly truncated: boolean
  /** Whether the Host page reached the end of the file. */
  readonly eof: boolean
  /** File version of the page. */
  readonly version: string
  /** Complete byte size when the Host reports it. */
  readonly bytes?: number
}

/** A parser failure that the viewer can explain without exposing parser internals. */
export interface PatchParseFailure {
  readonly ok: false
  readonly message: string
}

/** A successful parser result. */
export interface PatchParseSuccess {
  readonly ok: true
  readonly value: ParsedPatch
}

/** Result of parsing one first text page. */
export type PatchParseResult = PatchParseFailure | PatchParseSuccess

interface MutableHunk {
  path: string
  oldText: string | null
  removed: string[]
  added: string[]
}

interface MutablePatch {
  path: string
  hunks: MutableHunk[]
}

function contentLines(lines: readonly string[]): number {
  return lines.length
}

function stripFilePrefix(value: string, prefix: 'a' | 'b'): string {
  const path = value.split('\t', 1).join('')
  if (path === '/dev/null') return path
  return path.startsWith(`${prefix}/`) ? path.slice(2) : path
}

function pathFromDiffHeader(line: string): string | undefined {
  const match = /^diff --git a\/(.+) b\/(.+)$/u.exec(line)
  return match?.[2] ?? match?.[1]
}

function pathFromFileHeader(line: string, prefix: 'a' | 'b'): string | undefined {
  if (!line.startsWith(`${prefix === 'a' ? '---' : '+++'} `)) return undefined
  return stripFilePrefix(line.slice(4), prefix)
}

function beginPatch(patches: MutablePatch[], path: string): MutablePatch {
  const created: MutablePatch = { path, hunks: [] }
  patches.push(created)
  return created
}

function pathOf(patch: MutablePatch | undefined, oldPath: string | undefined, newPath: string | undefined): string {
  const candidate = newPath !== undefined && newPath !== '/dev/null' ? newPath : oldPath
  return candidate ?? patch?.path ?? 'patch'
}

function parseLines(text: string, maxHunks: number): { patches: MutablePatch[]; truncated: boolean } {
  const patches: MutablePatch[] = []
  let current: MutablePatch | undefined
  let oldPath: string | undefined
  let newPath: string | undefined
  let currentHunk: MutableHunk | undefined
  let hunks = 0
  let truncated = false
  for (const rawLine of text.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
    const diffPath = pathFromDiffHeader(line)
    if (diffPath !== undefined) {
      current = beginPatch(patches, diffPath)
      oldPath = undefined
      newPath = undefined
      currentHunk = undefined
      continue
    }
    if (currentHunk === undefined) {
      const oldHeader = pathFromFileHeader(line, 'a')
      if (oldHeader !== undefined) {
        oldPath = oldHeader
        continue
      }
      const newHeader = pathFromFileHeader(line, 'b')
      if (newHeader !== undefined) {
        newPath = newHeader
        if (current !== undefined) current.path = pathOf(current, oldPath, newPath)
        continue
      }
    }
    if (line.startsWith('@@ ')) {
      if (current === undefined) current = beginPatch(patches, pathOf(undefined, oldPath, newPath))
      if (hunks >= maxHunks) {
        truncated = true
        currentHunk = undefined
        continue
      }
      currentHunk = {
        path: pathOf(current, oldPath, newPath),
        oldText: oldPath === '/dev/null' ? null : '',
        removed: [],
        added: [],
      }
      current.hunks.push(currentHunk)
      hunks += 1
      continue
    }
    if (currentHunk === undefined || line.startsWith('\\ ')) continue
    if (line.startsWith('-')) currentHunk.removed.push(line.slice(1))
    else if (line.startsWith('+')) currentHunk.added.push(line.slice(1))
  }
  return { patches, truncated }
}

/**
 * Parse one first-page unified diff.
 *
 * Context lines are deliberately omitted from the `DiffBlock` input because
 * that primitive renders changed sides and owns the compact collapse/copy UI.
 * The file and hunk counts remain visible so a reader can switch to the text
 * fallback when context is required.
 * @param text - first-page patch text.
 * @param version - file version returned by the Host.
 * @param eof - whether the page reached the end of the file.
 * @param maxHunks - largest number of hunks to retain.
 * @param bytes - complete byte size reported by the Host, when known.
 * @returns the parsed patch or a user-facing parse failure.
 */
export function parsePatch(text: string, version: string, eof: boolean, maxHunks: number, bytes?: number): PatchParseResult {
  const { patches, truncated } = parseLines(text, maxHunks)
  const diffs = patches.flatMap(patch => patch.hunks.map(hunk => ({
    path: hunk.path,
    oldText: hunk.oldText === null ? null : hunk.removed.join('\n'),
    newText: hunk.added.join('\n'),
  } satisfies DiffHunk)))
  if (text.trim() !== '' && patches.length === 0) return { ok: false, message: 'no unified diff file sections found' }
  let added = 0
  let removed = 0
  for (const diff of diffs) {
    added += contentLines(diff.newText === '' ? [] : diff.newText.split('\n'))
    removed += contentLines(diff.oldText === null || diff.oldText === '' ? [] : diff.oldText.split('\n'))
  }
  return {
    ok: true,
    value: {
      diffs,
      files: patches.length,
      hunks: diffs.length,
      added,
      removed,
      truncated,
      eof,
      version,
      ...bytes === undefined ? {} : { bytes },
    },
  }
}
