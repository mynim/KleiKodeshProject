import { describe, it, expect } from 'vitest'
import { chordProblem } from './chordAssignment'
import { SHORTCUT_DEFINITIONS } from './shortcutDefinitions'

describe('chordProblem', () => {
  it('accepts the ordinary combinations', () => {
    for (const chord of [
      'Ctrl+KeyQ',
      'Ctrl+Shift+KeyG',
      'Ctrl+Alt+KeyJ',
      'Alt+ArrowUp',
      'Shift+F4',
      'F8',
    ])
      expect(chordProblem(chord), chord).toBeNull()
  })

  it('leaves the app its own Ctrl+Shift+J, devtools or not', () => {
    // The side commentary panel has had it for as long as the panel has existed.
    // Calling that family unavailable would be contradicted by the app itself.
    expect(chordProblem('Ctrl+Shift+KeyJ')).toBeNull()
  })

  it("refuses what is not the app's to give away", () => {
    // Each of these would be a row claiming a key it does not get. Ctrl+Shift+W
    // closes the window outright, and preventDefault cannot call that back.
    for (const chord of [
      'Ctrl+Shift+KeyW',
      'Alt+F4',
      'F5',
      'Ctrl+KeyR',
      'F12',
      'Ctrl+Shift+KeyN',
      'Ctrl+Shift+Delete',
    ])
      expect(chordProblem(chord), chord).toBe('reserved')
  })

  it('refuses the keys reading and editing need', () => {
    // F7 is caret browsing, which has no app code behind it at all; the three
    // clipboard keys are how a reader quotes a book.
    for (const chord of ['F7', 'Ctrl+KeyC', 'Ctrl+KeyV', 'Ctrl+KeyA'])
      expect(chordProblem(chord), chord).toBe('reserved')
  })

  it('refuses the two keys the app answers for the browser', () => {
    // Ctrl+N would open a window with no way back; Ctrl+P is forwarded into the
    // open PDF. Both are swallowed on purpose, so nothing may be bound to them.
    expect(chordProblem('Ctrl+KeyN')).toBe('reserved')
    expect(chordProblem('Ctrl+KeyP')).toBe('reserved')
  })

  it('refuses a key that would fire while the reader is typing', () => {
    for (const chord of ['KeyA', 'Digit4', 'Shift+KeyA', 'Enter', 'Space', 'ArrowDown', 'Comma'])
      expect(chordProblem(chord), chord).toBe('needsModifier')
  })

  it('lets a function key stand alone', () => {
    // Which is what the app's own F1, F8 and F9 are.
    expect(chordProblem('F1')).toBeNull()
    expect(chordProblem('F9')).toBeNull()
    expect(chordProblem('F11')).toBeNull()
  })

  it('never refuses a combination the app ships with', () => {
    // A default the reader could not re-enter after resetting it would be a
    // trap. The fixed ones are exempt: F7 and the clipboard keys are listed
    // precisely because they belong to someone else.
    for (const definition of SHORTCUT_DEFINITIONS) {
      if (definition.fixed) continue
      for (const chord of definition.chords)
        expect(chordProblem(chord), `${definition.id} ${chord}`).toBeNull()
    }
  })
})
