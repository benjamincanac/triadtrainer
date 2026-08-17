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

const readouts = computed(() => [
  { label: 'Last', value: formatSeconds(props.lastMs) },
  { label: 'Avg 10', value: formatSeconds(props.rollingMs) },
  { label: 'Streak', value: String(props.streak) },
  { label: 'Accuracy', value: formatPercent(props.accuracy) }
])

const dayLabel = computed(() =>
  `${props.dayStreak} ${props.dayStreak === 1 ? 'day' : 'days'}`
)

/** The bar fills, it doesn't overflow, but the count above it tells the truth. */
const goalValue = computed(() => Math.min(props.todayCorrect, props.dailyGoal))
</script>

<template>
  <!-- `gap-px` over the accented body is what draws the hairlines between tiles. -->
  <UCard :ui="{ body: 'grid grid-cols-2 gap-px bg-accented p-0 sm:p-0 sm:grid-cols-4' }">
    <div
      v-for="readout in readouts"
      :key="readout.label"
      class="flex flex-col gap-1.5 bg-elevated px-3 py-3"
    >
      <span class="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">
        {{ readout.label }}
      </span>
      <span class="font-mono tabular-nums text-xl leading-none text-highlighted">
        {{ readout.value }}
      </span>
    </div>

    <!-- Spanning the full width picks up the same hairline as the tiles above. -->
    <div class="col-span-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-elevated px-3 py-2.5 sm:col-span-4">
      <div class="flex items-baseline gap-2">
        <span class="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">
          Day streak
        </span>
        <span
          class="font-mono tabular-nums text-[11px] leading-none"
          :class="streakActiveToday ? 'text-highlighted' : 'text-muted'"
        >
          {{ dayLabel }}
        </span>
        <!-- A run waiting on today has to read differently from a broken one,
             otherwise every morning looks like a loss. -->
        <span v-if="dayStreak > 0 && !streakActiveToday" class="font-mono text-[10px] text-muted">
          today still open
        </span>
      </div>

      <div class="flex items-center gap-2">
        <span class="font-mono tabular-nums text-[11px] text-muted">
          {{ todayCorrect }} / {{ dailyGoal }} today
        </span>
        <UProgress
          :model-value="goalValue"
          :max="dailyGoal"
          size="sm"
          class="w-20"
          :get-value-label="() => `${todayCorrect} of ${dailyGoal} correct today`"
        />
      </div>
    </div>
  </UCard>
</template>
