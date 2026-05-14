import { useSignal } from '@preact/signals'
import { useEffect } from 'preact/hooks'

import type { MemeSource } from '../lib/meme-sources'

import { type CbTagInfo, fetchCbTags, submitCbMeme, suggestCbTagNames } from '../lib/cb-backend-client'
import { notifyUser } from '../lib/log'

/**
 * 候选梗 → chatterbox-cloud 内嵌提交组件。
 *
 * 行为:
 *  1. 拉后端全量 tag 字典(一小时缓存)
 *  2. 用 source.keywordToTag 命中 + tag 字典反查,推荐一组初始勾选(可改)
 *  3. 显示所有 tag 为可点击 chip;允许用户切换勾选 + 添加自定义 tag(逗号分隔)
 *  4. 点"提交" → POST /memes(进 pending 队列)→ 成功后调 onDone(id)
 *
 * 与 SbhzmSubmitRow 形态对齐(代码风格、按钮位置都一致),用户在两个地方
 * 切换学习成本最低。
 */
export function CbSubmitRow({
  content,
  source,
  onDone,
  onCancel,
}: {
  content: string
  source: MemeSource | null
  /** 提交成功调用,参数为后端返回的新 meme id;调用方据此 ignoreCandidate。 */
  onDone: (newId: number) => void
  /** 用户取消 / 提交完成时关闭。 */
  onCancel: () => void
}) {
  const tags = useSignal<CbTagInfo[] | null>(null)
  const selected = useSignal<Set<string>>(new Set())
  const customInput = useSignal('')
  const loading = useSignal(true)
  const submitting = useSignal(false)
  const error = useSignal<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [allTags, suggested] = await Promise.all([fetchCbTags(), suggestCbTagNames(content, source)])
        if (cancelled) return
        tags.value = allTags
        selected.value = new Set(suggested)
        loading.value = false
      } catch (err) {
        if (cancelled) return
        loading.value = false
        error.value = err instanceof Error ? err.message : String(err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [content])

  const toggleTag = (name: string) => {
    const next = new Set(selected.value)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    selected.value = next
  }

  const collectTagNames = (): string[] => {
    const out = new Set(selected.value)
    // 自定义输入:按逗号 / 中文逗号 / 空格分割。
    for (const piece of customInput.value.split(/[,，\s]+/)) {
      const t = piece.trim()
      if (t) out.add(t)
    }
    return [...out]
  }

  const handleSubmit = async () => {
    if (submitting.value) return
    submitting.value = true
    error.value = null
    try {
      const tagNames = collectTagNames()
      const result = await submitCbMeme(content, { tagNames })
      if (result.dedup) {
        notifyUser('info', `已提交,但库内已有同梗(状态:${result.status})`, content)
      } else {
        notifyUser('success', `已贡献 #${result.id},等待审核`, content)
      }
      onDone(result.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      error.value = msg
      notifyUser('error', `chatterbox-cloud 提交失败`, msg)
    } finally {
      submitting.value = false
    }
  }

  return (
    <div
      style={{
        marginTop: '.3em',
        padding: '.4em',
        background: 'var(--bg2, #f0f7ff)',
        border: '1px solid #007aff',
        borderRadius: '4px',
        fontSize: '11px',
      }}
    >
      <div style={{ marginBottom: '.3em', color: '#666' }}>
        给「<b>{content}</b>」选标签后提交到 <b>chatterbox-cloud</b>。已根据关键词预选了推荐标签,可任意修改。
      </div>

      {loading.value ? (
        <div style={{ color: '#666' }}>正在拉取标签字典…</div>
      ) : !tags.value || tags.value.length === 0 ? (
        <div style={{ color: '#666', marginBottom: '.3em' }}>
          后端字典暂时无 tag{error.value ? `(${error.value})` : ''}。可以无 tag 提交,管理员可后补。
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3em', marginBottom: '.3em' }}>
          {tags.value.map(t => {
            const isOn = selected.value.has(t.name)
            return (
              <button
                key={t.id}
                type='button'
                onClick={() => toggleTag(t.name)}
                title={t.count > 0 ? `已有 ${t.count} 条` : '尚未使用过'}
                style={{
                  appearance: 'none',
                  cursor: 'pointer',
                  padding: '.1em .4em',
                  borderRadius: '999px',
                  border: '1px solid var(--Ga2, #ccc)',
                  background: isOn ? 'var(--cb-accent)' : 'transparent',
                  color: isOn ? '#fff' : 'inherit',
                  fontSize: '11px',
                  fontFamily: 'inherit',
                }}
              >
                {t.emoji ? `${t.emoji} ` : ''}
                {t.name}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ marginBottom: '.3em' }}>
        <input
          type='text'
          value={customInput.value}
          placeholder='额外 tag(逗号分隔,可空)'
          style={{ boxSizing: 'border-box', width: '100%', fontSize: '11px', padding: '.2em' }}
          onInput={e => {
            customInput.value = e.currentTarget.value
          }}
        />
      </div>

      {error.value && !loading.value && (
        <div style={{ color: 'var(--cb-danger-text)', marginBottom: '.3em' }}>{error.value}</div>
      )}

      <div style={{ display: 'flex', gap: '.4em', alignItems: 'center' }}>
        <button
          type='button'
          disabled={submitting.value}
          onClick={() => void handleSubmit()}
          style={{
            cursor: submitting.value ? 'wait' : 'pointer',
            padding: '.15em .8em',
            background: 'var(--cb-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            fontSize: '11px',
          }}
        >
          {submitting.value ? '提交中…' : `提交(已选 ${selected.value.size} 个标签)`}
        </button>
        <button
          type='button'
          disabled={submitting.value}
          onClick={onCancel}
          style={{ cursor: 'pointer', padding: '.15em .8em', fontSize: '11px' }}
        >
          取消
        </button>
        <span style={{ color: '#888', marginLeft: 'auto', fontSize: '10px' }}>API:POST /memes(等管理员审核)</span>
      </div>
    </div>
  )
}
