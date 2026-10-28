/**
 * Catching the combination the reader presses, for one row of the settings list.
 *
 * Three things make this safe to do inside a running app:
 *
 *   · `isCapturingShortcut` is on for as long as a row is waiting, and
 *     `matchShortcut` answers null throughout — so pressing Ctrl+W to BIND it
 *     does not also close a tab. Nothing in any handler changed for this.
 *   · the listener is on the window in the CAPTURE phase and stops the event
 *     dead, so a keydown meant for a binding never reaches the page underneath:
 *     not a dialog's Escape, not a list's arrows, not the browser's own key.
 *   · nothing is written until it can be written cleanly. A combination the
 *     browser owns is refused with a reason, and one another shortcut holds is
 *     put to the reader as a question before anything is taken away.
 */
import { onScopeDispose, ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { chordFromEvent, type Chord } from './chord'
import { chordProblem, type ChordProblem } from './chordAssignment'
import {
  assignShortcut,
  clearShortcut,
  isCapturingShortcut,
  shortcutHolding,
} from './shortcutSettings'

/** A combination the reader must confirm, because something else holds it. */
export interface PendingReplacement {
  id: string
  chord: Chord
  /** The shortcut that would be left without a key. */
  heldBy: string
}

export function useShortcutCapture() {
  /** The row waiting for a combination, or null. */
  const capturingId = ref<string | null>(null)
  /** Why the last combination was refused, on the row that asked for it. */
  const refused = ref<{ id: string; problem: ChordProblem } | null>(null)
  const pending = ref<PendingReplacement | null>(null)

  function stop(): void {
    capturingId.value = null
    isCapturingShortcut.value = false
  }

  /** Ask for a combination for `id`, dropping whatever the row was showing. */
  function start(id: string): void {
    refused.value = null
    pending.value = null
    capturingId.value = id
    isCapturingShortcut.value = true
  }

  function cancel(): void {
    refused.value = null
    pending.value = null
    stop()
  }

  /** Take the combination anyway, leaving the shortcut that held it with no key. */
  function confirmPending(): void {
    const replacement = pending.value
    if (!replacement) return
    assignShortcut(replacement.id, replacement.chord, [replacement.heldBy])
    pending.value = null
  }

  useEventListener(
    window,
    'keydown',
    (event: KeyboardEvent) => {
      const id = capturingId.value
      if (id === null) return
      // Everything, including the keys this page would otherwise act on.
      event.preventDefault()
      event.stopImmediatePropagation()

      const chord = chordFromEvent(event)
      // Only modifiers so far — keep waiting for the key itself.
      if (chord === null) return
      if (chord === 'Escape') {
        cancel()
        return
      }
      // Clearing is deliberate and reachable: a shortcut the reader does not
      // want at all is better off with no key than with one they will hit by
      // accident.
      if (chord === 'Backspace' || chord === 'Delete') {
        clearShortcut(id)
        stop()
        return
      }
      const problem = chordProblem(chord)
      if (problem !== null) {
        // Stay on the row: the reader pressed something that cannot work, and
        // the natural next move is to press something else.
        refused.value = { id, problem }
        return
      }
      refused.value = null
      const heldBy = shortcutHolding(chord, id)
      if (heldBy !== null) {
        // Nothing is written yet. The row asks first, because the cost of this
        // one is another shortcut losing its key.
        pending.value = { id, chord, heldBy }
        stop()
        return
      }
      assignShortcut(id, chord)
      stop()
    },
    { capture: true },
  )

  // A row left mid-capture (the page navigated away, the search box hid the
  // section) must not leave every shortcut in the app standing down.
  onScopeDispose(() => {
    if (capturingId.value !== null) isCapturingShortcut.value = false
  })

  return { capturingId, refused, pending, start, cancel, confirmPending }
}
