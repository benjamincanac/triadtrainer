<template>
  <!--
    Three keys with lit feet: the root solid, the third and fifth soft. Same
    colour hierarchy the diagrams use, so the mark is a miniature of what the
    app shows you. The lamp is the full width of the key rather than a dot,
    because a dot disappears at 16px. Black keys are left out for the same reason.
  -->
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="trainer-mark-key-1">
        <rect x="1" y="2" width="6" height="20" rx="1.5" />
      </clipPath>
      <clipPath id="trainer-mark-key-2">
        <rect x="9" y="2" width="6" height="20" rx="1.5" />
      </clipPath>
      <clipPath id="trainer-mark-key-3">
        <rect x="17" y="2" width="6" height="20" rx="1.5" />
      </clipPath>
    </defs>

    <rect x="1" y="2" width="6" height="20" rx="1.5" fill="var(--color-ivory)" />
    <rect x="9" y="2" width="6" height="20" rx="1.5" fill="var(--color-ivory)" />
    <rect x="17" y="2" width="6" height="20" rx="1.5" fill="var(--color-ivory)" />

    <rect
      x="1"
      y="15"
      width="6"
      height="7"
      fill="var(--color-lamp)"
      clip-path="url(#trainer-mark-key-1)"
    />
    <rect
      x="9"
      y="15"
      width="6"
      height="7"
      fill="var(--color-lamp-soft)"
      clip-path="url(#trainer-mark-key-2)"
    />
    <rect
      x="17"
      y="15"
      width="6"
      height="7"
      fill="var(--color-lamp-soft)"
      clip-path="url(#trainer-mark-key-3)"
    />
  </svg>
</template>
