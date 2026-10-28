// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { chordFromEvent, isChord, parseChord } from './chord'

function keydown(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', init)
}

describe('chordFromEvent', () => {
  it('spells an unmodified key as its code', () => {
    expect(chordFromEvent(keydown({ code: 'F8' }))).toBe('F8')
    expect(chordFromEvent(keydown({ code: 'Delete' }))).toBe('Delete')
  })

  it('puts the modifiers in one fixed order', () => {
    expect(chordFromEvent(keydown({ code: 'KeyD', ctrlKey: true }))).toBe('Ctrl+KeyD')
    expect(chordFromEvent(keydown({ code: 'KeyD', ctrlKey: true, shiftKey: true }))).toBe(
      'Ctrl+Shift+KeyD',
    )
    // Declared shift-then-alt, spelled alt-then-shift: one combination, one spelling.
    expect(
      chordFromEvent(keydown({ code: 'KeyJ', ctrlKey: true, shiftKey: true, altKey: true })),
    ).toBe('Ctrl+Alt+Shift+KeyJ')
  })

  it('folds Meta into Ctrl, as every handler already did', () => {
    expect(chordFromEvent(keydown({ code: 'KeyE', metaKey: true }))).toBe('Ctrl+KeyE')
  })

  it('reads the physical key, so the keyboard language cannot change it', () => {
    // The same cap types 'd' on a US layout and 'ד' on a Hebrew one. `key` would
    // follow the character; `code` does not, which is why chords are built from it.
    expect(chordFromEvent(keydown({ code: 'KeyD', key: 'd', ctrlKey: true }))).toBe('Ctrl+KeyD')
    expect(chordFromEvent(keydown({ code: 'KeyD', key: 'ד', ctrlKey: true }))).toBe('Ctrl+KeyD')
  })

  it('has no chord while only modifiers are down', () => {
    // What lets the settings capture box wait through the Ctrl that arrives
    // before the letter instead of binding Ctrl to something.
    expect(chordFromEvent(keydown({ code: 'ControlLeft', ctrlKey: true }))).toBeNull()
    expect(chordFromEvent(keydown({ code: 'ShiftRight', shiftKey: true }))).toBeNull()
    expect(chordFromEvent(keydown({ code: 'AltLeft', altKey: true }))).toBeNull()
    expect(chordFromEvent(keydown({ code: '' }))).toBeNull()
  })
})

describe('parseChord', () => {
  it('splits a chord into its parts', () => {
    expect(parseChord('Ctrl+Shift+KeyD')).toEqual({
      ctrl: true,
      alt: false,
      shift: true,
      code: 'KeyD',
    })
    expect(parseChord('F11')).toEqual({ ctrl: false, alt: false, shift: false, code: 'F11' })
  })

  it('round-trips whatever chordFromEvent produced', () => {
    for (const event of [
      keydown({ code: 'KeyJ', ctrlKey: true, altKey: true }),
      keydown({ code: 'ArrowRight', altKey: true }),
      keydown({ code: 'Backslash', ctrlKey: true }),
      keydown({ code: 'F7' }),
    ]) {
      const chord = chordFromEvent(event)!
      const parts = parseChord(chord)
      expect(parts.ctrl).toBe(event.ctrlKey || event.metaKey)
      expect(parts.alt).toBe(event.altKey)
      expect(parts.shift).toBe(event.shiftKey)
      expect(parts.code).toBe(event.code)
    }
  })
})

describe('isChord', () => {
  it('accepts what this app produces', () => {
    for (const chord of [
      'F1',
      'Delete',
      'Ctrl+KeyE',
      'Ctrl+Shift+KeyD',
      'Ctrl+Alt+KeyJ',
      'Alt+ArrowRight',
      'Ctrl+Alt+Shift+Digit1',
    ])
      expect(isChord(chord), chord).toBe(true)
  })

  it('rejects anything a stored override must not be trusted with', () => {
    // User data: an older build, a rename or a hand-edited localStorage can
    // leave any shape here, and a malformed one must be dropped rather than
    // shadow a working default.
    for (const value of [
      '',
      'ctrl+KeyE', // wrong case
      'Shift+Ctrl+KeyE', // wrong order
      'Ctrl+Ctrl+KeyE', // repeated
      'Ctrl+', // no key
      'Ctrl+ShiftLeft', // a modifier as the key
      'Meta+KeyE', // folded into Ctrl, never spelled
      42,
      null,
      undefined,
      { code: 'KeyE' },
    ])
      expect(isChord(value), String(value)).toBe(false)
  })
})
