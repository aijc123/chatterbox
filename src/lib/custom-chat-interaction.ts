export function prepareChatButton(button: HTMLButtonElement, title: string): void {
  button.type = 'button'
  button.title = title
  button.setAttribute('aria-label', title)
}

export function normalizeWheelDelta(event: WheelEvent): number {
  const unit =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 180 : 1
  const delta = event.deltaY * unit
  if (!Number.isFinite(delta) || delta === 0) return 0
  return Math.max(-140, Math.min(140, delta))
}
