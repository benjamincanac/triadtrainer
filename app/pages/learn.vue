<script setup lang="ts">
import { ref } from 'vue'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { useSynth } from '~/composables/useSynth'
import { KEY_NAMES, type Chord, type Quality } from '~/composables/useTheory'

const { play, unlock } = useSynth()

const root = ref(0)
const quality = ref<Quality>('major')
const chord = computed<Chord>(() => ({ root: root.value, quality: quality.value }))

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
  <div class="flex flex-col gap-10">
    <section class="flex flex-col gap-4">
      <p class="max-w-prose font-sans text-sm leading-relaxed text-legend">
        Three ways into the same twenty-four chords: the hand shape you reach for, the
        three orders you can stack it in, and the scale it comes from. Everything is
        playable, so pick a chord and listen.
      </p>

      <div class="flex flex-col gap-3 rounded-lg border border-etch bg-panel p-4">
        <span class="font-mono text-[10px] tracking-[0.18em] text-legend uppercase">
          Chord
        </span>

        <div class="flex flex-wrap gap-1">
          <button
            v-for="(name, pitchClass) in KEY_NAMES"
            :key="name"
            type="button"
            class="min-w-9 cursor-pointer rounded border px-2 py-1.5 font-mono text-[11px] transition-colors"
            :class="root === pitchClass
              ? 'border-lamp/40 bg-lamp/15 text-lamp'
              : 'border-etch bg-panel-raised text-legend hover:text-ivory'"
            :aria-pressed="root === pitchClass"
            @click="root = pitchClass"
          >
            {{ name }}
          </button>
        </div>

        <ToggleGroup
          :model-value="quality"
          type="single"
          variant="outline"
          class="w-full max-w-xs"
          @update:model-value="setQuality($event as Quality | null)"
        >
          <ToggleGroupItem
            v-for="option in (['major', 'minor'] as const)"
            :key="option"
            :value="option"
            class="flex-1 font-mono text-xs capitalize data-[state=on]:border-lamp/40 data-[state=on]:bg-lamp/15 data-[state=on]:text-lamp"
          >
            {{ option }}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </section>

    <LessonShapes :quality="quality" @play="playNotes" />
    <LessonInversions :chord="chord" @play="playNotes" />
    <LessonScale :chord="chord" @play="playNotes" />
  </div>
</template>
