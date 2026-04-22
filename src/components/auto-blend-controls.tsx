import { AUTO_BLEND_PRESETS } from '../lib/auto-blend-preset-config'
import { applyAutoBlendPreset } from '../lib/auto-blend-presets'
import {
  autoBlendAdvancedOpen,
  autoBlendBurstSettleMs,
  autoBlendCandidateText,
  autoBlendCooldownSec,
  autoBlendEnabled,
  autoBlendIncludeReply,
  autoBlendLastActionText,
  autoBlendMinDistinctUsers,
  autoBlendPanelOpen,
  autoBlendPreset,
  autoBlendRateLimitStopThreshold,
  autoBlendRateLimitWindowMin,
  autoBlendRequireDistinctUsers,
  autoBlendRoutineIntervalSec,
  autoBlendSendAllTrending,
  autoBlendSendCount,
  autoBlendStatusText,
  autoBlendThreshold,
  autoBlendUseReplacements,
  autoBlendWindowSec,
  msgSendInterval,
} from '../lib/store'

function NumberInput({
  value,
  min,
  max,
  width = '40px',
  onChange,
}: {
  value: number
  min: number
  max?: number
  width?: string
  onChange: (n: number) => void
}) {
  return (
    <input
      type='number'
      autocomplete='off'
      min={String(min)}
      max={max !== undefined ? String(max) : undefined}
      style={{ width }}
      value={value}
      onInput={e => {
        let v = parseInt(e.currentTarget.value, 10)
        if (Number.isNaN(v) || v < min) v = min
        if (max !== undefined && v > max) v = max
        onChange(v)
      }}
    />
  )
}

function markCustom(): void {
  autoBlendPreset.value = 'custom'
}

function modeButtonStyle(active: boolean) {
  return {
    fontWeight: active ? 'bold' : undefined,
  }
}

function SettingHint({ children }: { children: string }) {
  return (
    <div className='cb-note' style={{ marginTop: '-.25em' }}>
      {children}
    </div>
  )
}

export function AutoBlendControls() {
  const isOn = autoBlendEnabled.value
  const currentPreset = autoBlendPreset.value
  const presetHint =
    currentPreset === 'safe' || currentPreset === 'normal' || currentPreset === 'hot'
      ? AUTO_BLEND_PRESETS[currentPreset].hint
      : '自定义参数'
  const statusColor = !isOn
    ? '#777'
    : autoBlendStatusText.value.includes('冷却')
      ? '#a15c00'
      : autoBlendStatusText.value.includes('跟车')
        ? '#1677ff'
        : '#0a7f55'

  const toggleEnabled = () => {
    autoBlendEnabled.value = !autoBlendEnabled.value
  }

  return (
    <details
      open={autoBlendPanelOpen.value}
      onToggle={e => {
        autoBlendPanelOpen.value = e.currentTarget.open
      }}
    >
      <summary style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'bold' }}>
        <span>自动跟车</span>
        {isOn && <span className='cb-soft'>已开</span>}
      </summary>

      <div className='cb-body cb-stack'>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '.5em', alignItems: 'center' }}>
          <button type='button' className={isOn ? 'cb-danger' : 'cb-primary'} onClick={toggleEnabled}>
            {isOn ? '停止跟车' : '开始跟车'}
          </button>
          <span
            style={{
              color: statusColor,
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          >
            <span className='cb-status-dot' /> {autoBlendStatusText.value}
          </span>
        </div>

        <div>
          <div className='cb-segment'>
            {(['safe', 'normal', 'hot'] as const).map(preset => (
              <button
                key={preset}
                type='button'
                aria-pressed={currentPreset === preset}
                onClick={() => applyAutoBlendPreset(preset)}
                style={modeButtonStyle(currentPreset === preset)}
              >
                {AUTO_BLEND_PRESETS[preset].label}
              </button>
            ))}
          </div>
          <div className='cb-note' style={{ marginTop: '.25em' }}>
            当前：{presetHint}
          </div>
        </div>

        <div
          className='cb-panel'
          style={{
            color: isOn ? undefined : '#999',
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '4.5em 1fr', gap: '.25em' }}>
            <strong>正在刷</strong>
            <span style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{autoBlendCandidateText.value}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '4.5em 1fr', gap: '.25em' }}>
            <strong>刚刚</strong>
            <span style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{autoBlendLastActionText.value}</span>
          </div>
        </div>
      </div>

      <details
        open={autoBlendAdvancedOpen.value}
        onToggle={e => {
          autoBlendAdvancedOpen.value = e.currentTarget.open
        }}
        style={{ marginTop: '.5em' }}
      >
        <summary style={{ cursor: 'pointer', userSelect: 'none' }}>高级设置</summary>

        <div
          style={{
            margin: '.5em 0',
            display: 'grid',
            gap: '.5em',
            color: isOn ? undefined : '#999',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '.25em' }}>
            <span>多少算跟：</span>
            <NumberInput
              value={autoBlendWindowSec.value}
              min={3}
              onChange={v => {
                markCustom()
                autoBlendWindowSec.value = v
              }}
            />
            <span>秒内</span>
            <NumberInput
              value={autoBlendThreshold.value}
              min={2}
              onChange={v => {
                markCustom()
                autoBlendThreshold.value = v
              }}
            />
            <span>条</span>
          </div>
          <SettingHint>在指定秒数内，同一句弹幕达到条数才触发；阈值越低越积极。</SettingHint>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '.25em' }}>
            <span>节奏：</span>
            <span>冷却</span>
            <NumberInput
              value={autoBlendCooldownSec.value}
              min={4}
              width='50px'
              onChange={v => {
                markCustom()
                autoBlendCooldownSec.value = v
              }}
            />
            <span>秒，补跟</span>
            <NumberInput
              value={autoBlendRoutineIntervalSec.value}
              min={10}
              width='50px'
              onChange={v => {
                markCustom()
                autoBlendRoutineIntervalSec.value = v
              }}
            />
            <span>秒</span>
          </div>
          <SettingHint>冷却是每次发送后的停顿；补跟是没有突发时重新检查热门弹幕的间隔。</SettingHint>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '.25em' }}>
            <span>突发等待</span>
            <NumberInput
              value={autoBlendBurstSettleMs.value}
              min={0}
              max={10000}
              width='58px'
              onChange={v => {
                markCustom()
                autoBlendBurstSettleMs.value = v
              }}
            />
            <span>毫秒</span>
          </div>
          <SettingHint>检测到刷屏后先等一小会儿，把同一波里的其它高频弹幕一起纳入判断。</SettingHint>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '.25em' }}>
            <span>限频保护：</span>
            <NumberInput
              value={autoBlendRateLimitWindowMin.value}
              min={1}
              max={60}
              width='44px'
              onChange={v => {
                markCustom()
                autoBlendRateLimitWindowMin.value = v
              }}
            />
            <span>分钟内</span>
            <NumberInput
              value={autoBlendRateLimitStopThreshold.value}
              min={1}
              max={20}
              width='40px'
              onChange={v => {
                markCustom()
                autoBlendRateLimitStopThreshold.value = v
              }}
            />
            <span>次后停车</span>
          </div>
          <SettingHint>限制连续失败或风控信号；超过次数会自动停止跟车，避免继续刷失败。</SettingHint>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '.25em' }}>
            <span>每次发：</span>
            <NumberInput
              value={autoBlendSendCount.value}
              min={1}
              max={20}
              width='40px'
              onChange={v => {
                markCustom()
                autoBlendSendCount.value = v
              }}
            />
            <span>遍</span>
          </div>
          <SettingHint>同一句被选中后重复发送的次数；建议配合发送间隔和冷却一起调。</SettingHint>
        </div>

        <div style={{ margin: '.5em 0', display: 'grid', gap: '.35em' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <input
              id='autoBlendRequireDistinctUsers'
              type='checkbox'
              checked={autoBlendRequireDistinctUsers.value}
              onInput={e => {
                markCustom()
                autoBlendRequireDistinctUsers.value = e.currentTarget.checked
              }}
            />
            <label for='autoBlendRequireDistinctUsers'>多人都在刷才跟</label>
            {autoBlendRequireDistinctUsers.value && (
              <>
                <span>至少</span>
                <NumberInput
                  value={autoBlendMinDistinctUsers.value}
                  min={2}
                  width='40px'
                  onChange={v => {
                    markCustom()
                    autoBlendMinDistinctUsers.value = v
                  }}
                />
                <span>人</span>
              </>
            )}
          </span>

          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <input
              id='autoBlendUseReplacements'
              type='checkbox'
              checked={autoBlendUseReplacements.value}
              onInput={e => {
                markCustom()
                autoBlendUseReplacements.value = e.currentTarget.checked
              }}
            />
            <label for='autoBlendUseReplacements'>套用替换规则</label>
          </span>

          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <input
              id='autoBlendIncludeReply'
              type='checkbox'
              checked={autoBlendIncludeReply.value}
              onInput={e => {
                markCustom()
                autoBlendIncludeReply.value = e.currentTarget.checked
              }}
            />
            <label for='autoBlendIncludeReply'>也跟 @ 回复</label>
          </span>

          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <input
              id='autoBlendSendAllTrending'
              type='checkbox'
              checked={autoBlendSendAllTrending.value}
              onInput={e => {
                markCustom()
                autoBlendSendAllTrending.value = e.currentTarget.checked
              }}
            />
            <label for='autoBlendSendAllTrending'>一波刷屏全跟</label>
            <span style={{ color: '#a15c00' }}>猛</span>
          </span>
        </div>

        {autoBlendSendAllTrending.value && (
          <div style={{ color: '#a15c00', fontSize: '12px', lineHeight: 1.5, marginBottom: '.25em' }}>
            会把同一波里达标的几句话依次发出去。
          </div>
        )}

        {autoBlendSendCount.value * msgSendInterval.value > autoBlendCooldownSec.value && (
          <div style={{ color: '#a15c00', fontSize: '12px', lineHeight: 1.5, marginBottom: '.25em' }}>
            当前要发 {autoBlendSendCount.value * msgSendInterval.value}s，超过冷却 {autoBlendCooldownSec.value}s。
          </div>
        )}
      </details>
    </details>
  )
}
