# Appendix B — Klei Kodesh: navigation, persistence, shortcuts and personalisation

Raw inventory, read off the source on 2026-10-26. Evidence base for
[the synthesis](navigation-and-shortcuts.md). File paths are repo-relative.

Scope: navigation, access, saving and reuse, keyboard shortcuts, history, settings.
The editing/proofreading dimension was deliberately excluded.

> ⚠️ **Read against code that was 101 commits behind upstream.** Re-verified on
> 2026-10-27 after syncing to `v10.3.0`. The headline findings all survived — no
> bookmarks, zero Word-level key bindings, one shortcut source matched on `e.code`,
> the Word pane still single-tab, the ribbon still one group with one `splitButton`
> defaulting to `Settings`. **Four entries below are now wrong:**
>
> 1. **`ShortcutsReferenceList.vue` is no longer script-free.** It now has logic that
>    shows or hides shortcut groups by `hasNativeChromeTabs`.
> 2. **`workspaceStore.switchWorkspace` no longer reloads.** It sets the active id and
>    persists. `Workspace` is a thin `{ id, name, createdAt }`; the heavy per-tab and
>    per-book state lives under workspace-scoped keys, not inside the record.
> 3. **`useSettingsSearch.ts` moved** from `composables/` to `features/settings/`.
> 4. **Multi-select does exist**, for lines inside a book (`multiSelectLineIds`). What
>    is missing is multi-select in *lists*, to open several items at once.
>
> **And one thing the inventory never had:** the add-in now injects items into 15 of
> Word's context menus (`ContextMenuXmlBuilder.cs`) — full-text search and catalog
> search from the selection, compare, and open-link. That is a Word-level access path
> the synthesis was written without. See
> [the synthesis' verification section](navigation-and-shortcuts.md#מה-אומת-ומה-התיישן--27102026).
>
> Also structural: the book view and the search results page were rewritten onto
> `WindowedScroller` upstream and `@tanstack/vue-virtual` was dropped, so rows are no
> longer all in the DOM.

---

# Navigation, persistence, shortcuts and personalisation — current state

A note first: **three of the project's own docs are stale on this dimension.** `KitveiHakodesh/.kiro/plan/keyboard-shortcuts.md` is almost entirely wrong (it lists `Alt+N`, `Alt+T`, `Alt+L`, `Alt+F`, `Alt+Home`, `Alt+M` and claims shortcuts live in `AppTitleBar.vue`); `.kiro/steering/architecture.md` lists a `/workspaces` route, `Ctrl+T` for the address bar and `Ctrl+9` for workspaces, all gone; `vue-frontend/src/layout/README.md` says the rail carries home + workspaces and the title bar has new-tab/close-tab buttons — it does not. Everything below is read off the source.

---

## 1. Navigation surfaces

### The destination list — one definition, three renderers
`KitveiHakodesh/vue-frontend/src/layout/appNavItems.ts` is the single list. `APP_NAV_ITEMS` is a **computed** (Hameshiv is filtered out while unreachable), plus `APP_NAV_SETTINGS_ITEM` below a divider.

| Label (the routing key) | Shortcut | What it does |
|---|---|---|
| קטלוג הספרים | Ctrl+1 | `/books` |
| חיפוש | Ctrl+2 | `/search` |
| היברו-בוקס | Ctrl+3 | `/hebrewbooks` |
| פתח קובץ | Ctrl+4 | native file picker (no route) |
| חיפוש קבצים | Ctrl+5 | `/file-search` |
| מילון | Ctrl+6 | `/dictionary` |
| לוח שנה | Ctrl+7 | `/hebrew-calendar` |
| מידות ושיעורים | Ctrl+8 | `/midot` |
| המשיב | Ctrl+9 | opens hameshiv.com in a host popup (no route, no tab) |
| הגדרות | F1 | `/settings` |

The label *is* the routing key: `composables/useAppNavigation.ts` maps it in `DESTINATION_ROUTES`. Renaming a label there without renaming it here silently breaks the destination (documented in both files).

Four surfaces offer these:
- **`layout/AppTitleBarNavDropdown.vue`** — the hamburger menu. Rows = `APP_NAV_ITEMS`, then a divider, then exactly three rows: `settings`, `navSidebar` (opens the rail), and `popOut` (hosted only). Keyboard list via `useListKeyNav`; shortcut captions rendered per row. Opens destinations with `navigateInNewTab`.
- **`layout/AppNavSidebar.vue`** — the same menu docked as a 44px icon rail, one per pane. Contents: the destinations, a flex spacer, then split-view toggle, pop-out, settings, and a pinned hide button. **Home and workspaces are deliberately *not* on the rail** (source comment at line 48) — they live in the title bar. In a short pane the tail collapses bottom-up into `AppNavSidebarOverflowMenu.vue`; the fit arithmetic is `layout/useAppNavSidebarOverflow.ts` (32px button + 6px gap, 38px pitch).
- **`features/home/useHomeNavCards.ts`** — the same destinations as home cards. **Returns `[]` entirely while that pane's rail is visible.** When no DB is available the first two cards swap to הורד מסד ספרים / בחר מסד ספרים.
- **Keyboard** — `Ctrl+1`…`Ctrl+9` / `F1` in `layout/useAppTitleBarShortcuts.ts`, driven off the same labels (`QUICK_NAV_LABELS`).

### The home page
`features/home/HomePage.vue` + `useHomeSuggestionCards.ts`. One card collection, order depends on the rail:
- rail hidden → `[...navCards, ...historyCards]`
- rail shown → `[...historyCards, ...dailyLearningCards]`, daily-learning padding only up to `FILLED_CARD_COUNT = 9`

Above the cards: the hero quick-search, which is `features/global-search/` (`useGlobalSearch.ts` + `GlobalSearchDropdown.vue`) fanning one query across book catalog (instant, in-memory), HebrewBooks (300ms debounce, bridge) and DocumentLocator file search (300ms debounce, bridge), each capped at 50 rows, min 2 chars. Source-priority prefixes and `\` / `\\` shorthands reorder the sections. Below: `HomePageDateBar.vue` (clock, next zman, Hebrew date, daily learning), kept to one line by `useHomeDateBarFit.ts`.

### Title bar
`layout/AppTitleBar.vue`, 40px, one per pane. Actual buttons today:
- `.bar-start`: hamburger (`'hamburger'`, dropped while the rail is up), Back and Forward (`AppTitleBarHistoryButton.vue`, ids `'prev-tab'`/`'next-tab'` — legacy names), home (`'home'`)
- centre: `AddressBar.vue` in search mode, else tab title + `AppTitleBarTocBreadcrumb.vue` with a chevron dropdown per segment
- `.bar-end`: workspaces picker (`'workspaces'`), split view (`'split-view'`, dropped while the rail is up), theme toggle (`'theme-toggle'`), txt-view find, toolbar toggle (`'toolbar-toggle'`), OCR (`'ocr'`)

There is **no new-tab and no close-tab button** — the native strip owns that. Every one of those ids is user-hideable (see §5).

### Routes → pages
`layout/AppPageView.vue` holds the `<component :is>` map. 13 routes, all `defineAsyncComponent`: `/`, `/books`, `/book-view`, `/pdf-view`, `/html-view`, `/txt-view`, `/settings`, `/hebrewbooks`, `/search`, `/hebrew-calendar`, `/dictionary`, `/midot`, `/file-search`. `TabRoute` in `stores/tabStore.ts` is the authoritative union — **`/workspaces` no longer exists.**

Remount keying (`pageKey`): `/book-view` → `tabId:bookId:navNonce`; `/`, `/search`, `/txt-view` → `tabId`; everything else shares one instance. `navNonce` exists so a jump to a *different position in the already-open book* (a recents row, Back, a catalog TOC hit) forces a remount.

**Singletons are nearly gone.** `SINGLE_TAB_ROUTES` in `tabStore.ts` is exactly `['/settings']`, with the reasoning spelled out: settings is app-wide state, every other destination is something you may legitimately want two of. `navigateToDestination(route, pane, openInNewTab)` replaces in place when `openInNewTab` is false (home cards) or when the current tab is home; it **always** navigates in place where `navigatesDestinationsInPlace` (VSTO + dev).

---

## 2. Tabs, panes and workspaces

### tabStore — `stores/tabStore.ts` (1438 lines)
One flat `tabs` array; `Tab.pane` (absent/1/2) is the only pane discriminator. Parallel pairs: `openTab`/`openPane2Tab`, `switchTab`/`switchPaneTab`, `closeTab`/`closePane2Tab`, `updateActiveTab`/`updatePane2ActiveTab`, ids `activeTabId`/`pane2ActiveTabId`, computeds `pane1Tabs`/`pane2Tabs`/`activeTabForPane`. Pane-1 select/update does an **MRU move-to-front** — the only tab reordering in the app (there is no drag UI in the Vue layer).

Field classification (all four lists in `tabStore.ts`):
- `IDENTITY_FIELDS` = route, bookId, localFilePath, localFileHbBookId, localFileName, searchQuery — changing one clears `POSITION_FIELDS` and records a navigation
- `POSITION_FIELDS` = tocPath, openTocEntryId, openTocLineIndex, flashOpenLine, searchHighlight*, searchRestore
- `TRANSIENT_FIELDS` — never persisted (live handles, nonces, pending jumps). `tocPath` is the deliberate exception: it is the tab's caption.
- `WATCHED_FIELDS` — the only hand-maintained list; what the save watcher tracks. Asserted complete in dev by `persistTabs`.

Tab list persistence: localStorage, per workspace, `KEYS.tabsList(wsId)` = `tabs:${wsId}` → `{ tabs, activeTabId, nextId }`.

### Panes
`App.vue` renders `AppShell` for pane 1 always, pane 2 only while `bookViewStore.splitViewEnabled`. Split state lives in **`bookViewStore`**, not tabStore: `splitViewEnabled`, `splitViewFraction` (default 0.5, clamped 0.15–0.85), `focusedPaneId`. Persisted as `splitView.enabled` / `splitView.fraction`. Requires ≥768px (`layout/useSplitViewAvailable.ts`) and is unavailable under VSTO.

- **`composables/usePaneNavigation.ts`** — defines `PANE_NAVIGATION_KEY` and the inject helper; falls back to pane 1 outside a shell.
- **`composables/useAppShellPane.ts`** — `useAppShellPane(paneId)` wraps tabStore so every mutation hits the right pane: `switchTab`, `closeTab`, `closeAllTabs`, `openTab`, `openNewTab`, `updateActiveTab`, `navigateToDestination`, `goHome`, `goBack`/`goForward`/`goToHistoryIndex`, `closeCurrentPage`/`closeAllPages`, `togglePdfViewerTitleBar`. `ROUTE_MAP` here resolves the user's new-tab-page setting.
- **`composables/useCrossPaneTabActions.ts`** — plain functions for the native strip: `activateTabAnyPane`, `closeTabAnyPane`, `openNewTabInPane`. Pane-2 "orphans" (tabs left behind when split closed) are adopted by pane 1 and activating one never reopens the split.
- `tabStore.moveTabToPane`, `reclaimPane1ActiveForSplit`, `ensurePane2HasTab` enforce the split invariants synchronously at setup.
- **`composables/useTabSwipeNavigation.ts`** — touch/trackpad swipe between tabs, one swipe = one tab.

### Native tab strip (desktop host only)
`CSharpBackend/KitveiHakodeshLib/ChromeTabsMirror.cs` glues a `FluentChromeTabsForm` to the Vue store. **Vue is the source of truth**; membership, titles and selection are reconciled in, order never is (Vue is MRU, the strip is stable visual order). Gestures on the strip (select / close / `+` / drag-to-group / split-ratio drag) are forwarded to Vue, which pushes back a fresh snapshot. Snapshot shape is `AppViewerTabs.cs` `MirroredTabInfo` { Id, Title, ListTitle (the full "title · tocPath" breadcrumb for the dropdown), IconKey, Pane }; favicons arrive out of band as a rasterized set and are re-stamped on DPI change.

**Strip session restore:** `ChromeTabsMirror.SaveSession` / `RestoreSession` write a JSON `Session` (tabs, active ids, split view, fraction, focused pane, and the icons as base64 PNGs) so the strip is populated before WebView2 and Vue are up. Called from `KitveiHakodeshDemoApp/MainForm.cs` (lines 54 and 105) — **the demo app only**, not the VSTO pane. Automatic, not named.

**Quick-switch:** `toggleChromeTabList(quickSwitchStep)` in `webview-host/bridge.ts` → `toggleChromeTabList` action → `ChromeTabsMirror.ToggleTabListMenu` → `_form.ShowTabListMenu(group, step)`. `Ctrl+Shift+T` = plain toggle (step 0); `Ctrl+Tab` / `Ctrl+Shift+Tab` = ±1, which opens it as an Alt+Tab-style hold-to-scroll switcher. **C# owns the whole hold gesture** because the native popup takes OS focus, so the page never sees the matching keyup. Works with the strip hidden (fullscreen, Ctrl+H) — the anchor rect is computed from `StripHeight` regardless of `StripVisible`.

### `hasNativeChromeTabs` — who gets tabs at all
`webview-host/bridge.ts`:
```
showPopOutButton = window.__webviewShowPopOut === true
isVstoEnvironment = showPopOutButton
hasNativeChromeTabs = hasHostBridge && !isVstoEnvironment
navigatesDestinationsInPlace = isVstoEnvironment || !hasHostBridge
```
So: **standalone demo app** = native strip, many tabs. **VSTO Word task pane** and **dev browser** = exactly one tab by construction — `tabStore.openTab` navigates in place instead of adding one, and this is the single funnel, so host push events (local files, host search) and session restore all land in the one tab too.

Where there is one tab, the keys are repurposed rather than dead:
- `Ctrl+Tab` / `Ctrl+Shift+Tab` → walk that tab's own back/forward history
- `Ctrl+W` → `closeCurrentPage` (`navHistory.popCurrentAndGoBack` + drop from `recentLocations`), `Ctrl+X` → `closeAllPages`
- `Ctrl+T` → swallowed (no-op); `Ctrl+Shift+T` → no-op
- `Alt+W` / `Alt+X` exist so the *native-strip* host can also reach page-close semantics while Ctrl+W/X do the real tab close
- `ShortcutsReferenceList.vue` branches on `hasNativeChromeTabs` and hides the whole tab-management group where it does not apply

### Workspaces
`stores/workspaceStore.ts` (123 lines). `Workspace { id, name, createdAt }`, list in localStorage under `workspaces.list` with `activeId`. CRUD: `createWorkspace`, `renameWorkspace`, `deleteWorkspace` (refused when only one left; also calls `deleteWorkspaceData` → `lsDelete(tabs:${id})` + `idbTabsDeleteByPrefix('tab:…')` and `('book:…')`), `switchWorkspace`. Switching or deleting the active one ends in `window.location.reload()`.

**This is the app's one genuinely user-named container.** The tab list, every `TabState`, every `BookState` and `recentLocations` are all workspace-scoped, so a workspace is effectively a named saved session.

UI: `layout/WorkspaceMenu.vue` rendered inside `layout/WorkspaceSubmenu.vue`. Reached from the **title-bar workspaces button**, from the hamburger menu's overflow flyout, or by **F8**. It is deliberately a picker, not a page — no route, no home card, no quick-nav digit (`appNavItems.ts` comment, and the home README says the same). Keyboard: the rows and the create box are one up/down walk; Enter switches, F2 renames, Delete confirms-then-deletes, Enter creates in the box.

---

## 3. Things the user can save, name, pin or reuse

**There is no bookmark/favourites feature anywhere.** `grep -rni "bookmark|סימניה|מועדפ|favorite"` over `vue-frontend/src` returns nothing. Everything below is either automatic history, a pin on an automatic entry, or a workspace.

### `stores/navLocation.ts` — the shared record
A `NavLocation` is **self-describing**: it carries its own `LocationPosition`, so it does not depend on any live tab. That is what lets a recents row outlive its tab and lets two rows hold different places in one book. Also owns `locationKey` (document identity, for dedupe), `isRecentsWorthy` and `isHistoryWorthy` — two *different* rules:
- recents excludes home, the non-document routes (`NON_DOCUMENT_ROUTES`) and an empty search page, so the capped list is not crowded out by tool pages
- history excludes only an empty search page, because Back must work from anywhere, Settings and home included

### The three collections (table is in `stores/README.md`)
| | browser analogue | scope | lifetime | eviction |
|---|---|---|---|---|
| `tabStore.tabs` | open tabs | window | until closed | closed → removed |
| `recentLocations` | History + Recently-closed | app-wide, per workspace, persisted | outlives the tab | LRU, deduped per document |
| `navHistory` | Back/Forward stack | ONE tab | dies with the tab | memory only |

**`stores/recentLocations.ts`** — IDB database `app-recent-tabs`, key `recent:${wsId}`, stored under the legacy field name `tabs`. `RECENT_LOCATIONS_MAX = 50` *distinct documents* (deduped on `locationKey`, so a revisit bumps and updates rather than stacking). Entirely **automatic**. The user reaches it through the **address bar**: `layout/AddressBar.vue` line 114 `sortedByRecency(tabStore.recentLocations)` — the dropdown shows recents whenever there are no search results. Selecting one calls `tabStore.locationPatch(id)` and navigates the **current** tab; `tabStore.forgetLocation(id)` removes the row and closes nothing. Explicitly documented as *not* a tab list.

**`stores/navHistory.ts`** — a list plus a cursor (not two stacks), keyed by tab id, in memory, dropped on tab close. Navigating from anywhere but the end truncates the forward branch. API: `pushLocation`, `updateCurrentLocation` (position changes must not push a frame), `stepHistory(±1)`, `jumpHistory(index)`, `historyEntries`, `historyCursor`, `popCurrentAndGoBack`, `clearHistory`. Reached by `Alt+ArrowRight`/`Alt+ArrowLeft` (RTL: right is back), the two title-bar buttons, and **press-and-hold (500ms) on either button** → a teleported dropdown of every frame in that direction, nearest first, straight to `goToHistoryIndex`. Recording happens only in `tabStore.applyTabPatch` when `isNavigationPatch` — `tocPath` arrives on every scroll tick and would otherwise push a frame per scroll. `updateTabWithoutHistory` exists so a file restore that merely *completes* an already-recorded navigation does not make Back need two presses.

**`stores/recentlyOpenedStore.ts`** — owns IDB `app-recently-opened` (store `data`) outright, not via the driver. `RECENTLY_OPENED_MAX = 50`, `MAX_PINNED = 46`. Entry carries key, route (`/book-view` | `/pdf-view` | `/html-view` | `/txt-view`), title, bookId, localFilePath, localFileHbBookId/Title, localFileName, `lastAccessedAt`, `isOtzariaAddin`, plus the `PopularityScored` fields. **No position** — the resume position comes from `recentLocations` for the same document key. Automatic (recorded by `tabStore.trackTabNavigation`, called from `openTab`/`updateActiveTab`/`updateTab`), but **user-pinnable**: `togglePin(key)` and `removeEntry(key)`. Loaded lazily on first access.

**`stores/frequentFoldersStore.ts`** — owns IDB `app-frequent-folders`, `FREQUENT_FOLDERS_MAX = 30`, `MAX_PINNED = 26`. Two entry kinds under one ranking: `FileSystemFolderEntry` (absolute path = identity) and `CatalogCategoryFolderEntry` (`catalog-category:${id}`, with `categoryTitles` and `containsBooks: true`). Automatic — `trackFolderVisit` fires from `tabStore.trackTabNavigation` for `localFilePath` without an HB book id (HebrewBooks downloads land in our own cache dir, which the user never chose, so they are excluded); `trackCatalogCategoryVisit` for catalog categories holding books directly. Same `togglePin` / `removeEntry`. Clicking a file-system folder card **reopens the file dialog already pointed at that folder** (`useAppNavigation.openFolderPicker` → `pickLocalFile(newTab, initialDir)`); clicking a catalog card opens that category.

**`stores/popularityScore.ts`** — the ranking model shared by both of the above. Time-decayed frequency: `VISIT_POINTS = 1`, `HALF_LIFE_MS = 14 days`, `MIN_SCORE = 0.02` floor. Decayed **lazily on read** (each entry stores when its score was last computed), so a month-closed app costs nothing on open and comes back correctly aged. `sortByPopularity` puts pins first unconditionally. `capByPopularity` closes two freeze-against-newcomers holes: `maxPinned` (pins may not fill every slot) and `protectedKey` (the entry just visited is never evicted). `pinBudgetExhausted` makes an over-budget pin *refuse* rather than silently get dropped on the next write.

**`stores/bookLastRead.ts`** — IDB `app-lastread`, keyed by **book id alone**: global, not per tab, not per workspace, and deliberately outlives tab close. `LastReadState` (same shape as `BookState`, different lifetime), including `versionTitle` for the alternate text version. Caps: 200 in memory (`MEMORY_CACHE_MAX`), 1000 on disk (`DISK_MAX`). Always written through `setLastReadPos`. Fully automatic. Consumed by `features/book-view/useBookViewSessionRestore.ts`; the `app.resumeLastRead` setting (default **on**) decides whether it is used as the primary restore or only as a fallback when a tab has no saved `BookState` — note the side-edition pick is restored from it even with the setting off.

**`stores/tabStatePersistence.ts`** — IDB `app-tabs`, keys `tab:${wsId}:${tabId}` and `book:${wsId}:${tabId}:${bookId}`. `TabState` = searchCheckedBookIds, searchAtFilters, searchZoom, searchScrollIndex/Offset, searchSortOrder, htmlViewScrollTop, txtViewZoom. `BookState` = scrollIndex, scrollOffset, selectedLineId, zoom, autoSelectTopLine, `commentaryPanels` (both panels' saved place, by slot), `toc`, `versionTitle`, `sideEdition`. `deleteAllStateForTab(tabId)` is the single teardown call every close path uses; `disposeClosedTab` first copies the reading position into the tab's `recentLocations` record so closing a tab does not lose the place. `peekTabViewState`/`peekBookViewState` are synchronous write-through-cache reads for callers that must capture a position mid-navigation.

**`stores/searchCacheStore.ts`** — IDB `app-search-cache` under a `search:` prefix (meta + chunked results + `search:lru` + `search:display-lru`), `MAX = 100`. Automatic. User-visible effect: re-running a query served entirely from cache skips the C# stream; a *partial* cache hit passes `skipCount` to C# so the stream resumes from the skip offset rather than restarting.

**`composables/useRecentSearches.ts`** — the app's own recent-searches dropdown (WebView2 disables Chrome's autofill, so this is a full reimplementation). localStorage under prefix `recent-searches.`, `DEFAULT_MAX = 15`, deduped newest-first. Focus an empty field → full history; typing filters to case-insensitive **prefix** matches; arrows move a wrapping highlight with nothing preselected; `Shift+Delete` removes the highlighted entry. Two instances exist, each with its own list: `key: 'fts-search'` (`features/full-text-search/FullTextSearchBar.vue`) and `key: 'book-view-search'`, `max: 10` (`features/book-view/BookViewSearchBar.vue`). Automatic, not named. *Not* used by the home search bar or the address bar — those show recents/global-search instead.

**`stores/catalogBookTitle.ts`** — `catalogBookTitle(entry)` renders the catalog's *current* title for any `/book-view` tab / recent / history entry, falling back to the stored title (local files, HebrewBooks, ids the catalog lacks, and the instant before the catalog loads). Not a save mechanism; it is why a renamed book does not leave stale captions behind in those lists.

**`stores/localFileTabLazyRestore.ts`** — `restoreLocalFileTabsLazily()`, called once from `main.ts`. Persisted `/pdf-view` and `/html-view` tabs: **only the active tab per pane is restored at boot**; the rest keep their title and icon in the strip and go through the same `localFileStore.restoreTab` path the first time they become active. Closing a never-restored tab is safe.

**`stores/hebrewBooksHistoryStore.ts`** — owns IDB `app-hb-history` entirely (needs `keyPath: 'id'` plus a `lastAccessed` index, which the driver cannot express). Which HebrewBooks PDFs the user downloaded, `HB_HISTORY_MAX = 25` LRU. Automatic; reached from the HebrewBooks page.

**User annotations — `KitveiHakodesh.Core/UserAnnotations/`** — the only write path in Core; everything else there is read-only. SQLite at `{libraryFolder}\Settings\user_settings.db` (`UserAnnotationStore.DeriveDatabasePath`) — the filename says "settings" but holds user *content*; frozen because existing installs hold real highlights under it. WAL, no connection held between calls, so Zayit or a second instance can read/write concurrently. Schema:
```
user_highlights(id, bookId, lineId, startOffset, endOffset, colorArgb, createdAt)
user_notes(id, bookId, lineId, startOffset, endOffset, note, quote, createdAt, updatedAt)
```
Both anchor to a line *and* a character range, so one line can carry several of either. The frontend sends **parameterised SQL with positional `?`**, rewritten quote-aware by `SqlPlaceholders.ToNamed` and gated by `UserAnnotationSqlGuard`. `UserAnnotationDbCarryOver.CopyIfDestinationMissing` copies the database to a new library when the user switches libraries and the new one has none (never overwrites). Frontend side: `features/book-view/lines/useBookViewHighlights.ts`, `useBookViewNotes.ts`, `useBookViewAnnotations.ts`, plus commentary equivalents. **A note's text is user-authored, so this is the one place the user types content that persists — but there is no notes/highlights index page: you only see them by returning to the line.**

**`features/book-view/commentary/uncheckedCommentaryBooks.ts`** — a per-tab, per-panel virtual check-tree for the commentary filter. Resolution: own override → subsection default → section default → root default → checked; entries equal to their parent default are deleted rather than stored. Serialized into each panel's persisted `BookState.commentaryPanels` record, so the filter survives tab switches, session restore and reopening a book via resume-last-read. Dropped when the tab closes. Automatic, and *not* app-wide — there is no "always hide this commentator everywhere" setting.

**`features/book-view/useBookViewPinnedCommentary.ts`** — "pinned" here means *which commentary group is currently shown in the panel*, with a fallback to the book's default commentators from the DB (`getDefaultCommentators`, promise-cached per book). It is view state, not a user-saved preference.

**Catalog user folders — NOT BUILT.** `KitveiHakodesh/.kiro/plan/catalog-user-folders.md`: "Lets the user add a folder from their own computer to the book catalog… **Not yet implemented** — a first attempt was built and reverted." The design: persist only the folder *path*, never cache contents, lazy one-directory-level-per-expand scan off the critical path, delete affordance on the added folder's own row, search via DocumentLocator by appending the folder path to the query. The plan's consumer table and data-model notes (negative ids for custom entries, match by path not node id, `treeOrder` collision, the `Uint16Array` overflow in the catalog search index) are salvage from the reverted attempt. So today **the catalog has no user-defined folders at all**.

---

## 4. Keyboard shortcuts

**Single definition: `KitveiHakodesh/vue-frontend/src/layout/useAppTitleBarShortcuts.ts`**, installed once per pane, capture-phase, matching on `e.code` only (`e.key` changes with the keyboard language). It also forwards `Ctrl`+key and function-key events out of child iframes into the top-level pipeline (pane 1 only; the iframe side is injected by `CSharpBackend/KitveiHakodeshLib/Bridge/JsBridge.cs`, which filters to ctrl/meta/F1–F12). The user-facing reference is `features/settings/ShortcutsReferenceList.vue`, which is in sync with the source.

**Pane-scoped** (fire only when `isThisPaneFocused` — i.e. always when split view is off):

| Key | Action |
|---|---|
| `Ctrl+1`…`Ctrl+9` | the nine quick-nav destinations, in a new tab (Ctrl+9 is a no-op while Hameshiv is unreachable) |
| `F1` | settings (switches to the open settings tab if there is one) |
| `F8` | workspace picker |
| `Ctrl+T` | new tab — **native-strip host only**, swallowed elsewhere |
| `Ctrl+Shift+T` | native tab-list dropdown — native strip only |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | native strip: hold-to-scroll switcher. Else: back / forward in the tab's history. `e.repeat` guarded |
| `Ctrl+W` | native strip: close tab. Else: `closeCurrentPage` |
| `Ctrl+X` | native strip: close all tabs. Else: `closeAllPages` |
| `Alt+W` / `Alt+X` | `closeCurrentPage` / `closeAllPages` (for the native-strip host) |
| `Alt+ArrowRight` / `Alt+ArrowLeft` | back / forward in the tab's history (RTL: right = back). `stopPropagation` too, so list/tile focus handlers do not also move |
| `Ctrl+G` | go home (reuses the pane's existing home tab) |
| `Ctrl+E` | toggle the address bar |
| `Ctrl+M` | nav dropdown — inert while the rail is up |
| `Ctrl+Shift+M` | toggle this pane's nav rail (works both ways; returns before the rail-open guard) |
| `Ctrl+H` | toggle this pane's title bar (session-only) |
| `Ctrl+L` | toggle dark mode |
| `Ctrl+B` | book-view toolbar, or the PDF viewer title bar on `/pdf-view` |
| `Ctrl+J` / `Ctrl+Shift+J` / `Ctrl+Alt+J` | commentary panel: bottom / right side / left side (book view only; the side ones need ≥650px) |
| `Ctrl+K` | TOC panel (book view only) |
| `Ctrl+U` | toggle the current book's word-link markers (no-op without markers or on schema-v1; consumed anyway to suppress view-source) |
| `Ctrl+F` | search in book view or txt view; yields to a focused `[data-ctrlf-enabled]` input |
| `Ctrl+N` | swallowed (blocks the browser's new window) |

**App-wide** (pane 1 only, so they do not fire twice in split view): `F11` and `Ctrl+Shift+F` fullscreen (bridge → `AppViewer`); `Ctrl+\` split view (only when `isSplitViewAvailable`); `Ctrl+Shift+H` hidden scrollbars (persisted); `F9` reading mode (check-all over title bars, book toolbars and scrollbars — derived, never stored); `Ctrl+P` preventDefault-only so `features/pdf-viewer/usePdfPrintShortcut.ts` can forward print into the PDF.js iframe.

**Defined elsewhere:**
- `features/book-view/useBookViewKeyboardShortcuts.ts` — `Ctrl+ArrowLeft` / `Ctrl+ArrowRight` = next / previous TOC section (RTL); `Ctrl+D` = toggle clean text; `Ctrl+±`/`Ctrl+0` zoom (delegating to the focused scroller's own handler when focus is inside one)
- `composables/useZoom.ts` — `Ctrl+±/0`, `Ctrl+scroll`, 2-finger pinch. 50–200, step 10, default 100
- `composables/useVirtualScrollerKeys.ts` — `Ctrl+Home` / `Ctrl+End`, required on every virtualizer
- `composables/useInputListNavigation.ts` — the combobox model for every input-paired list: arrows, PageUp/Down, `Ctrl+Home`/`Ctrl+End`, Enter, **`Ctrl+Enter` = open in new tab**; plain Home/End and Left/Right stay caret keys
- `composables/useListKeyNav.ts` — arrows/Home/End for roving-focus lists (TreeView, nav dropdown)
- `layout/WorkspaceMenu.vue` — inside the picker: Enter switches, **F2** renames, **Delete** confirms delete, Enter in the create box creates; a pending delete-confirm owns Enter and Escape until answered
- `layout/AppTitleBarHistoryButton.vue` — 500ms press-and-hold opens the history dropdown
- `composables/useContextMenuLongPress.ts` — long-press context menu on touch
- `F7` (caret browsing) is listed in `ShortcutsReferenceList.vue` but **has no handler in the codebase** — it is Chromium/WebView2's own binding

**User-configurable: none.** No keybinding store, no remap UI, nothing in `settingsStore`'s `KEYS`; `grep -rni "customShortcut|keybinding|remapKey|shortcutConfig"` over both halves returns only `node_modules` noise. The settings page shows a read-only reference grid (`SettingsPageKeyboardShortcutsSection.vue`, "No script, no reactivity") and the setup wizard has a shortcuts *introduction* step.

**Word level: none.** No `KeyBindings.Add`, no `Application.OnKey`, no `ProcessCmdKey` anywhere in `KleiKodeshVsto`. The add-in adds zero Word keyboard shortcuts — only ribbon and context-menu entries.

---

## 5. Settings

### Vue side — `stores/settingsStore.ts` (846 lines)
One localStorage key per setting, namespaced `area.name`, each watched individually so only the changed key is written. The local `KEYS` object is the authoritative list (there is no central registry — `utils/persistence.ts` deliberately holds zero imports and zero key names). The ~60 keys, by group:

- **Main text** — `text.headerFont`, `text.textFont`, `text.teamimTextFont`, `text.fontSize`, `text.fontWeight`, `text.linePadding`, `text.fixedLineHeight`, `text.maxWidth`, `text.cleanText.active`, `text.cleanText.options`, `text.hiddenWordLinkMarkers`
- **Commentary** — `commentary.headerFont`, `.textFont`, `.fontSize`, `.fontWeight`, `.linePadding`, `.maxWidth`, `.defaultAutoSync` (commentary always carries its own values; there is no "same as book" mode)
- **Word-link tooltip** — `wordLinkTooltip.fontSize`
- **Divine-name censoring** — `censor.divineNames`, `censor.elokimMode`, `censor.otherNamesMode`
- **Copy behaviour** — `copy.cleanText`, `copy.joinLines`, `copy.sourcePosition`, `copy.withNotes`, `copy.asSourceWithQuotation` (mutual exclusivity in `features/book-view/copyFlagExclusivity.ts`)
- **Search** — `search.contextMargin`, `.maxWordDistance`, `.requireOrdered`, `.expandKetiv`, `.expandInflections`, `.expandSynonyms`, `.wildcardPrefix`, `.wildcardSuffix`, `.grammarPrefix`, `.grammarSuffix`, `.fuzzy`
- **App shell / chrome** — `app.zoom`, `app.newTabPage`, `app.showClock`, `app.setupDone`, `app.addressBarHintDone`, `app.scrollbarsHidden`, `app.navSidebar` + `app.navSidebar.pane2`, `app.hbEditionInSidePanel` + `.pane2`, `app.showRecentlyOpened`, `app.showFrequentFolders`, `app.resumeLastRead`, `titleBar.hiddenButtons`
- **Book-view chrome** — `bookView.toolbarVisible`, `bookView.toolbarPosition`, `bookView.autoSelectTopLine`, `splitView.enabled`, `splitView.fraction`
- **Per-feature** — `books.view`, `pdf.pageFilters`, `dictionary.zoom`, `midot.disclaimerAccepted`, `app.termsAccepted`, `hebrewBooks.localFolder`, `fileSearch.sortOrder`, `errorReport.senderEmail`
- Elsewhere: `app.theme` (`theme/themeStore.ts`: `themePreset`, `readingBackground`, `backgroundTint`) and `uiLanguage` (`i18n/index.ts`, bare key, `'he' | 'en'`, changing it reloads the page)

`titleBar.hiddenButtons` is a string array; the pickable ids are in `SettingsPageThemeAndApplicationSection.vue`: `hamburger`, `theme-toggle`, `toolbar-toggle`, `split-view`, `ocr`, `home`, `workspaces`, `prev-tab` (back), `next-tab` (forward). Default hides `theme-toggle`.

`app.newTabPage` options: `homepage` / `openfile` (→ `/books`) / `hebrewbooks` / `search`. `app.navSidebar` default is host-dependent (on in the demo app, off under VSTO and in dev, keyed off `hasNativeChromeTabs`) — a *default* only; once toggled, the stored per-pane value wins, and the two panes never mirror each other.

`clearPersistedSettings` implements the settings-vs-structural split: wipes the `kitvei-hakodesh.` namespace **except** the `tabs:` and `workspaces.` prefixes and `PRESERVE_KEYS` = `app.setupDone`, `app.termsAccepted`. That distinction is a product decision and lives here rather than in the driver.

### Settings page — `features/settings/`
`SettingsPage.vue` is a shell (side nav + scroll body + sticky search). Sections: theme-and-application, book-and-commentary-display, censor-divine-names, calendar, updates, advanced, reset, keyboard-shortcuts. A section registers itself purely by `[data-section]` / `data-section-label` on its root; `useSettingsSearch.ts` is a DOM walker that hides non-matching sections and feeds the sidebar and drawer nav — **so the search bar is the short path to any setting**.

Notable: `SettingsPageAdvancedSection.vue` — HebrewBooks local folder, database path, file-search excluded folders — every control there is backed by a Windows **registry** value or an on-disk file shared with the hosted app, never localStorage, so the setting is the same one in dev and hosted. It branches on `isDev` (`typeof window.__webviewAction !== 'function'`), never on `isHosted` (which is true in dev). `SettingsPageUpdatesSection.vue` covers installed version, check-now, install, and turn-off-automatic-updates (a shared VSTO registry value), all through `composables/useSelfUpdate.ts`. `SettingsPageResetSection.vue` has four resets: settings, search index, DocumentLocator index, and full app reset (`appResetState.resetEverything()` — all seven databases + localStorage, then host reset and reload).

**Setup wizard** — `SetupWizard.vue`, shown while `app.setupDone` is false, one card whose body swaps per step: welcome, db (hosted, only when none chosen), theme (+ app zoom), general (divine names, resume-last-read, new-tab destination), book display, commentary display, shortcuts intro. `settings.completeSetup()` sets `app.setupDone`, which `clearPersistedSettings` preserves, so a settings reset never re-shows it.

### C# / VSTO side
**`KleiKodeshVsto/Helpers/SettingsManager.cs`** — a thin typed wrapper over VB `Interaction.GetSetting`/`SaveSetting`, i.e. `HKCU\Software\VB and VBA Program Settings\KleiKodesh\<section>\<key>`. `Get`, `Save`, `GetBool`, `GetInt`, `GetEnum<T>`, and `ClearAll()` which deletes the whole `KleiKodesh` subkey tree.

**`KleiKodeshVsto/Ribbon/RibbonSettingsView.xaml`** — the entire VSTO settings surface. Three things:
1. **רכיבים זמינים** — a checkbox per ribbon component (`KitveiHakodesh_Visible`, `Kiwix_Visible`, `WebSites_Visible`, `KleiKodesh_Visible`, `Nakdan_Visible`, `RegexFind_Visible`), saved as `Ribbon\<name>` and read back by `getVisible` → `SettingsManager.GetBool("Ribbon", control.Id + "_Visible", true)`
2. **לחצן ראשי** — a radio group choosing what the splitButton's big button does, saved as `Ribbon\DefaultButton`; each option is enabled only while its component checkbox is on. **Default is `"Settings"`.** Unchecking a component that is the current default resets `DefaultButton` to `Settings`
3. `ChkTurnOffUpdates` → `UpdateChecker\TurnOffUpdates`, and a `BtnReset` ("איפוס התוכנה") calling `SettingsManager.ClearAll()`

**Automatic, invisible personalisation on the VSTO side:**
- `Helpers/TaskpaneManager.cs` `RestoreDockPosition` / `RestoreWidth` — a pane's dock position and width are saved per control type under `<TypeName>\DockPosition` and `<TypeName>\TaskPaneWidth`, re-saved on every `DockPositionChanged` / width change. Default dock is RTL-aware (Hebrew UI → left, otherwise right)
- `Helpers/FormSettings.cs` `FormSettingsHelper` — a window's size, location and maximized state under `<appName>\<formName>FormSettings\<form.Name>_{State,Left,Top,Width,Height}`, using `RestoreBounds` when maximized. Used by `TaskPanePopOut` for the floating pop-out window (saved on `FormClosing`), with `"KleiKodesh"` as the app name

**Shared registry** — `KitveiHakodesh.Core/Settings/AppSettingsRegistry` holds values both hosts read (UI language, dark mode via `window.__webviewIsDark`, update flags), which is why setting dark mode in the VSTO pane shows up in the standalone app. `webview-host/userSettingsDb.ts` exists for settings C# must read; browser-only preferences stay in localStorage.

---

## 6. Word-side entry points, and the click count

**`KleiKodeshVsto/Ribbon/KeliKodeshRibbon.xml`** — one group `Klei_Kodesh3` ("כלי קודש"), inserted into **`TabHome` after `GroupEditing`**, so it is on Word's Home tab and needs no tab switch. The group holds exactly one large `splitButton`:
- the big button `KleiKodesh_Main` → `button_Click` → resolves `SettingsManager.Get("Ribbon", "DefaultButton", "Settings")` and runs *that* tool
- the dropdown `menu` → `KitveiHakodesh` (כתבי הקודש), `Kiwix` (ספריית קיוויקס), `WebSites` (דרך האתרים), `DocDesign` (עיצוב תורני), `Nakdan` (נקדן דיקטה), `RegexFind` (חיפוש רגקס), `DuplicatePane` (שכפל חלונית צד), `Settings` (הגדרות), `About` (אודות). `HebrewBooks` and `OpenChildDoc` are commented out. Note `Kiwix` is still wired in `Execute` (`KiwixLib.KiwixWebview`) even though `architecture.md` says ZIM support was removed on the Vue side.

Click counts from a Word document, Home tab active:
- **1 click** — the configured default tool (out of the box that is the add-in *settings* pane, which is an odd default)
- **2 clicks** — any other tool: splitButton arrow, then the item
- **1 click** — `DuplicatePane`, after the arrow: `TaskPaneManager.DuplicateCurrent()` opens a second pane mirroring the current one
- **3 clicks + a selection** — settings: arrow → הגדרות → the control

`Execute` routes: `KitveiHakodesh` → `ShowKitveiHakodesh()` → `TaskPaneManager.Show(() => new AppViewer { ShowPopOutButton = true }, "כתבי הקודש", 610, popOutBehavior: true)` and returns the live `AppViewer`. Everything else goes through `WpfTaskPane.Show(factory, title, width)`. **Panes are reused**: `TaskpaneManager.Show` looks for a usable pane of the same control type for the active Word window before creating one (`FindAllUsable`, `IsForWindow`, `IsUsable` — which counts a popped-out pane as usable), and the factory means an already-open pane does not pay for a discarded WebView2.

**`KleiKodeshVsto/Ribbon/ContextMenuXmlBuilder.cs`** — generates the `<contextMenus>` half of the customUI at run time and splices it into the `<!--CONTEXT_MENUS-->` slot. Four items, repeated across **16 of Word's context menus** with per-menu id suffixes (15 full menus — text, list, listTable, spell, grammar, footnote, endnote, textTable, tableCell, table, tableWhole, heading, headingTable, comment, revision — plus `ContextMenuHyperlink`, which gets the open-link item only):
1. **העתק לחיפוש בכתבי הקודש** → `contextMenu_Click`, target `fts`
2. **חיפוש ספר בכתבי הקודש** → `contextMenu_Click`, target `catalog` (dispatched by the substring `"Catalog"` in the control id)
3. **השווה עם כתבי הקודש** → `compareText_Click` — compares the selected paragraph against the selection in the Kitvei Hakodesh pane, writing differences as tracked changes
4. **פתח קישור בכתבי הקודש** → `openLink_Click`, `getVisible`-gated to selections that actually hold a supported link

Items 1 and 2 are the **shortest path from Word into the app**: select text → right-click → one item = **2 clicks after the selection**, and they reuse the running pane (or launch it) and then call `appViewer.SearchFromHost(text, target)` directly. That lands in `stores/hostSearchStore.ts`, which seeds `tab.searchQuery` or `tab.catalogQuery` for the target page to read on mount. A deep link (`otzaria://` / `kitveihakodeshapp://` / `zayit://`) arrives the same way as `hostOpenBook`.

Two deliberate constraints are documented in the builder: no `insertBeforeMso`/`insertAfterMso` anchors (an anchor naming a control absent from a given menu makes Office drop the item **silently**), so the items append to the end of each menu — less prominent but always present; and every `idMso` must be verified against Microsoft's `wordcontrols.xlsx`, because an unknown one fails customUI validation and takes down the whole ribbon including the add-in's own tab, with no visible error.

**`Helpers/TaskPanePopOut.cs`** — pops a docked pane into a floating resizable window via `HwndSource`, with `Toggle(goFullScreen)`, `FocusPopOutWindow`, `ClosePopOut`, and geometry persisted through `FormSettingsHelper`. The Vue side offers it as the hamburger menu's `popOut` row and the rail's pop-out button, both gated on `showPopOutButton`.

**`Helpers/WpfTaskPane.cs`** — hosts a WPF UserControl in the WinForms VSTO pane via `ElementHost`, propagates the Office theme (`OfficeThemeWatcher`), manages keyboard focus, and has its own `DuplicateCurrent`.

---

## 7. Search scoping — per-search, not saved

**`features/full-text-search/useFullTextSearchFilters.ts`** holds two filter inputs:
- `checkedBookIds` — the checkbox tree selection
- `atFilters` — `@` tokens parsed out of the search input by `parseSearchQuery` (`"word @ בראשית @ בבלי"`), each matched against the full catalog, the matches **unioned**, then **intersected** with `checkedBookIds` to give `effectiveBookIds`

**There is no named, reusable filter.** No preset, no save-as, no filter library. The only persistence is **per tab**, in `FullTextSearchPage.vue` `saveFilterState` → `TabState.searchCheckedBookIds` + `TabState.searchAtFilters` (IDB `app-tabs`, workspace+tab scoped), restored in that page's `onMounted`. Two guards there are worth knowing: a subset is persisted **only when it is a real partial selection** (an empty set would restore as "no books" and hide every result, so it falls back to `undefined` = all), and a restored set that comes back empty after filtering out ids the catalog no longer has falls back to `initCheckedBooks()`.

`FullTextSearchFilterPanel.vue` emits only `toggleBook`, `toggleCategory`, `checkAll`, `checkVisible`, `uncheckAll`, `close`, `update:atFilters`, `navigateToBook` — nothing about saving. Expansion state is a local reactive `Set` shared via `provide(FILTER_EXPANSION_KEY, …)`, not persisted.

So the closest thing to a saved scope today is: put the search in its own tab and keep that tab (which a workspace will then preserve across restarts), or retype the `@` tokens — which `useRecentSearches` (key `fts-search`) will at least offer back, since the tokens are part of the query string.

---

## 8. Other path-shorteners found

- **`AppTitleBarTocBreadcrumb.vue`** — the title bar centre for `/book-view` and `/pdf-view` is an interactive breadcrumb: a chevron before each segment lists its siblings, the active segment gets a trailing chevron for its children. Backed by the per-tab `TocBridge` / `PdfBridge` registered in `bookViewStore` (in-memory, never persisted). Jump to a sibling section without opening the TOC panel.
- **`features/book-view/lines/useBookViewLineLink.ts`** — "copy link to this section" writes `kitveihakodeshapp://book/<bookId>?index=<lineIndex>` (`utils/appDeepLink.ts` `buildLineLink`), shaped to match the `otzaria://` links `HostLink.cs` parses. The app opens such a link when launched with one (`Program.GetOpenRequestArgument` / `MainForm.OpenRequest`, through the same single-instance pipe as a file path), landing as a new tab. **Registering the scheme with Windows is an installer step** (`Build/Installer/README.md`), so whether a pasted link works depends on the install.
- **`composables/useOpenInNewTab.ts`** plus `useInputListNavigation`'s `Ctrl+Enter` — modifier-click, middle-click and Ctrl+Enter open in a new tab consistently across every list, and every home card's `open(newTab)` honours the Ctrl/⌘ flag.
- **`webview-host/tabMirror.ts`** — mirrors the Vue tab list (and rasterized favicons) to the host so the native strip can render it. Order is not synced back.
- **Daily learning** — `features/home/homeDailyLearningItems.ts` turns today's calendar into one-click cards: weekly parsha, Nach Yomi, daily Tehillim, Mishnah Yomit, Perek Yomi, Pirkei Avot, Daf Yomi, Daf Weekly, Amud Yomi, Yerushalmi Yomi, Rambam 1 and 3 perakim. Shown only when the history list is shorter than 9 cards. `dafYomiNavigation.ts` resolves the book by name.
- **`app.addressBarHintDone`** — a one-time animated hint on the title-bar centre marking it as a collapsible address bar (`completeAddressBarHint()`).
- **`features/settings/useSettingsSearch.ts`** — the settings search bar is itself a path-shortener to any individual setting.
- **`composables/useUiChromeVisibility.ts`** — `F9` reading mode is a one-key check-all over every chrome surface at once.

---

## What a user can personalise today

**Named by the user (one thing):**
- **Workspaces** — name, create, rename, delete, switch. Carries the tab list, every per-tab and per-book state, and recent locations.

**Pinned / removed by the user (on automatic lists):**
- Pin or remove a **recently-opened document** card (budget 46 of 50)
- Pin or remove a **frequent folder / catalog category** card (budget 26 of 30)
- Remove a **recent location** row from the address-bar dropdown (`forgetLocation`)
- Remove a **recent search** with `Shift+Delete` (per bar: `fts-search`, `book-view-search`)

**Chrome and layout:**
- Theme preset, dark/light toggle, reading background colour, background tint
- UI language (he / en; reloads)
- App zoom; per-tab+book zoom; dictionary zoom; per-tab search and txt-view zoom
- Nav rail on/off **per pane** (persisted per pane)
- Title bar visibility (`Ctrl+H`, session-only, per pane); book toolbar visibility and position; hidden scrollbars; reading mode (F9); fullscreen
- Which title-bar buttons exist at all — 9 ids
- Split view on/off and the divider fraction
- New-tab destination: home / catalog / HebrewBooks / search
- Show recently-opened cards on/off; show frequent-folder cards on/off; clock on/off
- PDF page filters; PDF viewer title bar per tab; OCR activation, script (Hebrew/Rashi/mixed), skip-existing-text

**Reading:**
- Resume last read on/off
- Header/text/te'amim fonts, size, weight, line padding, fixed line height, max content width — separately for main text and commentary
- Default commentary auto-sync; commentary panel slots (bottom / right / left); the per-tab, per-panel commentary check-tree; auto-select-top-line
- Clean-text mode and its options; word-link marker visibility per book; word-link tooltip font size
- Divine-name censoring: main mode, Elokim mode, other-names mode
- Copy flags: clean text, join lines, source position, with notes, as-source-with-quotation
- Catalog view mode (list / cards); file-search sort order; HebrewBooks edition in side panel (per pane)

**Content the user authors:**
- **Highlights** (colour per range) and **notes** (free text + quote), in `user_settings.db` beside the library, carried over when switching libraries

**Search:**
- Context margin, max word distance, require-ordered, expand ketiv, expand inflections, expand synonyms, wildcard prefix/suffix, grammar prefix/suffix, fuzzy
- Book/category checkbox scope and `@` tokens — **per tab only**

**Paths and services:**
- Seforim database path; HebrewBooks local folder; file-search excluded folders; automatic updates on/off; error-report sender email

**VSTO (Word) side:**
- Which ribbon components appear (6 checkboxes)
- Which tool the big splitButton runs (`DefaultButton`)
- Automatic updates off
- Automatic: task-pane dock position and width per tool; pop-out window geometry
- Full reset (`SettingsManager.ClearAll()`)

**Not personalisable:** keyboard shortcuts (no remap anywhere), the destination list, tab order (MRU is automatic; no drag reorder in Vue), bookmarks (do not exist), named search filters (do not exist), catalog user folders (designed, reverted, not built).

---

## Paths that are currently long

1. **Word → a specific book, cold** — 2 clicks to open the pane (arrow + כתבי הקודש, or 1 if it is the default button), then catalog → category → sub-category → book → section: **6–9 clicks**, and the VSTO pane is single-tab so it replaces whatever was there. The right-click **חיפוש ספר בכתבי הקודש** collapses this to 2 clicks *when the book name is already selected in the document*, which is the only short path in.
2. **Re-running yesterday's filtered search** — the filter is per tab (`TabState.searchCheckedBookIds`), so if the tab is gone: open `/search` (Ctrl+2), retype or pick the query from `useRecentSearches`, open the filter panel, uncheck all, then re-check the books/categories one by one. **5 + n clicks**, with no way to save the set.
3. **Reaching a saved highlight or note** — there is no index. Remember which book and which line, open the book, navigate to the section, find the marker: **4–7 steps**, and only if you remember where it is.
4. **Changing workspace** — title-bar button or F8, pick the row, then `window.location.reload()`. **2 clicks**, but the reload makes it feel like a restart, and there is no "open this workspace in the other pane".
5. **A book under the 7th+ catalog category in the nav rail's short-pane state** — the rail collapses its tail into a "more" flyout, so a destination that overflowed costs: more button → flyout row → page: **3 clicks** instead of 1.
6. **Opening a file in a folder you use daily, cold** — Ctrl+4 / פתח קובץ opens the picker wherever the shell left it, then navigate the tree. The frequent-folder card cuts this to **2 clicks** (card → file in the already-pointed dialog), but only once the folder has accumulated score, and only if `app.showFrequentFolders` is on *and* the nav rail is off or history fits (folders are capped at 6 and at half the 18-card budget).
7. **VSTO settings out of the box** — the default `DefaultButton` is `"Settings"`, so the one-click big button opens the add-in settings pane rather than a tool. Every actual tool is **2 clicks** until the user changes that radio.
8. **Pane 2 destinations** — a second pane has its own tabs, title bar, history and rail, but there is no "send this to the other pane" gesture in the Vue layer; `moveTabToPane` is reachable only by **dragging a tab into the other group on the native strip**, i.e. only in the demo app, and not at all under VSTO where split view is disabled outright.
9. **Any setting, without the search bar** — side nav → section → scroll → row. The sticky settings search is what keeps this to **2 steps**; without it a row in the advanced or reading section is 3–4.