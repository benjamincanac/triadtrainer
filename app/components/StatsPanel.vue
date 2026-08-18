<script setup lang="ts">
import { computed } from 'vue'
import { formatPercent, formatSeconds } from '~/composables/useStats'

const props = defineProps<{
  lastMs: number | null
  rollingMs: number | null
  streak: number
  accuracy: number | null
  total: number
  dayStreak: number
  /** False while a live run is still waiting on today. */
  streakActiveToday: boolean
  todayCorrect: number
  dailyGoal: number
}>()

const dayLabel = computed(() =>
  `${props.dayStreak} ${props.dayStreak === 1 ? 'day' : 'days'}`
)

const readouts = computed(() => [
  { label: 'Last', value: formatSeconds(props.lastMs) },
  { label: 'Avg 10', value: formatSeconds(props.rollingMs) },
  { label: 'Streak', value: String(props.streak) },
  { label: 'Accuracy', value: formatPercent(props.accuracy) },
  {
    label: 'Days',
    value: dayLabel.value,
    // A run waiting on today has to read differently from a broken one,
    // otherwise every morning looks like a loss.
    muted: props.dayStreak > 0 && !props.streakActiveToday,
    title: props.streakActiveToday ? undefined : 'Today still open'
  },
  { label: 'Today', value: `${props.todayCorrect}/${props.dailyGoal}` }
])

/** The bar fills, it doesn't overflow, but the count above it tells the truth. */
const goalValue = computed(() => Math.min(props.todayCorrect, props.dailyGoal))
</script>

<template>
  <!-- `gap-px` over the accented body is what draws the hairlines between cells. -->
  <UCard title="Session" :ui="{ body: 'grid grid-cols-2 gap-px bg-accented p-0 sm:p-0' }">
    <div
      v-for="readout in readouts"
      :key="readout.label"
      class="flex items-baseline justify-between gap-2 bg-elevated px-3 py-2"
      :title="readout.title"
    >
      <span class="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">
        {{ readout.label }}
      </span>
      <span
        class="font-mono tabular-nums text-sm leading-none"
        :class="readout.muted ? 'text-muted' : 'text-highlighted'"
      >
        {{ readout.value }}
      </span>
    </div>

    <!-- Spanning both columns picks up the same hairline as the cells above. -->
    <div class="col-span-2 flex items-center gap-3 bg-elevated px-3 py-2.5">
      <span class="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">
        Goal
      </span>
      <UProgress
        :model-value="goalValue"
        :max="dailyGoal"
        size="sm"
        :get-value-label="() => `${todayCorrect} of ${dailyGoal} correct today`"
      />
    </div>
  </UCard>
</template>
