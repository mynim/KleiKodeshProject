/**
 * A shortcut's keys, for the buttons and hints that name them.
 *
 * These used to be part of the sentence — `"home": "בית (Ctrl+G)"` in
 * `layout.json`, and a dozen more like it. That was harmless while the keys
 * were fixed, and became a lie the moment a reader could move one: the button
 * would go on promising a combination that no longer did anything.
 *
 * So the label and the keys are separate now. The label stays in the locale
 * file, which is where a translator can reach it, and the keys come from the
 * bindings in force — through `activeBindings`, so a tooltip follows a change
 * the moment it is made.
 */
import { chordLabels } from './chordLabel'
import { activeBindings } from './shortcutSettings'

/** `Ctrl+G` — empty when the shortcut has no key at all. */
export function shortcutKeys(id: string): string {
  const definition = activeBindings.value.definitions.find((candidate) => candidate.id === id)
  const chord = definition?.chords[0]
  return chord === undefined ? '' : chordLabels(chord).join('+')
}

/**
 * `בית (Ctrl+G)` — the label on its own when the shortcut has no key, so a
 * button never shows an empty pair of brackets.
 */
export function withShortcut(label: string, id: string): string {
  const keys = shortcutKeys(id)
  return keys === '' ? label : `${label} (${keys})`
}
