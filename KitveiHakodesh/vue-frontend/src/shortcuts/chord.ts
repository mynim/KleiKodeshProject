/**
 * A key combination, as one normalized string.
 *
 * Shape: the modifiers that are down, each followed by `+`, then the key's own
 * `KeyboardEvent.code` — `Ctrl+KeyE`, `Ctrl+Shift+KeyD`, `Ctrl+Alt+KeyJ`,
 * `Alt+ArrowRight`, `Ctrl+Backslash`, `F8`. Modifiers always in the order
 * Ctrl, Alt, Shift, so one combination has exactly one spelling and two chords
 * can be compared as strings.
 *
 * On `code`, never `key`, for the reason the title-bar handler has always given:
 * `event.key` returns the CHARACTER the key produces, which changes with the
 * active keyboard language — every shortcut would break the moment the reader
 * types Hebrew. `code` is the physical key and is the same in every layout.
 *
 * `Meta` (the Windows key) folds into Ctrl rather than getting a modifier of its
 * own: the handlers have always treated `ctrlKey || metaKey` as one thing, and a
 * chord that spelled them apart would stop matching on a Mac keyboard.
 *
 * Pure on purpose — no imports, nothing about the app, no display text (that is
 * `chordLabel.ts`, which needs the UI language). This file is what the stored
 * user override is validated against, so it has to stay something a test can
 * reason about completely.
 */
export type Chord = string

/**
 * Keys that are only ever part of a combination, never the combination itself.
 * A keydown on one of them produces no chord at all — which is what lets the
 * settings capture box ignore the Ctrl that arrives before the letter.
 */
const MODIFIER_CODES: ReadonlySet<string> = new Set([
  'ControlLeft',
  'ControlRight',
  'ShiftLeft',
  'ShiftRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
])

/** The chord this keydown spells, or null when no real key is down yet. */
export function chordFromEvent(event: KeyboardEvent): Chord | null {
  const code = event.code
  if (!code || MODIFIER_CODES.has(code)) return null
  let chord = ''
  if (event.ctrlKey || event.metaKey) chord += 'Ctrl+'
  if (event.altKey) chord += 'Alt+'
  if (event.shiftKey) chord += 'Shift+'
  return chord + code
}

export interface ChordParts {
  ctrl: boolean
  alt: boolean
  shift: boolean
  /** The key's own `KeyboardEvent.code`. */
  code: string
}

/** Splits a chord back into its parts. Does not validate — see `isChord`. */
export function parseChord(chord: Chord): ChordParts {
  const tokens = chord.split('+')
  const code = tokens[tokens.length - 1] ?? ''
  return {
    ctrl: tokens.includes('Ctrl'),
    alt: tokens.includes('Alt'),
    shift: tokens.includes('Shift'),
    code,
  }
}

/**
 * Is this a chord this app would ever produce?
 *
 * The gate for anything read off disk: a stored override is user data that an
 * older build, a hand-edited localStorage or a future rename could have left in
 * any shape, and a malformed one must be dropped rather than silently shadowing
 * a working default.
 */
export function isChord(value: unknown): value is Chord {
  if (typeof value !== 'string' || value === '') return false
  const tokens = value.split('+')
  const code = tokens.pop()
  if (code === undefined || code === '' || MODIFIER_CODES.has(code)) return false
  // Modifiers, in the one order, each at most once.
  const order = ['Ctrl', 'Alt', 'Shift']
  let next = 0
  for (const token of tokens) {
    const at = order.indexOf(token, next)
    if (at < 0) return false
    next = at + 1
  }
  return true
}
