import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  dockedSidebarWidth, panelModeForWidth,
} from '../src/client/layout.ts'

test('uses exact sheet/drawer/dock boundaries', () => {
  assert.equal(panelModeForWidth(640), 'sheet')
  assert.equal(panelModeForWidth(641), 'drawer')
  assert.equal(panelModeForWidth(1479), 'drawer')
  assert.equal(panelModeForWidth(1480), 'docked')
})

test('reserves non-overlapping dock geometry without horizontal overflow', () => {
  for (const width of [1480, 1600, 2000, 2560]) {
    const expanded = dockedSidebarWidth(width, false)
    const collapsed = dockedSidebarWidth(width, true)
    assert.equal((width - expanded) + expanded, width)
    assert.equal((width - collapsed) + collapsed, width)
    assert.ok(expanded >= 440 && expanded <= 560)
    assert.equal(collapsed, 44)
  }
})

test('keeps CSS media geometry aligned with the runtime boundary contract', async () => {
  const styles = await readFile(new URL('../src/client/styles.ts', import.meta.url), 'utf8')
  assert.match(styles, /@media\(min-width:1480px\)/)
  assert.match(styles, /@media\(max-width:1479px\)/)
  assert.match(styles, /@media\(max-width:640px\)/)
  assert.match(styles, /width:calc\(100% - clamp\(560px,40vw,760px\)\)/)
  assert.match(styles, /width:calc\(100% - 44px\)/)
})
