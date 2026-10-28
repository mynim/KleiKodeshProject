import { describe, it, expect } from 'vitest'
import { buildChordIndex, pickShortcut } from './shortcutIndex'
import { scopesOverlap } from './shortcutScopes'
import type { ShortcutDefinition } from './shortcutDefinitions'

const DEFINITIONS: ShortcutDefinition[] = [
  { id: 'pane.one', chords: ['Ctrl+KeyE'], scope: 'pane' },
  { id: 'book.one', chords: ['Ctrl+KeyD'], scope: 'bookView' },
  // The same keys in two pages that are never open at once.
  { id: 'book.two', chords: ['Enter'], scope: 'bookView' },
  { id: 'results.two', chords: ['Enter'], scope: 'searchResults' },
  // One row to the reader, two codes: the keypad twin.
  { id: 'app.zoom', chords: ['Ctrl+Equal', 'Ctrl+NumpadAdd'], scope: 'app' },
]

const index = buildChordIndex(DEFINITIONS)

describe('pickShortcut', () => {
  it('finds a binding in a scope the caller asked for', () => {
    expect(pickShortcut(index, 'Ctrl+KeyE', ['pane'])).toBe('pane.one')
  })

  it('ignores a binding outside those scopes', () => {
    // How a handler goes on falling through for a key it does not own — the
    // pane handler asking for 'pane' must not see the book view's own keys.
    expect(pickShortcut(index, 'Ctrl+KeyD', ['pane'])).toBeNull()
    expect(pickShortcut(index, 'Ctrl+KeyD', ['pane', 'bookView'])).toBe('book.one')
  })

  it('has nothing for an unbound combination', () => {
    expect(pickShortcut(index, 'Ctrl+KeyQ', ['pane', 'app', 'bookView'])).toBeNull()
  })

  it('gives each page its own meaning for one combination', () => {
    expect(pickShortcut(index, 'Enter', ['bookView'])).toBe('book.two')
    expect(pickShortcut(index, 'Enter', ['searchResults'])).toBe('results.two')
  })

  it('answers every chord of a multi-key binding', () => {
    expect(pickShortcut(index, 'Ctrl+Equal', ['app'])).toBe('app.zoom')
    expect(pickShortcut(index, 'Ctrl+NumpadAdd', ['app'])).toBe('app.zoom')
  })
})

describe('buildChordIndex', () => {
  it('keeps every binding of a shared combination, in declaration order', () => {
    expect(index.get('Enter')?.map((definition) => definition.id)).toEqual([
      'book.two',
      'results.two',
    ])
  })
})

describe('scopesOverlap', () => {
  it('is true for a scope with itself', () => {
    expect(scopesOverlap('pane', 'pane')).toBe(true)
    expect(scopesOverlap('bookView', 'bookView')).toBe(true)
  })

  it('is true wherever one side is always possible', () => {
    expect(scopesOverlap('app', 'bookView')).toBe(true)
    expect(scopesOverlap('bookView', 'pane')).toBe(true)
    // The picker opens over whatever page is showing.
    expect(scopesOverlap('workspacePicker', 'searchResults')).toBe(true)
  })

  it('is false between two pages, which a pane cannot show at once', () => {
    expect(scopesOverlap('bookView', 'searchResults')).toBe(false)
  })
})
