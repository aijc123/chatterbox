import { AUTO_BLEND_PRESETS } from '../lib/auto-blend-preset-config'
import { applyAutoBlendPreset } from '../lib/auto-blend-presets'
import {
  autoBlendAdvancedOpen,
  autoBlendCandidateText,
  autoBlendCooldownSec,
  autoBlendEnabled,
  autoBlendIncludeReply,
  autoBlendLastActionText,
  autoBlendMinDistinctUsers,
  autoBlendPanelOpen,
  autoBlendPreset,
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
    appearance: 'none',
    border: active ? '1px solid #1677ff' : '1px solid var(--Ga2, rgba(0, 0, 0, .18))',
    background: active ? '#1677ff' : 'transparent',
    color: active ? '#fff' : undefined,
    borderRadius: '4px',
    padding: '4px 0',
    cursor: 'pointer',
    fontWeight: active ? 'bold' : undefined,
    minWidth: 0,
  }
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
        自动跟车{isOn ? ' · 已开' : ''}
      </summary>

      <div style={{ margin: '.5em 0', display: 'grid', gap: '.5em' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '.5em', alignItems: 'center' }}>
          <button
            type='button'
            onClick={toggleEnabled}
            style={{
              border: '1px solid transparent',
              borderRadius: '4px',
              padding: '6px 8px',
              cursor: 'pointer',
              background: isOn ? '#d64545' : '#0a7f55',
              color: '#fff',
              fontWeight: 'bold',
            }}
          >
            {isOn ? '停止跟车' : '开始跟车'}
          </button>
          <span
            style={{
              color: statusColor,
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          >
            {autoBlendStatusText.value}
          </span>
        </div>

        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.25em' }}>
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
          <div style={{ color: '#777', fontSize: '12px', lineHeight: 1.5, marginTop: '.25em' }}>当前：{presetHint}</div>
        </div>

        <div
          style={{
            border: '1px solid var(--Ga2, rgba(0, 0, 0, .14))',
            borderRadius: '4px',
            padding: '.4em .5em',
            color: isOn ? undefined : '#999',
            fontSize: '12px',
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
