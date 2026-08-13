import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

test('ships an installable DSH bundle without install-time build scripts', async () => {
  const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8')) as {
    name?: string
    exports?: Record<string, { default?: string }>
    files?: string[]
    scripts?: Record<string, string>
    peerDependenciesMeta?: Record<string, { optional?: boolean }>
    dsh?: {
      bundle?: { patch?: string }
      client?: { platform?: string }
    }
  }

  assert.equal(manifest.name, '@dsh-external/dsh-plannotator')
  assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml')
  assert.equal(manifest.dsh?.client?.platform, 'web')
  assert.equal(manifest.exports?.['.']?.default, './lib/index.js')
  assert.equal(manifest.exports?.['./client']?.default, './lib/client.js')
  assert.ok(manifest.files?.includes('lib'))
  assert.ok(manifest.files?.includes('cordis.patch.yml'))
  assert.equal(manifest.scripts?.prepare, undefined)
  assert.equal(manifest.peerDependenciesMeta?.react?.optional, true)
  assert.equal(manifest.peerDependenciesMeta?.['react-dom']?.optional, true)

  const patch = await readFile(new URL('cordis.patch.yml', root), 'utf8')
  assert.match(patch, /^- insert:\n/m)
  assert.match(patch, /^    - id: dsh-plannotator$/m)
  assert.match(patch, /^      name: '@dsh-external\/dsh-plannotator'$/m)

  const host = await import('../lib/index.js') as Record<string, unknown>
  assert.equal(host.name, 'dsh-plannotator')
  assert.equal(typeof host.apply, 'function')
  assert.equal('default' in host, false)

  const client = await readFile(new URL('lib/client.js', root), 'utf8')
  assert.match(
    client,
    /window\.__ModuleLoader__\.load\(\{ id: "@dsh-external\/dsh-plannotator", factory:/,
  )
})
