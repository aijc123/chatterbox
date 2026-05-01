import { useSignal } from '@preact/signals'

import { notifyUser } from '../lib/log'
import { cachedEmoticonPackages } from '../lib/store'

export function EmoteIds() {
  const packages = cachedEmoticonPackages.value
  const copiedId = useSignal<string | null>(null)

  if (packages.length === 0) {
    return (
      <div className='cb-empty' style={{ color: '#999' }}>
        表情数据加载中…
      </div>
    )
  }

  const handleCopy = async (unique: string) => {
    try {
      await navigator.clipboard.writeText(unique)
    } catch {
      notifyUser('error', '复制表情 ID 失败，请手动复制', unique)
      return
    }
    copiedId.value = unique
    setTimeout(() => {
      if (copiedId.peek() === unique) copiedId.value = null
    }, 1500)
  }

  return (
    <>
      {packages.map(pkg => (
        <div key={pkg.pkg_id} style={{ marginBottom: '.75em' }}>
          <div
            className='cb-heading'
            style={{
              fontWeight: 'bold',
              marginBottom: '.25em',
              color: '#666',
              fontSize: '11px',
            }}
          >
            {pkg.pkg_name}
            <span style={{ fontWeight: 'normal', marginLeft: '.5em' }}>({pkg.emoticons.length})</span>
          </div>
          <div className='cb-row' style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {pkg.emoticons.map(emo => {
              const isCopied = copiedId.value === emo.emoticon_unique
              return (
                <button
                  type='button'
                  key={emo.emoticon_id}
                  className='cb-emote'
                  data-copied={isCopied}
                  title={`${emo.emoji}\n点击复制: ${emo.emoticon_unique}`}
                  onClick={() => void handleCopy(emo.emoticon_unique)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    border: '1px solid var(--Ga2, #ddd)',
                    borderRadius: '3px',
                    background: isCopied ? '#36a185' : 'var(--bg2, #f5f5f5)',
                    color: isCopied ? '#fff' : '#555',
                    cursor: 'pointer',
                    fontSize: '10px',
                    lineHeight: 1.6,
                    transition: 'background .15s, color .15s',
                  }}
                >
                  <img
                    src={emo.url}
                    alt={emo.emoji}
                    style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                    loading='lazy'
                  />
                  {isCopied ? '已复制' : emo.emoji}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}
