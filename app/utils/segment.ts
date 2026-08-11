/**
 * Shared `ui` overrides that turn a URadioGroup into a segmented control.
 * These are choices rather than panels, so they stay radio groups semantically
 * and only borrow the look.
 */
export const SEGMENT_UI = {
  legend: 'mb-1.5 font-mono text-[11px] font-normal text-legend',
  fieldset: 'w-full gap-1',
  // The card variant is generously padded by default; the panel is meant to
  // stay quiet next to the keyboard, so it gets tightened here.
  item: 'flex-1 items-center justify-center rounded-md px-2 py-1',
  wrapper: 'w-auto ps-0',
  label: 'font-mono text-[11px]'
} as const
