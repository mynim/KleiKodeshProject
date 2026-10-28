<template>
  <div class="shortcuts-list">
    <button
      v-if="editable && hasChanges"
      type="button"
      class="shortcuts-reset-all"
      @click="resetAllShortcuts"
    >
      {{ $t('settings.shortcuts.resetAll') }}
    </button>
    <template v-for="group in groups" :key="group.id">
      <div class="shortcuts-group-label">{{ $t(group.labelKey) }}</div>
      <template v-for="row in group.rows" :key="row.id">
        <div class="shortcut-row">
          <!-- The key cell is a button only where pressing it leads somewhere:
               a fixed shortcut explains itself on hover instead. -->
          <button
            v-if="editable && !row.fixed"
            type="button"
            class="shortcut-keys shortcut-keys-button"
            :class="{ capturing: capturingId === row.id }"
            :title="$t('settings.shortcuts.changeHint')"
            @click="start(row.id)"
            @blur="cancelIfWaiting(row.id)"
          >
            <span v-if="capturingId === row.id" class="shortcut-prompt">
              {{ $t('settings.shortcuts.pressKeys') }}
            </span>
            <span v-else-if="row.keys.length === 0" class="shortcut-unassigned">
              {{ $t('settings.shortcuts.noKey') }}
            </span>
            <template v-else>
              <template v-for="(token, index) in row.keys" :key="index">
                <span v-if="token.sep" class="kbd-plus">{{ token.sep }}</span>
                <kbd v-else>{{ token.kbd }}</kbd>
              </template>
            </template>
          </button>
          <div
            v-else
            class="shortcut-keys"
            :class="{ 'shortcut-keys-fixed': editable && row.fixed }"
            :title="row.fixed ? $t(`settings.shortcuts.fixed.${row.fixed}`) : undefined"
          >
            <template v-for="(token, index) in row.keys" :key="index">
              <span v-if="token.sep" class="kbd-plus">{{ token.sep }}</span>
              <kbd v-else>{{ token.kbd }}</kbd>
            </template>
          </div>
          <span class="shortcut-description">{{ $t(row.labelKey) }}</span>
          <button
            v-if="editable && isShortcutChanged(row.id)"
            type="button"
            class="shortcut-reset"
            :title="$t('settings.shortcuts.resetOne')"
            @click="resetShortcut(row.id)"
          >
            ↺
          </button>
        </div>
        <!-- One note under the row at a time: what was just refused, what has
             to be confirmed, or a default that could not be applied. -->
        <div v-if="editable && refused?.id === row.id" class="shortcut-note">
          {{ $t(`settings.shortcuts.refused.${refused.problem}`) }}
        </div>
        <div v-else-if="editable && capturingId === row.id" class="shortcut-note shortcut-hint">
          {{ $t('settings.shortcuts.captureHelp') }}
        </div>
        <div v-else-if="editable && pending?.id === row.id" class="shortcut-note">
          <span>{{ takenByText(pending.heldBy) }}</span>
          <button type="button" class="shortcut-note-action" @click="confirmPending">
            {{ $t('settings.shortcuts.replaceAnyway') }}
          </button>
          <button type="button" class="shortcut-note-action" @click="cancel">
            {{ $t('settings.shortcuts.cancel') }}
          </button>
        </div>
        <div v-else-if="editable && row.heldBy" class="shortcut-note">
          {{ $t('settings.shortcuts.defaultTaken') }}
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
// Every row comes from `src/shortcuts` — the one place a shortcut is written
// down. This file used to spell each key out in markup beside the handler that
// listens for it, which is how a renamed binding could leave the list telling
// the reader about a key that no longer did anything.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useShortcutRows } from '@/shortcuts/useShortcutRows'
import { useShortcutCapture } from '@/shortcuts/useShortcutCapture'
import { shortcutLabelKey } from '@/shortcuts/shortcutRows'
import {
  isShortcutChanged,
  resetAllShortcuts,
  resetShortcut,
  shortcutOverrides,
} from '@/shortcuts/shortcutSettings'

// Read-only everywhere except the settings page: the setup wizard shows the
// same list as something to learn, not to configure.
const { editable = false } = defineProps<{ editable?: boolean }>()

const { t } = useI18n()
const groups = useShortcutRows()
const { capturingId, refused, pending, start, cancel, confirmPending } = useShortcutCapture()
const hasChanges = computed(() => Object.keys(shortcutOverrides.value).length > 0)

/**
 * Clicking away from a row that is still waiting for a key gives up on it,
 * rather than leaving every shortcut in the app standing down until the reader
 * happens to press something. A row showing a question it has already asked
 * (`pending`) is past waiting, and `capturingId` is null there — so moving the
 * focus onto that question's own buttons does not throw it away.
 */
function cancelIfWaiting(id: string): void {
  if (capturingId.value === id) cancel()
}

/** Names the shortcut in the way, or says only that the combination is taken. */
function takenByText(heldBy: string): string {
  const labelKey = shortcutLabelKey(heldBy)
  return labelKey === null
    ? t('settings.shortcuts.taken')
    : t('settings.shortcuts.takenBy', { name: t(labelKey) })
}
</script>

<style scoped>
.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shortcuts-reset-all {
  align-self: flex-start;
  margin-bottom: 8px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--control-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
}

.shortcuts-reset-all:hover {
  background: var(--control-bg-hover);
  color: var(--text-primary);
}

.shortcuts-group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 10px 0 4px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 60%, transparent);
  margin-bottom: 4px;
}

.shortcuts-group-label:first-child {
  padding-top: 0;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 30px;
  padding: 0 4px;
  border-radius: 4px;
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.shortcut-keys-button {
  padding: 2px 4px;
  margin: 0 -4px;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.shortcut-keys-button:hover {
  border-color: var(--border-color);
  background: var(--hover-bg);
}

.shortcut-keys-button.capturing {
  border-color: var(--accent-color);
  background: var(--accent-bg-light);
}

.shortcut-keys-fixed {
  cursor: help;
}

.shortcut-prompt,
.shortcut-unassigned {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.shortcut-prompt {
  color: var(--accent-color);
}

.shortcut-description {
  font-size: 13px;
  color: var(--text-primary);
  text-align: start;
  flex: 1;
}

.shortcut-reset {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  padding: 0;
  font-size: 13px;
  line-height: 1;
  color: var(--text-secondary);
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.shortcut-reset:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.shortcut-note {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px 4px 6px;
  font-size: 12px;
  color: var(--status-warning);
}

/* The how-to while a row waits for a key: guidance, not a warning. */
.shortcut-hint {
  color: var(--text-secondary);
}

.shortcut-note-action {
  padding: 2px 8px;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--control-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
}

.shortcut-note-action:hover {
  background: var(--control-bg-hover);
}

kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 22px;
  padding: 0 6px;
  font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 1px 0 var(--border-color);
  white-space: nowrap;
  direction: ltr;
}

.kbd-plus {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1;
}
</style>
