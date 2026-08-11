<template>
  <ClientOnly>
    <!--
      Everything here is client-only: Web MIDI, Web Audio, localStorage and
      performance.now() have no server equivalent, and rendering the persisted
      settings on the server would only produce a hydration mismatch.
    -->
    <TrainerBoard />
    <template #fallback>
      <div class="flex min-h-[520px] items-center justify-center">
        <p class="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
          Loading
        </p>
      </div>
    </template>
  </ClientOnly>
</template>
