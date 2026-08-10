<script setup lang="ts">
import { computed } from 'vue'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import type { Settings } from '~/composables/useSettings'

const settings = defineModel<Settings>({ required: true })

const QUALITIES = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'both', label: 'Both' }
] as const

/**
 * A single-select toggle group clears itself when you click the active item.
 * The drill always needs a pool, so an empty selection keeps the old value.
 */
const quality = computed({
  get: () => settings.value.quality,
  set: (value: Settings['quality'] | null) => {
    if (value) settings.value = { ...settings.value, quality: value }
  }
})

const hideNames = computed({
  get: () => settings.value.hideNames,
  set: (value: boolean) => {
    settings.value = { ...settings.value, hideNames: value }
  }
})

const whiteRootsOnly = computed({
  get: () => settings.value.whiteRootsOnly,
  set: (value: boolean) => {
    settings.value = { ...settings.value, whiteRootsOnly: value }
  }
})
</script>

<template>
  <section class="flex flex-col gap-5 rounded-lg border border-etch bg-panel p-4">
    <h2 class="font-mono text-[10px] tracking-[0.18em] text-legend uppercase">
      Settings
    </h2>

    <div class="flex flex-col gap-2">
      <span class="font-mono text-[11px] text-legend">Chord types</span>
      <ToggleGroup v-model="quality" type="single" variant="outline" class="w-full">
        <ToggleGroupItem
          v-for="option in QUALITIES"
          :key="option.value"
          :value="option.value"
          class="flex-1 font-mono text-xs data-[state=on]:border-lamp/40 data-[state=on]:bg-lamp/15 data-[state=on]:text-lamp"
        >
          {{ option.label }}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>

    <div class="flex items-center justify-between gap-4">
      <Label for="hide-names" class="font-mono text-[11px] font-normal text-legend">
        Hide note names
      </Label>
      <Switch id="hide-names" v-model="hideNames" />
    </div>

    <div class="flex items-center justify-between gap-4">
      <Label for="white-roots" class="font-mono text-[11px] font-normal text-legend">
        White-key roots only
      </Label>
      <Switch id="white-roots" v-model="whiteRootsOnly" />
    </div>

    <p class="font-mono text-[10px] leading-relaxed text-legend/70">
      Press <kbd class="rounded border border-etch bg-panel-raised px-1 py-0.5 text-ivory">space</kbd> to skip to the next chord.
    </p>
  </section>
</template>
