/**
 * 内容指纹与 token hash。
 *
 * `normalizeContent` 把肉眼"等同"的两条梗压到同一个 hash:
 *  - 小写化(英文)
 *  - 把所有 Unicode 空白(含全角空格)折叠成单空格
 *  - 去掉零宽字符(ZWSP/ZWJ/ZWNJ/BOM)
 *  - 首尾 trim
 *
 * 故意保留繁简差异和半角/全角标点 —— 这两类常被刷梗者用来"伪造新梗"。
 *
 * Phase C 跨源去重也复用这个函数 —— 别在别处再写一份归一。
 */
export function normalizeContent(s: string): string {
  return s
    .replace(/[​-‍﻿]/g, '') // 零宽
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase()
}

const enc = new TextEncoder()

async function digest(algo: 'SHA-1' | 'SHA-256', data: string): Promise<string> {
  const buf = await crypto.subtle.digest(algo, enc.encode(data))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** 内容 hash:用于 memes.content_hash 唯一索引。SHA-1 对去重用足够,且短 12 字节省存储。 */
export function contentHash(content: string): Promise<string> {
  return digest('SHA-1', normalizeContent(content))
}

/** Token hash:用于 api_keys.key_hash。SHA-256 对鉴权该用强 hash。 */
export function tokenHash(plaintext: string): Promise<string> {
  return digest('SHA-256', plaintext)
}

/**
 * IP 防 PII 化:存 sha256(ip + salt)。salt 应来自环境变量(非密钥级,但避免彩虹表)。
 * 即便 salt 泄露,知道明文 IP 也只能反查"这个 IP 是否提交过",而不会在数据库里
 * 直接看到一堆 IP。
 */
export function hashIp(ip: string, salt: string): Promise<string> {
  return digest('SHA-256', `${salt}|${ip}`)
}
