// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // The templates group related attributes on one line on purpose.
    'vue/max-attributes-per-line': 'off'
  }
})
