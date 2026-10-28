/**
 * The list the reader sees in settings, which is now derived rather than
 * written out. These assertions are the hand-written list it replaced: row for
 * row, in order, per host — so the move to the registry can be shown to have
 * changed nothing on screen.
 */
import { describe, it, expect } from 'vitest'
import { buildShortcutRows } from './shortcutRows'
import { keyCellTokens } from './chordLabel'

const WIDE_DESKTOP = { nativeTabs: true, notVsto: true, wideScreen: true }
const TASK_PANE = { nativeTabs: false, notVsto: false, wideScreen: false }

function rowIds(conditions: Parameters<typeof buildShortcutRows>[0]) {
  return buildShortcutRows(conditions).map((group) => [group.id, group.rows.map((row) => row.id)])
}

describe('the demo host, with a native tab strip', () => {
  it('lists every group in order', () => {
    expect(rowIds(WIDE_DESKTOP)).toEqual([
      [
        'tabManagement',
        ['tabs.new', 'tabs.list', 'tabs.cycle', 'tabs.cycleBack', 'tabs.close', 'tabs.closeAll'],
      ],
      [
        'navigation',
        [
          'nav.addressBar',
          'nav.back',
          'nav.forward',
          'nav.home',
          'nav.menu',
          'nav.sidebar',
          'nav.workspaces',
          'workspaces.rename',
          'workspaces.delete',
          'theme.toggle',
        ],
      ],
      [
        'quickNavigation',
        [
          'quickNav.bookCatalog',
          'quickNav.search',
          'quickNav.hebrewBooks',
          'quickNav.openFile',
          'quickNav.fileSearch',
          'quickNav.dictionary',
          'quickNav.calendar',
          'quickNav.measures',
          'quickNav.hameshiv',
          'nav.settings',
        ],
      ],
      [
        'bookView',
        [
          'bookView.commentaryBottom',
          'bookView.commentaryRight',
          'bookView.commentaryLeft',
          'bookView.toc',
          'bookView.search',
          'bookView.nextSection',
          'bookView.previousSection',
          'bookView.wordLinkMarkers',
          'bookView.cleanText',
          'bookView.bookmark',
        ],
      ],
      [
        'searchResults',
        [
          'searchResults.move',
          'searchResults.open',
          'searchResults.openInNewTab',
          'searchResults.preview',
        ],
      ],
      [
        'view',
        [
          'view.splitView',
          'view.toolbar',
          'view.zoomIn',
          'view.zoomOut',
          'view.zoomReset',
          'view.appBar',
          'view.scrollbars',
          'view.readingMode',
          'view.fullscreen',
          'view.caretBrowsing',
        ],
      ],
    ])
  })
})

describe('the Word task pane, where there is one tab and no room to split', () => {
  const groups = rowIds(TASK_PANE)

  it('drops the tab group entirely', () => {
    // Everywhere without a strip the app is single-tab, so every key in that
    // group would be a row about nothing.
    expect(groups.map(([id]) => id)).not.toContain('tabManagement')
  })

  it('walks the page history with the keys that cycle tabs elsewhere', () => {
    expect(groups.find(([id]) => id === 'navigation')?.[1]).toEqual([
      'nav.addressBar',
      'nav.back',
      'nav.forward',
      'nav.backWithTab',
      'nav.forwardWithTab',
      'nav.home',
      'nav.menu',
      'nav.sidebar',
      'nav.workspaces',
      'workspaces.rename',
      'workspaces.delete',
      'theme.toggle',
    ])
  })

  it('hides the rows for what the pane has no room for', () => {
    // Side commentary columns need a wide enough pane, and split view does not
    // exist in the task pane. Both keys stay bound; only the rows go.
    const view = groups.find(([id]) => id === 'view')?.[1]
    expect(view).not.toContain('view.splitView')
    const book = groups.find(([id]) => id === 'bookView')?.[1]
    expect(book).not.toContain('bookView.commentaryRight')
    expect(book).not.toContain('bookView.commentaryLeft')
    expect(book).toContain('bookView.commentaryBottom')
  })
})

describe('the key cell', () => {
  it('reads a combination left to right, as Windows does', () => {
    expect(keyCellTokens(['Ctrl+Shift+KeyD'])).toEqual([
      { kbd: 'Ctrl' },
      { sep: '+' },
      { kbd: 'Shift' },
      { sep: '+' },
      { kbd: 'D' },
    ])
  })

  it('names the punctuation keys by the character on the cap', () => {
    expect(keyCellTokens(['Ctrl+Backslash'])).toEqual([{ kbd: 'Ctrl' }, { sep: '+' }, { kbd: '|' }])
    expect(keyCellTokens(['Ctrl+Digit1'])).toEqual([{ kbd: 'Ctrl' }, { sep: '+' }, { kbd: '1' }])
    expect(keyCellTokens(['F8'])).toEqual([{ kbd: 'F8' }])
  })

  it('collapses the keypad twin into one box', () => {
    // Ctrl and + either way round; printing it twice would be noise.
    expect(keyCellTokens(['Ctrl+Equal', 'Ctrl+NumpadAdd'])).toEqual([
      { kbd: 'Ctrl' },
      { sep: '+' },
      { kbd: '+' },
    ])
  })

  it('shows two real alternatives side by side', () => {
    expect(keyCellTokens(['ArrowUp', 'ArrowDown'])).toEqual([
      { kbd: '↑' },
      { sep: '/' },
      { kbd: '↓' },
    ])
  })
})
