<script setup lang="ts">
const links = [
  { to: '/', label: 'Drill' },
  { to: '/learn', label: 'Learn' }
]
</script>

<template>
  <div class="min-h-dvh bg-shell">
    <main class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header class="flex items-center justify-between gap-4 border-b border-etch pb-4">
        <!-- The name is itself an expression marking, so it gets the same serif
             italic as the chord prompt, three sizes down so it stays a wordmark
             and doesn't compete with it. -->
        <h1 class="flex items-baseline gap-2.5">
          <span class="font-serif text-lg italic text-ivory">Subito</span>
          <span class="font-mono text-[10px] tracking-[0.18em] text-legend uppercase">
            triad trainer
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
