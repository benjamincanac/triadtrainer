<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSettings } from '~/composables/useSettings'
import { useSynth } from '~/composables/useSynth'
import { noteName, PITCH_CLASS_COUNT, type Chord, type Quality } from '~/composables/useTheory'

const { play, unlock } = useSynth()
const { settings } = useSettings()

const rootItems = computed(() =>
  Array.from({ length: PITCH_CLASS_COUNT }, (_, pitchClass) => ({
    label: noteName(pitchClass, settings.value.accidentals),
    value: pitchClass
  }))
)

const QUALITIES = [
  { label: 'Major', value: 'major' },
  { label: 'Minor', value: 'minor' }
]

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
function playNotes(notes: number[]) {
  unlock()
  notes.forEach((note, index) => setTimeout(() => play(note), index * 140))
}

function setQuality(value: unknown) {
  if (value) quality.value = value as Quality
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

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-default bg-elevated px-3 py-2.5">
      <URadioGroup
        v-if="needsRoot"
        :model-value="root"
        :items="rootItems"
        orientation="horizontal"
        variant="card"
        indicator="hidden"
        :ui="{ ...SEGMENT_UI, fieldset: 'flex-wrap gap-1', item: 'items-center justify-center px-2 py-1' }"
        aria-label="Root"
        @update:model-value="root = Number($event)"
      />

      <span v-else class="font-mono text-[11px] text-muted">
        All twelve roots
      </span>

      <URadioGroup
        :model-value="quality"
        :items="QUALITIES"
        orientation="horizontal"
        variant="card"
        indicator="hidden"
        :ui="{ ...SEGMENT_UI, fieldset: 'w-auto gap-1' }"
        aria-label="Quality"
        class="ms-auto"
        @update:model-value="setQuality"
      />
    </div>

    <LessonShapes v-if="lesson === 'shapes'" :quality="quality" @play="playNotes" />
    <LessonInversions v-else-if="lesson === 'inversions'" :chord="chord" @play="playNotes" />
    <LessonScale v-else :chord="chord" @play="playNotes" />
  </div>
</template>
