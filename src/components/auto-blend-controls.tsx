import { useSignal } from '@preact/signals'

import { AUTO_BLEND_PRESETS } from '../lib/auto-blend-preset-config'
import { applyAutoBlendPreset } from '../lib/auto-blend-presets'
import { decideAutoBlendToggle } from '../lib/auto-blend-toggle'
import { appendLog } from '../lib/log'
import {
  autoBlendAdvancedOpen,
  autoBlendBurstSettleMs,
  autoBlendCandidateText,
  autoBlendCooldownSec,
  autoBlendDryRun,
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
  autoBlendUserBlacklist,
  autoBlendWindowSec,
  hasConfirmedAutoBlendRealFire,
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
  const rangeText = max !== undefined ? `${min}–${max}` : `≥${min}`
  const rangeHint = max !== undefined ? `允许范围：${min}–${max}` : `最小值：${min}`
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      <input
        type='number'
        autocomplete='off'
        min={String(min)}
        max={max !== undefined ? String(max) : undefined}
        title={rangeHint}
        aria-label={rangeHint}
        style={{ width }}
        value={value}
        onInput={e => {
          let v = parseInt(e.currentTarget.value, 10)
          if (Number.isNaN(v) || v < min) v = min
          if (max !== undefined && v > max) v = max
          onChange(v)
        }}
      />
      <span className='cb-soft' aria-hidden='true' style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
        {rangeText}
      </span>
    </span>
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

function BlacklistPanel() {
  const addUid = useSignal('')
  const addUname = useSignal('')
  const list = autoBlendUserBlacklist.value
  const entries = Object.entries(list)

  const handleAdd = () => {
    const uid = addUid.value.trim().replace(/\D/g, '')
    if (!uid) return
    if (uid in list) {
      appendLog(`⚠️ UID ${uid} 已在黑名单中`)
      return
    }
    const next = { ...list, [uid]: addUname.value.trim() }
    autoBlendUserBlacklist.value = next
    appendLog(`🚲 已加入融入黑名单：${addUname.value.trim() || uid}`)
    addUid.value = ''
    addUname.value = ''
  }

  const handleRemove = (uid: string) => {
    const next = { ...list }
    const display = next[uid] || uid
    delete next[uid]
    autoBlendUserBlacklist.value = next
    appendLog(`🚲 已解除融入黑名单：${display}`)
  }

  return (
    <details style={{ marginTop: '.5em' }}>
      <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
        融入黑名单
        {entries.length > 0 && <span className='cb-soft'> ({entries.length})</span>}
      </summary>

      <div style={{ margin: '.5em 0', display: 'grid', gap: '.35em' }}>
        <div className='cb-note'>黑名单用户的弹幕不会触发自动跟车。也可在弹幕右键菜单中添加。</div>

        {entries.length > 0 ? (
          <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'grid', gap: '.25em' }}>
            {entries.map(([uid, uname]) => (
              <div
                key={uid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.5em',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  background: 'rgba(0,0,0,.04)',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: '12px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {uname || '(未记录昵称)'}
                  <span style={{ color: '#999', marginLeft: '.4em' }}>UID {uid}</span>
                </span>
                <button
                  type='button'
                  className='cb-rule-remove'
                  style={{ minHeight: 'unset', padding: '1px 6px', fontSize: '11px' }}
                  onClick={() => handleRemove(uid)}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className='cb-empty'>暂无黑名单用户</div>
        )}

        <div style={{ display: 'flex', gap: '.35em', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type='text'
            placeholder='UID'
            style={{ width: '80px' }}
            value={addUid.value}
            onInput={e => {
              addUid.value = e.currentTarget.value.replace(/\D/g, '')
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.isComposing) {
                e.preventDefault()
                handleAdd()
              }
            }}
          />
          <input
            type='text'
            placeholder='备注名（可选）'
            style={{ flex: 1, minWidth: '60px' }}
            value={addUname.value}
            onInput={e => {
              addUname.value = e.currentTarget.value
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.isComposing) {
                e.preventDefault()
                handleAdd()
              }
            }}
          />
          <button type='button' onClick={handleAdd} style={{ whiteSpace: 'nowrap' }}>
            添加
          </button>
        </div>
      </div>
    </details>
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
    const decision = decideAutoBlendToggle(
      {
        currentlyEnabled: autoBlendEnabled.value,
        dryRun: autoBlendDryRun.value,
        hasConfirmedRealFire: hasConfirmedAutoBlendRealFire.value,
      },
      () =>
        confirm(
          '自动跟车将会以你的账号真实发送弹幕（试运行已关闭）。\n\n建议先打开「试运行」观察一段时间。是否继续直接开启？'
        )
    )
    if (!decision.proceed) return
    if (decision.markConfirmed) hasConfirmedAutoBlendRealFire.value = true
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
        <div className='cb-note' style={{ color: '#666', fontSize: '0.9em', marginBottom: '.25em' }}>
          条件满足时，会以你的账号自动发送弹幕。第一次开启建议先打开下方的「试运行」观察效果。
        </div>
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
            <button
              type='button'
              aria-pressed={currentPreset === 'custom'}
              onClick={() => {
                autoBlendPreset.value = 'custom'
                autoBlendAdvancedOpen.value = true
              }}
              style={modeButtonStyle(currentPreset === 'custom')}
              title='保留当前数值并切到自定义；点击后会展开高级设置以便调参。'
            >
              自定义
            </button>
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
              id='autoBlendDryRun'
              type='checkbox'
              checked={autoBlendDryRun.value}
              onInput={e => {
                markCustom()
                autoBlendDryRun.value = e.currentTarget.checked
              }}
            />
            <label for='autoBlendDryRun' title='开启后只在日志里显示会发送什么，不会真的发出。关闭后会真实发送弹幕。'>
              试运行（只观察，不发送）
            </label>
            {!autoBlendDryRun.value && (
              <span style={{ color: '#a15c00', fontSize: '0.85em' }} title='当前关闭试运行，会真实发送弹幕。'>
                关闭后会真实发送
              </span>
            )}
          </span>

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
            <label for='autoBlendSendAllTrending' title='命中后连发同一波里多句达标弹幕，更激进。'>
              一波刷屏全跟
            </label>
            <span style={{ color: '#a15c00' }} title='更激进：命中一波后会连发多条达标弹幕，更容易被风控。'>
              （更激进）
            </span>
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

        <BlacklistPanel />
      </details>
    </details>
  )
}
