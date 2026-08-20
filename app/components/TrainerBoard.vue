<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import type { Settings } from '~/composables/useSettings'
import { DAILY_GOAL } from '~/composables/useStats'
import { fingering, SCALE_RUN_LENGTH } from '~/composables/useTheory'
import { useTrainer } from '~/composables/useTrainer'

/**
 * One flat row: the drill split by exercise, then the two other modes. Ear and
 * explore stay triad-only (a scale's pitch class set is ambiguous — C major and
 * A minor are the same seven notes — so identifying or grading one from held
 * notes has no honest answer), which is what lets two axes collapse into four tabs.
 */
type Tab = Settings['exercise'] | 'ear' | 'explore'

const TABS: { label: string, value: Tab }[] = [
  { label: 'Triads', value: 'triads' },
  { label: 'Scales', value: 'scales' },
  { label: 'Ear', value: 'ear' },
  { label: 'Explore', value: 'explore' }
]

const {
  settings,
  stats,
  midi,
  current,
  currentInversion,
  phase,
  verdict,
  scaleIndex,
  selected,
  selectedNotes,
  lampFor,
  pressKey,
  next,
  reveal,
  replay,
  start,
  identified,
  clearHeld
} = useTrainer()

const isExplore = computed(() => settings.value.mode === 'explore')
const isEar = computed(() => settings.value.mode === 'ear')
const isScales = computed(() => settings.value.mode === 'drill' && settings.value.exercise === 'scales')

/**
 * Writable, so switching also empties whatever was being held in the old tab.
 * The tab is a view over the two persisted fields: triads and scales are both
 * the drill, so picking one sets the mode and the exercise together.
 */
const tab = computed({
  get: (): Tab => settings.value.mode === 'drill' ? settings.value.exercise : settings.value.mode,
  set: (value: string | number) => {
    const picked = value as Tab
    settings.value = picked === 'triads' || picked === 'scales'
      ? { ...settings.value, mode: 'drill', exercise: picked }
      : { ...settings.value, mode: picked }
    clearHeld()
  }
})

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
 * Space advances, R replays, A gives the answer. They have to be intercepted
 * globally, and suppressed when focus sits on a control or inside an open panel,
 * otherwise they would also activate whatever is focused there.
 */
const INTERACTIVE = 'input, textarea, select, button, [contenteditable], [role="switch"], [role="combobox"], [role="dialog"]'

/**
 * The board's own controls are the exception: clicking Skip or a mode tab leaves
 * focus on it, and it would then swallow every shortcut. Space is prevented
 * further down, before the browser turns it into a second activation.
 */
const SHORTCUTS_SAFE = '[data-shortcuts]'

function onKeydown(event: KeyboardEvent) {
  if (event.code !== 'Space' && event.code !== 'KeyR' && event.code !== 'KeyA') return
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
  const focused = (event.target as HTMLElement | null)?.closest?.(INTERACTIVE)
  if (focused && !focused.closest(SHORTCUTS_SAFE)) return

  // R hears the prompt again, and only ear mode has one to hear.
  if (event.code === 'KeyR') {
    if (!isEar.value) return
    event.preventDefault()
    replay()
    return
  }

  if (isExplore.value) return

  event.preventDefault()

  // A gives up on the current chord; space moves past it.
  if (event.code === 'KeyA') reveal()
  else next()
}

onMounted(() => {
  void start()
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!--
    A board, not a document: the rail, the readouts, the prompt and the key bed
    divide one viewport between them. Only the prompt flexes, so nothing here
    has to scroll and the keys stay put whatever the mode.
  -->
  <div class="flex min-h-0 flex-1 flex-col gap-3">
    <div class="relative grid grid-cols-3 shrink-0 gap-2">
      <div>
        <MidiStatus :state="midi.state.value" :inputs="midi.inputs.value" :selected-id="midi.selectedId.value" @select="midi.selectInput" />
      </div>

      <!-- Sized to its labels and allowed to spill over the track, so four tabs
           stay readable without dragging the switch off the centre of the board.
           `flex-initial` undoes the equal-width triggers that would otherwise
           squeeze the longest label into an ellipsis. -->
      <UTabs v-model="tab" :items="TABS" :content="false" size="sm" class="-my-1 w-fit justify-self-center" :ui="{ trigger: 'flex-initial' }" data-shortcuts />

      <div class="flex justify-end">
        <!-- The one panel that isn't a readout. The device it plays sits at the
           other end of the rail. -->
        <PanelPopover label="Settings" icon="i-lucide-sliders-horizontal" width="w-[min(20rem,calc(100vw-2rem))]">
          <SettingsPanel v-model="settings" />
        </PanelPopover>
      </div>
    </div>

    <!-- The prompt takes whatever height is left over, so it sits centred
         between the readouts and the key bed on any window. -->
    <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
      <EarPrompt v-if="isEar" :chord="current" :phase="phase" :verdict="verdict" />
      <ExploreReadout v-else-if="isExplore" :identified="identified" :held="selectedNotes" />
      <ScalePrompt v-else-if="isScales" :chord="current" :phase="phase" :verdict="verdict" :step="scaleIndex" :total="SCALE_RUN_LENGTH" />
      <ChordPrompt v-else :chord="current" :phase="phase" :verdict="verdict" :inversion="currentInversion" />

      <div data-shortcuts class="flex justify-center gap-2">
        <UButton v-if="isEar" label="Replay" color="neutral" variant="outline" size="sm" class="font-mono text-xs" @click="replay()">
          <template #trailing>
            <UKbd value="R" variant="subtle" size="sm" />
          </template>
        </UButton>

        <UButton v-if="!isExplore" label="Answer" color="neutral" variant="outline" size="sm" class="font-mono text-xs" @click="reveal()">
          <template #trailing>
            <UKbd value="A" variant="subtle" size="sm" />
          </template>
        </UButton>

        <UButton :label="isExplore ? 'Clear' : 'Skip'" color="neutral" variant="outline" size="sm" class="font-mono text-xs" @click="isExplore ? clearHeld() : next()">
          <template #trailing>
            <UKbd value="space" variant="subtle" size="sm" />
          </template>
        </UButton>
      </div>
    </div>

    <!-- The whole record of how it's going, read between chords rather than
         during one. Above the prompt rather than below the keys: explore keeps
         no score, and dropping it from up here grows the space around the
         prompt instead of sliding the key bed down the board. -->
    <div v-if="!isExplore" class="grid shrink-0 gap-3 sm:grid-cols-3">
      <StatsPanel :last-ms="stats.lastMs.value" :rolling-ms="stats.rollingMs.value" :streak="stats.streak.value" :accuracy="stats.accuracy.value" :total="stats.total.value" :day-streak="stats.dayStreak.value.length" :streak-active-today="stats.dayStreak.value.activeToday" :today-correct="stats.todayCorrect.value" :daily-goal="DAILY_GOAL" />

      <MasteryGrid :stats="stats.perChord.value" :accidentals="settings.accidentals" />

      <ProgressChart :sessions="stats.sessions.value" />
    </div>
    <div v-else class="h-40" />

    <PianoKeyboard class="shrink-0" :lamp-for="lampFor" :selected="selected" :show-labels="!settings.hideNames" :fingers="fingers" @press="pressKey" />
  </div>
</template>
