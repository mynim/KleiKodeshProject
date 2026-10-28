/**
 * Keyboard shortcuts for the book view — the half not already handled beside
 * the title bar's (`useAppTitleBarShortcuts`, which owns the panel and search
 * toggles because its pane-focus guard was already there).
 *
 * Handles:
 * - `view.zoomIn` / `view.zoomOut` / `view.zoomReset`: when focus is inside a
 *   scroller, the scroller's own useZoomHandler takes over (but we still
 *   preventDefault to block the browser). When focus is elsewhere (toolbar,
 *   etc.) we zoom both panels together.
 * - `bookView.nextSection` / `bookView.previousSection`: section navigation
 *   (RTL — Left = next, Right = previous).
 * - `bookView.cleanText`: the toolbar's eraser button.
 * - `bookView.bookmark`: a bookmark at the top line (the toolbar's bookmarks
 *   dropdown).
 *
 * Which keys those are is in `src/shortcuts/shortcutDefinitions.ts`; the guards
 * below (pane focused, active tab, focus inside a scroller) stay here.
 */
import { inject } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useBookViewStore } from '@/stores/bookViewStore'
import { usePaneNavigation } from '@/composables/usePaneNavigation'
import { matchShortcut } from '@/shortcuts/matchShortcut'

// Only `$el` is used here (see below) — the scroller API is not part of this
// composable's contract.
type LinesContentInstance = Record<string, unknown>

type CommentaryViewInstance = Record<string, unknown>

export function useBookViewKeyboardShortcuts(
  linesContentRef: () => (LinesContentInstance & { $el?: HTMLElement }) | null,
  /** Every commentary scroller in this pane — one per commentary panel. */
  commentaryViewRefs: Array<() => (CommentaryViewInstance & { $el?: HTMLElement }) | null>,
  hasToc: () => boolean,
  navigateToAdjacentTocSection: (direction: 'next' | 'previous') => void,
  toggleCleanText: () => void,
  createBookmark: () => void,
) {
  const bookViewStore = useBookViewStore()
  const paneNavigation = usePaneNavigation()
  const paneId = inject<1 | 2>('paneId', 1)

  useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    // Only respond when split view is off, or this pane is the focused one.
    if (bookViewStore.splitViewEnabled && bookViewStore.focusedPaneId !== paneId) return
    // Only respond when the active tab in this pane is a book view.
    if (paneNavigation.activeTab.route !== '/book-view') return

    // The zoom shortcuts are app-scoped (they mean the same thing on every
    // page), which is why both scopes are asked for here.
    const id = matchShortcut(event, 'bookView', 'app')
    if (id === null) return

    switch (id) {
      case 'bookView.cleanText':
        event.preventDefault()
        toggleCleanText()
        return
      case 'bookView.bookmark':
        event.preventDefault()
        createBookmark()
        return
      case 'bookView.nextSection':
      case 'bookView.previousSection':
        if (!hasToc()) return
        event.preventDefault()
        navigateToAdjacentTocSection(id === 'bookView.nextSection' ? 'next' : 'previous')
        return
      case 'view.zoomIn':
      case 'view.zoomOut':
      case 'view.zoomReset':
        break
      // Every other shortcut of the book view is handled where its pane-focus
      // guard already lives — see `useAppTitleBarShortcuts`.
      default:
        return
    }

    const focused = document.activeElement
    const linesRoot = linesContentRef()?.$el
    // The commentary check is structural (the slot attribute on each panel's
    // root) rather than $el-based: a stray comment beside a template root turns
    // the component into a fragment and $el into a comment node, which silently
    // breaks contains() - that exact regression double-zoomed the panels once.
    const focusInScroller =
      focused != null &&
      ((linesRoot != null && linesRoot.contains(focused)) ||
        (focused instanceof Element && focused.closest('[data-commentary-slot]') != null))

    // Prevent the browser from applying its own page zoom regardless of focus.
    event.preventDefault()

    // If a scroller owns focus, its own useZoomHandler handles the zoom — skip.
    if (focusInScroller) return

    // Zoom this pane's own tab — the no-arg forms target pane 1's active tab,
    // which is the wrong book when these shortcuts fire in pane 2.
    const tab = paneNavigation.activeTab
    if (id === 'view.zoomIn') bookViewStore.zoomIn(tab.id, tab.bookId)
    else if (id === 'view.zoomOut') bookViewStore.zoomOut(tab.id, tab.bookId)
    else bookViewStore.resetZoom(tab.id, tab.bookId)
  })
}
