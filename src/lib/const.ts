import { GM_info } from '$'

/**
 * Userscript version, sourced from the `// @version` header that
 * vite-plugin-monkey generates from `helper/package.json`. Importing
 * `GM_info` from `$` lets vite-plugin-monkey track the dependency and add
 * the matching `@grant`.
 */
export const VERSION = GM_info.script.version

/**
 * API endpoint URLs used by the script.
 */
export const BASE_URL = {
  /** Fetches room basic info. GET, param: id (room ID). */
  BILIBILI_ROOM_INIT: 'https://api.live.bilibili.com/room/v1/Room/room_init',

  /** Alternative room info endpoint. GET, param: room_id. Fallback when room_init fails. */
  BILIBILI_ROOM_INIT_ALT: 'https://api.live.bilibili.com/room/v1/Room/get_info',

  /** Resolve live room info by anchor UID. GET, param: mid. */
  BILIBILI_ROOM_INFO_BY_UID: 'https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld',

  /** Send chat. POST, params: web_location, w_rid, wts. */
  BILIBILI_MSG_SEND: 'https://api.live.bilibili.com/msg/send',

  /** Chat config. POST. */
  BILIBILI_MSG_CONFIG: 'https://api.live.bilibili.com/xlive/web-room/v1/dM/AjaxSetConfig',

  /** Get danmaku config by group. GET, params: room_id, web_location, w_rid, wts. */
  BILIBILI_GET_DM_CONFIG: 'https://api.live.bilibili.com/xlive/web-room/v1/dM/GetDMConfigByGroup',

  /** Get live WebSocket token and host list. GET, param: id (real room ID). */
  BILIBILI_DANMU_INFO: 'https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo',

  /** Get emoticons for a room. GET, params: platform, room_id. */
  BILIBILI_GET_EMOTICONS: 'https://api.live.bilibili.com/xlive/web-ucenter/v2/emoticon/GetEmoticons',

  /** All fan medals for a user. GET, param: target_id. */
  BILIBILI_MEDAL_WALL: 'https://api.live.bilibili.com/xlive/web-ucenter/user/MedalWall',

  /** Followed anchors for the logged-in account. GET, params: vmid, pn, ps. */
  BILIBILI_FOLLOWINGS: 'https://api.bilibili.com/x/relation/followings',

  /** Current viewer info in a live room. GET, param: room_id. */
  BILIBILI_ROOM_USER_INFO: 'https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByUser',

  /** Room silent list. Usually only available to anchors/admins. */
  BILIBILI_SILENT_USER_LIST: 'https://api.live.bilibili.com/xlive/web-ucenter/v1/banned/GetSilentUserList',

  LAPLACE_CHAT_AUDIT: 'https://edge-workers.laplace.cn/laplace/chat-audit',

  REMOTE_KEYWORDS: 'https://workers.vrp.moe/gh-raw/laplace-live/public/master/artifacts/livesrtream-keywords.json',

  LAPLACE_MEMES: 'https://workers.vrp.moe/laplace/memes',
  LAPLACE_MEME_COPY: 'https://workers.vrp.moe/laplace/meme-copy',
  BILIBILI_AVATAR: 'https://workers.vrp.moe/bilibili/avatar',
  BILIBILI_SUPERCHAT_ORDER: 'https://workers.vrp.moe/bilibili/live-create-order',
} as const

/**
 * Sentinel header that Chatterbox attaches to its own `/msg/send` requests so
 * the fetch hijack in `fetch-hijack.ts` can distinguish them from native
 * Bilibili UI sends and skip the duplicate verification path.
 */
export const CHATTERBOX_SEND_HEADER = 'X-Chatterbox-Send'
export const CHATTERBOX_SEND_VALUE = '1'
