import tailwindcss from '@tailwindcss/vite'

// Web MIDI is gated by the `midi` permission policy. It defaults to `self`,
// which is what we want — do NOT add a Permissions-Policy header here, in a
// vercel.json, or in nitro.routeRules. Anything more restrictive silently kills
// navigator.requestMIDIAccess() in production and the app falls back to clicks.
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/fonts', 'shadcn-nuxt'],

  devtools: { enabled: false },

  app: {
    head: {
      // `dark` is permanent: shadcn-vue components style themselves through
      // `dark:` variants and the app has no light mode.
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

  compatibilityDate: 'latest',

  vite: {
    plugins: [tailwindcss()]
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui'
  }
})
