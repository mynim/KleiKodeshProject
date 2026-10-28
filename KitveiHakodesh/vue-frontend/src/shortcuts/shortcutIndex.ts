/**
 * Chord → shortcut lookup. Pure: the handlers' question ("what does this
 * keystroke mean here?") answered without touching the DOM or the host.
 */
import type { Chord } from './chord'
import type { ShortcutDefinition } from './shortcutDefinitions'
import type { ShortcutScope } from './shortcutScopes'

export type ChordIndex = ReadonlyMap<Chord, readonly ShortcutDefinition[]>

/**
 * One entry per combination, holding the definitions bound to it in the order
 * they were declared.
 *
 * A combination can legitimately hold more than one: the book view and the
 * search results never run at the same time, so each may give the same keys
 * their own meaning (see `scopesOverlap`).
 */
export function buildChordIndex(definitions: readonly ShortcutDefinition[]): ChordIndex {
  const index = new Map<Chord, ShortcutDefinition[]>()
  for (const definition of definitions) {
    for (const chord of definition.chords) {
      const bucket = index.get(chord)
      if (bucket) bucket.push(definition)
      else index.set(chord, [definition])
    }
  }
  return index
}

/**
 * The id this combination triggers in these scopes, or null.
 *
 * Callers pass the scopes they actually implement, and may pass more than they
 * own — a handler only acts on the ids it has a case for, and an id it does not
 * recognize falls through exactly as an unknown key did before.
 *
 * With two definitions on one combination in the same scope the first declared
 * wins. That is a registry mistake rather than a runtime decision, and the
 * definitions test fails on it.
 */
export function pickShortcut(
  index: ChordIndex,
  chord: Chord,
  scopes: readonly ShortcutScope[],
): string | null {
  const bucket = index.get(chord)
  if (!bucket) return null
  for (const definition of bucket) {
    if (scopes.includes(definition.scope)) return definition.id
  }
  return null
}
