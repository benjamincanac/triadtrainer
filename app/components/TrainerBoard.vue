<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import type { Settings } from '~/composables/useSettings'
import { fingering } from '~/composables/useTheory'
import { useTrainer } from '~/composables/useTrainer'

const MODES = [
  { label: 'Drill', value: 'drill' },
  { label: 'Explore', value: 'explore' }
] as const

const {
  settings,
  stats,
  midi,
  current,
  phase,
  verdict,
  selected,
  selectedNotes,
  lampFor,
  pressKey,
  next,
  start,
  identified,
  clearHeld
} = useTrainer()

const isExplore = computed(() => settings.value.mode === 'explore')

function setMode(mode: Settings['mode']) {
  settings.value = { ...settings.value, mode }
  clearHeld()
}

/** Only explore prints fingers on the keys; the drill would be giving answers. */
const fingers = computed(() => {
  const found = identified.value
  if (!isExplore.value || !found) return undefined
  const f = fingering(found.inversion)
  return Object.fromEntries(
    [...selectedNotes.value].sort((a, b) => a - b).map((note, i) => [note, {
      right: f.right[i]!,
      left: f.left[i]!
    }])
  )
})

/**
 * Space advances. It has to be intercepted globally, and suppressed when focus
 * sits on a control, otherwise it would also activate the focused button.
 */
const INTERACTIVE = 'input, textarea, select, button, [contenteditable], [role="switch"], [role="combobox"]'

function onKeydown(event: KeyboardEvent) {
  if (event.code !== 'Space' || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
  if ((event.target as HTMLElement | null)?.closest?.(INTERACTIVE)) return

  if (isExplore.value) return

  event.preventDefault()
  next()
}

onMounted(() => {
  void start()
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="flex flex-col gap-6">
    <ExploreReadout v-if="isExplore" :identified="identified" :held="selectedNotes" />
    <ChordPrompt v-else :chord="current" :phase="phase" :verdict="verdict" />

    <div class="flex justify-center gap-2">
      <UFieldGroup size="sm" aria-label="Mode">
        <UButton
          v-for="option in MODES"
          :key="option.value"
          :label="option.label"
          :active="settings.mode === option.value"
          color="neutral"
          variant="outline"
          active-color="primary"
          active-variant="soft"
          :aria-pressed="settings.mode === option.value"
          class="justify-center font-mono text-xs"
          @click="setMode(option.value)"
        />
      </UFieldGroup>

      <UButton
        :label="isExplore ? 'Clear' : 'Skip'"
        color="neutral"
        variant="outline"
        size="sm"
        class="font-mono text-xs"
        @click="isExplore ? clearHeld() : next()"
      />
    </div>

    <PianoKeyboard
      :lamp-for="lampFor"
      :selected="selected"
      :show-labels="!settings.hideNames"
      :fingers="fingers"
      @press="pressKey"
    />

    <StatsPanel
      v-if="!isExplore"
      :last-ms="stats.lastMs.value"
      :rolling-ms="stats.rollingMs.value"
      :streak="stats.streak.value"
      :accuracy="stats.accuracy.value"
      :total="stats.total.value"
    />

    <div class="grid items-start gap-4 md:grid-cols-3">
      <MidiStatus
        :state="midi.state.value"
        :inputs="midi.inputs.value"
        :selected-id="midi.selectedId.value"
        @select="midi.selectInput"
      />
      <SettingsPanel v-model="settings" />
      <ProgressChart v-if="!isExplore" :sessions="stats.sessions.value" />
    </div>
  </div>
</template>
