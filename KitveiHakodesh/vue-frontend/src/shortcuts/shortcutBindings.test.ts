import { describe, it, expect } from 'vitest'
import { resolveBindings, type ShortcutOverrides } from './shortcutBindings'
import type { ShortcutDefinition } from './shortcutDefinitions'

const DEFINITIONS: ShortcutDefinition[] = [
  { id: 'nav.home', chords: ['Ctrl+KeyG'], scope: 'pane' },
  { id: 'nav.menu', chords: ['Ctrl+KeyM'], scope: 'pane' },
  { id: 'book.toc', chords: ['Ctrl+KeyK'], scope: 'bookView' },
  // The same combination in two pages a pane cannot show at once.
  { id: 'book.find', chords: ['Ctrl+KeyF'], scope: 'bookView' },
  { id: 'results.find', chords: ['Ctrl+KeyF'], scope: 'searchResults' },
  { id: 'results.open', chords: ['Enter'], scope: 'searchResults', fixed: 'listModel' },
  { id: 'view.fullscreen', chords: ['F11'], scope: 'app', fixed: 'chromium' },
]

function chords(overrides: ShortcutOverrides = {}): Record<string, readonly string[]> {
  const { definitions } = resolveBindings(DEFINITIONS, overrides)
  return Object.fromEntries(definitions.map((definition) => [definition.id, definition.chords]))
}

describe('with nothing changed', () => {
  it('is the defaults, in the order they were declared', () => {
    const { definitions, conflicts } = resolveBindings(DEFINITIONS)
    expect(definitions.map((definition) => definition.id)).toEqual(
      DEFINITIONS.map((definition) => definition.id),
    )
    expect(chords()).toEqual({
      'nav.home': ['Ctrl+KeyG'],
      'nav.menu': ['Ctrl+KeyM'],
      'book.toc': ['Ctrl+KeyK'],
      'book.find': ['Ctrl+KeyF'],
      'results.find': ['Ctrl+KeyF'],
      'results.open': ['Enter'],
      'view.fullscreen': ['F11'],
    })
    expect(conflicts).toEqual([])
  })
})

describe("with the reader's own choices", () => {
  it('uses the combination they picked', () => {
    expect(chords({ 'nav.home': 'Ctrl+Shift+KeyG' })['nav.home']).toEqual(['Ctrl+Shift+KeyG'])
  })

  it('leaves a shortcut with no key when they asked for none', () => {
    expect(chords({ 'nav.home': null })['nav.home']).toEqual([])
  })

  it('frees the default they moved away from', () => {
    // The whole point of moving one: Ctrl+G is now available to something else.
    const after = chords({ 'nav.home': 'Ctrl+Shift+KeyG', 'nav.menu': 'Ctrl+KeyG' })
    expect(after['nav.menu']).toEqual(['Ctrl+KeyG'])
    expect(after['nav.home']).toEqual(['Ctrl+Shift+KeyG'])
  })

  it('lets two pages that are never open at once keep one combination', () => {
    // Ctrl+F means "find in this book" and "filter these results", and neither
    // has to give it up: a pane shows one page at a time. Not a conflict, and so
    // not something the reader is ever asked about.
    const after = chords()
    expect(after['book.find']).toEqual(['Ctrl+KeyF'])
    expect(after['results.find']).toEqual(['Ctrl+KeyF'])
    expect(resolveBindings(DEFINITIONS).conflicts).toEqual([])
  })
})

describe('when a choice and a default collide', () => {
  it("keeps the reader's choice and reports the default that lost", () => {
    // What a reader sees after an update that moves a default onto the key they
    // took: the key they chose keeps working, and the other shortcut's row says
    // it needs one. Nothing is changed behind their back, and nothing is silent.
    const { conflicts } = resolveBindings(DEFINITIONS, { 'nav.home': 'Ctrl+KeyM' })
    expect(chords({ 'nav.home': 'Ctrl+KeyM' })).toMatchObject({
      'nav.home': ['Ctrl+KeyM'],
      'nav.menu': [],
    })
    expect(conflicts).toEqual([{ id: 'nav.menu', chord: 'Ctrl+KeyM', heldBy: 'nav.home' }])
  })

  it('cannot take a key away from a shortcut that is fixed', () => {
    // F11 is Chromium's; a choice landing on it loses rather than winning.
    const { conflicts } = resolveBindings(DEFINITIONS, { 'nav.home': 'F11' })
    expect(chords({ 'nav.home': 'F11' })).toMatchObject({
      'view.fullscreen': ['F11'],
      'nav.home': [],
    })
    expect(conflicts).toEqual([{ id: 'nav.home', chord: 'F11', heldBy: 'view.fullscreen' }])
  })

  it('does not depend on the order the choices were saved in', () => {
    const one = resolveBindings(DEFINITIONS, { 'nav.home': 'Ctrl+KeyQ', 'nav.menu': 'Ctrl+KeyQ' })
    const other = resolveBindings(DEFINITIONS, { 'nav.menu': 'Ctrl+KeyQ', 'nav.home': 'Ctrl+KeyQ' })
    expect(one.definitions).toEqual(other.definitions)
    expect(one.conflicts).toEqual(other.conflicts)
  })
})

describe('with data this build cannot honour', () => {
  it('falls back to the default rather than leaving a shortcut dead', () => {
    // An older build, a rename or a hand-edited localStorage. Dropping the entry
    // is visible (the key is the shipped one); honouring it would not be.
    for (const value of ['not a chord', 'Shift+Ctrl+KeyG', 'Ctrl+'])
      expect(chords({ 'nav.home': value })['nav.home'], value).toEqual(['Ctrl+KeyG'])
  })

  it('ignores a combination that could never have been offered', () => {
    // Ctrl+R reloads the page: the capture box refuses it, so a stored one did
    // not come from there.
    expect(chords({ 'nav.home': 'Ctrl+KeyR' })['nav.home']).toEqual(['Ctrl+KeyG'])
  })

  it('ignores a choice about a shortcut that cannot be reassigned', () => {
    expect(chords({ 'view.fullscreen': 'Ctrl+Shift+KeyY' })['view.fullscreen']).toEqual(['F11'])
  })

  it('ignores an id this build no longer has', () => {
    expect(() => resolveBindings(DEFINITIONS, { 'nav.gone': 'Ctrl+KeyZ' })).not.toThrow()
    expect(chords({ 'nav.gone': 'Ctrl+KeyZ' })['nav.home']).toEqual(['Ctrl+KeyG'])
  })
})

describe('a shortcut the developer adds next version', () => {
  it('takes its default, with no migration', () => {
    // The reason only the changes are stored.
    const withNewOne = [
      ...DEFINITIONS,
      { id: 'nav.recent', chords: ['Ctrl+KeyY'], scope: 'pane' } as ShortcutDefinition,
    ]
    const { definitions, conflicts } = resolveBindings(withNewOne, {
      'nav.home': 'Ctrl+Shift+KeyG',
    })
    expect(definitions.find((d) => d.id === 'nav.recent')?.chords).toEqual(['Ctrl+KeyY'])
    expect(definitions.find((d) => d.id === 'nav.home')?.chords).toEqual(['Ctrl+Shift+KeyG'])
    expect(conflicts).toEqual([])
  })
})
