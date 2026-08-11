<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[][] = [
  [
    // `exact` or `/` stays active on every route, since the default match is a
    // prefix match.
    { label: 'Drill', to: '/', exact: true },
    { label: 'Learn', to: '/learn' }
  ],
  [
    {
      label: 'GitHub',
      icon: 'i-lucide-github',
      to: 'https://github.com/benjamincanac/triadtrainer',
      target: '_blank',
      // Icon-only in the header; the label stays for screen readers.
      ui: { link: 'px-1.5', linkLabel: 'sr-only', linkLeadingIcon: 'size-4' }
    }
  ]
]
</script>

<template>
  <UApp class="min-h-dvh bg-default">
    <main class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header class="flex items-center justify-between gap-4 border-b border-default pb-4">
        <!-- Silkscreened gear label, not a logotype. Serif italic is reserved
             for the chord prompt, which is the one thing meant to be read from
             across the room. -->
        <h1 class="flex items-center gap-2.5">
          <TrainerMark class="h-5 w-5 shrink-0" />
          <span class="font-mono text-[11px] tracking-[0.25em] text-muted uppercase">
            Triad trainer
          </span>
        </h1>

        <UNavigationMenu
          :items="items"
          :ui="{ link: 'font-mono text-[11px]' }"
        />
      </header>

      <NuxtPage />
    </main>
  </UApp>
</template>
