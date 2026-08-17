<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import type { Settings } from '~/composables/useSettings'
import { DAILY_GOAL } from '~/composables/useStats'
import { fingering } from '~/composables/useTheory'
import { useTrainer } from '~/composables/useTrainer'

const MODES = [
  { label: 'Drill', value: 'drill' },
  { label: 'Ear', value: 'ear' },
  { label: 'Explore', value: 'explore' }
] as const

const {
  settings,
  stats,
  midi,
  current,
  currentInversion,
  phase,
  verdict,
  selected,
  selectedNotes,
  lampFor,
  pressKey,
  next,
  replay,
  start,
  identified,
  clearHeld
} = useTrainer()

const isExplore = computed(() => settings.value.mode === 'explore')
const isEar = computed(() => settings.value.mode === 'ear')

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
  if (event.code !== 'Space' && event.code !== 'KeyR') return
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
  if ((event.target as HTMLElement | null)?.closest?.(INTERACTIVE)) return

  // R hears the prompt again, and only ear mode has one to hear.
  if (event.code === 'KeyR') {
    if (!isEar.value) return
    event.preventDefault()
    replay()
    return
  }

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
    <div class="flex justify-center">
      <UFieldGroup size="sm" aria-label="Mode">
        <UButton v-for="option in MODES" :key="option.value" :label="option.label" :active="settings.mode === option.value" color="neutral" variant="subtle" active-color="primary" active-variant="subtle" :aria-pressed="settings.mode === option.value" class="justify-center font-mono text-xs" :class="{ 'z-1': settings.mode === option.value }" @click="setMode(option.value)" />
      </UFieldGroup>
    </div>

    <EarPrompt v-if="isEar" :chord="current" :phase="phase" :verdict="verdict" />
    <ExploreReadout v-else-if="isExplore" :identified="identified" :held="selectedNotes" />
    <ChordPrompt v-else :chord="current" :phase="phase" :verdict="verdict" :inversion="currentInversion" />

    <div class="flex justify-center gap-2">
      <UButton v-if="isEar" label="Replay" color="neutral" variant="outline" size="sm" class="font-mono text-xs" @click="replay()">
        <template #trailing>
          <UKbd value="R" variant="subtle" size="sm" />
        </template>
      </UButton>

      <UButton :label="isExplore ? 'Clear' : 'Skip'" color="neutral" variant="outline" size="sm" class="font-mono text-xs" @click="isExplore ? clearHeld() : next()">
        <template #trailing>
          <UKbd value="space" variant="subtle" size="sm" />
        </template>
      </UButton>
    </div>

    <PianoKeyboard :lamp-for="lampFor" :selected="selected" :show-labels="!settings.hideNames" :fingers="fingers" @press="pressKey" />

    <StatsPanel v-if="!isExplore" :last-ms="stats.lastMs.value" :rolling-ms="stats.rollingMs.value" :streak="stats.streak.value" :accuracy="stats.accuracy.value" :total="stats.total.value" :day-streak="stats.dayStreak.value.length" :streak-active-today="stats.dayStreak.value.activeToday" :today-correct="stats.todayCorrect.value" :daily-goal="DAILY_GOAL" />

    <MasteryGrid v-if="!isExplore" :stats="stats.perChord.value" :accidentals="settings.accidentals" />

    <div class="grid items-start gap-4 md:grid-cols-3">
      <MidiStatus :state="midi.state.value" :inputs="midi.inputs.value" :selected-id="midi.selectedId.value" @select="midi.selectInput" />
      <SettingsPanel v-model="settings" />
      <ProgressChart v-if="!isExplore" :sessions="stats.sessions.value" />
    </div>
  </div>
</template>
