import { ignoreMemeCandidate } from '../lib/meme-contributor'
import {
  autoBlendCooldownSec,
  autoBlendEnabled,
  autoBlendIncludeReply,
  autoBlendMinDistinctUsers,
  autoBlendPanelOpen,
  autoBlendRequireDistinctUsers,
  autoBlendRoutineIntervalSec,
  autoBlendSendCount,
  autoBlendThreshold,
  autoBlendUseReplacements,
  autoBlendWindowSec,
  cachedStreamerUid,
  enableMemeContribution,
  memeContributorCandidates,
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

  const handleContribute = (text: string) => {
    void navigator.clipboard.writeText(text)
    const uid = cachedStreamerUid.value
    const url = `https://laplace.live/memes${uid ? `?contribute=${uid}` : ''}`
    window.open(url, '_blank', 'noopener')
    ignoreMemeCandidate(text)
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
          <span>例行</span>
          <NumberInput
            value={autoBlendRoutineIntervalSec.value}
            min={10}
            width='50px'
            onChange={v => {
              autoBlendRoutineIntervalSec.value = v
            }}
          />
          <span>秒</span>
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

      <div style={{ color: '#999', fontSize: '12px', lineHeight: 1.5 }}>
        监测弹幕爆发，在窗口内重复达到阈值时立即跟发（爆发触发），并以加权随机定时检测持续热门（例行触发）。会复用「独轮车」面板里的随机字符
        / 随机颜色 / 最大字数；自己发出的弹幕不会被计入
      </div>

      <div style={{ margin: '.5em 0' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
          <input
            id='enableMemeContribution'
            type='checkbox'
            checked={enableMemeContribution.value}
            onInput={e => {
              enableMemeContribution.value = e.currentTarget.checked
            }}
          />
          <label for='enableMemeContribution'>参与社区梗库建设</label>
        </span>
      </div>

      {enableMemeContribution.value && memeContributorCandidates.value.length > 0 && (
        <div style={{ margin: '.25em 0' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '.25em' }}>
            待贡献梗（{memeContributorCandidates.value.length} 条）：
          </div>
          {memeContributorCandidates.value.map(text => (
            <div
              key={text}
              style={{
                display: 'flex',
                gap: '.4em',
                alignItems: 'center',
                padding: '.2em 0',
                borderBottom: '1px solid var(--Ga2, #eee)',
              }}
            >
              <span style={{ flex: 1, fontSize: '12px', wordBreak: 'break-all' }}>{text}</span>
              <button
                type='button'
                style={{ fontSize: '11px', cursor: 'pointer', padding: '.1em .4em', flexShrink: 0 }}
                onClick={() => handleContribute(text)}
              >
                复制+贡献
              </button>
              <button
                type='button'
                style={{ fontSize: '11px', cursor: 'pointer', padding: '.1em .4em', flexShrink: 0 }}
                onClick={() => ignoreMemeCandidate(text)}
              >
                忽略
              </button>
            </div>
          ))}
        </div>
      )}
    </details>
  )
}
