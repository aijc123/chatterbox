import { BASE_URL } from '../../lib/const'
import { radarBackendUrlOverride, radarConsultEnabled, radarReportEnabled } from '../../lib/store-radar'

const SECTION_KEYWORDS = 'radar 雷达 live-meme-radar trending 跨房间 meme 传感器 sensor cluster rank amplifier'

/**
 * "Live Meme Radar 传感器" 设置区块。
 *
 * radar 是一个独立的传感器项目（https://live-meme-radar.pages.dev）：消化几十
 * 个直播间的弹幕,聚类成跨房间 meme,把 trending 信号开放给 userscript。
 *
 * 两条路径都默认关闭:
 *  - radarConsultEnabled — 自动跟车在准备发送前调一次 /radar/cluster-rank
 *    作为软门。命中 isTrending=true 时正常发,!isTrending 时跳过本次。
 *  - radarReportEnabled  — 把本房间窗口聚合 sample POST 给 /radar/report
 *    (服务端 endpoint 在 radar Week 9-10 上线;开启后 endpoint 不存在的话只
 *    会静默 404 + log,不影响主流程)。
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
          独立的"meme 传感器"项目,聚类几十个直播间的弹幕成跨房间 meme。两条开关均默认关闭,启用前 userscript
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
            <span>启用 radar 软门(自动跟车)</span>
            <span style={{ color: '#888', fontSize: '0.8em' }}>
              发送前查一次 /radar/cluster-rank。雷达确认跨房间 trending → 正常发并打 boost log; 雷达明确否决 →
              跳过本次,不冷却,等下一波。雷达无匹配/网络挂 → 按本地逻辑继续。
            </span>
          </span>
        </label>
        <label className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'flex-start' }}>
          <input
            type='checkbox'
            style={{ marginTop: '.2em' }}
            checked={radarReportEnabled.value}
            onChange={e => {
              radarReportEnabled.value = e.currentTarget.checked
            }}
          />
          <span className='cb-stack' style={{ gap: '.15em' }}>
            <span>把本房间聚合 sample 上传给 radar(双源数据贡献)</span>
            <span style={{ color: '#888', fontSize: '0.8em' }}>
              只送 dedupe 后的短文本计数 + 时间窗口,不送单条消息明文 + uid。endpoint 在 radar Week 9-10
              上线之前开启也是无害的(全部静默 404)。
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
