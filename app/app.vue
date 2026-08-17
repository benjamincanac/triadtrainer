<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[][] = [
  [
    // `exact` or `/` stays active on every route, since the default match is a
    // prefix match.
    { label: 'Play', to: '/', exact: true },
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
    <UMain>
      <UHeader :ui="{ title: 'items-center gap-2.5' }">
        <template #title>
          <TrainerMark class="h-5 w-5 shrink-0" />

          <span class="font-mono text-[11px] tracking-[0.25em] text-muted uppercase">
            Triad trainer
          </span>
        </template>

        <template #right>
          <UNavigationMenu :items="items" :external-icon="false" :ui="{ link: 'font-mono text-[11px]' }" />
        </template>
      </UHeader>

      <UContainer class="py-6 sm:py-8">
        <NuxtPage />
      </UContainer>
    </UMain>
  </UApp>
</template>
