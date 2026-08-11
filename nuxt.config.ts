// Web MIDI is gated by the `midi` permission policy. It defaults to `self`,
// which is what we want — do NOT add a Permissions-Policy header here, in a
// vercel.json, or in nitro.routeRules. Anything more restrictive silently kills
// navigator.requestMIDIAccess() in production and the app falls back to clicks.
export default defineNuxtConfig({
  // @nuxt/ui registers the Tailwind Vite plugin and @nuxt/fonts itself, so
  // neither needs its own entry here.
  modules: ['@nuxt/eslint', '@nuxt/ui'],

  devtools: { enabled: false },

  ui: {
    // The app is dark-only and sets `class="dark"` in app.head, so the
    // colour-mode module has nothing to switch.
    colorMode: false,

    theme: {
      // Only `primary` is used. The default also generates secondary, success,
      // info, warning and error, none of which this app references. `neutral`
      // is always present and isn't listed here.
      colors: ['primary']
    },

    experimental: {
      // Emit CSS only for the handful of components actually used.
      componentDetection: true
    }
  },

  app: {
    head: {
      // `dark` is permanent: the app is a piece of gear, not a document, and
      // has no light mode.
      htmlAttrs: { lang: 'en', class: 'dark' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'Triad trainer',
      meta: [
        { name: 'theme-color', content: '#16130F' },
        { name: 'color-scheme', content: 'dark' },
        {
          name: 'description',
          content: 'Drill major and minor triads on a MIDI keyboard. Reaction time, streaks and per-session progress, all client-side.'
        }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },

  css: ['~/assets/css/main.css'],

  fonts: {
    families: [
      { name: 'Instrument Serif', provider: 'google' },
      { name: 'IBM Plex Sans', provider: 'google' },
      { name: 'IBM Plex Mono', provider: 'google' }
    ]
  },

  compatibilityDate: 'latest'
})
