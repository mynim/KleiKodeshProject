/**
 * The combinations actually in force: the defaults with the reader's own
 * choices laid over them.
 *
 * Only the CHANGES are stored, never the whole table — which is what makes the
 * next version painless. A shortcut the developer adds has no stored entry and
 * simply takes its default; a default he changes for a shortcut the reader has
 * already moved loses to the reader, because that is what a change means.
 *
 * The one case that needs a rule is a new default landing on a combination the
 * reader has taken for something else. The rule is: whoever is more fixed wins,
 * and NOTHING is ever silently left without a key —
 *
 *   1. shortcuts that cannot be reassigned claim their keys first
 *   2. then the reader's own choices, in id order so the result never depends on
 *      the order they were saved in
 *   3. then the remaining defaults
 *
 * and anything that finds its key taken comes back in `conflicts`, for the
 * settings list to show as a row waiting for a key. Pure, so the whole of that
 * is something a test can state.
 */
import { isChord, type Chord } from './chord'
import { chordProblem } from './chordAssignment'
import type { ShortcutDefinition } from './shortcutDefinitions'
import { scopesOverlap } from './shortcutScopes'

/** What the reader changed: a combination, or null for "no key at all". */
export type ShortcutOverrides = Readonly<Record<string, Chord | null>>

export interface ShortcutConflict {
  /** The shortcut left without a key. */
  id: string
  /** The combination it wanted. */
  chord: Chord
  /** The shortcut that already holds it. */
  heldBy: string
}

export interface ResolvedBindings {
  /**
   * The definitions as they are in force, in their original order. A shortcut
   * with no key has no chords.
   */
  definitions: ShortcutDefinition[]
  conflicts: ShortcutConflict[]
}

/** Can `definition` take `chord`, or does something live already hold it? */
function holder(
  claims: Map<Chord, ShortcutDefinition[]>,
  chord: Chord,
  definition: ShortcutDefinition,
): ShortcutDefinition | undefined {
  return claims.get(chord)?.find((claimant) => scopesOverlap(claimant.scope, definition.scope))
}

export function resolveBindings(
  definitions: readonly ShortcutDefinition[],
  overrides: ShortcutOverrides = {},
): ResolvedBindings {
  const claims = new Map<Chord, ShortcutDefinition[]>()
  const chordsById = new Map<string, Chord[]>()
  const conflicts: ShortcutConflict[] = []

  function claim(definition: ShortcutDefinition, chords: readonly Chord[]): void {
    const taken: Chord[] = []
    for (const chord of chords) {
      const held = holder(claims, chord, definition)
      if (held) {
        conflicts.push({ id: definition.id, chord, heldBy: held.id })
        continue
      }
      const bucket = claims.get(chord)
      if (bucket) bucket.push(definition)
      else claims.set(chord, [definition])
      taken.push(chord)
    }
    chordsById.set(definition.id, taken)
  }

  /**
   * An override is used only where it could have been offered in the first
   * place: a known shortcut, one the reader is allowed to change, and a
   * combination that is still well-formed and still assignable. Anything else
   * is old or hand-edited data and falls back to the default, rather than
   * leaving a shortcut dead for a reason the reader cannot see.
   */
  function overrideFor(definition: ShortcutDefinition): Chord[] | null {
    if (!(definition.id in overrides)) return null
    if (definition.fixed) return null
    const chord = overrides[definition.id]
    if (chord === null) return []
    if (!isChord(chord) || chordProblem(chord) !== null) return null
    return [chord]
  }

  const changed = definitions.filter((definition) => overrideFor(definition) !== null)
  const changedIds = new Set(changed.map((definition) => definition.id))

  // 1. What cannot be reassigned. (`overrideFor` never answers for these, so
  // none of them is in `changed`.)
  for (const definition of definitions) if (definition.fixed) claim(definition, definition.chords)

  // 2. The reader's own choices, in id order.
  for (const definition of [...changed].sort((a, b) => a.id.localeCompare(b.id)))
    claim(definition, overrideFor(definition)!)

  // 3. Everything still on its default.
  for (const definition of definitions)
    if (!definition.fixed && !changedIds.has(definition.id)) claim(definition, definition.chords)

  return {
    definitions: definitions.map((definition) => ({
      ...definition,
      chords: chordsById.get(definition.id) ?? [],
    })),
    conflicts,
  }
}
