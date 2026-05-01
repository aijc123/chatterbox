/**
 * Danmaku color entry from Bilibili API.
 */
export interface DanmakuColor {
  name: string
  color: string
  color_hex: string
  status: number
  weight: number
  color_id: number
  origin: number
}

/**
 * Group of danmaku colors.
 */
export interface DanmakuColorGroup {
  name: string
  sort: number
  color: DanmakuColor[]
}

/**
 * Danmaku display mode (scroll, bottom, top).
 */
export interface DanmakuMode {
  name: string
  mode: number
  type: string
  status: number
}

/**
 * Danmaku config payload (groups + modes).
 */
export interface DanmakuConfigData {
  group: DanmakuColorGroup[]
  mode: DanmakuMode[]
}

/**
 * API response wrapper for danmaku config.
 */
export interface DanmakuConfigResponse {
  code: number
  data: DanmakuConfigData
  message: string
  msg: string
}

/**
 * WBI signing keys extracted from Bilibili nav API.
 */
export interface BilibiliWbiKeys {
  img_key: string
  sub_key: string
}

export interface BilibiliEmoticon {
  emoji: string
  descript: string
  url: string
  emoticon_unique: string
  emoticon_id: number
  /**
   * Server-computed permission for the current user. `1` = sendable,
   * `0` = locked. Optional because older responses may omit it.
   */
  perm?: number
  /**
   * Required identity tier. Observed values include 1 总督, 2 提督, 3 舰长,
   * 4 粉丝团, 99 public.
   */
  identity?: number
  unlock_need_level?: number
  unlock_need_gift?: number
  unlock_show_text?: string
  unlock_show_color?: string
}

export interface BilibiliEmoticonPackage {
  pkg_id: number
  pkg_name: string
  pkg_type: number
  pkg_descript: string
  emoticons: BilibiliEmoticon[]
}

export interface BilibiliGetEmoticonsResponse {
  code: number
  data: {
    data: BilibiliEmoticonPackage[]
  }
}
