<template>
  <div class="shortcuts-list">
    <template v-for="group in groups" :key="group.id">
      <div class="shortcuts-group-label">{{ $t(group.labelKey) }}</div>
      <div v-for="row in group.rows" :key="row.id" class="shortcut-row">
        <div class="shortcut-keys">
          <template v-for="(token, index) in row.keys" :key="index">
            <span v-if="token.sep" class="kbd-plus">{{ token.sep }}</span>
            <kbd v-else>{{ token.kbd }}</kbd>
          </template>
        </div>
        <span class="shortcut-description">{{ $t(row.labelKey) }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Every row comes from `src/shortcuts` — the one place a shortcut is written
// down. This file used to spell each key out in markup beside the handler that
// listens for it, which is how a renamed binding could leave the list telling
// the reader about a key that no longer did anything.
import { useShortcutRows } from '@/shortcuts/useShortcutRows'

const groups = useShortcutRows()
</script>

<style scoped>
.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
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

.shortcut-description {
  font-size: 13px;
  color: var(--text-primary);
  text-align: start;
  flex: 1;
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
