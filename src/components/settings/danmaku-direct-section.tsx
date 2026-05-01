import { danmakuDirectAlwaysShow, danmakuDirectConfirm, danmakuDirectMode } from '../../lib/store'

export function DanmakuDirectSection({ query = '' }: { query?: string }) {
  const visible = !query || '偷弹幕 +1 发送 确认 按钮'.toLowerCase().includes(query)
  if (!visible) return null

  return (
    <details className='cb-settings-accordion'>
      <summary className='cb-module-summary'>
        <span className='cb-accordion-title'>偷弹幕与 +1</span>
        <span className='cb-module-state' data-active={danmakuDirectMode.value ? 'true' : 'false'}>
          {danmakuDirectMode.value ? 'ON' : 'OFF'}
        </span>
      </summary>
      <div
        className='cb-section cb-stack'
        style={{ margin: '.5em 0', paddingBottom: '1em', borderBottom: '1px solid var(--Ga2, #eee)' }}
      >
        <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.5em' }}>
          偷弹幕与 +1
        </div>
        <div className='cb-setting-block cb-setting-primary'>
          <span className='cb-switch-row' style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <input
              id='danmakuDirectMode'
              type='checkbox'
              checked={danmakuDirectMode.value}
              onInput={e => {
                danmakuDirectMode.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='danmakuDirectMode'>+1模式（在聊天消息旁显示偷弹幕和+1按钮）</label>
          </span>
          <span
            className='cb-switch-row cb-setting-child'
            data-enabled={danmakuDirectMode.value ? 'true' : 'false'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em', paddingLeft: '1.5em' }}
          >
            <input
              id='danmakuDirectConfirm'
              type='checkbox'
              checked={danmakuDirectConfirm.value}
              disabled={!danmakuDirectMode.value}
              onInput={e => {
                danmakuDirectConfirm.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='danmakuDirectConfirm' style={{ color: danmakuDirectMode.value ? undefined : '#999' }}>
              +1弹幕发送前需确认（防误触）
            </label>
          </span>
          <span
            className='cb-switch-row cb-setting-child'
            data-enabled={danmakuDirectMode.value ? 'true' : 'false'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em', paddingLeft: '1.5em' }}
          >
            <input
              id='danmakuDirectAlwaysShow'
              type='checkbox'
              checked={danmakuDirectAlwaysShow.value}
              disabled={!danmakuDirectMode.value}
              onInput={e => {
                danmakuDirectAlwaysShow.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='danmakuDirectAlwaysShow' style={{ color: danmakuDirectMode.value ? undefined : '#999' }}>
              总是显示偷/+1按钮
            </label>
          </span>
        </div>
      </div>
    </details>
  )
}
