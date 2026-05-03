import { useSignal } from '@preact/signals'

import { checkCbBackendHealth, getCbBackendBaseUrl } from '../../lib/cb-backend-client'
import { BASE_URL } from '../../lib/const'
import { cbBackendEnabled, cbBackendUrlOverride } from '../../lib/store-meme'

const SECTION_KEYWORDS = '梗库后端 chatterbox cloud cb 后端 自建 backend localhost'

/**
 * "梗库后端 (chatterbox-cloud)" 设置区块。
 *
 * Phase A:开关 + 开发用 URL 覆盖 + 健康检查按钮。开关默认 off,打开后烂梗库
 * 列表会同时拉一份 chatterbox-cloud 的源,Phase A 只有 3 条写死样例。
 *
 * Phase B/C 会在这里加上"提交贡献时调后端而非 sbhzm.cn"等开关。
 */
export function CbBackendSection({ query = '' }: { query?: string }) {
  const probeMsg = useSignal('')
  const probing = useSignal(false)
  const visible = !query || SECTION_KEYWORDS.toLowerCase().includes(query)
  if (!visible) return null

  async function handleProbe() {
    probing.value = true
    probeMsg.value = '探测中...'
    const result = await checkCbBackendHealth()
    probing.value = false
    if (!result) {
      probeMsg.value = `❌ 不通: ${getCbBackendBaseUrl() || '(未配置)'}`
      return
    }
    probeMsg.value = `✅ 通: phase=${result.phase} cb=${result.upstreams.cb}`
  }

  return (
    <details className='cb-settings-accordion'>
      <summary>梗库后端 (chatterbox-cloud)</summary>
      <div className='cb-section cb-stack' style={{ margin: '.5em 0', paddingBottom: '1em' }}>
        <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.5em' }}>
          梗库后端 (chatterbox-cloud)
        </div>
        <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', marginBottom: '.5em' }}>
          自建第三方烂梗库。开启后,烂梗库列表会额外加载来自 chatterbox-cloud 的内容(带蓝色 C 徽章)。 Phase A 仅有 3
          条写死样例,Phase B/C 会接入真实社区贡献和上游聚合。
        </div>
        <label className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center' }}>
          <input
            type='checkbox'
            checked={cbBackendEnabled.value}
            onChange={e => {
              cbBackendEnabled.value = e.currentTarget.checked
            }}
          />
          <span>启用 chatterbox-cloud 梗源</span>
        </label>
        <div className='cb-stack' style={{ marginTop: '.5em', gap: '.25em' }}>
          <label htmlFor='cbBackendUrlOverride' style={{ color: '#666', fontSize: '0.85em' }}>
            后端 URL(开发用,留空走默认 {BASE_URL.CB_BACKEND})
          </label>
          <input
            id='cbBackendUrlOverride'
            type='url'
            placeholder='http://localhost:8787'
            value={cbBackendUrlOverride.value}
            style={{ width: '100%', fontSize: '12px' }}
            onInput={e => {
              cbBackendUrlOverride.value = e.currentTarget.value
            }}
          />
        </div>
        <div className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center', marginTop: '.5em' }}>
          <button className='cb-btn' onClick={handleProbe} disabled={probing.value} type='button'>
            {probing.value ? '探测中…' : '测试连通性'}
          </button>
          {probeMsg.value && <span style={{ fontSize: '0.85em' }}>{probeMsg.value}</span>}
        </div>
      </div>
    </details>
  )
}
