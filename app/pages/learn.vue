<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSettings } from '~/composables/useSettings'
import { useSynth } from '~/composables/useSynth'
import { noteName, PITCH_CLASS_COUNT, type Chord, type Quality } from '~/composables/useTheory'

const { playNotes } = useSynth()
const { settings } = useSettings()

/** Slow enough that each note lands as its own event, not as a chord. */
const ARPEGGIO_SPACING = 140

const rootItems = computed(() =>
  Array.from({ length: PITCH_CLASS_COUNT }, (_, pitchClass) => ({
    label: noteName(pitchClass, settings.value.accidentals),
    value: pitchClass
  }))
)

const QUALITIES = [
  { label: 'Major', value: 'major' },
  { label: 'Minor', value: 'minor' }
] as const

const LESSONS = [
  { value: 'shapes', label: 'Shapes' },
  { value: 'inversions', label: 'Inversions' },
  { value: 'scale', label: 'Scale' }
]

const root = ref(0)
const quality = ref<Quality>('major')
const lesson = ref('shapes')

const chord = computed<Chord>(() => ({ root: root.value, quality: quality.value }))

/**
 * Shapes is about the four hand positions across all twelve roots, so the root
 * picker would imply a dependency that isn't there. Quality still applies:
 * the major and minor families group differently.
 */
const needsRoot = computed(() => lesson.value !== 'shapes')

/** Arpeggiate rather than strike together, so each note is audible on its own. */
function arpeggiate(notes: number[]) {
  playNotes(notes, ARPEGGIO_SPACING)
}

</script>

<template>
  <div class="flex flex-col gap-4">
    <!--
      `content: false` renders the tab list only, so the control row can sit
      between the tabs and the lesson. Pick a lesson, then configure it.
    -->
    <UTabs
      v-model="lesson"
      :items="LESSONS"
      :content="false"
      color="neutral"
      :ui="{
        list: 'w-full bg-elevated',
        // The keyboard is the loud element; a solid pill here competes with it.
        indicator: 'bg-primary/15 ring ring-primary/30',
        trigger: 'flex-1 font-mono text-xs data-[state=active]:text-primary'
      }"
    />

    <!-- A toolbar, not a panel: tighter vertical padding than the card default. -->
    <UCard :ui="{ body: 'flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 sm:py-2.5' }">
      <!-- A field group is deliberately non-wrapping so its segments stay
           joined, and twelve roots are wider than a phone. Scroll the control
           rather than the page. -->
      <UFieldGroup
        v-if="needsRoot"
        size="xs"
        aria-label="Root"
        class="max-w-full overflow-x-auto"
      >
        <UButton
          v-for="item in rootItems"
          :key="item.value"
          :label="item.label"
          :active="root === item.value"
          color="neutral"
          variant="subtle"
          active-color="primary"
          active-variant="subtle"
          :aria-pressed="root === item.value"
          class="justify-center font-mono text-[11px]"
          :class="{ 'z-1': root === item.value }"
          @click="root = item.value"
        />
      </UFieldGroup>

      <span v-else class="font-mono text-[11px] text-muted">
        All twelve roots
      </span>

      <UFieldGroup size="xs" class="ms-auto" aria-label="Quality">
        <UButton
          v-for="option in QUALITIES"
          :key="option.value"
          :label="option.label"
          :active="quality === option.value"
          color="neutral"
          variant="subtle"
          active-color="primary"
          active-variant="subtle"
          :aria-pressed="quality === option.value"
          class="justify-center font-mono text-[11px]"
          :class="{ 'z-1': quality === option.value }"
          @click="quality = option.value"
        />
      </UFieldGroup>
    </UCard>

    <LessonShapes v-if="lesson === 'shapes'" :quality="quality" @play="arpeggiate" />
    <LessonInversions v-else-if="lesson === 'inversions'" :chord="chord" @play="arpeggiate" />
    <LessonScale v-else :chord="chord" @play="arpeggiate" />
  </div>
</template>
