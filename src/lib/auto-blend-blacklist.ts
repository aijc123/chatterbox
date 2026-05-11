import { autoBlendMessageBlacklist, autoBlendUserBlacklist } from './store'

export function isAutoBlendBlacklistedUid(uid: string | null): boolean {
  return uid !== null && uid !== '' && uid in autoBlendUserBlacklist.value
}

/**
 * `true` when `text`（应当先 trim）出现在用户配置的文本黑名单里。
 *
 * 用 `Object.hasOwn`(而非 `in`)是关键安全点:键来自任意用户输入弹幕,
 * `in` 会顺着原型链找,导致"toString"、"constructor"、"valueOf" 这种
 * `Object.prototype` 上的内置属性名永远会被识别成黑名单项,默默地
 * 把所有正好叫这些名字的弹幕静默吞掉——即便用户的黑名单是空的。
 * 上游 chatterbox 16972c7 因此专门修过同一个坑。
 */
export function isAutoBlendBlacklistedText(text: string): boolean {
  if (!text) return false
  return Object.hasOwn(autoBlendMessageBlacklist.value, text)
}
