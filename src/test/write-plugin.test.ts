import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import demoData from '@/data/kebab-places.json'
import { isWriteEndpoint, kebabDataWritePlugin, persistSiteData } from '@/lib/write-plugin'

describe('local write safeguards', () => {
  it('exposes the write plugin only for the Vite dev server', () => {
    const plugin = kebabDataWritePlugin()
    expect(plugin.apply).toBe('serve')
    expect(isWriteEndpoint('/api/site-data', 'POST')).toBe(true)
    expect(isWriteEndpoint('/api/site-data', 'GET')).toBe(false)
    expect(isWriteEndpoint('/admin', 'POST')).toBe(false)
  })

  it('rejects invalid payloads before writing', async () => {
    await expect(persistSiteData('{"ingredients":[]}')).rejects.toThrow()
  })

  it('writes validated JSON to the requested file', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'kebab-'))
    const file = path.join(dir, 'kebab-places.json')
    await persistSiteData(JSON.stringify(demoData), file)
    const saved = JSON.parse(await readFile(file, 'utf8')) as { restaurants: unknown[] }
    expect(saved.restaurants.length).toBeGreaterThan(0)
  })
})
