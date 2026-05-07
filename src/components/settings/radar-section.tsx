import { BASE_URL } from '../../lib/const'
import { radarBackendUrlOverride, radarConsultEnabled } from '../../lib/store-radar'

const SECTION_KEYWORDS = 'radar 雷达 live-meme-radar trending 跨房间 meme 传感器 sensor cluster rank amplifier'

/**
 * "Live Meme Radar 传感器" 设置区块（实验性，默认关闭）。
 *
 * radar 是一个独立的只读传感器项目（https://live-meme-radar.pages.dev）：聚类
 * 几十个直播间的弹幕成跨房间 meme。当前 userscript 只读取该信号作为自动跟车
 * 的可选信心提示，不会用它阻止本地发送。
 */
export function RadarSection({ query = '' }: { query?: string }) {
  const visible = !query || SECTION_KEYWORDS.toLowerCase().includes(query)
  if (!visible) return null

  return (
    <details className='cb-settings-accordion'>
      <summary>
        <span className='cb-accordion-title'>Meme 雷达（live-meme-radar）</span>
      </summary>
      <div className='cb-section cb-stack' style={{ margin: '.5em 0', paddingBottom: '1em' }}>
        <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.5em' }}>
          Meme 雷达（live-meme-radar）
        </div>
        <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', marginBottom: '.5em' }}>
          独立的"meme 传感器"项目，聚类几十个直播间的弹幕成跨房间 meme。该开关默认关闭， 启用前 userscript
          行为完全等同旧版。完整说明见{' '}
          <a href='https://live-meme-radar.pages.dev' target='_blank' rel='noreferrer'>
            live-meme-radar.pages.dev
          </a>
          。
        </div>
        <label className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'flex-start' }}>
          <input
            type='checkbox'
            style={{ marginTop: '.2em' }}
            checked={radarConsultEnabled.value}
            onChange={e => {
              radarConsultEnabled.value = e.currentTarget.checked
            }}
          />
          <span className='cb-stack' style={{ gap: '.15em' }}>
            <span>实验：用跨房间热度增强自动跟车</span>
            <span style={{ color: '#888', fontSize: '0.8em' }}>
              开启后，脚本会在自动跟车前查询该弹幕是否也在其他直播间流行；确认热门时只会在日志里加一条提示，
              不会阻止原本的自动跟车。雷达失联时仍按原逻辑运行。默认关闭。
            </span>
          </span>
        </label>
        <div className='cb-stack' style={{ marginTop: '.5em', gap: '.25em' }}>
          <label htmlFor='radarBackendUrlOverride' style={{ color: '#666', fontSize: '0.85em' }}>
            radar URL(开发用,留空走默认 {BASE_URL.RADAR_BACKEND})
          </label>
          <input
            id='radarBackendUrlOverride'
            type='url'
            placeholder='http://localhost:8788'
            value={radarBackendUrlOverride.value}
            style={{ width: '100%', fontSize: '12px' }}
            onInput={e => {
              radarBackendUrlOverride.value = e.currentTarget.value
            }}
          />
        </div>
      </div>
    </details>
  )
}
