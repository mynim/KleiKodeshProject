// @vitest-environment jsdom
/**
 * What survives a restart, and what is dropped on the way in. Only the reader's
 * CHANGES are stored, so this is also the test of what happens when the app
 * they stored them with is no longer the app reading them.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  assignShortcut,
  clearShortcut,
  initShortcutSettings,
  isShortcutChanged,
  resetAllShortcuts,
  resetShortcut,
  shortcutOverrides,
} from './shortcutSettings'
import { activeBindings } from './shortcutSettings'

const DISK_KEY = 'kitvei-hakodesh.shortcuts.overrides'

function stored(): unknown {
  const raw = localStorage.getItem(DISK_KEY)
  return raw === null ? null : JSON.parse(raw)
}

function chordsOf(id: string): readonly string[] {
  return activeBindings.value.definitions.find((definition) => definition.id === id)?.chords ?? []
}

beforeEach(() => {
  localStorage.clear()
  resetAllShortcuts()
})

describe('storing', () => {
  it('writes only what the reader changed', () => {
    // Not the whole table: a new shortcut in the next version then needs no
    // migration, it simply has no entry and takes its default.
    assignShortcut('nav.home', 'Ctrl+Shift+KeyG')
    expect(stored()).toEqual({ 'nav.home': 'Ctrl+Shift+KeyG' })
    expect(isShortcutChanged('nav.home')).toBe(true)
    expect(isShortcutChanged('nav.menu')).toBe(false)
  })

  it('records "no key at all" as a choice of its own', () => {
    // Distinct from never having touched it, which is why null is stored
    // rather than the entry being removed.
    clearShortcut('nav.home')
    expect(stored()).toEqual({ 'nav.home': null })
    expect(chordsOf('nav.home')).toEqual([])
  })

  it('forgets a shortcut put back to its default', () => {
    assignShortcut('nav.home', 'Ctrl+Shift+KeyG')
    resetShortcut('nav.home')
    expect(stored()).toEqual({})
    expect(isShortcutChanged('nav.home')).toBe(false)
  })

  it('takes a key from another shortcut only when told to', () => {
    // The settings row asks first, then passes the one being displaced — so one
    // press writes one consistent state.
    assignShortcut('nav.home', 'Ctrl+KeyM', ['nav.menu'])
    expect(stored()).toEqual({ 'nav.home': 'Ctrl+KeyM', 'nav.menu': null })
    expect(chordsOf('nav.home')).toEqual(['Ctrl+KeyM'])
    expect(chordsOf('nav.menu')).toEqual([])
  })

  it('puts everything back at once', () => {
    assignShortcut('nav.home', 'Ctrl+Shift+KeyG')
    clearShortcut('nav.menu')
    resetAllShortcuts()
    expect(shortcutOverrides.value).toEqual({})
    expect(chordsOf('nav.home')).toEqual(['Ctrl+KeyG'])
    expect(chordsOf('nav.menu')).toEqual(['Ctrl+KeyM'])
  })
})

describe('reading back', () => {
  it('restores what was stored', () => {
    localStorage.setItem(DISK_KEY, JSON.stringify({ 'nav.home': 'Ctrl+Shift+KeyG' }))
    initShortcutSettings()
    expect(chordsOf('nav.home')).toEqual(['Ctrl+Shift+KeyG'])
  })

  it('drops an id this build no longer has', () => {
    localStorage.setItem(DISK_KEY, JSON.stringify({ 'nav.gone': 'Ctrl+KeyZ' }))
    initShortcutSettings()
    expect(shortcutOverrides.value).toEqual({})
  })

  it('drops a choice about a shortcut that has since become fixed', () => {
    localStorage.setItem(DISK_KEY, JSON.stringify({ 'view.fullscreen': 'Ctrl+Shift+KeyY' }))
    initShortcutSettings()
    expect(shortcutOverrides.value).toEqual({})
    expect(chordsOf('view.fullscreen')).toEqual(['F11'])
  })

  it('drops a combination this app would never have produced', () => {
    // Hand-edited storage, or an older spelling. The shortcut is then on its
    // shipped key, which the reader can see, rather than on nothing.
    localStorage.setItem(
      DISK_KEY,
      JSON.stringify({ 'nav.home': 'Shift+Ctrl+KeyG', 'nav.menu': 42 }),
    )
    initShortcutSettings()
    expect(shortcutOverrides.value).toEqual({})
    expect(chordsOf('nav.home')).toEqual(['Ctrl+KeyG'])
  })

  it('survives junk where the table should be', () => {
    localStorage.setItem(DISK_KEY, '"not an object"')
    expect(() => initShortcutSettings()).not.toThrow()
    localStorage.setItem(DISK_KEY, '{ broken')
    expect(() => initShortcutSettings()).not.toThrow()
    expect(chordsOf('nav.home')).toEqual(['Ctrl+KeyG'])
  })
})
