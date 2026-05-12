// Step ③ 变体归一化（拼音反查层）
//
// Chatfilter Python 端这一层做两件事：
//   1. Layer 1：变体字典精确全文匹配（含拉丁如 "niubi"、"yyds"）
//   2. Layer 2：用 pypinyin 把输入文本和 canonical 都转成带声调的拼音串，
//              输入命中 canonical 拼音 → 替换
//
// chatterbox 侧的取舍：
//   - Layer 1 已经被 alias-ac.ts 完全吃掉（YAML 里的 variant 自然包括了
//     "niubi"/"yyds"/"南亭" 这类）。
//   - Layer 2 需要 `pinyin-pro`（~30 KB gz）。M1 不接入，仅占位；用户开
//     `chatfilterAggressiveness = 'aggressive'` 时再走这条路。这样 M1 可以
//     在不引新依赖的情况下提供 80%+ 的归一化收益。
//
// 当前 `applyPinyin()` 是 identity，并附一个 `_pinyinEnabledForTests` 占位
// 给未来对接 pinyin-pro 用。等真接上 pinyin-pro 时，这里要做的事：
//   1. 在 build-variants.mjs 里预计算每个 canonical 的拼音串 → 写进 variants.gen.ts
//   2. 运行期 import pinyin-pro，把 input 转成同样格式的拼音串
//   3. 在 input 拼音 = 某 canonical 拼音时（且 input 不已经是该 canonical），替换

export interface PinyinResult {
  result: string
  /** 通过拼音反查命中的 (input → canonical) 替换数。 */
  pinyinHits: number
}

export function applyPinyin(text: string): PinyinResult {
  // 占位：M1 不开启拼音层；返回原文。
  return { result: text, pinyinHits: 0 }
}

/** 给未来的 pinyin-pro 接入留的开关；M1 永远是 false。 */
export const PINYIN_LAYER_READY = false
