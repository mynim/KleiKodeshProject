<script setup lang="ts">
import { computed } from 'vue'
import {
  IconBrightnessHigh20Regular,
  IconWeatherMoon20Regular,
} from '@iconify-prerendered/vue-fluent'
import { useThemeStore } from './themeStore'
import { withShortcut } from '@/shortcuts/shortcutHint'

const store = useThemeStore()
const isDark = computed(() => store.themePreset.includes('-dark'))
</script>

<template>
  <button
    class="bar-btn"
    :title="withShortcut(isDark ? $t('theme.toLight') : $t('theme.toDark'), 'theme.toggle')"
    @click.stop="store.toggleDarkMode()"
  >
    <IconWeatherMoon20Regular v-if="isDark" />
    <IconBrightnessHigh20Regular v-else />
  </button>
</template>
