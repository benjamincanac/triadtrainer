# Triad Trainer

A personal drill for major and minor triads on a MIDI keyboard. The app names a chord, you play it,
it validates and times you. Reaction time is the metric worth watching, not the score: the goal is
not working the chord out, it is knowing it immediately.

**Learn** covers the same 24 chords three ways: the four hand shapes they sort into, the three
inversions, and the scale each one comes from.

## Modes

**Drill** names a chord and times how long you take to play it. Turn on *Ask for inversions* and the
prompt names a voicing too, so `C major / 1st inversion` wants E at the bottom.

**Ear** plays a chord instead of naming one. Find it on the keyboard. `R` plays it again, and
listening twice costs you the time it costs you. A miss retries the same chord, so the name stays
hidden unless you turn on *Name the answer*.

**Explore** is free play. It names whatever you hold, with the inversion and the fingering for both
hands.

## Progress

A mastery grid shows all 24 chords by accuracy, so the weak ones are visible rather than remembered.
Underneath the timing readouts, a day streak counts consecutive days with at least one correct
answer, next to a daily target of 20. Everything is derived from the last 500 attempts, which makes
it recent form rather than a lifetime record.

## Sound

The keys play a real piano: fourteen samples from Alexander Holm's [Salamander Grand
Piano](https://archive.org/details/SalamanderGrandPianoV3) (CC BY 3.0), sitting a minor third apart
and pitched at most a semitone to reach the notes between them. They live in `public/piano`, about
500 KB, and decode in the background on load rather than waiting for a click. Until they land, and if
they never do, a synthesised voice covers every note, so the drill still works offline and on a
browser that refuses the fetch. See `public/piano/NOTICE.md`.

## Browser constraint

**Web MIDI only exists in Chromium** (Chrome, Edge, Arc, Brave). Firefox and Safari ship no
`navigator.requestMIDIAccess`, so there the on-screen keyboard is the input — click the keys, it
behaves identically. The app tells the three failure modes apart rather than lumping them into one
message: no API, permission refused, and no device connected each say something different.

Chromium prompts for MIDI permission on first use. If you refuse it, re-allow it in the site
settings next to the address bar and reload.

## Validation

Everything compares sets of pitch classes, never raw MIDI notes, so octave, order and inversion are
all irrelevant: C-E-G, G-C-E and E-G-C validate C major identically, and doubling a note changes
nothing.

Inversion drills are the one exception, and only a partial one. They still compare the same set,
then additionally check the lowest note you played. Everything above the bass stays as free as it
ever was.

## Running it

```bash
pnpm install
pnpm dev
```

`pnpm test` runs the theory suite, `pnpm lint` and `pnpm typecheck` the rest.

## Deploying

Push it and import the repo on Vercel. Nuxt's zero-config Vercel preset handles the build, there is
no `vercel.json` and there should not be one: any `Permissions-Policy` header would kill MIDI in
production. History lives in `localStorage`, so nothing is stored server-side and stats are per
browser.
