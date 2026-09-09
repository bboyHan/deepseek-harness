import { describe, expect, it } from 'vitest'
import { parsePatch } from '../src/client/patch.ts'

const FILE_HEADER = [
  'diff --git a/src/a.txt b/src/a.txt',
  'index 1111111..2222222 100644',
  '--- a/src/a.txt',
  '+++ b/src/a.txt',
  '@@ -1,3 +1,3 @@',
  ' context',
  '-old',
  '+++ added-looking content',
  '+new',
].join('\n')

describe('parsePatch', () => {
  it('parses one file and keeps changed lines that resemble file headers', () => {
    const result = parsePatch(FILE_HEADER, 'v1', true, 10, 4096)
    expect(result).toEqual({
      ok: true,
      value: {
        diffs: [{
          path: 'src/a.txt',
          oldText: 'old',
          newText: '++ added-looking content\nnew',
        }],
        files: 1,
        hunks: 1,
        added: 2,
        removed: 1,
        truncated: false,
        eof: true,
        version: 'v1',
        bytes: 4096,
      },
    })
  })

  it('parses multiple files, renames, and new files', () => {
    const result = parsePatch([
      'diff --git a/old.txt b/new.txt',
      'similarity index 95%',
      'rename from old.txt',
      'rename to new.txt',
      '--- a/old.txt',
      '+++ b/new.txt',
      '@@ -1 +1 @@',
      '-before',
      '+after',
      'diff --git a/new.txt b/new.txt',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/new.txt',
      '@@ -0,0 +1 @@',
      '+created',
    ].join('\n'), 'v2', true, 10)
    expect(result).toMatchObject({
      ok: true,
      value: {
        files: 2,
        hunks: 2,
        added: 2,
        removed: 1,
        diffs: [
          { path: 'new.txt', oldText: 'before', newText: 'after' },
          { path: 'new.txt', oldText: null, newText: 'created' },
        ],
      },
    })
  })

  it('accepts a patch without a git header and marks limits and page truncation', () => {
    const result = parsePatch([
      '--- a/a.txt',
      '+++ b/a.txt',
      '@@ -1 +1 @@',
      '-a',
      '+b',
      '@@ -3 +3 @@',
      '-c',
      '+d',
    ].join('\n'), 'v1', false, 1)
    expect(result).toMatchObject({
      ok: true,
      value: {
        files: 1,
        hunks: 1,
        added: 1,
        removed: 1,
        truncated: true,
        eof: false,
      },
    })
  })

  it('limits the total retained hunks across all file sections', () => {
    const result = parsePatch([
      'diff --git a/a.txt b/a.txt',
      '--- a/a.txt',
      '+++ b/a.txt',
      '@@ -1 +1 @@',
      '-a',
      '+b',
      'diff --git a/b.txt b/b.txt',
      '--- a/b.txt',
      '+++ b/b.txt',
      '@@ -1 +1 @@',
      '-c',
      '+d',
    ].join('\n'), 'v1', true, 1)
    expect(result).toMatchObject({
      ok: true,
      value: {
        files: 2,
        hunks: 1,
        added: 1,
        removed: 1,
        truncated: true,
        diffs: [{ path: 'a.txt', oldText: 'a', newText: 'b' }],
      },
    })
  })

  it('returns an empty result for empty text and rejects unrelated text', () => {
    expect(parsePatch('', 'v1', true, 10, 0)).toEqual({
      ok: true,
      value: { diffs: [], files: 0, hunks: 0, added: 0, removed: 0, truncated: false, eof: true, version: 'v1', bytes: 0 },
    })
    expect(parsePatch('not a patch', 'v1', true, 10)).toEqual({
      ok: false,
      message: 'no unified diff file sections found',
    })
  })

  it('handles unprefixed headers, deletion-only hunks, and a hunk without file headers', () => {
    expect(parsePatch([
      '--- old.txt',
      '+++ new.txt',
      '@@ -1 +0,0 @@',
      '-removed',
    ].join('\n'), 'v1', true, 10)).toMatchObject({
      ok: true,
      value: { files: 1, hunks: 1, added: 0, removed: 1, diffs: [{ path: 'new.txt', newText: '' }] },
    })
    expect(parsePatch([
      '@@ -0,0 +1 @@',
      '+created',
    ].join('\n'), 'v1', true, 10)).toMatchObject({
      ok: true,
      value: { files: 1, hunks: 1, diffs: [{ path: 'patch', oldText: '', newText: 'created' }] },
    })
  })

  it('normalizes CRLF line endings before parsing paths and changed content', () => {
    const result = parsePatch([
      'diff --git a/src/a.txt b/src/a.txt',
      '--- a/src/a.txt',
      '+++ b/src/a.txt',
      '@@ -1 +1 @@',
      '-old',
      '+new',
    ].join('\r\n'), 'v1', true, 10)
    expect(result).toMatchObject({
      ok: true,
      value: {
        diffs: [{ path: 'src/a.txt', oldText: 'old', newText: 'new' }],
        files: 1,
        hunks: 1,
        added: 1,
        removed: 1,
      },
    })
  })
})
