import { radarReportEnabled } from '../../lib/store-radar'

const SECTION_KEYWORDS = 'radar 雷达 跨房间 meme 上报 report 观察'

/**
 * "live-meme-radar 观察上报" 设置区块。
 *
 * 默认 OFF。开启后,每当本房间有弹幕命中 radar 已经识别的某个 trending 簇,
 * 该文本会被加入一个 60 秒滚动窗口的 buffer(去重、上限 30 条),窗口结束时
 * 整批 fire-and-forget 发到 radar 的 /radar/report endpoint。
 *
 * 隐私:只发 dedupe 后的短文本数组 + roomId + channelUid(主播公开 id),
 * 不发观众 uid(明文或哈希都不发),不发逐条 timestamp。失败一律静默。
 */
export function RadarSection({ query = '' }: { query?: string }) {
  const visible = !query || SECTION_KEYWORDS.toLowerCase().includes(query)
  if (!visible) return null

  return (
    <details className='cb-settings-accordion'>
      <summary>
        <span className='cb-accordion-title'>live-meme-radar 观察上报</span>
      </summary>
      <div className='cb-section cb-stack' style={{ margin: '.5em 0', paddingBottom: '1em' }}>
        <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.5em' }}>
          live-meme-radar 观察上报
        </div>
        <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', marginBottom: '.5em' }}>
          帮助 radar 识别跨房间 meme:开启后,本房间命中已知 trending 簇的弹幕文本会按 60s 窗口聚合后批量上报。
          只送 dedupe 后的短文本 + 房间 id + 主播 uid;不送观众 uid、不送逐条时间戳、失败静默。默认关闭。
        </div>
        <label className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center' }}>
          <input
            type='checkbox'
            checked={radarReportEnabled.value}
            onChange={e => {
              radarReportEnabled.value = e.currentTarget.checked
            }}
          />
          <span>启用观察上报(/radar/report)</span>
        </label>
      </div>
    </details>
  )
}
