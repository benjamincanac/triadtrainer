<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[][] = [
  [
    // `exact` or `/` stays active on every route, since the default match is a
    // prefix match.
    { label: 'Practice', to: '/', exact: true },
    { label: 'Learn', to: '/learn' },
    {
      label: 'GitHub',
      to: 'https://github.com/benjamincanac/triadtrainer',
      target: '_blank'
    }
  ]
]
</script>

<template>
  <UApp>
    <UHeader :ui="{ title: 'items-center gap-2.5' }">
      <template #title>
        <TrainerMark class="h-5 w-5 shrink-0" />

        <span class="font-mono text-[11px] tracking-[0.25em] text-muted uppercase">
          Triad Trainer
        </span>
      </template>

      <template #right>
        <UNavigationMenu :items="items" :external-icon="false" :ui="{ link: 'font-mono text-[11px]' }" />
      </template>
    </UHeader>

    <!--
      `dvh` so the board measures the window a phone actually shows, and a flex
      column so the practice page can claim whatever the header leaves behind.
    -->
    <UMain class="flex min-h-[calc(100dvh-var(--ui-header-height))] flex-col">
      <UContainer class="flex flex-1 flex-col py-6 sm:py-8">
        <NuxtPage />
      </UContainer>
    </UMain>
  </UApp>
</template>
