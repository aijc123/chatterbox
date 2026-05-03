/**
 * 客户端用的轻量内容指纹,用于"两段文本是否实质相同"的去重判断。
 *
 * 跟服务端 `server/src/lib/hash.ts` 的 normalizeContent 行为一致,但**没有 sha**:
 * 我们只是在前端做集合查找(看 candidate 文本是否已在烂梗库),不需要密码学
 * 强度。直接拿规整后的字符串当 Map/Set key 就够用。
 *
 * 共享给 cb-backend-client(用作 mirror 推送的会话级去重)和
 * meme-contributor("已在库自动跳过"检测)。
 */
export function memeContentKey(s: string): string {
  return s
    .replace(/[​-‍﻿]/g, '') // ZWSP/ZWJ/ZWNJ/BOM
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase()
}
