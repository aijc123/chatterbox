// Step ① 基础清洗 —— TS 移植自 Chatfilter `preprocessor.py`。
//
// 只做确定性清洗；模糊的（"哈哈哈哈" 是不是水）留给后续 stage。
// 返回 null = 文本应被丢弃（filtered = true）。

/** 控制字符（Cc + Cf + Cs + Co + Cn）但 \n\r\t 保留。 */
const CONTROL_RE = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}]/gu
const WHITESPACE_RE = /\s+/gu
const ASCII_DIGITS_RE = /^[0-9]+$/

export interface PreprocessOptions {
  /** 字符数下限（含），默认 1。 */
  minLen?: number
  /** 字符数上限（含），默认 128。 */
  maxLen?: number
}

/**
 * 入口：原始弹幕 → 清洗后文本 / null。
 *
 * 注意"字符数"的定义：用 spread + length 走 code-point 数（而非 UTF-16 code
 * unit），保证 emoji 等多字节字符按 1 计。与 Python `len(str)` 等价于 code
 * point 数（Python 3 str 是 code point 序列）。
 */
export function basicCleanse(text: unknown, opts: PreprocessOptions = {}): string | null {
  const minLen = opts.minLen ?? 1
  const maxLen = opts.maxLen ?? 128

  if (typeof text !== 'string' || text.length === 0) return null

  // 1. 控制字符移除（保留 \n\r\t）
  let out = text.replace(CONTROL_RE, ch => (ch === '\n' || ch === '\r' || ch === '\t' ? ch : ''))

  // 2. NFKC：全角→半角、合字→分字、上标→普通
  out = out.normalize('NFKC')

  // 3. 折叠空白 + 去首尾
  out = out.replace(WHITESPACE_RE, ' ').trim()
  if (!out) return null

  // 4. 纯数字 >4 字过滤（"12345" 是噪音, "666" 是梗保留）
  if (ASCII_DIGITS_RE.test(out) && out.length > 4) return null

  // 5. 长度边界（按 code point 数）
  const codePointLen = [...out].length
  if (codePointLen < minLen || codePointLen > maxLen) return null

  return out
}
