/**
 * The registry has to hold together on its own: it is the one description of
 * every shortcut, and the handlers and the settings list both believe it.
 *
 * These are the checks that used to be a comment asking the next person to keep
 * two files in step by hand.
 */
import { describe, it, expect } from 'vitest'
import heSettings from '@/i18n/locales/he/settings.json'
import enSettings from '@/i18n/locales/en/settings.json'
import { isChord } from './chord'
import { buildChordIndex } from './shortcutIndex'
import { scopesOverlap } from './shortcutScopes'
import {
  SHORTCUT_DEFINITIONS,
  SHORTCUT_GROUPS,
  definitionsForHost,
  hostsCoexist,
  type ShortcutDefinition,
} from './shortcutDefinitions'

/** Does `settings.a.b` resolve to a string in this locale file? */
function resolves(messages: Record<string, unknown>, key: string): boolean {
  const path = key.split('.')
  if (path.shift() !== 'settings') return false
  let node: unknown = messages
  for (const part of path) {
    if (typeof node !== 'object' || node === null) return false
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' && node !== ''
}

const LOCALES = {
  he: heSettings as Record<string, unknown>,
  en: enSettings as Record<string, unknown>,
}

describe('the registry describes itself completely', () => {
  it('has a unique id for every binding', () => {
    // An id is what a handler switches on and what a reader's own choice is
    // stored under, so two of one id would silently hide a shortcut.
    const ids = SHORTCUT_DEFINITIONS.map((definition) => definition.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('binds every shortcut to at least one well-formed chord', () => {
    for (const definition of SHORTCUT_DEFINITIONS) {
      expect(definition.chords.length, definition.id).toBeGreaterThan(0)
      for (const chord of definition.chords)
        expect(isChord(chord), `${definition.id} ${chord}`).toBe(true)
    }
  })

  it('names every row in both languages', () => {
    // The list is rendered from these keys. A missing one used to be a row that
    // printed its own key name at the reader.
    for (const definition of SHORTCUT_DEFINITIONS) {
      if (!definition.listing) continue
      for (const [language, messages] of Object.entries(LOCALES))
        expect(
          resolves(messages, definition.listing.labelKey),
          `${definition.id} → ${definition.listing.labelKey} (${language})`,
        ).toBe(true)
    }
  })

  it('names every group in both languages', () => {
    for (const group of SHORTCUT_GROUPS)
      for (const [language, messages] of Object.entries(LOCALES))
        expect(resolves(messages, group.labelKey), `${group.id} (${language})`).toBe(true)
  })

  it('shows every group it declares', () => {
    // A group with no rows would render a heading over nothing.
    for (const group of SHORTCUT_GROUPS)
      expect(
        SHORTCUT_DEFINITIONS.some((definition) => definition.listing?.group === group.id),
        group.id,
      ).toBe(true)
  })
})

describe('no two shortcuts fight over one combination', () => {
  /** Pairs that share a chord and could both be live. */
  function clashes(definitions: readonly ShortcutDefinition[]): string[] {
    const found: string[] = []
    for (const [chord, bound] of buildChordIndex(definitions)) {
      for (let i = 0; i < bound.length; i++)
        for (let j = i + 1; j < bound.length; j++) {
          const a = bound[i]!
          const b = bound[j]!
          if (scopesOverlap(a.scope, b.scope) && hostsCoexist(a, b))
            found.push(`${chord}: ${a.id} / ${b.id}`)
        }
    }
    return found
  }

  it('in the host with a native tab strip', () => {
    expect(clashes(definitionsForHost(true))).toEqual([])
  })

  it('in the task pane and the dev browser', () => {
    expect(clashes(definitionsForHost(false))).toEqual([])
  })

  it('counts a clash when there is one', () => {
    // Guards the check above: it has to be able to fail.
    expect(
      clashes([
        { id: 'a', chords: ['Ctrl+KeyE'], scope: 'pane' },
        { id: 'b', chords: ['Ctrl+KeyE'], scope: 'bookView' },
      ]),
    ).toEqual(['Ctrl+KeyE: a / b'])
  })
})

describe('the host difference', () => {
  it('gives Ctrl+Tab exactly one meaning in each host', () => {
    // With a strip it cycles tabs (the C# popup owns the hold); without one
    // there is a single tab, so the same keys walk its history.
    const withStrip = definitionsForHost(true).filter((definition) =>
      definition.chords.includes('Ctrl+Tab'),
    )
    const withoutStrip = definitionsForHost(false).filter((definition) =>
      definition.chords.includes('Ctrl+Tab'),
    )
    expect(withStrip.map((definition) => definition.id)).toEqual(['tabs.cycle'])
    expect(withoutStrip.map((definition) => definition.id)).toEqual(['nav.backWithTab'])
  })

  it('keeps every host-free binding in both hosts', () => {
    const free = SHORTCUT_DEFINITIONS.filter((definition) => definition.hosts === undefined).length
    expect(definitionsForHost(true).length).toBe(free + 2)
    expect(definitionsForHost(false).length).toBe(free + 2)
  })
})

describe('what must never become editable', () => {
  it('leaves the search results list alone', () => {
    // These keys are the results list's own keyboard model, and their handler is
    // where the caret-browsing fix lives: the arrows reach the list from the
    // window in the capture phase, and a focused result button keeps only Enter.
    // Offering to reassign them would mean reopening exactly that.
    const rows = SHORTCUT_DEFINITIONS.filter(
      (definition) => definition.listing?.group === 'searchResults',
    )
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.fixed, row.id).toBe('listModel')
  })

  it('leaves the keys Chromium acts on itself alone', () => {
    // F7 (caret browsing) has no app code behind it at all; F11 and the zoom
    // keys are the browser's too and the app only suppresses them. A promise to
    // move any of them would not be kept.
    for (const id of [
      'view.caretBrowsing',
      'view.fullscreen',
      'view.zoomIn',
      'view.zoomOut',
      'view.zoomReset',
    ]) {
      const definition = SHORTCUT_DEFINITIONS.find((candidate) => candidate.id === id)
      expect(definition, id).toBeDefined()
      expect(definition!.fixed, id).toBe('chromium')
    }
  })

  it('leaves the keys the C# host takes over alone', () => {
    for (const id of ['tabs.cycle', 'tabs.cycleBack']) {
      const definition = SHORTCUT_DEFINITIONS.find((candidate) => candidate.id === id)
      expect(definition!.fixed, id).toBe('host')
    }
  })
})
