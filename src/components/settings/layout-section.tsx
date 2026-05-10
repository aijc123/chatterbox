import { forceScrollDanmaku, optimizeLayout, unlockForbidLive, unlockSpaceBlock } from '../../lib/store'
import { matchesSearchQuery } from './search'

export function LayoutSection({ query = '' }: { query?: string }) {
  if (!matchesSearchQuery('直播间布局 优化布局 layout 滚动 scroll 拉黑 forbidLive 解锁 unlock 空间', query)) return null

  return (
    <details className='cb-settings-accordion'>
      <summary className='cb-module-summary'>
        <span className='cb-accordion-title'>直播间布局</span>
        <span className='cb-module-state' data-active={optimizeLayout.value ? 'true' : 'false'}>
          {optimizeLayout.value ? 'OPT' : 'STD'}
        </span>
      </summary>
      <div
        className='cb-section cb-stack'
        style={{ margin: '.5em 0', paddingBottom: '1em', borderBottom: '1px solid var(--Ga2, #eee)' }}
      >
        <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.5em' }}>
          直播间布局
        </div>
        <div className='cb-setting-block cb-setting-primary'>
          <span className='cb-switch-row' style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <input
              id='optimizeLayout'
              type='checkbox'
              checked={optimizeLayout.value}
              onInput={e => {
                optimizeLayout.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='optimizeLayout'>优化布局</label>
          </span>
          <span className='cb-switch-row' style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <input
              id='forceScrollDanmaku'
              type='checkbox'
              checked={forceScrollDanmaku.value}
              onInput={e => {
                forceScrollDanmaku.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='forceScrollDanmaku'>脚本载入时强制配置弹幕位置为滚动方向</label>
          </span>
          <span className='cb-switch-row' style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <input
              id='unlockForbidLive'
              type='checkbox'
              checked={unlockForbidLive.value}
              onInput={e => {
                unlockForbidLive.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='unlockForbidLive'>拉黑直播间解锁（刷新生效，仅布局解锁）</label>
          </span>
          <span className='cb-switch-row' style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <input
              id='unlockSpaceBlock'
              type='checkbox'
              checked={unlockSpaceBlock.value}
              onInput={e => {
                unlockSpaceBlock.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='unlockSpaceBlock'>空间拉黑解锁（刷新生效，仅布局解锁）</label>
          </span>
        </div>
      </div>
    </details>
  )
}
