/**
 * The reader's own shortcut choices: held here, persisted here, and nowhere
 * else.
 *
 * Module-level reactive state rather than a Pinia store, because
 * `matchShortcut` is called from keydown handlers rather than from a component
 * setup, and a store would have to be resolved on every keystroke. The app
 * already keeps cross-cutting UI state this way — see
 * `composables/useUiChromeVisibility.ts`.
 *
 * STORAGE: one localStorage key through the app's own driver, holding only the
 * CHANGES — `{ "nav.home": "Ctrl+Shift+KeyG" }`, a few hundred bytes for a
 * reader who has moved everything they care about. Nothing new was built for
 * it: `lsGet`/`lsSet` are what every setting in the app uses, the key is
 * namespaced `area.name` as `src/stores/README.md` requires, and it is defined
 * here because the module that owns a value owns its disk name. It is small
 * enough that localStorage's 5MB budget is not a consideration, so it
 * deliberately registers no reclaimer — those belong to owners of data that can
 * afford to be dropped, and a reader's keyboard is not that.
 *
 * "Reset settings" clears this key along with every other preference, which is
 * the intended behaviour: it puts the shortcuts back to their defaults.
 */
import { computed, ref, watch } from 'vue'
import { lsGet, lsSet } from '@/utils/persistence'
import { hasNativeChromeTabs } from '@/webview-host/bridge'
import { isChord, type Chord } from './chord'
import { resolveBindings, type ShortcutOverrides } from './shortcutBindings'
import { SHORTCUT_DEFINITIONS, definitionsForHost } from './shortcutDefinitions'
import { scopesOverlap } from './shortcutScopes'

/** Disk name for the reader's changes. Nothing else reads it. */
const KEYS = { SHORTCUT_OVERRIDES: 'shortcuts.overrides' } as const

const overrides = ref<Record<string, Chord | null>>({})

/** Ids the reader is allowed to have an opinion about. */
const CHANGEABLE_IDS = new Set(
  SHORTCUT_DEFINITIONS.filter((definition) => !definition.fixed).map((definition) => definition.id),
)

/**
 * Reads the stored changes, dropping anything this build cannot honour: an id
 * that no longer exists or has since become fixed, and a combination that is
 * not one this app would ever produce. Doing it on the way IN means the rest of
 * the app never has to consider malformed data, and the next write leaves the
 * dropped entries behind for good.
 */
export function initShortcutSettings(): void {
  const stored = lsGet<Record<string, unknown>>(KEYS.SHORTCUT_OVERRIDES)
  if (stored === null || typeof stored !== 'object') return
  const clean: Record<string, Chord | null> = {}
  for (const [id, value] of Object.entries(stored)) {
    if (!CHANGEABLE_IDS.has(id)) continue
    if (value === null) clean[id] = null
    else if (isChord(value)) clean[id] = value
  }
  overrides.value = clean
}

// Written at once rather than on Vue's next flush: a shortcut change is a
// single deliberate act, rare enough that there is nothing to coalesce, and a
// reader who closes the app the moment after must not find their key gone.
watch(overrides, (value) => lsSet(KEYS.SHORTCUT_OVERRIDES, value), {
  deep: true,
  flush: 'sync',
})

/** The reader's changes, for the settings UI. */
export const shortcutOverrides = computed<ShortcutOverrides>(() => overrides.value)

/**
 * Every binding as it is actually in force. One computed, so a change reaches
 * the handlers and the settings list in the same tick and neither can be
 * looking at yesterday's keys.
 */
export const activeBindings = computed(() =>
  resolveBindings(definitionsForHost(hasNativeChromeTabs), overrides.value),
)

/** Has the reader moved this one? */
export function isShortcutChanged(id: string): boolean {
  return id in overrides.value
}

/**
 * The shortcut that would be in the way, or null. Scope decides: the book view
 * and the search results are never open at once, so the same combination in
 * both is not a clash (see `scopesOverlap`).
 */
export function shortcutHolding(chord: Chord, id: string): string | null {
  const mine = activeBindings.value.definitions.find((definition) => definition.id === id)
  if (!mine) return null
  const holder = activeBindings.value.definitions.find(
    (definition) =>
      definition.id !== id &&
      definition.chords.includes(chord) &&
      scopesOverlap(definition.scope, mine.scope),
  )
  return holder?.id ?? null
}

/**
 * Give `id` this combination. `displacing` are the shortcuts the reader agreed
 * to leave without a key in order to free it — the settings row asks first and
 * passes them here, so one press writes one consistent state rather than
 * passing through a moment where two shortcuts hold the same keys.
 */
export function assignShortcut(id: string, chord: Chord, displacing: readonly string[] = []): void {
  const next = { ...overrides.value }
  for (const displaced of displacing) if (CHANGEABLE_IDS.has(displaced)) next[displaced] = null
  next[id] = chord
  overrides.value = next
}

/** Leave `id` with no key at all. */
export function clearShortcut(id: string): void {
  overrides.value = { ...overrides.value, [id]: null }
}

/** Put `id` back to the combination it shipped with. */
export function resetShortcut(id: string): void {
  const next = { ...overrides.value }
  delete next[id]
  overrides.value = next
}

/** Put every shortcut back to the combination it shipped with. */
export function resetAllShortcuts(): void {
  overrides.value = {}
}

/**
 * True while a settings row is waiting for the reader to press a combination.
 *
 * `matchShortcut` answers null throughout, so pressing Ctrl+W to BIND it cannot
 * also close a tab. One gate inside the registry, rather than a change to any
 * of the handlers.
 */
export const isCapturingShortcut = ref(false)
