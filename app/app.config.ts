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
        header: 'sm:px-4 py-3',
        title: 'font-mono text-[10px] font-normal tracking-[0.18em] text-muted uppercase',
        body: 'sm:p-4'
      },
      variants: {
        variant: {
          subtle: {
            root: 'ring-accented bg-elevated divide-accented'
          }
        }
      },
      defaultVariants: {
        variant: 'subtle'
      }
    },
    tabs: {
      // A compound rather than a slot: the colour and size variants land after
      // the slots, so anything set there loses to `bg-primary` and `text-sm`.
      compoundVariants: [{
        color: 'primary',
        variant: 'pill',
        class: {
          // The keyboard is the loud element; a solid pill here competes with it.
          indicator: 'bg-primary/15',
          trigger: 'flex-1 font-mono text-xs data-[state=active]:text-primary'
        }
      }]
    }
  }
})
