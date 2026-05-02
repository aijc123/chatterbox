/**
 * 直播间专属烂梗库注册表。
 *
 * chatterbox 默认从 LAPLACE 的 `workers.vrp.moe/laplace/memes` 拉烂梗，对所有
 * 直播间通用。但有些主播社区（如灰泽满直播间）有自建的梗库 API。这里登记
 * 这些专属梗源，按 roomId 触发：当观众进入注册过的直播间时，烂梗库 UI 会
 * 同时拉 LAPLACE 与该专属源，并启用"智能辅助驾驶"面板。
 *
 * 想加新房间——只需在 DEFAULT_MEME_SOURCES 加一条配置即可，不必动逻辑代码。
 * 未来可加用户面板让用户自配置（持久化在 GM 存储），目前先内置已知房间。
 */

export interface MemeSource {
  /** 直播间号（real room id），用作注册表 key 时也是 string 形式。 */
  roomId: number
  /** 显示名，例如 "灰泽满烂梗库"。 */
  name: string
  /** 列表 endpoint。预期支持 `?page=N&per_page=M` 分页，返回 JSON 数组或包裹对象。 */
  listEndpoint: string
  /** 随机一条 endpoint，可选。当列表 endpoint 拉空时降级使用。 */
  randomEndpoint?: string
  /** 默认勾选的 tag 列表（智驾启动时自动启用）。 */
  defaultTags?: string[]
  /**
   * 启发式选梗用：弹幕命中正则 → 优先选带这个 tag 的梗。
   * 顺序敏感，命中第一条即返回。
   */
  keywordToTag?: Record<string, string>
  /**
   * 公屏出现这些关键词（任一正则命中）时，60s 内不再发智驾弹幕。
   * 用来配合主播 / 房管的"够了""停一下""别刷了"指令。
   */
  pauseKeywords?: string[]
  /** sbhzm.cn 风格的"提交新梗"页 URL（点贡献按钮时打开）。可选。 */
  submitPage?: string
}

/**
 * 内置梗源——按 roomId 字符串索引。
 *
 * 添加新梗源指南：
 * 1. 找到该社区的烂梗 API（必须支持 GET，最好支持 ?page&per_page 分页）
 * 2. 在下面加一条配置
 * 3. 在 vite.config.ts 的 `connect` 列表加上对应域名
 * 4. 测试：进入对应直播间 → 烂梗库面板应自动出现该梗源
 */
export const DEFAULT_MEME_SOURCES: Record<string, MemeSource> = {
  // 灰泽满（sbhzm = 傻逼灰泽满，社区自嘲名）
  // keywordToTag 里 tag 名必须严格等于 sbhzm 后端 /api/public/tags 返回的 name；
  // 否则智驾"匹配关键词→选 tag"和上传"自动预选 tag"都会落空。
  // 实际站点 tag（2026-05 抓取）：
  //   喷灰泽满 / 爱灰泽满 / 群魔乱舞 / 打Call / 原话 / 暖男 / 黄桃 / 区 / 茶 / 富 /
  //   喷绿冻 / 直播间互喷 / 满爸 / 满弟 / 东野圭吾 / 文学 / 丈育 / 同事 / 老弥 /
  //   hololive / nijisanji
  '1713546334': {
    roomId: 1713546334,
    name: '灰泽满烂梗库',
    listEndpoint: 'https://sbhzm.cn/api/public/memes',
    randomEndpoint: 'https://sbhzm.cn/api/public/memes/random',
    defaultTags: ['满弟', '喷绿冻', '老弥'],
    keywordToTag: {
      '冲耳朵|耳朵痛|实习医生|医生|住院|医院': '满弟',
      '绿冻|绿茬|喷.*绿|路人.*骂': '喷绿冻',
      '困|睡|累|休息|床|被子|起床': '老弥',
      '可爱|心动|心疼|爱.*(?:灰|满)|宝贝|乖': '爱灰泽满',
      '傻逼|讨厌|喷.*(?:灰|满)|骂.*(?:灰|满)|烦死|滚': '喷灰泽满',
      '茶|奶茶|龙井|绿茶': '茶',
      '富|有钱|sc|大哥|舰长|豪|订阅': '富',
      '原话|刚.*说|刚才.*说|你.*说.*过': '原话',
      '黄桃|罐头': '黄桃',
      '丈育|文盲|不识字': '丈育',
      'hololive|holo|宝钟|姫|崎波': 'hololive',
      'nijisanji|彩虹社|niji|社团': 'nijisanji',
      '东野圭吾|侦探|推理|嫌疑人': '东野圭吾',
      '同事|公司|周报|加班|上班': '同事',
      '满爸|爸爸|父亲': '满爸',
      '群魔乱舞|聚众|互喷|对骂': '群魔乱舞',
    },
    pauseKeywords: ['歇歇', '够了', '别刷了', '刷够了', '烦', '不要刷', '停一下'],
    submitPage: 'https://sbhzm.cn/submit',
  },
}

/**
 * 返回当前房间的梗源配置。
 * @returns 找到则返回 MemeSource，否则返回 null（这是大多数房间的情况）。
 */
export function getMemeSourceForRoom(roomId: number | null | undefined): MemeSource | null {
  if (roomId == null) return null
  return DEFAULT_MEME_SOURCES[String(roomId)] ?? null
}

/** 给定房间是否有专属梗源。 */
export function hasMemeSourceForRoom(roomId: number | null | undefined): boolean {
  return getMemeSourceForRoom(roomId) !== null
}
