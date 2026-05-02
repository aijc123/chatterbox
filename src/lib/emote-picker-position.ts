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
 * Horizontal: align right edges so the popup grows leftward off the button.
 * If that would clip the left viewport edge (anchor too far left), flip to
 * align left edges instead.
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
  if (rect.right - PICKER_W >= PICKER_GAP) {
    pos.right = Math.max(PICKER_GAP, viewportWidth - rect.right)
  } else {
    pos.left = Math.max(PICKER_GAP, rect.left)
  }
  return pos
}
