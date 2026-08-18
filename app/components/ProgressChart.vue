<script setup lang="ts">
import { computed } from 'vue'
import { formatSeconds } from '~/composables/useStats'
import type { SessionSummary } from '~/composables/useStats'

const props = defineProps<{ sessions: SessionSummary[] }>()

const WIDTH = 320
const HEIGHT = 90
const PAD_X = 4
const PAD_Y = 10

/** The last 40 sessions is a couple of months of practice. */
const series = computed(() => props.sessions.slice(-40))

const bounds = computed(() => {
  const values = series.value.map(session => session.meanMs)
  const min = Math.min(...values)
  const max = Math.max(...values)
  // A flat run would divide by zero; give it a nominal band so the line centres.
  const span = max - min || Math.max(max * 0.2, 1)
  return { min, max, span }
})

const points = computed(() => {
  const list = series.value
  if (list.length < 2) return []

  const { min, span } = bounds.value
  const usableW = WIDTH - PAD_X * 2
  const usableH = HEIGHT - PAD_Y * 2

  return list.map((session, index) => ({
    x: PAD_X + (index / (list.length - 1)) * usableW,
    // Lower time sits lower: a line drifting down is a run getting faster.
    y: PAD_Y + ((session.meanMs - min) / span) * usableH,
    session
  }))
})

const linePath = computed(() =>
  points.value.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
)

const areaPath = computed(() => {
  if (points.value.length < 2) return ''
  const first = points.value[0]!
  const last = points.value.at(-1)!
  return `${linePath.value} L${last.x.toFixed(1)} ${HEIGHT} L${first.x.toFixed(1)} ${HEIGHT} Z`
})

const trend = computed(() => {
  if (points.value.length < 2) return ''
  const first = series.value[0]!.meanMs
  const last = series.value.at(-1)!.meanMs
  const delta = last - first
  const direction = delta < 0 ? 'faster' : 'slower'
  return `${formatSeconds(Math.abs(delta))} ${direction} than the first of ${series.value.length} sessions`
})
</script>

<template>
  <UCard as="section" :ui="{ title: 'flex items-baseline justify-between gap-2' }">
    <template #title>
      <span>Mean per session</span>
      <span class="tabular-nums lowercase">
        {{ series.length }} {{ series.length === 1 ? 'session' : 'sessions' }}
      </span>
    </template>

    <p v-if="points.length < 2" class="font-mono text-[11px] text-dimmed">
      Two sessions needed before the curve means anything.
    </p>

    <template v-else>
      <svg
        :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
        class="h-auto w-full overflow-visible"
        role="img"
        :aria-label="`Mean reaction time per session. ${trend}.`"
      >
        <defs>
          <linearGradient id="progress-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-lamp)" stop-opacity="0.22" />
            <stop offset="100%" stop-color="var(--color-lamp)" stop-opacity="0" />
          </linearGradient>
        </defs>

        <path :d="areaPath" fill="url(#progress-fade)" />
        <path
          :d="linePath"
          fill="none"
          stroke="var(--color-lamp)"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
        <circle
          :cx="points.at(-1)!.x"
          :cy="points.at(-1)!.y"
          r="2.5"
          fill="var(--color-lamp)"
        />
      </svg>

      <footer class="mt-2 flex items-baseline justify-between font-mono text-[10px] text-muted">
        <span class="tabular-nums">fastest {{ formatSeconds(bounds.min) }}</span>
        <span class="tabular-nums">slowest {{ formatSeconds(bounds.max) }}</span>
      </footer>
    </template>
  </UCard>
</template>
