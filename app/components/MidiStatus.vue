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
 *
 * `label` is what fits on the rail, `title` what the panel can afford.
 */
const COPY: Record<MidiState, { lamp: string, label: string, title: string, detail: string }> = {
  'idle': {
    lamp: 'bg-gear-400/40',
    label: 'Connecting',
    title: 'Connecting',
    detail: 'Asking the browser for MIDI access.'
  },
  'unsupported': {
    lamp: 'bg-gear-400/40',
    label: 'No Web MIDI',
    title: 'No Web MIDI in this browser',
    detail: 'Web MIDI is Chromium-only. In Firefox and Safari the on-screen keyboard is the input: click the keys.'
  },
  'denied': {
    lamp: 'bg-bad',
    label: 'MIDI refused',
    title: 'MIDI permission refused',
    detail: 'Re-allow MIDI in the site settings next to the address bar, then reload. Clicking the keys works meanwhile.'
  },
  'no-device': {
    lamp: 'bg-lamp',
    label: 'No device',
    title: 'No MIDI device',
    detail: 'Plug a keyboard in over USB and it gets picked up automatically. Clicking the keys works meanwhile.'
  },
  'ready': {
    lamp: 'bg-ok shadow-[0_0_8px_1px_var(--color-ok)]',
    label: 'MIDI ready',
    title: 'MIDI ready',
    detail: 'Play a chord. Clicking the keys still works too.'
  }
}

const copy = computed(() => COPY[props.state])

const selectedName = computed(() =>
  props.inputs.find(input => input.id === props.selectedId)?.name
)

/** Once a device is talking, its name says more on the rail than "MIDI ready". */
const railLabel = computed(() => selectedName.value ?? copy.value.label)

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
  <PanelPopover :label="copy.title" width="w-[min(20rem,calc(100vw-2rem))]" align="start">
    <!-- A lamp on the rail, the way the device would report itself on a panel.
         The wording only shows up where there's room for it. -->
    <template #trigger>
      <UButton color="neutral" variant="ghost" size="sm" :aria-label="copy.title" class="font-mono text-[11px] text-muted">
        <span class="size-2 shrink-0 rounded-full transition-colors" :class="copy.lamp" aria-hidden="true" />
        <span class="hidden max-w-40 truncate sm:inline">{{ railLabel }}</span>
      </UButton>
    </template>

    <UCard :title="copy.title" :ui="{ body: 'flex flex-col gap-3' }">
      <p class="text-[11px] leading-relaxed text-muted">
        {{ copy.detail }}
      </p>

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
    </UCard>
  </PanelPopover>
</template>
