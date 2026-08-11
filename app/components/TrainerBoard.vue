<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useTrainer } from '~/composables/useTrainer'

const {
  settings,
  stats,
  midi,
  current,
  phase,
  verdict,
  selected,
  lampFor,
  pressKey,
  next,
  start
} = useTrainer()

/**
 * Space advances. It has to be intercepted globally, and suppressed when focus
 * sits on a control, otherwise it would also activate the focused button.
 */
const INTERACTIVE = 'input, textarea, select, button, [contenteditable], [role="switch"], [role="combobox"]'

function onKeydown(event: KeyboardEvent) {
  if (event.code !== 'Space' || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
  if ((event.target as HTMLElement | null)?.closest?.(INTERACTIVE)) return

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
    <ChordPrompt :chord="current" :phase="phase" :verdict="verdict" />

    <div class="flex justify-center">
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        label="Skip"
        class="font-mono text-xs"
        @click="next"
      />
    </div>

    <PianoKeyboard
      :lamp-for="lampFor"
      :selected="selected"
      :show-labels="!settings.hideNames"
      @press="pressKey"
    />

    <StatsPanel
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
      <ProgressChart :sessions="stats.sessions.value" />
    </div>
  </div>
</template>
