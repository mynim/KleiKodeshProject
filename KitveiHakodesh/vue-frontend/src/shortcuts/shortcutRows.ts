/**
 * The settings list, derived from the registry.
 *
 * The rows used to be 60 hand-written lines of `<kbd>` markup, kept in step
 * with the handlers by hand. Here they are read off `SHORTCUT_DEFINITIONS`, so
 * a changed binding changes the list by itself.
 *
 * Only the display-only conditions live here — a row hidden because the host
 * has no tab strip, no room for a side commentary column or no split view still
 * has its key working exactly as before (see `ListedWhen`).
 */
import { keyCellTokens, type KeyCellToken } from './chordLabel'
import {
  SHORTCUT_GROUPS,
  definitionsForHost,
  type ShortcutDefinition,
  type ShortcutListing,
} from './shortcutDefinitions'

type ListedDefinition = ShortcutDefinition & { listing: ShortcutListing }

export interface ShortcutRow {
  id: string
  labelKey: string
  keys: KeyCellToken[]
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
 * conditions rather than reading them, so the whole list is one pure function of
 * where the app is running.
 */
export function buildShortcutRows(conditions: ShortcutRowConditions): ShortcutRowGroup[] {
  const listed = definitionsForHost(conditions.nativeTabs).filter(isListed)

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

  return SHORTCUT_GROUPS.map((group) => ({
    id: group.id,
    labelKey: group.labelKey,
    rows: listed
      .filter((definition) => definition.listing.group === group.id && isVisible(definition))
      .map((definition) => ({
        id: definition.id,
        labelKey: definition.listing.labelKey,
        keys: keyCellTokens(definition.chords),
      })),
  })).filter((group) => group.rows.length > 0)
}
