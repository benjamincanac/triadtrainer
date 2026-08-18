<script setup lang="ts">
withDefaults(defineProps<{
  /** Names the trigger for assistive tech; the panel carries its own title. */
  label: string
  /** Ignored when a `trigger` slot is given. */
  icon?: string
  /** Panel width, capped by the caller so it can't run off a phone. */
  width: string
  align?: 'start' | 'end'
}>(), { icon: undefined, align: 'end' })
</script>

<template>
  <!--
    The popover contributes positioning only. Its own surface is stripped back
    so the card inside stays the single panel, instead of a panel in a panel.
  -->
  <UPopover
    :content="{ align }"
    :ui="{ content: 'rounded-none bg-transparent shadow-none ring-0' }"
  >
    <slot name="trigger">
      <UButton :icon="icon" :aria-label="label" color="neutral" variant="ghost" size="sm" />
    </slot>

    <template #content>
      <div class="shadow-2xl shadow-black/60" :class="width">
        <slot />
      </div>
    </template>
  </UPopover>
</template>
