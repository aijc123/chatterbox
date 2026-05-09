/**
 * Pure positioning logic for the emoji picker popup.
 *
 * Lives outside the component so it can be unit-tested without a DOM —
 * `EmotePicker` calls `computePos(getBoundingClientRect(), innerWidth,
 * innerHeight)` and feeds the result straight into `style`.
 */

export interface PickerRect {
  top: number
  bottom: number
  left: number
  right: number
}

export interface PickerPos {
  top?: number
  bottom?: number
  left?: number
  right?: number
}

/** Picker popup width in CSS pixels. Kept here so positioning math agrees. */
export const PICKER_W = 320
/** Picker popup height in CSS pixels. */
export const PICKER_H = 360
/** Minimum gap between the picker and the viewport edges / its anchor. */
export const PICKER_GAP = 8
/** Vertical offset between the anchor button and the picker edge. */
export const ANCHOR_OFFSET = 4

/**
 * Vertical: prefer above the anchor (the composer sits at the bottom of the
 * chat panel), fall back to below when the viewport top doesn't have enough
 * headroom for `PICKER_H + PICKER_GAP`.
 *
 * Horizontal: anchor the picker's CENTER on the trigger button's center, then
 * clamp into the viewport with PICKER_GAP padding. Earlier we right-aligned
 * the picker to the trigger so it grew leftward — that put the popup ~300 px
 * away from the trigger when the trigger sat in a narrow right-edge panel,
 * making it look unrelated to the button you just clicked.
 *
 * Returned values are CSS pixel offsets ready to drop into `style.top` etc.
 * `top`/`bottom` are mutually exclusive, as are `left`/`right`.
 */
export function computePos(rect: PickerRect | null, viewportWidth: number, viewportHeight: number): PickerPos {
  if (!rect) return { bottom: PICKER_GAP, right: PICKER_GAP }
  const pos: PickerPos = {}
  if (rect.top >= PICKER_H + PICKER_GAP) {
    pos.bottom = viewportHeight - rect.top + ANCHOR_OFFSET
  } else {
    pos.top = rect.bottom + ANCHOR_OFFSET
  }
  // Center horizontally on the anchor, then clamp to viewport. This keeps
  // the picker visually attached to whatever button opened it, regardless of
  // whether the panel sits in the page center or hugs the right edge.
  const anchorCenter = (rect.left + rect.right) / 2
  const idealLeft = anchorCenter - PICKER_W / 2
  const maxLeft = viewportWidth - PICKER_W - PICKER_GAP
  pos.left = Math.max(PICKER_GAP, Math.min(maxLeft, idealLeft))
  return pos
}
