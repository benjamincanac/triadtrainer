<script setup lang="ts">
import { computed, ref } from 'vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { useSettings } from '~/composables/useSettings'
import { useSynth } from '~/composables/useSynth'
import { noteName, PITCH_CLASS_COUNT, type Chord, type Quality } from '~/composables/useTheory'

const { play, unlock } = useSynth()
const { settings } = useSettings()

const rootNames = computed(() =>
  Array.from({ length: PITCH_CLASS_COUNT }, (_, pitchClass) =>
    noteName(pitchClass, settings.value.accidentals))
)

const root = ref(0)
const quality = ref<Quality>('major')
const chord = computed<Chord>(() => ({ root: root.value, quality: quality.value }))

const LESSONS = [
  { value: 'shapes', label: 'Shapes' },
  { value: 'inversions', label: 'Inversions' },
  { value: 'scale', label: 'Scale' }
] as const

const lesson = ref<string>('shapes')

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

function setQuality(value: Quality | null) {
  if (value) quality.value = value
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <Tabs v-model="lesson" class="gap-4">
      <TabsList class="w-full">
        <TabsTrigger
          v-for="item in LESSONS"
          :key="item.value"
          :value="item.value"
          class="flex-1 font-mono text-xs data-[state=active]:text-lamp"
        >
          {{ item.label }}
        </TabsTrigger>
      </TabsList>

      <!-- Pick a lesson, then configure it. The roots drop out for Shapes,
           which reads across all twelve of them. -->
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-etch bg-panel px-3 py-2.5">
        <div v-if="needsRoot" class="flex flex-wrap gap-1">
          <button
            v-for="(name, pitchClass) in rootNames"
            :key="name"
            type="button"
            class="min-w-8 cursor-pointer rounded border px-1.5 py-1 font-mono text-[11px] transition-colors"
            :class="root === pitchClass
              ? 'border-lamp/40 bg-lamp/15 text-lamp'
              : 'border-etch bg-panel-raised text-legend hover:text-ivory'"
            :aria-pressed="root === pitchClass"
            @click="root = pitchClass"
          >
            {{ name }}
          </button>
        </div>

        <span v-else class="font-mono text-[11px] text-legend">
          All twelve roots
        </span>

        <ToggleGroup
          :model-value="quality"
          type="single"
          variant="outline"
          class="ms-auto"
          @update:model-value="setQuality($event as Quality | null)"
        >
          <ToggleGroupItem
            v-for="option in (['major', 'minor'] as const)"
            :key="option"
            :value="option"
            class="px-3 font-mono text-[11px] capitalize data-[state=on]:border-lamp/40 data-[state=on]:bg-lamp/15 data-[state=on]:text-lamp"
          >
            {{ option }}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <TabsContent value="shapes">
        <LessonShapes :quality="quality" @play="playNotes" />
      </TabsContent>

      <TabsContent value="inversions">
        <LessonInversions :chord="chord" @play="playNotes" />
      </TabsContent>

      <TabsContent value="scale">
        <LessonScale :chord="chord" @play="playNotes" />
      </TabsContent>
    </Tabs>
  </div>
</template>
