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
 * Position the picker relative to its trigger button.
 *
 * Two modes:
 *
 * **Centered-above mode (default)**: trigger is somewhere in the page; place
 * picker above (or below, if no headroom) with horizontal center on the
 * trigger, clamped to viewport.
 *
 * **Flank-panel mode (when `flankRect` is provided)**: the trigger sits inside
 * a panel that takes up its own column on the right edge of the viewport.
 * Centering on the trigger would put the picker half inside the panel — which
 * either overlaps (z-index war) or gets clipped (panel covers half the
 * picker). Instead, place the picker to the LEFT of the panel, vertically
 * aligned with the trigger so the user's eyes scan leftward from the button
 * they just clicked. This is how iOS popovers behave when their anchor sits
 * inside a sidebar.
 *
 * Flank mode falls back to centered-above when there isn't enough horizontal
 * room to the left of the panel (e.g. narrow viewport). Better to overlap
 * than to push the picker off-screen.
 *
 * Returned values are CSS pixel offsets ready to drop into `style.top` etc.
 * `top`/`bottom` are mutually exclusive, as are `left`/`right`.
 */
export function computePos(
  rect: PickerRect | null,
  viewportWidth: number,
  viewportHeight: number,
  /**
   * The bounding rect of a panel that *contains* the trigger button and
   * occupies its own horizontal band (e.g. the chatterbox dialog or the custom
   * chat composer). When provided AND there's room to the left, the picker is
   * placed adjacent to this rect rather than centered on the trigger — this
   * avoids the picker overlapping with the panel that holds its own trigger.
   */
  flankRect?: PickerRect | null
): PickerPos {
  if (!rect) return { bottom: PICKER_GAP, right: PICKER_GAP }

  // Flank mode: try to place picker to the left of the panel.
  if (flankRect) {
    const leftRoom = flankRect.left - PICKER_GAP * 2
    if (leftRoom >= PICKER_W) {
      const pos: PickerPos = {}
      // Vertical: align picker's vertical center with anchor center, clamped
      // to viewport. Keeps the picker "in the same band" as the button — the
      // user scans leftward from the trigger and hits the picker.
      const anchorCenter = (rect.top + rect.bottom) / 2
      const idealTop = anchorCenter - PICKER_H / 2
      const maxTop = viewportHeight - PICKER_H - PICKER_GAP
      pos.top = Math.max(PICKER_GAP, Math.min(maxTop, idealTop))
      // Horizontal: right-anchor the picker so its right edge sits just left
      // of the panel.
      pos.right = viewportWidth - flankRect.left + PICKER_GAP
      return pos
    }
    // Fall through to centered-above when there's no horizontal room. Picker
    // will overlap the panel but at least stays on screen — the caller is
    // expected to bump z-index so the picker wins the overlap in that case.
  }

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
