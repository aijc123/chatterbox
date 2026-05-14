import { useEffect, useRef } from 'preact/hooks'

import { appendLog } from '../lib/log'
import { activeTab, autoBlendDryRun, autoBlendPreset, dialogOpen, hasSeenWelcome } from '../lib/store'

const ONBOARDING_STEPS: { title: string; detail: string }[] = [
  {
    title: '选一个自动跟车预设',
    detail: '建议先选「正常」。预设决定多积极地跟车。',
  },
  {
    title: '先手动发一条普通弹幕',
    detail: '确认账号能正常发言，再交给脚本。',
  },
  {
    title: '开启自动跟车「试运行」',
    detail: '试运行只在日志里显示会发什么，不会真的发出去。先观察一会再决定是否真的发送。',
  },
]

export function Onboarding() {
  const firstBtnRef = useRef<HTMLButtonElement>(null)
  const willShow = !hasSeenWelcome.value && dialogOpen.value

  // 首次挂载时把焦点跳到「使用建议配置」按钮（推荐路径）。键盘用户可以直接
  // Enter 接受，或 Tab 浏览其它按钮。useEffect 在条件返回 null 之前调用,
  // hooks 顺序稳定。
  useEffect(() => {
    if (willShow) firstBtnRef.current?.focus()
  }, [willShow])

  if (!willShow) return null

  const finish = (message: string) => {
    hasSeenWelcome.value = true
    appendLog(message)
  }

  const useRecommended = () => {
    autoBlendPreset.value = 'normal'
    autoBlendDryRun.value = true
    activeTab.value = 'fasong'
    finish('👋 已套用新手建议：自动跟车使用正常预设，并先开启试运行。')
  }

  const openAbout = () => {
    activeTab.value = 'about'
    finish('👋 已跳过首次引导，已为你打开「关于」隐私说明。')
  }

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='cb-onboarding-title'
      aria-describedby='cb-onboarding-intro'
      className='cb-floating-surface'
      style={{
        position: 'fixed',
        right: 'min(336px, calc(100vw - 288px))',
        bottom: '46px',
        zIndex: 2147483647,
        width: 'min(300px, calc(100vw - 24px))',
        padding: '12px',
        fontSize: '13px',
        lineHeight: 1.5,
      }}
    >
      <div id='cb-onboarding-title' style={{ fontWeight: 700, marginBottom: '6px' }}>
        第一次使用弹幕助手
      </div>
      <div id='cb-onboarding-intro' className='cb-floating-soft' style={{ marginBottom: '8px', fontSize: '12px' }}>
        弹幕助手可以循环发送弹幕、按热度自动跟车、接管聊天区，并查询粉丝牌房间状态。
      </div>
      <ol style={{ margin: '0 0 10px 18px', padding: 0 }}>
        {ONBOARDING_STEPS.map(step => (
          <li key={step.title} style={{ marginBottom: '4px' }}>
            <div>{step.title}</div>
            <div className='cb-floating-softer' style={{ fontSize: '12px' }}>
              {step.detail}
            </div>
          </li>
        ))}
      </ol>
      <div className='cb-floating-softer' style={{ fontSize: '12px', marginBottom: '8px' }}>
        部分功能（AI 规避、保安室同步、同传）会和外部服务通信，详见「关于 → 隐私说明」。
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button ref={firstBtnRef} type='button' className='cb-btn cb-primary' onClick={useRecommended}>
          使用建议配置
        </button>
        <button type='button' className='cb-btn' onClick={openAbout}>
          查看隐私说明
        </button>
        <button type='button' className='cb-btn' onClick={() => finish('👋 已跳过首次引导。')}>
          跳过
        </button>
      </div>
    </div>
  )
}
