<script setup lang="ts">
const links = [
  { to: '/', label: 'Drill' },
  { to: '/learn', label: 'Learn' }
]
</script>

<template>
  <div class="min-h-dvh bg-shell">
    <main class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header class="flex items-center justify-between gap-4 border-b border-etch pb-4">
        <!-- Silkscreened gear label, not a logotype. Serif italic is reserved
             for the chord prompt, which is the one thing meant to be read from
             across the room. -->
        <h1 class="flex items-center gap-2.5">
          <TrainerMark class="h-5 w-5 shrink-0" />
          <span class="font-mono text-[11px] tracking-[0.25em] text-legend uppercase">
            Triad trainer
          </span>
        </h1>

        <nav class="flex gap-1" aria-label="Sections">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="rounded px-2.5 py-1 font-mono text-[11px] text-legend transition-colors hover:text-ivory"
            active-class="bg-lamp/15 text-lamp"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
      </header>

      <NuxtPage />
    </main>
  </div>
</template>
