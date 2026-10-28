// @vitest-environment jsdom
/**
 * The buttons that name their own key. This is the part that used to be a
 * sentence in the locale file and would have started lying the moment a reader
 * moved a shortcut.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { shortcutKeys, withShortcut } from './shortcutHint'
import { assignShortcut, clearShortcut, resetAllShortcuts } from './shortcutSettings'

beforeEach(() => {
  localStorage.clear()
  resetAllShortcuts()
})

describe('shortcutKeys', () => {
  it('reads the combination in force', () => {
    expect(shortcutKeys('nav.home')).toBe('Ctrl+G')
    expect(shortcutKeys('nav.workspaces')).toBe('F8')
  })

  it('follows the reader the moment they change one', () => {
    assignShortcut('nav.home', 'Ctrl+Shift+KeyG')
    expect(shortcutKeys('nav.home')).toBe('Ctrl+Shift+G')
  })

  it('has nothing to say for a shortcut with no key', () => {
    clearShortcut('nav.home')
    expect(shortcutKeys('nav.home')).toBe('')
  })

  it('has nothing to say for an id that does not exist', () => {
    expect(shortcutKeys('nav.nothing')).toBe('')
  })
})

describe('withShortcut', () => {
  it('names the key after the label', () => {
    expect(withShortcut('בית', 'nav.home')).toBe('בית (Ctrl+G)')
  })

  it('leaves the label alone when there is no key', () => {
    // Rather than an empty pair of brackets on the button.
    clearShortcut('nav.home')
    expect(withShortcut('בית', 'nav.home')).toBe('בית')
  })
})
