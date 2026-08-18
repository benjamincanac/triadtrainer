<script setup lang="ts">
import { computed } from 'vue'
import { formatPercent, formatSeconds, type ChordStat } from '~/composables/useStats'
import {
  chordLabel,
  noteNames,
  PITCH_CLASS_COUNT,
  type Accidentals,
  type Quality
} from '~/composables/useTheory'

const props = defineProps<{
  stats: ChordStat[]
  accidentals: Accidentals
}>()

const roots = computed(() =>
  Array.from({ length: PITCH_CLASS_COUNT }, (_, pitchClass) => ({
    pitchClass,
    // Stacked, not joined: a twelfth of the card is too narrow for `C#/Db`.
    names: noteNames(pitchClass, props.accidentals)
  }))
)

/**
 * `stats` arrives in `allChords()` order, chromatic with major before minor,
 * so filtering by quality leaves twelve cells already lined up with the header.
 */
const rows = computed(() =>
  (['major', 'minor'] as Quality[]).map(quality => ({
    quality,
    label: quality === 'major' ? 'maj' : 'min',
    cells: props.stats.filter(stat => stat.q === quality)
  }))
)

const played = computed(() => props.stats.filter(stat => stat.count > 0).length)

/**
 * One signal per cell and it's accuracy, because two would need two hues and
 * the app has one. Speed rides along in the tooltip.
 */
function fill(stat: ChordStat) {
  if (stat.accuracy === null) return undefined
  // Floored well above zero: a chord answered wrong every time still has to
  // read as attempted rather than as untouched.
  return { backgroundColor: 'var(--color-lamp)', opacity: 0.15 + 0.85 * stat.accuracy }
}

function describe(stat: ChordStat): string {
  const name = chordLabel({ root: stat.root, quality: stat.q }, props.accidentals)
  if (stat.count === 0) return `${name} — not played yet`
  const attempts = `${stat.count} ${stat.count === 1 ? 'attempt' : 'attempts'}`
  return `${name} — ${attempts} · ${formatPercent(stat.accuracy)} · ${formatSeconds(stat.meanMs)}`
}
</script>

<template>
  <UCard as="section" :ui="{ title: 'flex items-baseline justify-between gap-2' }">
    <template #title>
      <span>Mastery</span>
      <span class="tabular-nums lowercase">{{ played }} / {{ stats.length }} chords</span>
    </template>

    <p v-if="played === 0" class="font-mono text-[11px] text-dimmed">
      The grid fills in as you drill.
    </p>

    <template v-else>
      <!-- A row label column, then one column per root. -->
      <div class="grid grid-cols-[1.75rem_repeat(12,minmax(0,1fr))] gap-px">
        <span />
        <span
          v-for="root in roots"
          :key="root.pitchClass"
          class="flex flex-col items-center text-center font-mono text-[9px] leading-tight text-muted"
        >
          <span v-for="(name, index) in root.names" :key="name" :class="{ 'opacity-60': index > 0 }">
            {{ name }}
          </span>
        </span>

        <template v-for="row in rows" :key="row.quality">
          <span class="self-center font-mono text-[9px] text-muted">{{ row.label }}</span>
          <div
            v-for="cell in row.cells"
            :key="cell.root"
            class="h-5 rounded-xs"
            :class="{ 'ring-1 ring-accented ring-inset': cell.accuracy === null }"
            :style="fill(cell)"
            :title="describe(cell)"
          />
        </template>
      </div>

      <footer class="mt-3 flex items-center gap-2 font-mono text-[10px] text-muted">
        <span class="tabular-nums">0 %</span>
        <span
          class="h-1 flex-1 rounded-xs"
          style="background: linear-gradient(to right, color-mix(in oklab, var(--color-lamp) 15%, transparent), var(--color-lamp))"
        />
        <span class="tabular-nums">100 %</span>
      </footer>
    </template>
  </UCard>
</template>
