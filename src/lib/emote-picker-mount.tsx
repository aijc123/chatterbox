import { render } from 'preact'

import { SendActions } from '../components/send-actions'

/**
 * Mounts the SendActions Preact island into an arbitrary host element so the
 * imperative custom-chat composer (`custom-chat-dom.ts`) can embed the same
 * emoji picker / placeholder buttons without importing preact directly.
 *
 * Returns a teardown function that unmounts the island via `render(null,host)`,
 * which fires the picker's `useEffect` cleanups (document listeners, resize
 * listener). Callers MUST invoke the teardown in every composer remount path
 * to avoid leaking listeners.
 */
export function mountSendActionsIsland(host: HTMLElement, onSend: (msg: string) => void): () => void {
  render(<SendActions onSend={onSend} />, host)
  return () => {
    render(null, host)
  }
}
