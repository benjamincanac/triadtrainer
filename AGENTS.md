# AGENTS.md

Triad Trainer: a Nuxt app that names a chord, you play it on a MIDI keyboard, it validates and times you. See `README.md` for what the app is and the browser constraints around Web MIDI.

## Commands

```bash
pnpm dev          # dev server
pnpm test         # vitest run
pnpm test:watch   # vitest
pnpm lint         # eslint (--fix available as lint:fix)
pnpm typecheck    # nuxt typecheck
pnpm build
```

Run `pnpm test` and `pnpm typecheck` before calling a change done.

## Stack

Nuxt 4 (`app/` srcDir), `@nuxt/ui` v4, Tailwind v4, TypeScript, Vitest, pnpm. Deployed on Vercel with the zero-config preset. There is no `server/` directory, no database and no API: everything runs client-side.

## Architecture

State lives in composables, not stores. There is no Pinia, no `stores/`, no plugins and no middleware. Shared state is a module-scope `ref` inside the composable file, guarded by an `initialized` flag so the singleton is built once:

```ts
const settings = ref<Settings>({ ...DEFAULTS })
let initialized = false

export function useSettings() {
  if (import.meta.client && !initialized) { /* read localStorage, start the watcher */ }
}
```

`app/composables/useTheory.ts` is the domain layer and is deliberately free of DOM and Vue imports so it runs in plain node. Put new theory logic there as a pure function and test it in `test/useTheory.test.ts`, rather than inside a component or a Vue composable. The pure helpers of `useStats.ts` and `useSettings.ts` have their own test files.

Everything compares **sets of pitch classes** (integers 0-11), never raw MIDI note numbers, which is what makes octave, order, inversion and doubling irrelevant by construction. The one exception is inversion handling, which reads the lowest MIDI note before the set collapse.

Components are presentational and props-down (`StatsPanel`, `ProgressChart`, `MasteryGrid` take aggregates and render them). They are auto-imported, so no explicit import is needed. `useTrainer.ts` is the orchestrator that wires theory, MIDI, synth, settings and stats together.

## Persistence

localStorage only, through `app/composables/useStorage.ts`. Keys are versioned (`triadtrainer.attempts.v1`, `triadtrainer.sessions.v1`, `triadtrainer.settings.v1`, `triadtrainer.days.v1`) with a legacy `subito.*` fallback on read.

The migration strategy is **additive optional fields plus a filter-on-read type guard**, not a key bump. Adding a field to `Attempt` means widening `isAttempt` to accept it as optional; old rows survive, new rows carry the field. Bump the key only on a genuinely incompatible reshape.

## Conventions

- Dark-only. `colorMode: false` and `class="dark"` are pinned; do not add a light palette.
- Two generated colors: `primary` is `lamp` (amber), `neutral` is `gear` (brown). They are defined in `app/app.config.ts` and `app/assets/css/main.css`. Reach for `var(--color-lamp)` in SVG and inline styles rather than introducing a new hue.
- Typography: Instrument Serif for the big chord name, IBM Plex Sans for body, IBM Plex Mono for every readout, label and control. Numbers get `tabular-nums`.
- The `gap-px bg-accented` over `bg-elevated` children trick is how the hairline grids in `StatsPanel` are drawn.
- Comments explain why, not what. Match the existing density.

## Gotchas

- **Never add a `Permissions-Policy` header**, in `nuxt.config.ts`, a `vercel.json` or `nitro.routeRules`. Anything more restrictive than the default silently kills `navigator.requestMIDIAccess()` in production.
- `app/pages/index.vue` wraps the board in `<ClientOnly>` because MIDI, Web Audio, localStorage and `performance.now()` have no SSR equivalent. Keep it that way.
- The on-screen keyboard spans two octaves, C4 to B5 (MIDI 60-83). Voicings above 83 cannot be drawn.
- Lamps are keyed by **pitch class**, not by note: `PianoKeyboard` calls `lampFor(pitchClass)`, so both octaves of a pitch class always light together. Showing one exact voicing is not possible without reworking that API.
- The drill has three exercises, triads, scales and notes. Notes writes on a staff through `StaffDiagram`, which the Reading lesson shares. A `StaffNote` is a clef, a diatonic position and an optional sharp or flat, and it is still graded by pitch class.
- A line of notes stays inside one hand position and writes each staff height one way. That is what gives it a fingering and what keeps it readable without natural signs, so keep both when touching `pickStaffLine` or `staffRun`.
- `quality`, `order` and `whiteRootsOnly` are kept per tab in `settings.perTab`. The flat fields are the live values for the open tab and `withTab` swaps them on a switch, so change tabs through it rather than by setting `mode` or `exercise` directly.
- Synth output never feeds back into the played-notes set, so audio playback cannot trigger validation.
- `useSynth` plays recorded piano samples from `public/piano` (CC BY 3.0, see the NOTICE there) and falls back to a synthesised voice whenever they haven't loaded or can't be fetched. Keep the fallback: the drill has to make a sound offline. Samples are decoded through an `OfflineAudioContext`, which needs no user gesture, so they are ready before the first keypress.
