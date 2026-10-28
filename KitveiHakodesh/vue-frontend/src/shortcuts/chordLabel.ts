/**
 * How a chord is shown to the reader.
 *
 * Separate from `chord.ts` because this half needs the UI language, and the
 * matching half must stay pure. It is also the ONLY place that turns a key code
 * into text, so the settings list and (later) the capture box cannot print the
 * same combination two different ways.
 *
 * The `<kbd>` boxes are `direction: ltr` in the list's own styles and the
 * modifier names stay Latin in both languages, so a combination reads
 * left-to-right — `Ctrl + Shift + D` — inside an RTL page, as it does
 * everywhere in Windows.
 */
import { t } from '@/i18n'
import { parseChord, type Chord } from './chord'

/** Codes whose label is not simply the code itself. */
const CODE_LABELS: Readonly<Record<string, string>> = {
  // The punctuation keys, named by the character the reader sees on the cap.
  Backslash: '|',
  Equal: '+',
  NumpadAdd: '+',
  Minus: '-',
  NumpadSubtract: '-',
  Numpad0: '0',
  // The vertical arrows have no translated name and are shown as the glyphs.
  ArrowUp: '↑',
  ArrowDown: '↓',
}

/**
 * The horizontal arrows ARE named in words ("חץ ימינה" / "Right arrow"), since
 * right and left carry the meaning in an RTL app and a bare glyph beside a
 * Hebrew description reads as part of the sentence.
 */
const ARROW_LABEL_KEYS: Readonly<Record<string, string>> = {
  ArrowRight: 'settings.shortcutsList.rightArrow',
  ArrowLeft: 'settings.shortcutsList.leftArrow',
}

function keyLabel(code: string): string {
  const arrowKey = ARROW_LABEL_KEYS[code]
  if (arrowKey) return t(arrowKey)
  const fixed = CODE_LABELS[code]
  if (fixed) return fixed
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) return code.slice(6)
  // F1..F12, Tab, Enter, Space, Delete and anything else name themselves.
  return code
}

/** One label per box, modifiers first: `Ctrl+Shift+KeyD` → `['Ctrl','Shift','D']`. */
export function chordLabels(chord: Chord): string[] {
  const { ctrl, alt, shift, code } = parseChord(chord)
  const labels: string[] = []
  if (ctrl) labels.push('Ctrl')
  if (alt) labels.push('Alt')
  if (shift) labels.push('Shift')
  labels.push(keyLabel(code))
  return labels
}

/** A `<kbd>` box, or the separator drawn between two of them. */
export interface KeyCellToken {
  kbd?: string
  sep?: string
}

/**
 * The whole key cell of a row: boxes joined by `+` inside one combination and
 * by `/` between alternatives.
 *
 * Combinations that READ the same are collapsed, which is what makes the
 * keypad twins one box: Ctrl+Equal and Ctrl+NumpadAdd are both `Ctrl` `+`, and
 * showing them twice would be noise. ArrowUp and ArrowDown read differently and
 * stay two, as `↑ / ↓`.
 */
export function keyCellTokens(chords: readonly Chord[]): KeyCellToken[] {
  const alternatives: string[][] = []
  for (const chord of chords) {
    const labels = chordLabels(chord)
    if (!alternatives.some((existing) => existing.join('\u0000') === labels.join('\u0000')))
      alternatives.push(labels)
  }
  const tokens: KeyCellToken[] = []
  alternatives.forEach((labels, index) => {
    if (index > 0) tokens.push({ sep: '/' })
    labels.forEach((label, labelIndex) => {
      if (labelIndex > 0) tokens.push({ sep: '+' })
      tokens.push({ kbd: label })
    })
  })
  return tokens
}
