/**
 * 过滤 chatterbox-cloud 后端返回的合并梗,保证当前房间不串房间。
 *
 * 处理两类:
 *  - `_source === 'sbhzm'`:仅当当前房间有专属梗源(目前只有灰泽满)时保留,否则丢弃。
 *  - `_source === 'laplace'`:**始终丢弃**。后端 `bulk-mirror` 没有按 roomId 分桶,
 *    所有用户从各自房间镜像的 LAPLACE 内容会汇集到同一个全局池;返回时也不按房间
 *    过滤,导致进入任意房间都会看到主播本人最常逛房间(典型是灰泽满)的 LAPLACE
 *    梗。客户端的修法:剥掉后端的 laplace 镜像,改由 memes-list 始终从 LAPLACE
 *    upstream 直拉当前房间的梗(并继续 mirror 推回去,留作未来后端按房间分桶)。
 *
 * `cb` 自建源(用户主动 POST /memes 提交)是有意全局共享的,保留。
 */
export function filterBackendMemesForRoom<T extends { _source?: string }>(
  items: readonly T[],
  hasRoomSpecificSource: boolean
): T[] {
  return items.filter(m => {
    if (m._source === 'laplace') return false
    if (m._source === 'sbhzm') return hasRoomSpecificSource
    return true
  })
}
