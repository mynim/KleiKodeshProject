/**
 * `buildShortcutRows` wired to where the app is actually running: the bindings
 * in force, the host flags (fixed for the life of the page) and the window
 * width (not).
 *
 * Separate from the builder so the list itself stays a pure function of its
 * inputs and can be asserted row by row in a test.
 */
import { computed, type ComputedRef } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { hasNativeChromeTabs, isVstoEnvironment } from '@/webview-host/bridge'
import { activeBindings } from './shortcutSettings'
import { buildShortcutRows, type ShortcutRowGroup } from './shortcutRows'

/**
 * Mirrors BookViewPage's isWideScreen threshold, the gate the side commentary
 * shortcuts actually hit. That one measures the book pane; this measures the
 * window, which is the same thing outside split view and close enough inside it.
 */
const SIDE_COMMENTARY_MIN_WIDTH = 650

export function useShortcutRows(): ComputedRef<ShortcutRowGroup[]> {
  const { width: windowWidth } = useWindowSize()
  return computed(() =>
    buildShortcutRows(activeBindings.value, {
      nativeTabs: hasNativeChromeTabs,
      notVsto: !isVstoEnvironment,
      wideScreen: windowWidth.value >= SIDE_COMMENTARY_MIN_WIDTH,
    }),
  )
}
