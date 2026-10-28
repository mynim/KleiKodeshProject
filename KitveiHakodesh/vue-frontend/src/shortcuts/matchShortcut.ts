/**
 * What the keyboard handlers ask.
 *
 * This is the whole surface the rest of the app sees: one function that turns a
 * keydown into a shortcut id. It does NOT call `preventDefault`, does not call
 * `stopPropagation`, does not listen for anything and does not know when a
 * shortcut is allowed to fire — every one of those stays with the handler that
 * had it, which is what keeps the search results' capture-phase arrangement
 * (and with it caret browsing) exactly as it was.
 *
 * The one thing that moves here is the key itself: a handler used to spell
 * `case 'KeyE'` and now spells `case 'nav.addressBar'`.
 */
import { computed } from 'vue'
import { chordFromEvent } from './chord'
import { buildChordIndex, pickShortcut } from './shortcutIndex'
import { activeBindings, isCapturingShortcut } from './shortcutSettings'
import type { ShortcutScope } from './shortcutScopes'

/** Rebuilt by itself whenever the reader changes a binding. */
const index = computed(() => buildChordIndex(activeBindings.value.definitions))

/** The shortcut this keydown triggers in `scopes`, or null for none. */
export function matchShortcut(event: KeyboardEvent, ...scopes: ShortcutScope[]): string | null {
  // While a settings row is waiting for a combination, every shortcut stands
  // down — otherwise pressing Ctrl+W to bind it would also close a tab.
  if (isCapturingShortcut.value) return null
  const chord = chordFromEvent(event)
  if (chord === null) return null
  return pickShortcut(index.value, chord, scopes)
}
