import { probeAndUpdateCbBackendHealth } from '../../lib/cb-backend-client'
import { BASE_URL } from '../../lib/const'
import {
  cbBackendEnabled,
  cbBackendHealthDetail,
  cbBackendHealthState,
  cbBackendUrlOverride,
} from '../../lib/store-meme'
import { matchesSearchQuery } from './search'

const SECTION_KEYWORDS = '梗库后端 chatterbox cloud cb 后端 自建 backend localhost url 烂梗 LAPLACE SBHZM'

/**
 * "梗库后端 (chatterbox-cloud)" 设置区块。
 *
 * Phase A:开关 + 开发用 URL 覆盖 + 健康检查按钮。开关默认 off,打开后烂梗库
 * 列表会同时拉一份 chatterbox-cloud 的源,Phase A 只有 3 条写死样例。
 *
 * Phase B/C 会在这里加上"提交贡献时调后端而非 sbhzm.cn"等开关。
 *
 * 状态点:summary 行常驻显示 idle/probing/ok/fail —— 由
 * `app-lifecycle.ts → startCbBackendHealthProbe` 在启用开关或 URL 变化时
 * 自动写入,这里直接订阅 signal。
 */
function statusDotColor(state: typeof cbBackendHealthState.value): string {
  switch (state) {
    case 'ok':
      return '#34c759'
    case 'fail':
      return '#ff3b30'
    case 'probing':
      return '#ff9500'
    default:
      return '#c7c7cc'
  }
}

function statusLabel(state: typeof cbBackendHealthState.value): string {
  switch (state) {
    case 'ok':
      return '已连通'
    case 'fail':
      return '不通'
    case 'probing':
      return '探测中'
    default:
      return '未启用'
  }
}

export function CbBackendSection({ query = '' }: { query?: string }) {
  if (!matchesSearchQuery(SECTION_KEYWORDS, query)) return null

  async function handleProbe() {
    await probeAndUpdateCbBackendHealth()
  }

  const probing = cbBackendHealthState.value === 'probing'

  return (
    <details className='cb-settings-accordion'>
      <summary>
        <span className='cb-accordion-title'>梗库后端 (chatterbox-cloud)</span>
        <span
          className='cb-status-dot'
          role='img'
          style={{ color: statusDotColor(cbBackendHealthState.value) }}
          title={`${statusLabel(cbBackendHealthState.value)}: ${cbBackendHealthDetail.value || '尚未探测'}`}
          aria-label={statusLabel(cbBackendHealthState.value)}
        />
      </summary>
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
          <button className='cb-btn' onClick={handleProbe} disabled={probing} type='button'>
            {probing ? '探测中…' : '测试连通性'}
          </button>
          <span
            className='cb-status-dot'
            style={{ color: statusDotColor(cbBackendHealthState.value), marginLeft: '4px' }}
            aria-hidden='true'
          />
          <span style={{ fontSize: '0.85em' }}>
            {statusLabel(cbBackendHealthState.value)}
            {cbBackendHealthDetail.value ? `: ${cbBackendHealthDetail.value}` : ''}
          </span>
        </div>
      </div>
    </details>
  )
}
