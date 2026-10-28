/**
 * Whether a combination the reader just pressed can be assigned at all.
 *
 * Two kinds of answer, both of them honest refusals rather than taste:
 *
 *   'reserved'      — the key never reaches this page, or reaches it too late to
 *                     matter. Chromium acts on it first and `preventDefault`
 *                     cannot call it back, so a row claiming to own it would be
 *                     a lie the reader discovers by pressing it.
 *   'needsModifier' — a bare letter, digit or editing key would fire while the
 *                     reader is typing. Only the function keys stand alone.
 *
 * Pure, and tested: this is the gate in front of everything the reader can
 * store, so it has to be the part of the feature that cannot surprise anyone.
 */
import { parseChord, type Chord } from './chord'

export type ChordProblem = 'reserved' | 'needsModifier'

/**
 * Combinations that are not this app's to give away: the browser's own, the
 * ones text editing needs, and the two the app already answers on the
 * browser's behalf.
 */
const RESERVED: ReadonlySet<Chord> = new Set<Chord>([
  // Closes the window outright. preventDefault cannot call that back — the
  // reason F8 was chosen for the workspace picker in the first place.
  'Ctrl+Shift+KeyW',
  'Alt+F4',
  // Reload and hard reload. The browser's, and a reader who hit one by mistake
  // would lose everything they have open.
  'F5',
  'Ctrl+KeyR',
  'Ctrl+Shift+KeyR',
  'Ctrl+F5',
  // The developer tools' own key. Deliberately NOT the Ctrl+Shift+I/J/C family
  // with it: this app binds Ctrl+Shift+J to the side commentary panel and has
  // done so for as long as that panel has existed, so calling the family
  // unavailable would be contradicted by the app itself.
  'F12',
  // A new incognito window, and the clear-browsing-data dialog.
  'Ctrl+Shift+KeyN',
  'Ctrl+Shift+Delete',
  // Chromium's own focus moves between the page and its UI.
  'F6',
  'Ctrl+F6',
  // Caret browsing. There is no app code behind F7 at all, which is exactly why
  // nothing may be bound to it.
  'F7',
  // The clipboard and select-all, which the text in a book needs.
  'Ctrl+KeyC',
  'Ctrl+KeyV',
  'Ctrl+KeyA',
  // The app answers these itself to keep the browser out of the way: Ctrl+N
  // would open a window with no way back, and Ctrl+P is forwarded into the open
  // PDF. Binding something else to them would break both.
  'Ctrl+KeyN',
  'Ctrl+KeyP',
])

/** Keys that are a whole shortcut with no modifier held. */
const STANDS_ALONE = /^F([1-9]|1[0-2])$/

/** What is wrong with assigning this combination, or null when nothing is. */
export function chordProblem(chord: Chord): ChordProblem | null {
  if (RESERVED.has(chord)) return 'reserved'
  const { ctrl, alt, shift, code } = parseChord(chord)
  if (!ctrl && !alt && !shift && !STANDS_ALONE.test(code)) return 'needsModifier'
  // Shift alone turns a key into a character: Shift+KeyA is "A", and taking it
  // would swallow a capital letter mid-word.
  if (!ctrl && !alt && shift && !STANDS_ALONE.test(code)) return 'needsModifier'
  return null
}
