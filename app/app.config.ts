export default defineAppConfig({
  ui: {
    colors: {
      // Both scales live in assets/css/main.css. `gear` is the studio brown
      // palette, so every semantic surface resolves to it.
      primary: 'lamp',
      neutral: 'gear'
    },
    card: {
      slots: {
        root: 'divide-none',
        // `sm:px-4` keeps the header aligned with the body, which drops to
        // `sm:p-4` below.
        header: 'pb-0 sm:px-4',
        title: 'font-mono text-[10px] font-normal tracking-[0.18em] text-muted uppercase',
        body: 'sm:p-4'
      },
      variants: {
        variant: {
          subtle: {
            root: 'ring-accented bg-elevated'
          }
        }
      },
      defaultVariants: {
        variant: 'subtle'
      }
    }
  }
})
