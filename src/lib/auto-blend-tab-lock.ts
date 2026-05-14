/**
 * Cross-tab mutex for auto-blend (自动跟车).
 *
 * 问题：用户在 Chrome 里开两个 tab 同时进入同一个直播间 + 同时开自动跟车,
 * 两个 tab 的 auto-blend.ts 模块完全独立(trendMap / cooldownUntil / isSending
 * 都是模块级全局),会同时命中阈值 → 两 tab 同时发送 → B 站服务端按账号
 * 维度看到双倍频率 → 风控甚至封号。用户根本不知道是 tab 数量造成的。
 *
 * 解法：用 navigator.locks 在 `(roomId)` 维度抢一把锁。同账号同房间只允许
 * 一个 tab 持锁,持锁的 tab 才允许真正启动跟车 runtime;没抢到锁的 tab 把
 * 自动跟车开关关掉并提示"已被另一个 tab 占用"。
 *
 * 兼容性：navigator.locks 在 Chrome 69+ / Edge 79+ / Firefox 96+ / Safari 15.4+
 * 都有。README 声明的主线浏览器矩阵（Chrome/Edge ≥ 105, Firefox ≥ 110,
 * Safari ≥ 15.1）基本覆盖，唯独 Safari 15.1-15.3 缺；不支持时函数走 fallback
 * 路径(直接返回 acquired=true,相当于不做互斥,行为退回到本次实施前)。
 *
 * 设计要点：
 * - `navigator.locks.request(name, { ifAvailable: true }, callback)` 在锁可用时
 *   立刻调用 callback;不可用时立刻调用 callback(null)。这是 non-blocking。
 * - 要持锁不放,callback 必须返回一个永不 resolve 的 Promise——它的 resolve
 *   函数被我们存起来,stopAutoBlend 时调用它就释放锁。
 * - lock name 用 `chatterbox-autoblend-room-${roomId}`。账号维度其实更准
 *   （别人 cookie 跟你共享 IP 但是不同账号是 OK 的）,但脚本启动时不一定
 *   能立刻拿到 uid;roomId 是同账号同房间互斥的好近似,误锁的代价只是"另一
 *   个 tab 用别的账号也不能在这个房间跟车",可接受。
 *
 * 测试隔离：测试环境（bun + jsdom-ish）通常没有 navigator.locks 实现。
 * `tryAcquireAutoBlendLock` 检测到没有就直接 resolve `true`,等同于"没人在抢
 * 我，单 tab 行为照旧"。
 */

let releaser: (() => void) | null = null
let currentLockName: string | null = null

interface LocksLike {
  request: (
    name: string,
    options: { ifAvailable: boolean },
    callback: (lock: unknown | null) => Promise<void> | void
  ) => Promise<unknown>
}

function getLocksApi(): LocksLike | null {
  if (typeof navigator === 'undefined') return null
  const locks = (navigator as unknown as { locks?: LocksLike }).locks
  if (!locks || typeof locks.request !== 'function') return null
  return locks
}

/**
 * 试图为 `roomId` 加锁。成功返回 true,失败（被别的 tab 持有）返回 false。
 * 不支持 navigator.locks 的环境直接返回 true（退化到 pre-mutex 行为）。
 *
 * 内部维护一个 module-level releaser:释放靠 releaseAutoBlendLock()。重复
 * 调用 acquire 时如果已经持有锁,先释放老的再重抢——避免房间切换时孤儿锁。
 */
export async function tryAcquireAutoBlendLock(roomId: number): Promise<boolean> {
  const locks = getLocksApi()
  if (!locks) return true

  const lockName = `chatterbox-autoblend-room-${roomId}`
  if (releaser && currentLockName === lockName) {
    // Already holding the same lock — idempotent.
    return true
  }
  if (releaser) {
    // Holding a different room's lock; release before grabbing the new one.
    releaseAutoBlendLock()
  }

  return new Promise<boolean>(resolve => {
    void locks.request(lockName, { ifAvailable: true }, lock => {
      if (!lock) {
        resolve(false)
        return undefined
      }
      // Lock acquired. Resolve outer with true, then return a never-resolving
      // promise so the lock stays held until releaser() is called.
      resolve(true)
      currentLockName = lockName
      return new Promise<void>(release => {
        releaser = () => {
          release()
          releaser = null
          currentLockName = null
        }
      })
    })
  })
}

/** Release the held auto-blend lock (no-op if none held). Safe to call multiple times. */
export function releaseAutoBlendLock(): void {
  releaser?.()
}

/** Test seam: force-clear lock state without touching navigator.locks. */
export function _resetAutoBlendLockForTests(): void {
  releaser = null
  currentLockName = null
}
