# Subito

A personal drill for major and minor triads on a MIDI keyboard. The app names a chord, you play it,
it validates and times you. Reaction time is the metric worth watching, not the score, which is what
the name is about: the goal is not working the chord out, it is knowing it immediately.

**Learn** covers the same 24 chords three ways: the four hand shapes they sort into, the three
inversions, and the scale each one comes from.

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
