/**
 * Where a shortcut is live.
 *
 * READ THIS FIRST: a scope is DECLARED INFORMATION, not behaviour. The real
 * gating has always lived inside the handlers — this pane focused, this pane's
 * active tab being a book view, the focused element owning the key — and it
 * stays there, untouched, because that is the arrangement the caret-browsing fix
 * in the search results depends on. Nothing in this folder installs a listener
 * or decides when one runs.
 *
 * The scope is used for exactly two things:
 *   · which definitions a handler asks about (`matchShortcut(event, 'pane')`)
 *   · whether two bindings on the same combination are a CONFLICT, which is a
 *     question only about whether they can be live at the same moment
 */
export type ShortcutScope =
  /** The whole app, whatever is open. Handled by pane 1 only, so it fires once. */
  | 'app'
  /** One shell: tabs, chrome, navigation. Live whenever that pane is focused. */
  | 'pane'
  /** Only while the focused pane's active tab is a book. */
  | 'bookView'
  /** Only on the full-text search page, with results on screen. */
  | 'searchResults'
  /** Only while the workspace picker is open over the page. */
  | 'workspacePicker'

/**
 * Scopes that are live regardless of which page is open: either always ('app',
 * 'pane') or able to open over any page ('workspacePicker'). Anything here can
 * collide with anything.
 */
const ALWAYS_POSSIBLE: ReadonlySet<ShortcutScope> = new Set<ShortcutScope>([
  'app',
  'pane',
  'workspacePicker',
])

/**
 * Can both scopes be live at the same moment?
 *
 * Two PAGE scopes cannot: they name the active tab of the focused pane, and a
 * pane has one. That is what lets the book view and the search results each
 * give the same combination its own meaning without it counting as a clash —
 * split view does not change this, because both handlers stand down for the
 * pane that is not focused.
 */
export function scopesOverlap(a: ShortcutScope, b: ShortcutScope): boolean {
  if (a === b) return true
  return ALWAYS_POSSIBLE.has(a) || ALWAYS_POSSIBLE.has(b)
}
