import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'

describe('dsh-artifact-viewers bundle', () => {
  it('declares a parseable patch list and the package required by its inserted row', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      dsh?: { bundle?: { patch?: string } }
    }
    expect(manifest.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    const parsed = yaml.load(readFileSync(resolve(root, manifest.dsh!.bundle!.patch!), 'utf8'), { schema: entryListSchema })
    expect(Array.isArray(parsed)).toBe(true)
    const rows = (parsed as { insert?: { id?: string; name?: string }[] }[]).flatMap(patch => patch.insert ?? [])
    expect(rows).toEqual([{
      id: 'ui-sidebar-artifact-preview',
      name: '@deepseek-ai/dsh-client-ui-sidebar-artifact-preview',
    }, {
      id: 'ui-sidebar-office-preview',
      name: '@deepseek-ai/dsh-client-ui-sidebar-office-preview',
    }, {
      id: 'ui-sidebar-patch-preview',
      name: '@deepseek-ai/dsh-client-ui-sidebar-patch-preview',
    }, {
      id: 'ui-sidebar-svg-preview',
      name: '@deepseek-ai/dsh-client-ui-sidebar-svg-preview',
    }])
    expect(manifest.dependencies).toHaveProperty('@deepseek-ai/dsh-client-ui-sidebar-artifact-preview')
    expect(manifest.dependencies).toHaveProperty('@deepseek-ai/dsh-client-ui-sidebar-office-preview')
    expect(manifest.dependencies).toHaveProperty('@deepseek-ai/dsh-client-ui-sidebar-patch-preview')
    expect(manifest.dependencies).toHaveProperty('@deepseek-ai/dsh-client-ui-sidebar-svg-preview')
  })
})
