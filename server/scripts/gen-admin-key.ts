/**
 * 生成一个 admin token + 它的 sha-256 hash,打印出 SQL 命令供复制粘贴。
 *
 * 用法:
 *   bun scripts/gen-admin-key.ts [label]
 *
 * 然后:
 *   1) 把打印出来的 plaintext token 存到密码管理器(只此一次,不会再有)
 *   2) 把打印出来的 SQL 喂给 wrangler:
 *        wrangler d1 execute chatterbox-cloud --local  --command "<SQL>"   # 本地
 *        wrangler d1 execute chatterbox-cloud --remote --command "<SQL>"   # 生产
 *   3) 在 admin UI(/admin)粘贴 plaintext token 登录
 */

import { webcrypto as crypto } from 'node:crypto'

const label = process.argv[2] ?? 'owner'

const bytes = new Uint8Array(32)
crypto.getRandomValues(bytes)
const plaintext = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')

const enc = new TextEncoder()
const hashBuf = await crypto.subtle.digest('SHA-256', enc.encode(plaintext))
const keyHash = [...new Uint8Array(hashBuf)].map(b => b.toString(16).padStart(2, '0')).join('')

console.log('=== chatterbox-cloud admin token ===')
console.log(`label:      ${label}`)
console.log(`plaintext:  ${plaintext}`)
console.log(`key_hash:   ${keyHash}`)
console.log('')
console.log('SQL to insert (copy below into wrangler d1 execute):')
console.log('-----------------------------------------------------')
console.log(`INSERT INTO api_keys (label, key_hash, scopes) VALUES ('${label}', '${keyHash}', 'admin');`)
console.log('-----------------------------------------------------')
console.log('')
console.log('Plaintext token will not be shown again. Save it now.')
