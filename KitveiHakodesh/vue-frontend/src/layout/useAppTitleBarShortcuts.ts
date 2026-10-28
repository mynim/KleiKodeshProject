import { computed, type ComputedRef, type Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useAppNavigation } from '@/composables/useAppNavigation'
import { useBookViewStore } from '@/stores/bookViewStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useThemeStore } from '@/theme/themeStore'
import { toggleFullscreen, hasNativeChromeTabs, toggleChromeTabList } from '@/webview-host/bridge'
import { toggleReadingMode, toggleScrollbarsHidden } from '@/composables/useUiChromeVisibility'
import { HAMESHIV_LABEL } from '@/layout/appNavItems'
import { useHameshivReachable } from '@/composables/useHameshivReachable'
import { matchShortcut } from '@/shortcuts/matchShortcut'
import type { useAppShellPane } from '@/composables/useAppShellPane'

type Pane = ReturnType<typeof useAppShellPane>

/**
 * Every keyboard shortcut owned by the title bar, for one pane.
 *
 * Each pane installs its own handler, which splits the shortcuts in two:
 *
 *   Pane-scoped — tab operations, book-view panels, navigation within a pane.
 *     Fire only when this pane is focused (always, when split view is off).
 *   App-wide — fullscreen, split view. Handled by **pane 1 only**, so they do
 *     not fire twice while split view is open.
 *
 * Deciding which half a new shortcut belongs to is the whole point of this file:
 * an app-wide shortcut added to the pane-scoped block fires once per open pane.
 * That half is also the shortcut's `scope` in the registry — `'pane'` and
 * `'app'` are the two blocks below.
 *
 * WHICH KEY triggers what is no longer written here: `matchShortcut` answers
 * that from `src/shortcuts/shortcutDefinitions.ts`, where the key, the label in
 * the settings list and the context live as one entry. This file owns what
 * HAPPENS, and the guards deciding WHEN — this pane focused, the active tab,
 * the focused element — exactly as before.
 *
 * `Ctrl+1`..`Ctrl+9` and `F1` go through `navigateInNewTab` with the Hebrew
 * destination labels, so they stay in sync with the home tiles and the nav
 * dropdown — see `useAppNavigation`.
 *
 * F1 differs from `Ctrl+1`..`Ctrl+9` in where it lands, not in how it is wired:
 * settings is the one destination unique per pane, so a second F1 switches to the
 * open settings tab rather than opening another. That rule lives with the tab
 * store's `SINGLE_TAB_ROUTES`, not here.
 */
export function useAppTitleBarShortcuts(options: {
  paneId: 1 | 2
  pane: Pane
  /** `view.appBar` toggles this. Shared per-pane ref from `useUiChromeVisibility`. */
  titleBarVisible: Ref<boolean>
  /** `view.splitView` is ignored unless split view actually fits on screen. */
  isSplitViewAvailable: ComputedRef<boolean>
  /** `nav.addressBar`. Owned by the component because the
   *  address bar's visibility drives its template. */
  toggleAddressBar: () => void
  /** `nav.menu`. Owned by the component for the same reason. */
  toggleNavDropdown: () => void
  /** `nav.workspaces`. Owned by the component, which holds the picker's open state. */
  toggleWorkspaces: () => void
}) {
  const { paneId, pane, titleBarVisible, isSplitViewAvailable } = options
  const bookViewStore = useBookViewStore()
  const settingsStore = useSettingsStore()
  const themeStore = useThemeStore()
  const { navigateInNewTab } = useAppNavigation()

  const activeTab = computed(() => pane.activeTab.value)
  const isBookViewActive = computed(() => activeTab.value?.route === '/book-view')
  const isTxtViewActive = computed(() => activeTab.value?.route === '/txt-view')
  const isThisPaneFocused = computed(
    () => !bookViewStore.splitViewEnabled || bookViewStore.focusedPaneId === paneId,
  )

  /** Quick-nav destinations, by shortcut id. */
  const QUICK_NAV_DESTINATIONS: Record<string, string> = {
    'quickNav.bookCatalog': 'קטלוג הספרים',
    'quickNav.search': 'חיפוש',
    'quickNav.hebrewBooks': 'היברו-בוקס',
    'quickNav.openFile': 'פתח קובץ',
    'quickNav.fileSearch': 'חיפוש קבצים',
    'quickNav.dictionary': 'מילון',
    'quickNav.calendar': 'לוח שנה',
    'quickNav.measures': 'מידות ושיעורים',
    'quickNav.hameshiv': HAMESHIV_LABEL,
  }
  const hameshivReachable = useHameshivReachable()

  // Forward Ctrl+key shortcuts from child iframes (HTML/txt viewer) back into the
  // top-level keydown pipeline. Only pane 1 needs this — iframes only appear there.
  if (paneId === 1) {
    useEventListener('message', (e: MessageEvent) => {
      if (!e.data || e.data.type !== 'iframeKeydown') return
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          code: e.data.code,
          ctrlKey: e.data.ctrlKey,
          shiftKey: e.data.shiftKey,
          metaKey: e.data.metaKey,
          altKey: e.data.altKey,
          bubbles: true,
          cancelable: true,
        }),
      )
    })
  }

  /** Returns true when the event was consumed. */
  function handlePaneScoped(e: KeyboardEvent): boolean {
    // Swallow the browser's new-window; new tab is `tabs.new`. A suppression
    // rather than a shortcut of this app's own, so it is not in the registry and
    // it ignores the other modifiers deliberately — Ctrl+Shift+N is the
    // incognito window, and it must not open either.
    if (e.ctrlKey && e.code === 'KeyN') return true

    // Book-view ids are asked for here as well as in the book view's own
    // composable: Ctrl+J/K/U/F belong to the book but have always been handled
    // in this file, where the pane's focus guard already sits.
    const id = matchShortcut(e, 'pane', 'bookView')
    if (id === null) return false

    // Ctrl+1..Ctrl+9 — quick-nav in a new tab.
    const destination = QUICK_NAV_DESTINATIONS[id]
    if (destination !== undefined) {
      // Hameshiv is hidden while unreachable - its shortcut is a no-op then, like the missing item.
      if (destination === HAMESHIV_LABEL && !hameshivReachable.value) return true
      navigateInNewTab(destination)
      return true
    }

    switch (id) {
      case 'nav.settings':
        navigateInNewTab('הגדרות')
        return true
      // A bare function key rather than a Ctrl pair because every Ctrl+letter
      // left is one the BROWSER takes before the page ever sees it:
      // Ctrl+Shift+W closes the window outright, and preventDefault cannot call
      // that back. F8 has no Chromium binding at all, and it joins the F-key
      // family this app already has - F1 settings, F9 reading mode, F11 fullscreen.
      case 'nav.workspaces':
        options.toggleWorkspaces()
        return true
      // The tab's own Back/Forward, like a browser. RTL: back is the RIGHT
      // arrow, matching the title-bar button icons. The modifier is Alt because
      // Ctrl+Arrow stays with the book view's section navigation.
      // stopPropagation too: plain-arrow handlers (tile grids, list navigation)
      // don't check modifiers, and this must not also move their focus.
      case 'nav.back':
        e.stopPropagation()
        pane.goBack()
        return true
      case 'nav.forward':
        e.stopPropagation()
        pane.goForward()
        return true
      // Alt+W / Alt+X — history-aware close for the native-strip host, where
      // Ctrl+W/X own the real tab close. Same semantics as `tabs.close` /
      // `tabs.closeAll` in VSTO/dev: remove the current page (or all pages) from
      // both history stacks.
      case 'pages.close':
        pane.closeCurrentPage()
        return true
      case 'pages.closeAll':
        pane.closeAllPages()
        return true

      // Ctrl+Tab / Ctrl+Shift+Tab, with a native strip.
      //
      // This opens the strip's tab-list dropdown as an Alt+Tab-style switcher: it stays
      // up while Ctrl is held, each further Tab steps the highlight, and releasing Ctrl
      // activates the highlighted tab. Nothing loads until release, so stepping past
      // five tabs costs one remount instead of five.
      //
      // The page cannot drive that hold — the native popup takes OS focus as it opens, so
      // no keyup ever arrives here. We hand the direction to C# and it owns the rest,
      // including the repeat presses (which reach the focused popup, not this handler).
      //
      // The registry holds the host difference: everywhere else there is exactly one tab
      // by construction, so the same keys are `nav.backWithTab` / `nav.forwardWithTab`
      // below and walk the tab's own history instead — the same thing the title bar's
      // back/forward arrows do.
      case 'tabs.cycle':
      case 'tabs.cycleBack':
        if (e.repeat) return true
        toggleChromeTabList(id === 'tabs.cycleBack' ? -1 : 1)
        return true
      case 'nav.backWithTab':
        if (e.repeat) return true
        pane.goBack()
        return true
      case 'nav.forwardWithTab':
        if (e.repeat) return true
        pane.goForward()
        return true

      // Closing is meaningless where there is only ever one tab — the store would just
      // replace it with a fresh home tab, which reads as "my document vanished".
      // In VSTO and dev (no native strip), Ctrl+W instead removes the current page
      // from both the per-tab history stack and recentLocations, then goes back.
      // Ctrl+X does the same for all pages at once (clears everything, goes home).
      case 'tabs.close':
        if (hasNativeChromeTabs) pane.closeTab(pane.activeTabId.value)
        else pane.closeCurrentPage()
        return true
      case 'tabs.closeAll':
        if (hasNativeChromeTabs) pane.closeAllTabs()
        else pane.closeAllPages()
        return true
      // Only the demo-app host has somewhere to put a new tab. The VSTO task pane
      // shows one tab with no strip, and the dev browser has no strip either — in
      // both, a new tab would be one the user can never navigate back to. The keys
      // are still consumed there, so the browser does not act on them.
      case 'tabs.new':
        if (!hasNativeChromeTabs) return true
        pane.openNewTab()
        return true
      case 'tabs.list':
        if (!hasNativeChromeTabs) return true
        toggleChromeTabList()
        return true

      case 'view.toolbar':
        if (isBookViewActive.value) bookViewStore.toggleToolbar(paneId)
        else if (activeTab.value?.route === '/pdf-view') pane.togglePdfViewerTitleBar()
        return true
      // One family, three slots: the bottom commentary panel, the right-side one
      // and the left-side one.
      case 'bookView.commentaryBottom':
        if (isBookViewActive.value) bookViewStore.toggleCommentaryPanel(paneId, 'bottom')
        return true
      case 'bookView.commentaryRight':
        if (isBookViewActive.value) bookViewStore.toggleCommentaryPanel(paneId, 'side')
        return true
      case 'bookView.commentaryLeft':
        if (isBookViewActive.value) bookViewStore.toggleCommentaryPanel(paneId, 'side-left')
        return true
      case 'bookView.toc':
        if (isBookViewActive.value) bookViewStore.toggleTocPanel(paneId)
        return true
      // Toggle the current book's word-link marker signs (all visible → hide all;
      // otherwise show all). No-op on books without markers and on schema-v1 DBs;
      // consumed anyway to suppress the browser's view-source.
      case 'bookView.wordLinkMarkers':
        if (isBookViewActive.value && activeTab.value?.bookId != null)
          void settingsStore.toggleWordLinkMarkersForBook(activeTab.value.bookId)
        return true
      case 'bookView.search':
        // Let a focused search input keep its own Ctrl+F.
        if (document.activeElement?.closest('[data-ctrlf-enabled]')) return false
        if (isBookViewActive.value) bookViewStore.openSearch(paneId)
        else if (isTxtViewActive.value) bookViewStore.txtViewToggleSearch(paneId)
        return true

      case 'nav.addressBar':
        options.toggleAddressBar()
        return true
      case 'nav.home':
        pane.goHome()
        return true
      case 'view.appBar':
        // `view.scrollbars` is the app-wide hidden-scrollbars toggle and is not
        // in this block's scopes, so it falls through to handleAppWide instead of
        // also flipping this pane's title bar.
        titleBarVisible.value = !titleBarVisible.value
        return true
      case 'theme.toggle':
        themeStore.toggleDarkMode()
        return true
      // `nav.menu` opens the nav menu as a dropdown, `nav.sidebar` docks the same
      // menu as this pane's rail — one family, since they are two presentations
      // of one menu. Pane-scoped because each pane owns its own rail, like every
      // other per-pane chrome toggle.
      case 'nav.menu':
        options.toggleNavDropdown()
        return true
      case 'nav.sidebar':
        settingsStore.setNavSidebarVisible(paneId, !settingsStore.getNavSidebarVisible(paneId))
        return true
      default:
        return false
    }
  }

  /** Returns true when the event was consumed. Pane 1 only. */
  function handleAppWide(e: KeyboardEvent): boolean {
    // Swallow the browser print dialog. This is preventDefault-only (no
    // stopPropagation), and `usePdfPrintShortcut` relies on that: on the PDF
    // page it still sees this keydown and forwards the print into the PDF.js
    // iframe. A suppression, not a shortcut, so it is not in the registry.
    if (e.ctrlKey && e.code === 'KeyP') return true

    switch (matchShortcut(e, 'app')) {
      case 'view.fullscreen':
      case 'view.fullscreenAlt':
        toggleFullscreen()
        return true
      // Hide scrollbars completely except while scrolling (persisted setting).
      // App-wide because the mode sits on the one shared root element. Sits in
      // the `view.appBar` "hide chrome" family, which is pane-scoped.
      case 'view.scrollbars':
        toggleScrollbarsHidden()
        return true
      // Reading mode: hide/show all chrome at once (title bars, book toolbars,
      // scrollbars). Check-all semantics live in `toggleReadingMode`.
      case 'view.readingMode':
        toggleReadingMode()
        return true
      case 'view.splitView':
        if (isSplitViewAvailable.value) bookViewStore.toggleSplitView()
        return true
      default:
        return false
    }
  }

  useEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (isThisPaneFocused.value && handlePaneScoped(e)) {
        e.preventDefault()
        return
      }
      if (paneId === 1 && handleAppWide(e)) e.preventDefault()
    },
    { capture: true },
  )
}
