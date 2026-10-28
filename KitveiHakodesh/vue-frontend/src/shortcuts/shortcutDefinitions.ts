/**
 * Every keyboard shortcut in the app, once.
 *
 * THE POINT OF THIS FILE: a shortcut used to be written down twice — in the
 * handler that listens for it, and in `ShortcutsReferenceList.vue`, which tells
 * the reader about it. `useAppTitleBarShortcuts.ts` carried the only thing
 * holding those two together: a comment asking the next person to update the
 * list by hand. Here the key, the label and the context are one entry, the list
 * is rendered from it, and the handlers match against it — so the two cannot
 * drift, and a test asserts they haven't.
 *
 * WHAT THIS FILE DOES NOT DO: install listeners, or decide when a shortcut is
 * live. Every handler keeps its own listener, its own event phase and its own
 * guards (pane focused, active tab, focused element) exactly as before — see
 * `shortcutScopes.ts` on why that line matters.
 *
 * Adding one: append it to `SHORTCUT_DEFINITIONS` in the position it should
 * appear in its group, give it a label key that exists in
 * `i18n/locales/*​/settings.json`, and handle its id in the handler that owns
 * the behaviour. Leave `listing` off only for a binding that has no row to show
 * (a duplicate key kept for compatibility).
 */
import type { Chord } from './chord'
import type { ShortcutScope } from './shortcutScopes'

/** The headings of the settings list, in the order they are shown. */
export const SHORTCUT_GROUPS = [
  { id: 'tabManagement', labelKey: 'settings.shortcutsList.tabManagement' },
  { id: 'navigation', labelKey: 'settings.shortcutsList.navigation' },
  { id: 'quickNavigation', labelKey: 'settings.shortcutsList.quickNavigation' },
  { id: 'bookView', labelKey: 'settings.shortcutsList.bookView' },
  { id: 'searchResults', labelKey: 'settings.shortcutsList.searchResults' },
  { id: 'view', labelKey: 'settings.shortcutsList.view' },
] as const

export type ShortcutGroupId = (typeof SHORTCUT_GROUPS)[number]['id']

/**
 * Why a shortcut cannot be reassigned. Absent = the reader may change it.
 *
 * These are reasons, not policy: each one names something that would make a
 * promise to move the key untrue.
 *
 *   'chromium'  — the browser engine acts on the key itself. F7 (caret browsing)
 *                 has no app code behind it at all; F11 and Ctrl+±/0 are
 *                 Chromium's too and the app only suppresses them. Move the
 *                 action elsewhere and the original key goes on doing its thing.
 *   'host'      — the C# host owns the key once it fires. Ctrl+Tab hands the
 *                 direction to the native tab strip, whose popup takes OS focus,
 *                 so the further presses never reach the page; no other
 *                 combination can reproduce hold-and-cycle.
 *   'listModel' — a key of an open list or an open picker (the arrows, Enter,
 *                 Space, F2, Delete), part of the keyboard model of the control
 *                 rather than a command of the app.
 */
export type FixedReason = 'chromium' | 'host' | 'listModel'

/**
 * A host difference that decides WHICH binding a combination is — not merely
 * whether it is shown. Only Ctrl+Tab needs it: with a native tab strip it
 * cycles tabs, and without one (there is exactly one tab by construction) the
 * same keys walk the open page's history.
 */
export type HostGate = 'nativeTabs' | 'noNativeTabs'

/**
 * A condition on SHOWING the row, which never affects what the key does.
 *
 *   'nativeTabs' — tab commands: everywhere else the app is single-tab, so the
 *                  whole group would be rows about nothing.
 *   'notVsto'    — split view, which the task pane has no width for.
 *   'wideScreen' — the side commentary columns need the pane to be wide enough
 *                  (BookViewPage's 650px gate); below it both keys return
 *                  silently, so a row would promise something that won't happen.
 */
export type ListedWhen = 'nativeTabs' | 'notVsto' | 'wideScreen'

export interface ShortcutListing {
  group: ShortcutGroupId
  /** vue-i18n key for the row's description. */
  labelKey: string
  when?: ListedWhen
}

export interface ShortcutDefinition {
  /**
   * Stable id, `area.action`. It is what a handler switches on and what a stored
   * override is keyed by, so renaming one silently drops that reader's choice.
   */
  id: string
  /**
   * The combinations that trigger it. Almost always one; more than one is for a
   * key with a numeric-keypad twin, which is one row to the reader.
   */
  chords: readonly Chord[]
  scope: ShortcutScope
  fixed?: FixedReason
  hosts?: HostGate
  /** Omitted for a binding with no row of its own. */
  listing?: ShortcutListing
}

/**
 * In display order: grouped by `listing.group`, and within a group in the order
 * they appear here.
 */
export const SHORTCUT_DEFINITIONS: readonly ShortcutDefinition[] = [
  // ── Tab management ────────────────────────────────────────────────────────
  // Only the demo-app host has somewhere to put a new tab, so the group is shown
  // there alone. The keys are still MATCHED everywhere, because the handler
  // swallows them rather than letting the browser act on them.
  {
    id: 'tabs.new',
    chords: ['Ctrl+KeyT'],
    scope: 'pane',
    listing: {
      group: 'tabManagement',
      labelKey: 'settings.shortcutsList.newTab',
      when: 'nativeTabs',
    },
  },
  {
    id: 'tabs.list',
    chords: ['Ctrl+Shift+KeyT'],
    scope: 'pane',
    listing: {
      group: 'tabManagement',
      labelKey: 'settings.shortcutsList.openTabList',
      when: 'nativeTabs',
    },
  },
  {
    id: 'tabs.cycle',
    chords: ['Ctrl+Tab'],
    scope: 'pane',
    fixed: 'host',
    hosts: 'nativeTabs',
    listing: {
      group: 'tabManagement',
      labelKey: 'settings.shortcutsList.holdCtrlAndCycleThroughTabs',
    },
  },
  {
    id: 'tabs.cycleBack',
    chords: ['Ctrl+Shift+Tab'],
    scope: 'pane',
    fixed: 'host',
    hosts: 'nativeTabs',
    listing: { group: 'tabManagement', labelKey: 'settings.shortcutsList.cycleInReverse' },
  },
  {
    id: 'tabs.close',
    chords: ['Ctrl+KeyW'],
    scope: 'pane',
    listing: {
      group: 'tabManagement',
      labelKey: 'settings.shortcutsList.closeTab',
      when: 'nativeTabs',
    },
  },
  {
    id: 'tabs.closeAll',
    chords: ['Ctrl+KeyX'],
    scope: 'pane',
    listing: {
      group: 'tabManagement',
      labelKey: 'settings.shortcutsList.closeAllTabs',
      when: 'nativeTabs',
    },
  },

  // ── Navigation ────────────────────────────────────────────────────────────
  {
    id: 'nav.addressBar',
    chords: ['Ctrl+KeyE'],
    scope: 'pane',
    listing: { group: 'navigation', labelKey: 'settings.shortcutsList.focusTheSearchBar' },
  },
  // RTL: back is the RIGHT arrow, matching the title-bar button icons.
  {
    id: 'nav.back',
    chords: ['Alt+ArrowRight'],
    scope: 'pane',
    listing: { group: 'navigation', labelKey: 'settings.shortcutsList.goBackInHistory' },
  },
  {
    id: 'nav.forward',
    chords: ['Alt+ArrowLeft'],
    scope: 'pane',
    listing: { group: 'navigation', labelKey: 'settings.shortcutsList.goForwardInHistory' },
  },
  // Single-tab hosts: the same keys that cycle tabs elsewhere walk the open
  // page's own history, which is why they are listed with navigation there.
  {
    id: 'nav.backWithTab',
    chords: ['Ctrl+Tab'],
    scope: 'pane',
    hosts: 'noNativeTabs',
    listing: { group: 'navigation', labelKey: 'settings.shortcutsList.goBackInHistory' },
  },
  {
    id: 'nav.forwardWithTab',
    chords: ['Ctrl+Shift+Tab'],
    scope: 'pane',
    hosts: 'noNativeTabs',
    listing: { group: 'navigation', labelKey: 'settings.shortcutsList.goForwardInHistory' },
  },
  {
    id: 'nav.home',
    chords: ['Ctrl+KeyG'],
    scope: 'pane',
    listing: { group: 'navigation', labelKey: 'settings.shortcutsList.goToHomePage' },
  },
  {
    id: 'nav.menu',
    chords: ['Ctrl+KeyM'],
    scope: 'pane',
    listing: { group: 'navigation', labelKey: 'settings.shortcutsList.openMainMenu' },
  },
  {
    id: 'nav.sidebar',
    chords: ['Ctrl+Shift+KeyM'],
    scope: 'pane',
    listing: { group: 'navigation', labelKey: 'settings.shortcutsList.showHideSidebar' },
  },
  // A bare function key rather than a Ctrl pair: every Ctrl+letter left is one
  // the browser takes before the page sees it (Ctrl+Shift+W closes the window
  // outright, and preventDefault cannot call that back). F8 has no Chromium
  // binding at all.
  {
    id: 'nav.workspaces',
    chords: ['F8'],
    scope: 'pane',
    listing: { group: 'navigation', labelKey: 'settings.shortcutsList.openWorkspaces' },
  },
  // Inside the picker: listed with it rather than as a group of their own.
  {
    id: 'workspaces.rename',
    chords: ['F2'],
    scope: 'workspacePicker',
    fixed: 'listModel',
    listing: { group: 'navigation', labelKey: 'settings.shortcutsList.renameWorkspaceInList' },
  },
  {
    id: 'workspaces.delete',
    chords: ['Delete'],
    scope: 'workspacePicker',
    fixed: 'listModel',
    listing: { group: 'navigation', labelKey: 'settings.shortcutsList.deleteWorkspaceInList' },
  },
  {
    id: 'theme.toggle',
    chords: ['Ctrl+KeyL'],
    scope: 'pane',
    listing: { group: 'navigation', labelKey: 'settings.shortcutsList.toggleTheme' },
  },

  // ── Quick navigation ──────────────────────────────────────────────────────
  // Ctrl+1..Ctrl+9 open the nine destinations, in the order of the home tiles.
  {
    id: 'quickNav.bookCatalog',
    chords: ['Ctrl+Digit1'],
    scope: 'pane',
    listing: { group: 'quickNavigation', labelKey: 'settings.shortcutsList.bookCatalog' },
  },
  {
    id: 'quickNav.search',
    chords: ['Ctrl+Digit2'],
    scope: 'pane',
    listing: { group: 'quickNavigation', labelKey: 'settings.shortcutsList.search' },
  },
  {
    id: 'quickNav.hebrewBooks',
    chords: ['Ctrl+Digit3'],
    scope: 'pane',
    listing: { group: 'quickNavigation', labelKey: 'settings.shortcutsList.hebrewbooks' },
  },
  {
    id: 'quickNav.openFile',
    chords: ['Ctrl+Digit4'],
    scope: 'pane',
    listing: { group: 'quickNavigation', labelKey: 'settings.shortcutsList.openFile' },
  },
  {
    id: 'quickNav.fileSearch',
    chords: ['Ctrl+Digit5'],
    scope: 'pane',
    listing: { group: 'quickNavigation', labelKey: 'settings.shortcutsList.fileSearch' },
  },
  {
    id: 'quickNav.dictionary',
    chords: ['Ctrl+Digit6'],
    scope: 'pane',
    listing: { group: 'quickNavigation', labelKey: 'settings.shortcutsList.dictionary' },
  },
  {
    id: 'quickNav.calendar',
    chords: ['Ctrl+Digit7'],
    scope: 'pane',
    listing: { group: 'quickNavigation', labelKey: 'settings.shortcutsList.calendar' },
  },
  {
    id: 'quickNav.measures',
    chords: ['Ctrl+Digit8'],
    scope: 'pane',
    listing: { group: 'quickNavigation', labelKey: 'settings.shortcutsList.measuresAndQuantities' },
  },
  {
    id: 'quickNav.hameshiv',
    chords: ['Ctrl+Digit9'],
    scope: 'pane',
    listing: { group: 'quickNavigation', labelKey: 'settings.shortcutsList.hameshiv' },
  },
  // Settings is the one destination unique per pane, so a second F1 switches to
  // the open settings tab rather than opening another (the tab store's
  // SINGLE_TAB_ROUTES, not here).
  {
    id: 'nav.settings',
    chords: ['F1'],
    scope: 'pane',
    listing: { group: 'quickNavigation', labelKey: 'settings.shortcutsList.settings' },
  },

  // ── Book view ─────────────────────────────────────────────────────────────
  {
    id: 'bookView.commentaryBottom',
    chords: ['Ctrl+KeyJ'],
    scope: 'bookView',
    listing: { group: 'bookView', labelKey: 'settings.shortcutsList.showHideCommentariesBelow' },
  },
  {
    id: 'bookView.commentaryRight',
    chords: ['Ctrl+Shift+KeyJ'],
    scope: 'bookView',
    listing: {
      group: 'bookView',
      labelKey: 'settings.shortcutsList.showHideCommentariesOnTheRight',
      when: 'wideScreen',
    },
  },
  {
    id: 'bookView.commentaryLeft',
    chords: ['Ctrl+Alt+KeyJ'],
    scope: 'bookView',
    listing: {
      group: 'bookView',
      labelKey: 'settings.shortcutsList.showHideCommentariesOnTheLeft',
      when: 'wideScreen',
    },
  },
  {
    id: 'bookView.toc',
    chords: ['Ctrl+KeyK'],
    scope: 'bookView',
    listing: { group: 'bookView', labelKey: 'settings.shortcutsList.showHideTableOfContents' },
  },
  // Also opens the txt viewer's search bar — the same key for the same thing in
  // the other text page, which is one row to the reader.
  {
    id: 'bookView.search',
    chords: ['Ctrl+KeyF'],
    scope: 'bookView',
    listing: { group: 'bookView', labelKey: 'settings.shortcutsList.search' },
  },
  // RTL: Left is the NEXT section.
  {
    id: 'bookView.nextSection',
    chords: ['Ctrl+ArrowLeft'],
    scope: 'bookView',
    listing: { group: 'bookView', labelKey: 'settings.shortcutsList.nextSection' },
  },
  {
    id: 'bookView.previousSection',
    chords: ['Ctrl+ArrowRight'],
    scope: 'bookView',
    listing: { group: 'bookView', labelKey: 'settings.shortcutsList.previousSection' },
  },
  {
    id: 'bookView.wordLinkMarkers',
    chords: ['Ctrl+KeyU'],
    scope: 'bookView',
    listing: { group: 'bookView', labelKey: 'settings.shortcutsList.showHideCommentaryMarkers' },
  },
  {
    id: 'bookView.cleanText',
    chords: ['Ctrl+KeyD'],
    scope: 'bookView',
    listing: {
      group: 'bookView',
      labelKey: 'settings.shortcutsList.removeRestoreVowelsAndCantillation',
    },
  },
  {
    id: 'bookView.bookmark',
    chords: ['Ctrl+Shift+KeyD'],
    scope: 'bookView',
    listing: { group: 'bookView', labelKey: 'settings.shortcutsList.createBookmark' },
  },

  // ── Full-text search results ──────────────────────────────────────────────
  // The whole group is the keyboard model of the results list (W3C combobox),
  // and its handler is the one the caret-browsing fix lives in. Reported here,
  // never reassigned.
  {
    id: 'searchResults.move',
    chords: ['ArrowUp', 'ArrowDown'],
    scope: 'searchResults',
    fixed: 'listModel',
    listing: { group: 'searchResults', labelKey: 'settings.shortcutsList.moveBetweenResults' },
  },
  {
    id: 'searchResults.open',
    chords: ['Enter'],
    scope: 'searchResults',
    fixed: 'listModel',
    listing: { group: 'searchResults', labelKey: 'settings.shortcutsList.openResult' },
  },
  {
    id: 'searchResults.openInNewTab',
    chords: ['Ctrl+Enter'],
    scope: 'searchResults',
    fixed: 'listModel',
    listing: { group: 'searchResults', labelKey: 'settings.shortcutsList.openResultInNewTab' },
  },
  {
    id: 'searchResults.preview',
    chords: ['Space'],
    scope: 'searchResults',
    fixed: 'listModel',
    listing: { group: 'searchResults', labelKey: 'settings.shortcutsList.toggleResultPreview' },
  },

  // ── Display ───────────────────────────────────────────────────────────────
  {
    id: 'view.splitView',
    chords: ['Ctrl+Backslash'],
    scope: 'app',
    listing: { group: 'view', labelKey: 'settings.shortcutsList.splitView', when: 'notVsto' },
  },
  {
    id: 'view.toolbar',
    chords: ['Ctrl+KeyB'],
    scope: 'pane',
    listing: { group: 'view', labelKey: 'settings.shortcutsList.showHideToolbar' },
  },
  {
    id: 'view.zoomIn',
    chords: ['Ctrl+Equal', 'Ctrl+NumpadAdd'],
    scope: 'app',
    fixed: 'chromium',
    listing: { group: 'view', labelKey: 'settings.shortcutsList.zoomIn' },
  },
  {
    id: 'view.zoomOut',
    chords: ['Ctrl+Minus', 'Ctrl+NumpadSubtract'],
    scope: 'app',
    fixed: 'chromium',
    listing: { group: 'view', labelKey: 'settings.shortcutsList.zoomOut' },
  },
  {
    id: 'view.zoomReset',
    chords: ['Ctrl+Digit0', 'Ctrl+Numpad0'],
    scope: 'app',
    fixed: 'chromium',
    listing: { group: 'view', labelKey: 'settings.shortcutsList.resetZoom' },
  },
  {
    id: 'view.appBar',
    chords: ['Ctrl+KeyH'],
    scope: 'pane',
    listing: { group: 'view', labelKey: 'settings.shortcutsList.showHideAppBar' },
  },
  {
    id: 'view.scrollbars',
    chords: ['Ctrl+Shift+KeyH'],
    scope: 'app',
    listing: { group: 'view', labelKey: 'settings.shortcutsList.showHideScrollbars' },
  },
  // F9 is Firefox's Reader View key — the closest convention for this — and has
  // no default in Chromium, so there is nothing to suppress.
  {
    id: 'view.readingMode',
    chords: ['F9'],
    scope: 'app',
    listing: {
      group: 'view',
      labelKey: 'settings.shortcutsList.readingModeHideShowAllBarsAndScrollbars',
    },
  },
  {
    id: 'view.fullscreen',
    chords: ['F11'],
    scope: 'app',
    fixed: 'chromium',
    listing: { group: 'view', labelKey: 'settings.shortcutsList.fullScreen' },
  },
  // Chromium's own, with no app code behind it: it is listed because readers use
  // it constantly (it is how they walk a book line by line), and it is fixed
  // because there is nothing here to move.
  {
    id: 'view.caretBrowsing',
    chords: ['F7'],
    scope: 'app',
    fixed: 'chromium',
    listing: {
      group: 'view',
      labelKey: 'settings.shortcutsList.caretBrowsingForNavigationAndSelection',
    },
  },

  // ── Bindings with no row ──────────────────────────────────────────────────
  // Alt+W / Alt+X: history-aware close for the native-strip host, where Ctrl+W/X
  // own the real tab close. Same semantics as Ctrl+W/X without a strip.
  { id: 'pages.close', chords: ['Alt+KeyW'], scope: 'pane' },
  { id: 'pages.closeAll', chords: ['Alt+KeyX'], scope: 'pane' },
  // A second fullscreen key that predates F11 here. Kept so it goes on working.
  { id: 'view.fullscreenAlt', chords: ['Ctrl+Shift+KeyF'], scope: 'app', fixed: 'chromium' },
]

/**
 * The definitions this host has. Pure, so the host flags stay out of this file
 * and out of its tests — `matchShortcut.ts` is the one place that reads them.
 */
export function definitionsForHost(
  hasNativeTabs: boolean,
  definitions: readonly ShortcutDefinition[] = SHORTCUT_DEFINITIONS,
): ShortcutDefinition[] {
  return definitions.filter(
    (definition) =>
      definition.hosts === undefined || (definition.hosts === 'nativeTabs') === hasNativeTabs,
  )
}

/** Can both definitions exist in one host? Two that cannot can share a chord. */
export function hostsCoexist(a: ShortcutDefinition, b: ShortcutDefinition): boolean {
  if (a.hosts === undefined || b.hosts === undefined) return true
  return a.hosts === b.hosts
}
