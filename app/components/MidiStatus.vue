<script setup lang="ts">
import { computed } from 'vue'
import type { MidiInputInfo, MidiState } from '~/composables/useMidi'

const props = defineProps<{
  state: MidiState
  inputs: readonly MidiInputInfo[]
  selectedId: string | null
}>()

const emit = defineEmits<{ select: [id: string] }>()

/**
 * The three failure modes have nothing to do with each other, so they don't
 * share a message. Only "no device" is worth acting on; the other two mean the
 * on-screen keyboard is the whole story.
 */
const COPY: Record<MidiState, { lamp: string, title: string, detail: string }> = {
  idle: {
    lamp: 'bg-gear-400/40',
    title: 'Connecting',
    detail: 'Asking the browser for MIDI access.'
  },
  unsupported: {
    lamp: 'bg-gear-400/40',
    title: 'No Web MIDI in this browser',
    detail: 'Web MIDI is Chromium-only. In Firefox and Safari the on-screen keyboard is the input: click the keys.'
  },
  denied: {
    lamp: 'bg-bad',
    title: 'MIDI permission refused',
    detail: 'Re-allow MIDI in the site settings next to the address bar, then reload. Clicking the keys works meanwhile.'
  },
  'no-device': {
    lamp: 'bg-lamp',
    title: 'No MIDI device',
    detail: 'Plug a keyboard in over USB and it gets picked up automatically. Clicking the keys works meanwhile.'
  },
  ready: {
    lamp: 'bg-ok shadow-[0_0_8px_1px_var(--color-ok)]',
    title: 'MIDI ready',
    detail: 'Play a chord. Clicking the keys still works too.'
  }
}

const copy = computed(() => COPY[props.state])

const deviceItems = computed(() =>
  props.inputs.map(input => ({ label: input.name, value: input.id }))
)

const value = computed({
  get: () => props.selectedId ?? undefined,
  set: (id: string | undefined) => {
    if (id) emit('select', id)
  }
})
</script>

<template>
  <section class="flex flex-col gap-3 rounded-lg border border-default bg-elevated p-4">
    <div class="flex items-start gap-3">
      <span
        class="mt-1 size-2 shrink-0 rounded-full transition-colors"
        :class="copy.lamp"
        aria-hidden="true"
      />
      <div class="flex flex-col gap-1">
        <h2 class="font-mono text-[11px] tracking-wide text-highlighted">
          {{ copy.title }}
        </h2>
        <p class="font-sans text-[11px] leading-relaxed text-muted">
          {{ copy.detail }}
        </p>
      </div>
    </div>

    <!-- Only worth showing when there's actually a choice to make. -->
    <USelect
      v-if="inputs.length > 1"
      v-model="value"
      :items="deviceItems"
      placeholder="Select an input"
      class="w-full font-mono text-xs"
      :ui="{ item: 'font-mono text-xs' }"
    />

    <p v-else-if="inputs.length === 1" class="font-mono text-[10px] text-dimmed">
      {{ inputs[0]!.name }}
    </p>
  </section>
</template>
