import { useEffect, useRef } from 'preact/hooks'

import { VERSION } from '../lib/const'
import { activeTab, hasSeenWelcome, lastSeenVersion } from '../lib/store'
import { shouldShowVersionUpdateBadge } from '../lib/version-update'

const SECTION_STYLE = {
  margin: '.5em 0',
  paddingBottom: '1em',
  borderBottom: '1px solid var(--Ga2, #eee)',
} as const

const HEADING_STYLE = {
  fontWeight: 'bold',
  marginBottom: '.5em',
} as const

const LINK_STYLE = {
  color: '#288bb8',
  textDecoration: 'none',
} as const

interface ExternalService {
  name: string
  host: string
  url?: string
  trigger: string
  description: string
}

const EXTERNAL_SERVICES: ExternalService[] = [
  {
    name: 'Bilibili 直播接口',
    host: 'api.live.bilibili.com',
    trigger: '发送弹幕、获取房间信息、读取粉丝牌、检查禁言状态时',
    description:
      '脚本会使用你的 B 站登录态访问直播间相关接口，用于发送弹幕、获取房间号、读取表情包和粉丝牌直播间，并在你手动触发巡检时检查禁言/封禁信号。',
  },
  {
    name: 'AI 弹幕审核',
    host: 'edge-workers.laplace.cn',
    trigger: '启用「AI 规避」功能时',
    description:
      '当弹幕发送失败且开启了 AI 规避功能后，脚本会将弹幕文本发送至此服务进行敏感词检测，并尝试自动替换敏感词后重新发送。',
  },
  {
    name: '云端替换规则',
    host: 'workers.vrp.moe',
    url: 'https://subspace.institute/docs/laplace-chatterbox/replacement',
    trigger: '打开设置页时自动同步',
    description: '从云端获取由社区维护的弹幕敏感词替换规则，每 10 分钟自动同步一次。',
  },
  {
    name: '烂梗列表',
    host: 'workers.vrp.moe',
    url: 'https://subspace.institute/docs/laplace-chatterbox/memes',
    trigger: '打开独轮车页面中的烂梗列表时',
    description: '从原项目沿用的社区服务获取烂梗列表。复制烂梗时会向服务报告使用次数。',
  },
  {
    name: 'Soniox 语音识别',
    host: 'api.soniox.com',
    url: 'https://soniox.com',
    trigger: '使用同传功能时',
    description: '通过 WebSocket 连接 Soniox 语音识别云服务，将麦克风音频流实时转换为文字。需要提供 Soniox API Key。',
  },
  {
    name: 'Soniox SDK',
    host: 'unpkg.com',
    trigger: '脚本加载时',
    description: '从 unpkg CDN 加载 Soniox 语音识别 SDK (@soniox/speech-to-text-web)。',
  },
]

export function AboutTab() {
  const initialSeenRef = useRef(lastSeenVersion.value)
  const isFreshUpdate = shouldShowVersionUpdateBadge(initialSeenRef.current, VERSION)
  useEffect(() => {
    if (lastSeenVersion.value !== VERSION) {
      lastSeenVersion.value = VERSION
    }
  }, [])

  return (
    <>
      <div className='cb-section cb-stack' style={SECTION_STYLE}>
        <div className='cb-heading' style={HEADING_STYLE}>
          B站独轮车 + 自动跟车
        </div>
        <div className='cb-note' style={{ display: 'flex', flexDirection: 'column', gap: '.25em', color: '#666' }}>
          <span>
            版本: {VERSION}
            {isFreshUpdate && (
              <span
                style={{
                  marginLeft: '.5em',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: '#ffe7c2',
                  color: '#a15c00',
                  fontSize: '0.8em',
                }}
                title={`从 v${initialSeenRef.current} 更新到 v${VERSION}`}
              >
                🆕 已更新
              </span>
            )}
          </span>
          <span>
            作者:{' '}
            <a href='https://github.com/aijc123' target='_blank' rel='noopener' style={LINK_STYLE}>
              Eric Ai
            </a>
          </span>
          <span>许可证: AGPL-3.0</span>
          <span>
            源代码:{' '}
            <a
              href='https://github.com/aijc123/bilibili-live-wheel-auto-follow'
              target='_blank'
              rel='noopener'
              style={LINK_STYLE}
            >
              GitHub
            </a>
          </span>
          <span>
            原项目:{' '}
            <a href='https://github.com/laplace-live/chatterbox' target='_blank' rel='noopener' style={LINK_STYLE}>
              LAPLACE Chatterbox
            </a>
          </span>
          <span style={{ marginTop: '.5em' }}>
            <button
              type='button'
              className='cb-btn'
              onClick={() => {
                hasSeenWelcome.value = false
                activeTab.value = 'fasong'
              }}
              title='下次打开「发送」页签时会再次显示首次引导'
            >
              重新查看新手引导
            </button>
          </span>
        </div>
      </div>

      <div className='cb-section cb-stack' style={{ ...SECTION_STYLE, borderBottom: 'none' }}>
        <div className='cb-heading' style={HEADING_STYLE}>
          隐私说明
        </div>
        <div className='cb-note' style={{ color: '#666', marginBottom: '.75em' }}>
          本脚本在运行时可能会与以下外部服务通信。不同功能触发的请求不同，请按需启用。
        </div>

        <div className='cb-list' style={{ display: 'flex', flexDirection: 'column', gap: '.75em' }}>
          {EXTERNAL_SERVICES.map(service => (
            <div
              key={service.name}
              className='cb-list-item'
              style={{
                padding: '.5em',
                borderRadius: '4px',
                background: 'var(--Ga1_s, rgba(0,0,0,.03))',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '.25em' }}>
                {service.url ? (
                  <a href={service.url} target='_blank' rel='noopener' style={LINK_STYLE}>
                    {service.name}
                  </a>
                ) : (
                  service.name
                )}
              </div>
              <div style={{ fontSize: '.9em', color: '#666', fontFamily: 'monospace', marginBottom: '.25em' }}>
                {service.host}
              </div>
              <div style={{ fontSize: '.9em', marginBottom: '.25em' }}>
                <span style={{ color: '#36a185' }}>触发条件:</span> {service.trigger}
              </div>
              <div style={{ fontSize: '.9em', color: '#555' }}>{service.description}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
