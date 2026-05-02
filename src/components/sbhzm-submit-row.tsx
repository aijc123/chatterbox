import { useSignal } from '@preact/signals'
import { useEffect } from 'preact/hooks'

import type { MemeSource } from '../lib/meme-sources'

import { notifyUser } from '../lib/log'
import { fetchSbhzmTags, inferSbhzmTagIds, type SbhzmTagInfo, submitSbhzmMeme } from '../lib/sbhzm-client'

/**
 * 内联 tag 选择 + 上传组件。
 *
 * 用户点候选梗的"提交到灰泽满"按钮 → 这个组件挂上来，做以下事：
 *  1. 拉 sbhzm 全量 tag 字典（一小时缓存）
 *  2. 用 source.keywordToTag 自动推荐一组初始勾选（用户可改）
 *  3. 显示所有 tag 为可点击 chip；用户切换勾选状态
 *  4. 点"上传" → POST /api/admin/memes → 成功后调用 onDone(id)
 *
 * 失败时只 toast 不消除候选——让用户能重试或手动去网站。
 */
export function SbhzmSubmitRow({
  content,
  source,
  onDone,
  onCancel,
}: {
  content: string
  source: MemeSource
  /** 上传成功时调用，参数为后端返回的新 meme id；调用方据此 ignoreCandidate。 */
  onDone: (newId: number) => void
  /** 用户点取消，或上传完成时关闭。 */
  onCancel: () => void
}) {
  const tags = useSignal<SbhzmTagInfo[] | null>(null)
  const selected = useSignal<Set<number>>(new Set())
  const loadingTags = useSignal(true)
  const submitting = useSignal(false)
  const error = useSignal<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [allTags, inferred] = await Promise.all([fetchSbhzmTags(), inferSbhzmTagIds(content, source)])
        if (cancelled) return
        tags.value = allTags
        selected.value = new Set(inferred)
        loadingTags.value = false
      } catch (err) {
        if (cancelled) return
        loadingTags.value = false
        error.value = err instanceof Error ? err.message : String(err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [content])

  const toggleTag = (id: number) => {
    const next = new Set(selected.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selected.value = next
  }

  const handleSubmit = async () => {
    if (submitting.value) return
    submitting.value = true
    error.value = null
    try {
      const result = await submitSbhzmMeme(content, [...selected.value])
      notifyUser('success', `已提交到 ${source.name}（ID: ${result.id}）`, content)
      onDone(result.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      error.value = msg
      notifyUser('error', `${source.name} 上传失败`, msg)
    } finally {
      submitting.value = false
    }
  }

  return (
    <div
      style={{
        marginTop: '.3em',
        padding: '.4em',
        background: 'var(--bg2, #f6fff8)',
        border: '1px solid #10b981',
        borderRadius: '4px',
        fontSize: '11px',
      }}
    >
      <div style={{ marginBottom: '.3em', color: '#666' }}>
        给「<b>{content}</b>」选标签后上传到 <b>{source.name}</b>。已根据关键词预选了推荐标签，可任意修改。
      </div>

      {loadingTags.value ? (
        <div style={{ color: '#666' }}>正在拉取标签字典…</div>
      ) : !tags.value || tags.value.length === 0 ? (
        <div style={{ color: '#a00' }}>
          没拉到标签字典{error.value ? `（${error.value}）` : ''}。可以无标签上传，站长会后台补 tag。
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3em', marginBottom: '.3em' }}>
          {tags.value.map(t => {
            const isOn = selected.value.has(t.id)
            return (
              <button
                key={t.id}
                type='button'
                onClick={() => toggleTag(t.id)}
                title={`tag id=${t.id}`}
                style={{
                  appearance: 'none',
                  cursor: 'pointer',
                  padding: '.1em .4em',
                  borderRadius: '999px',
                  border: '1px solid var(--Ga2, #ccc)',
                  background: isOn ? '#10b981' : 'transparent',
                  color: isOn ? '#fff' : 'inherit',
                  fontSize: '11px',
                  fontFamily: 'inherit',
                }}
              >
                {t.name}
              </button>
            )
          })}
        </div>
      )}

      {error.value && !loadingTags.value && tags.value && tags.value.length > 0 && (
        <div style={{ color: '#a00', marginBottom: '.3em' }}>{error.value}</div>
      )}

      <div style={{ display: 'flex', gap: '.4em', alignItems: 'center' }}>
        <button
          type='button'
          disabled={submitting.value}
          onClick={() => void handleSubmit()}
          style={{
            cursor: submitting.value ? 'wait' : 'pointer',
            padding: '.15em .8em',
            background: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            fontSize: '11px',
          }}
        >
          {submitting.value ? '上传中…' : `上传（已选 ${selected.value.size} 个标签）`}
        </button>
        <button
          type='button'
          disabled={submitting.value}
          onClick={onCancel}
          style={{ cursor: 'pointer', padding: '.15em .8em', fontSize: '11px' }}
        >
          取消
        </button>
        <span style={{ color: '#888', marginLeft: 'auto', fontSize: '10px' }}>
          API：POST /api/admin/memes（无鉴权）
        </span>
      </div>
    </div>
  )
}
