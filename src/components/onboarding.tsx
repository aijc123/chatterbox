import { appendLog } from '../lib/log'
import { activeTab, autoBlendDryRun, autoBlendPreset, dialogOpen, hasSeenWelcome } from '../lib/store'

const ONBOARDING_STEPS = ['选择一个自动跟车预设', '先测试发送一条普通弹幕', '开启自动跟车试运行观察效果']

export function Onboarding() {
  if (hasSeenWelcome.value || !dialogOpen.value) return null

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

  return (
    <div
      role='dialog'
      aria-label='弹幕助手首次引导'
      style={{
        position: 'fixed',
        right: 'min(336px, calc(100vw - 288px))',
        bottom: '46px',
        zIndex: 2147483647,
        width: 'min(280px, calc(100vw - 24px))',
        border: '1px solid rgba(60, 60, 67, .18)',
        borderRadius: '8px',
        background: 'rgba(255, 255, 255, .96)',
        color: '#1d1d1f',
        boxShadow: '0 18px 48px rgba(0,0,0,.22)',
        padding: '12px',
        fontSize: '12px',
        lineHeight: 1.5,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: '6px' }}>第一次使用弹幕助手</div>
      <ol style={{ margin: '0 0 10px 18px', padding: 0 }}>
        {ONBOARDING_STEPS.map(step => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button type='button' className='cb-btn' onClick={useRecommended}>
          使用建议配置
        </button>
        <button type='button' className='cb-btn' onClick={() => finish('👋 已跳过首次引导。')}>
          跳过
        </button>
      </div>
    </div>
  )
}
