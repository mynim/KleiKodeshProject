/**
 * The settings list, derived from the registry.
 *
 * The rows used to be 60 hand-written lines of `<kbd>` markup, kept in step
 * with the handlers by hand. Here they are read off the bindings in force, so a
 * changed one — the developer's default or the reader's own choice — changes the
 * list by itself.
 *
 * Only the display-only conditions live here — a row hidden because the host
 * has no tab strip, no room for a side commentary column or no split view still
 * has its key working exactly as before (see `ListedWhen`).
 */
import type { Chord } from './chord'
import { keyCellTokens, type KeyCellToken } from './chordLabel'
import type { ResolvedBindings } from './shortcutBindings'
import {
  SHORTCUT_DEFINITIONS,
  SHORTCUT_GROUPS,
  type FixedReason,
  type ShortcutDefinition,
  type ShortcutListing,
} from './shortcutDefinitions'

type ListedDefinition = ShortcutDefinition & { listing: ShortcutListing }

export interface ShortcutRow {
  id: string
  labelKey: string
  /** The key cell, ready to render. Empty when the shortcut has no key. */
  keys: KeyCellToken[]
  /** The one combination a capture would replace, or null when there is none. */
  chord: Chord | null
  /** Why the reader cannot change it; absent when they can. */
  fixed?: FixedReason
  /**
   * Set when this shortcut's default could not be applied because the reader's
   * own choice holds the key — the row is waiting for them to pick another.
   */
  heldBy?: string
}

export interface ShortcutRowGroup {
  id: string
  labelKey: string
  rows: ShortcutRow[]
}

/** What the display-only conditions currently evaluate to. */
export interface ShortcutRowConditions {
  nativeTabs: boolean
  notVsto: boolean
  wideScreen: boolean
}

function isListed(definition: ShortcutDefinition): definition is ListedDefinition {
  return definition.listing !== undefined
}

/**
 * Groups with at least one visible row, in the registry's order. Takes the
 * bindings and the conditions rather than reading them, so the whole list is
 * one pure function of what is in force and where the app is running.
 */
export function buildShortcutRows(
  bindings: ResolvedBindings,
  conditions: ShortcutRowConditions,
): ShortcutRowGroup[] {
  const listed = bindings.definitions.filter(isListed)

  function isVisible(definition: ListedDefinition): boolean {
    switch (definition.listing.when) {
      case 'nativeTabs':
        return conditions.nativeTabs
      case 'notVsto':
        return conditions.notVsto
      case 'wideScreen':
        return conditions.wideScreen
      default:
        return true
    }
  }

  function toRow(definition: ListedDefinition): ShortcutRow {
    const conflict = bindings.conflicts.find((entry) => entry.id === definition.id)
    return {
      id: definition.id,
      labelKey: definition.listing.labelKey,
      keys: keyCellTokens(definition.chords),
      chord: definition.chords[0] ?? null,
      ...(definition.fixed ? { fixed: definition.fixed } : {}),
      ...(conflict ? { heldBy: conflict.heldBy } : {}),
    }
  }

  return SHORTCUT_GROUPS.map((group) => ({
    id: group.id,
    labelKey: group.labelKey,
    rows: listed
      .filter((definition) => definition.listing.group === group.id && isVisible(definition))
      .map(toRow),
  })).filter((group) => group.rows.length > 0)
}

/**
 * The row label of another shortcut, for "that combination is taken by…".
 *
 * Null for a binding with no row of its own, where naming it would mean showing
 * the reader an id. The message then says only that the combination is taken.
 */
export function shortcutLabelKey(id: string): string | null {
  const definition = SHORTCUT_DEFINITIONS.find((candidate) => candidate.id === id)
  return definition?.listing?.labelKey ?? null
}
