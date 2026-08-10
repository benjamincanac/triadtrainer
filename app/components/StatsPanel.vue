<script setup lang="ts">
import { computed } from 'vue'
import { formatPercent, formatSeconds } from '~/composables/useStats'

const props = defineProps<{
  lastMs: number | null
  rollingMs: number | null
  streak: number
  accuracy: number | null
  total: number
}>()

const readouts = computed(() => [
  { label: 'Last', value: formatSeconds(props.lastMs) },
  { label: 'Avg 10', value: formatSeconds(props.rollingMs) },
  { label: 'Streak', value: String(props.streak) },
  { label: 'Accuracy', value: formatPercent(props.accuracy) }
])
</script>

<template>
  <div class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-etch bg-etch sm:grid-cols-4">
    <div
      v-for="readout in readouts"
      :key="readout.label"
      class="flex flex-col gap-1.5 bg-panel px-3 py-3"
    >
      <span class="font-mono text-[10px] tracking-[0.18em] text-legend uppercase">
        {{ readout.label }}
      </span>
      <span class="tabular font-mono text-xl leading-none text-ivory">
        {{ readout.value }}
      </span>
    </div>
  </div>
</template>
