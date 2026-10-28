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
import { chordFromEvent } from './chord'
import { definitionsForHost } from './shortcutDefinitions'
import { buildChordIndex, pickShortcut, type ChordIndex } from './shortcutIndex'
import type { ShortcutScope } from './shortcutScopes'
import { hasNativeChromeTabs } from '@/webview-host/bridge'

// The definitions and the host flag are both fixed for the life of the page, so
// the index is built on first use. When a reader's own bindings arrive, this is
// the one place that has to apply them.
let index: ChordIndex | null = null

/** The shortcut this keydown triggers in `scopes`, or null for none. */
export function matchShortcut(event: KeyboardEvent, ...scopes: ShortcutScope[]): string | null {
  const chord = chordFromEvent(event)
  if (chord === null) return null
  index ??= buildChordIndex(definitionsForHost(hasNativeChromeTabs))
  return pickShortcut(index, chord, scopes)
}
