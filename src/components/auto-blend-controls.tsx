import {
  autoBlendCooldownSec,
  autoBlendEnabled,
  autoBlendIncludeReply,
  autoBlendMinDistinctUsers,
  autoBlendPanelOpen,
  autoBlendRequireDistinctUsers,
  autoBlendRoutineIntervalSec,
  autoBlendSendAllTrending,
  autoBlendSendCount,
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

export function AutoBlendControls() {
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
        自动融入{autoBlendEnabled.value ? ' 🟣' : ''}
      </summary>

      <div style={{ margin: '.5em 0', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '.25em' }}>
        <button type='button' onClick={toggleEnabled}>
          {autoBlendEnabled.value ? '停止融入' : '开始融入'}
        </button>
      </div>

      <div
        style={{
          margin: '.5em 0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '.5em',
          alignItems: 'center',
          color: autoBlendEnabled.value ? undefined : '#999',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
          <span>触发：</span>
          <NumberInput
            value={autoBlendWindowSec.value}
            min={3}
            onChange={v => {
              autoBlendWindowSec.value = v
            }}
          />
          <span>秒内重复</span>
          <NumberInput
            value={autoBlendThreshold.value}
            min={2}
            onChange={v => {
              autoBlendThreshold.value = v
            }}
          />
          <span>次</span>
        </span>
      </div>

      <div
        style={{
          margin: '.5em 0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '.5em',
          alignItems: 'center',
          color: autoBlendEnabled.value ? undefined : '#999',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
          <span>冷却</span>
          <NumberInput
            value={autoBlendCooldownSec.value}
            min={4}
            width='50px'
            onChange={v => {
              autoBlendCooldownSec.value = v
            }}
          />
          <span>秒</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
          <span>每隔</span>
          <NumberInput
            value={autoBlendRoutineIntervalSec.value}
            min={10}
            width='50px'
            onChange={v => {
              autoBlendRoutineIntervalSec.value = v
            }}
          />
          <span>秒轮查</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
          <span>跟车</span>
          <NumberInput
            value={autoBlendSendCount.value}
            min={1}
            max={20}
            width='40px'
            onChange={v => {
              autoBlendSendCount.value = v
            }}
          />
          <span>次</span>
        </span>
      </div>

      <div
        style={{
          margin: '.5em 0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '.75em',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
          <input
            id='autoBlendIncludeReply'
            type='checkbox'
            checked={autoBlendIncludeReply.value}
            onInput={e => {
              autoBlendIncludeReply.value = e.currentTarget.checked
            }}
          />
          <label for='autoBlendIncludeReply'>包含 @ 回复弹幕</label>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
          <input
            id='autoBlendUseReplacements'
            type='checkbox'
            checked={autoBlendUseReplacements.value}
            onInput={e => {
              autoBlendUseReplacements.value = e.currentTarget.checked
            }}
          />
          <label for='autoBlendUseReplacements'>应用替换规则</label>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
          <input
            id='autoBlendSendAllTrending'
            type='checkbox'
            checked={autoBlendSendAllTrending.value}
            onInput={e => {
              autoBlendSendAllTrending.value = e.currentTarget.checked
            }}
          />
          <label for='autoBlendSendAllTrending'>爆发时发所有趋势</label>
        </span>
      </div>

      <div
        style={{
          margin: '.5em 0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '.5em',
          alignItems: 'center',
          color: autoBlendEnabled.value ? undefined : '#999',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
          <input
            id='autoBlendRequireDistinctUsers'
            type='checkbox'
            checked={autoBlendRequireDistinctUsers.value}
            onInput={e => {
              autoBlendRequireDistinctUsers.value = e.currentTarget.checked
            }}
          />
          <label for='autoBlendRequireDistinctUsers'>要求来自不同用户</label>
        </span>
        {autoBlendRequireDistinctUsers.value && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <span>至少</span>
            <NumberInput
              value={autoBlendMinDistinctUsers.value}
              min={2}
              width='40px'
              onChange={v => {
                autoBlendMinDistinctUsers.value = v
              }}
            />
            <span>人</span>
          </span>
        )}
      </div>

      {autoBlendSendCount.value * msgSendInterval.value > autoBlendCooldownSec.value && (
        <div style={{ color: '#e6a700', fontSize: '12px', lineHeight: 1.5, marginBottom: '.25em' }}>
          ⚠️ 跟车 {autoBlendSendCount.value} 次 × 间隔 {msgSendInterval.value}s = {autoBlendSendCount.value * msgSendInterval.value}s，超过冷却时间 {autoBlendCooldownSec.value}s。冷却结束后若仍在发送，新触发会被跳过。
        </div>
      )}
      <div style={{ color: '#999', fontSize: '12px', lineHeight: 1.5 }}>
        监测弹幕爆发，在窗口内重复达到阈值时立即跟发，并每隔一段时间从热门候选中加权随机挑一条跟发。会复用「独轮车」面板里的随机字符
        / 随机颜色 / 最大字数；自己发出的弹幕不会被计入
      </div>
    </details>
  )
}
