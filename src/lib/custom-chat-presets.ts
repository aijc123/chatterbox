export const MILK_GREEN_IMESSAGE_CSS = `/* Chatterbox 奶绿 iMessage × Laplace 气泡 */
@import url('https://fonts.googleapis.com/css2?family=Jost:wght@400;600;700;800&display=swap');

@layer chatterbox-custom-css {
  #laplace-custom-chat {
    --lc-chat-font: 'Jost', -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
    --lc-chat-bg: #eef7f1;
    --lc-chat-panel: rgba(248, 253, 249, .86);
    --lc-chat-border: rgba(63, 103, 79, .15);
    --lc-chat-text: #1e3427;
    --lc-chat-muted: #6d8273;
    --lc-chat-name: #248a61;
    --lc-chat-bubble: #f7fff9;
    --lc-chat-bubble-text: #213d2b;
    --lc-chat-own: #2f9b70;
    --lc-chat-own-text: #fff;
    --lc-chat-chip: rgba(78, 141, 104, .14);
    --lc-chat-chip-text: #21422f;
    --lc-chat-accent: #34c759;
    --lc-chat-shadow: rgba(36, 74, 48, .16);
    --lc-chat-bubble-shadow: 0 1px 1px rgba(36, 74, 48, .05), 0 8px 22px rgba(36, 74, 48, .12);
    --lc-chat-lite: rgba(116, 159, 131, .16);
    --lc-chat-lite-text: #58715f;
    --lc-chat-medal-bg: #f7e7a8;
    --lc-chat-medal-text: #5c4210;
    --lc-chat-guard-bg: #c8ddfc;
    --lc-chat-guard-text: #1d4b86;
    --lc-chat-admin-bg: #d7ebff;
    --lc-chat-admin-text: #075d9a;
    --lc-chat-rank-bg: #ffe4a1;
    --lc-chat-rank-text: #704400;
    --lc-chat-ul-bg: #e6dcfa;
    --lc-chat-ul-text: #543579;
    --lc-chat-honor-bg: #d8f1df;
    --lc-chat-honor-text: #1d633c;
    --lc-chat-price-bg: #ffe0cc;
    --lc-chat-price-text: #7f3516;
    --lc-event-text: #213d2b;
    --lc-event-bg: #f1fbf5;
    --lc-gift-bg: linear-gradient(135deg, #ffe0cc, #fff3cd);
    --lc-gift-text: #4a2618;
    --lc-superchat-bg: linear-gradient(135deg, #2f80ed, #47d18c);
    --lc-superchat-text: #fff;
    --lc-guard-3-bg: linear-gradient(135deg, #c8ddfc, #d8f1df);
    --lc-guard-2-bg: linear-gradient(135deg, #e9ccf0, #d8f1df);
    --lc-guard-1-bg: linear-gradient(135deg, #ffd7c2, #f5e19e);
    --lc-redpacket-bg: linear-gradient(135deg, #ffb3bd, #ffe6a7);
    --lc-lottery-bg: linear-gradient(135deg, #bde5d1, #c8ddfc);
  }

  #laplace-custom-chat,
  #laplace-custom-chat * {
    font-family: var(--lc-chat-font);
  }

  #laplace-custom-chat .lc-chat-list {
    background-image:
      linear-gradient(45deg, rgba(255,255,255,.46) 25%, transparent 25%),
      linear-gradient(-45deg, rgba(255,255,255,.46) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, rgba(255,255,255,.46) 75%),
      linear-gradient(-45deg, transparent 75%, rgba(255,255,255,.46) 75%);
    background-size: 18px 18px;
    background-position: 0 0, 0 9px, 9px -9px, -9px 0;
    -webkit-mask-image: linear-gradient(to bottom, transparent, #000 24px, #000 calc(100% - 24px), transparent);
    mask-image: linear-gradient(to bottom, transparent, #000 24px, #000 calc(100% - 24px), transparent);
  }

  #laplace-custom-chat .lc-chat-message {
    transition: .24s color ease, .24s background-color ease, .24s opacity ease;
  }

  #laplace-custom-chat .lc-chat-avatar {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, .72), 0 2px 8px rgba(36, 74, 48, .16);
  }

  #laplace-custom-chat .lc-chat-name {
    color: #21976a;
    font-weight: 800;
    text-shadow: 0 0 2px rgba(238, 247, 241, .8);
  }

  #laplace-custom-chat .lc-chat-time {
    color: #7b8e82;
  }

  #laplace-custom-chat .lc-chat-bubble {
    color: var(--lc-event-text);
    background: var(--lc-event-bg);
    font-weight: 700;
    filter: drop-shadow(0 0 1px rgba(33, 61, 43, .24));
  }

  #laplace-custom-chat .lc-chat-bubble::before {
    background: var(--lc-event-bg);
    border-color: rgba(63, 103, 79, .12);
  }

  #laplace-custom-chat .lc-chat-reply {
    color: #15945f;
  }

  #laplace-custom-chat .lc-chat-medal {
    max-width: min(13em, 72%);
    text-shadow: none;
  }

  #laplace-custom-chat .lc-chat-badge[data-badge-type="medal"] {
    color: var(--lc-chat-medal-text);
    background: var(--lc-chat-medal-bg);
  }

  #laplace-custom-chat .lc-chat-badge[data-badge-type="guard"] {
    color: var(--lc-chat-guard-text);
    background: var(--lc-chat-guard-bg);
  }

  #laplace-custom-chat .lc-chat-badge[data-badge-type="admin"] {
    color: var(--lc-chat-admin-text);
    background: var(--lc-chat-admin-bg);
  }

  #laplace-custom-chat .lc-chat-badge[data-badge-type="rank"] {
    color: var(--lc-chat-rank-text);
    background: var(--lc-chat-rank-bg);
  }

  #laplace-custom-chat .lc-chat-badge[data-badge-type="ul"] {
    color: var(--lc-chat-ul-text);
    background: var(--lc-chat-ul-bg);
  }

  #laplace-custom-chat .lc-chat-badge[data-badge-type="honor"] {
    color: var(--lc-chat-honor-text);
    background: var(--lc-chat-honor-bg);
  }

  #laplace-custom-chat .lc-chat-badge[data-badge-type="price"] {
    color: var(--lc-chat-price-text);
    background: var(--lc-chat-price-bg);
  }

  #laplace-custom-chat .lc-chat-kind,
  #laplace-custom-chat .lc-chat-card-mark {
    color: #21422f;
    background: rgba(255, 255, 255, .5);
  }

  #laplace-custom-chat .lc-chat-card-event .lc-chat-bubble {
    min-width: min(18em, 100%);
    padding: 11px 15px;
    border-radius: 20px;
    border-bottom-left-radius: 8px;
    filter: drop-shadow(0 1px 2px rgba(36, 74, 48, .18));
  }

  #laplace-custom-chat .lc-chat-card-event .lc-chat-bubble::before {
    background: inherit;
  }

  #laplace-custom-chat .lc-chat-card-title {
    font-weight: 800;
  }

  #laplace-custom-chat .lc-chat-card-field {
    background: rgba(255, 255, 255, .42);
  }

  #laplace-custom-chat .lc-chat-card-field[data-field$="price"],
  #laplace-custom-chat .lc-chat-card-field[data-kind="money"] {
    color: #855118;
  }

  #laplace-custom-chat .lc-chat-card-field[data-field$="count"],
  #laplace-custom-chat .lc-chat-card-field[data-kind="count"] {
    color: #24523a;
  }

  #laplace-custom-chat .lc-chat-event-debug {
    color: #24523a;
    background: rgba(214, 239, 224, .92);
  }

  #laplace-custom-chat .lc-chat-card-event[data-card="gift"] .lc-chat-bubble {
    color: var(--lc-gift-text);
    background: var(--lc-gift-bg);
  }

  #laplace-custom-chat .lc-chat-card-event[data-card="superchat"] .lc-chat-bubble {
    color: var(--lc-superchat-text);
    background: var(--lc-superchat-bg);
  }

  #laplace-custom-chat .lc-chat-card-event[data-card="guard"] .lc-chat-bubble {
    color: #173b28;
    background: var(--lc-guard-3-bg);
  }

  #laplace-custom-chat .lc-chat-card-event[data-guard="2"] .lc-chat-bubble {
    color: #43205c;
    background: var(--lc-guard-2-bg);
  }

  #laplace-custom-chat .lc-chat-card-event[data-guard="1"] .lc-chat-bubble {
    color: #4d2318;
    background: var(--lc-guard-1-bg);
  }

  #laplace-custom-chat .lc-chat-card-event[data-card="redpacket"] .lc-chat-bubble {
    color: #4d2318;
    background: var(--lc-redpacket-bg);
  }

  #laplace-custom-chat .lc-chat-card-event[data-card="lottery"] .lc-chat-bubble {
    color: #173b28;
    background: var(--lc-lottery-bg);
  }

  #laplace-custom-chat .lc-chat-message[data-kind="follow"] .lc-chat-bubble,
  #laplace-custom-chat .lc-chat-message[data-kind="like"] .lc-chat-bubble,
  #laplace-custom-chat .lc-chat-message[data-kind="share"] .lc-chat-bubble,
  #laplace-custom-chat .lc-chat-message[data-kind="enter"] .lc-chat-bubble,
  #laplace-custom-chat .lc-chat-message[data-kind="notice"] .lc-chat-bubble,
  #laplace-custom-chat .lc-chat-message[data-priority="lite"] .lc-chat-bubble {
    color: #24523a;
    background: rgba(189, 229, 209, .72);
  }

  #laplace-custom-chat .lc-chat-actions {
    filter: drop-shadow(0 1px 2px rgba(36, 74, 48, .16));
  }

  #laplace-custom-chat .lc-chat-action,
  #laplace-custom-chat .lc-chat-send {
    color: #fff;
    background: #2f9b70;
  }

  #laplace-custom-chat .lc-chat-perf {
    color: #24523a;
    background: rgba(214, 239, 224, .8);
  }
}
`
