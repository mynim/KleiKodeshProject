# src/shortcuts

The keyboard shortcut registry: every shortcut in the app written down once.

A shortcut used to live in two independent places — the handler that listens for
it, and `features/settings/ShortcutsReferenceList.vue`, which tells the reader
about it. The only thing holding those together was a comment in
`layout/useAppTitleBarShortcuts.ts` asking the next person to update the list by
hand. Now the key, the label and the context are one entry, the settings list is
rendered from it, the handlers match against it, and the tests fail if the two
can drift.

## The line this folder does not cross

**The registry decides WHICH combination triggers a shortcut. It does not decide
who listens, where, or when.**

Every handler keeps its own listener, its own event phase and its own guards —
this pane focused, the active tab's route, what the focused element owns. The
only thing that changed inside a handler is the key: `case 'KeyE'` became
`case 'nav.addressBar'`.

That is deliberate, not tidiness. The full-text search results take the arrow
keys from the window in the capture phase, gated on the pane being focused and
its active tab being the search page, with `preventDefault` settling precedence
against caret browsing (F7) and a focused result button keeping only Enter. A
central dispatcher that moved who listens and in what phase would break exactly
that, and no test would notice. So nothing here listens for anything.

## Files

| | |
| --- | --- |
| `chord.ts` | A combination as one string — `Ctrl+Shift+KeyD`. Pure, no imports: builds a chord from a keydown, splits one apart, and validates one read off disk. |
| `chordLabel.ts` | The same combination as `<kbd>` boxes. The one place a key code becomes text, so the list and the key cell cannot disagree. Needs the UI language, which is why it is not in `chord.ts`. |
| `shortcutScopes.ts` | Where a shortcut is live, as DECLARED information — used to pick which definitions a handler asks about, and to decide whether two bindings on one combination can collide. |
| `shortcutDefinitions.ts` | The catalog: id, combination(s), scope, group, label key, and whether it can be reassigned. |
| `shortcutIndex.ts` | Combination → id, pure. |
| `matchShortcut.ts` | What the handlers call. Reads the host flag, builds the index once, answers with an id. |
| `shortcutRows.ts` | The settings list as a pure function of the host and the window width. |
| `useShortcutRows.ts` | The same, wired to the real host flags and window size. |

## Adding a shortcut

1. Append it to `SHORTCUT_DEFINITIONS`, in the position it should appear in its
   group. Give it a label key that exists in `i18n/locales/he/settings.json`
   **and** `locales/en/settings.json` — a test checks both.
2. Handle its id in the handler that owns the behaviour.

Leave `listing` off only for a binding with no row to show. Leave `hosts` off
unless the same combination has to mean different things in different hosts
(only Ctrl+Tab does).

## What is fixed, and why

`fixed` is a reason, never a policy: each value names something that would make
a promise to move the key untrue.

- **`'chromium'`** — the engine acts on the key itself. **F7** (caret browsing)
  has no app code behind it at all; **F11** and **Ctrl+±/0** are the browser's
  too and the app only suppresses them. Move the action elsewhere and the
  original key goes on doing its thing.
- **`'host'`** — **Ctrl+Tab** hands the direction to the native tab strip, whose
  popup takes OS focus, so the further presses never reach the page. No other
  combination can reproduce hold-and-cycle.
- **`'listModel'`** — a key of an open list or picker (**the arrows, Enter,
  Space, F2, Delete**), part of that control's keyboard model rather than a
  command of the app.

The `'listModel'` entries are REPORTED, not matched: the results list and the
workspace picker keep their own key handling, and these rows exist so the
settings list can tell the reader about keys it would otherwise leave
undocumented.

## Suppressions are not shortcuts

`Ctrl+N` (the browser's new window) and `Ctrl+P` (its print dialog) are swallowed
in `useAppTitleBarShortcuts` as raw key checks, on purpose. They do nothing and
belong to nobody — and the Ctrl+P swallow is `preventDefault`-only, which is what
lets `usePdfPrintShortcut` still see the event and print the open PDF.
