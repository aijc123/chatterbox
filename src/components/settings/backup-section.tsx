import { useSignal } from '@preact/signals'

import { exportSettings, importSettings } from '../../lib/backup'
import { copyTextToClipboard } from '../../lib/clipboard'
import { notifyUser } from '../../lib/log'
import { matchesSearchQuery } from './search'

export function BackupSection({ query = '' }: { query?: string }) {
  const importOpen = useSignal(false)
  const importText = useSignal('')
  const importMsg = useSignal('')
  if (!matchesSearchQuery('配置备份 恢复 导出 导入 JSON 复制 backup export import 设置导出 设置导入', query))
    return null

  function handleExport() {
    const json = exportSettings()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chatterbox-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    notifyUser('success', '配置已导出')
  }

  function handleCopyExport() {
    const json = exportSettings()
    void copyTextToClipboard(json).then(ok => {
      if (ok) notifyUser('success', '配置已复制到剪贴板')
      else notifyUser('error', '复制配置失败，请手动复制', '可改用「导出配置」下载文件')
    })
  }

  function handleImport() {
    const result = importSettings(importText.value)
    if (!result.ok) {
      importMsg.value = `❌ 导入失败：${result.error}（常见原因：JSON 格式错误，或来自不兼容的旧版本）`
      notifyUser('error', '配置导入失败', result.error)
      return
    }
    // Build a single message that names the rejected fields. Without this,
    // a corrupted backup that drops 5 fields out of 60 imports cleanly with
    // no signal — the user later wonders why their auto-blend cooldown
    // reverted to default.
    const skippedNote =
      result.skipped && result.skipped.length > 0
        ? `（${result.skipped.length} 项格式不匹配被跳过：${result.skipped.join('、')}）`
        : ''
    const unknownNote =
      result.unknownKeys && result.unknownKeys.length > 0
        ? `（${result.unknownKeys.length} 项未识别 key 被忽略：${result.unknownKeys.join('、')}）`
        : ''
    importMsg.value = `✅ 已导入 ${result.count} 项，请刷新页面生效${skippedNote}${unknownNote}`
    notifyUser('success', `配置导入成功（${result.count} 项），请刷新页面`)
    if (result.skipped && result.skipped.length > 0) {
      notifyUser('warning', '部分配置因格式不匹配被跳过', result.skipped.join('、'))
    }
  }

  return (
    <details className='cb-settings-accordion'>
      <summary>配置备份 / 恢复</summary>
      <div className='cb-section cb-stack' style={{ margin: '.5em 0', paddingBottom: '1em' }}>
        <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.5em' }}>
          配置备份 / 恢复
        </div>
        <div className='cb-row' style={{ display: 'flex', gap: '.5em', flexWrap: 'wrap' }}>
          <button className='cb-btn' onClick={handleExport} title='下载配置 JSON 文件' type='button'>
            导出配置
          </button>
          <button className='cb-btn' onClick={handleCopyExport} title='复制配置 JSON 到剪贴板' type='button'>
            复制 JSON
          </button>
          <button
            className='cb-btn'
            onClick={() => {
              importOpen.value = !importOpen.value
              importMsg.value = ''
            }}
            type='button'
          >
            {importOpen.value ? '取消导入' : '导入配置'}
          </button>
        </div>
        {importOpen.value && (
          <div className='cb-stack' style={{ marginTop: '.5em', gap: '.5em' }}>
            <div className='cb-note' style={{ color: '#a15c00', fontSize: '0.85em' }}>
              ⚠️ 导入会覆盖现有设置，包括同步密钥、Soniox API Key 和保安室地址。建议导入前先备份当前配置。
            </div>
            <details style={{ fontSize: '0.85em' }}>
              <summary style={{ cursor: 'pointer', color: '#666' }}>查看示例 JSON 结构</summary>
              <pre
                style={{
                  background: 'var(--bg2, #f5f5f5)',
                  padding: '.5em',
                  borderRadius: '4px',
                  fontSize: '0.8em',
                  overflowX: 'auto',
                  margin: '.25em 0 0',
                  whiteSpace: 'pre',
                }}
              >
                {`{
  "__version": 1,
  "__exportedAt": "2026-01-15T10:30:00.000Z",
  "msgSendInterval": 4,
  "autoBlendPreset": "normal",
  "autoBlendDryRun": true,
  "MsgTemplates": [{ "name": "默认", "msg": "..." }],
  "customChatEnabled": false,
  ...
}`}
              </pre>
            </details>
            <textarea
              style={{ width: '100%', height: '80px', fontFamily: 'monospace', fontSize: '0.8em', resize: 'vertical' }}
              placeholder='粘贴配置 JSON...'
              value={importText.value}
              onInput={e => {
                importText.value = e.currentTarget.value
                importMsg.value = ''
              }}
            />
            <button className='cb-btn' onClick={handleImport} disabled={!importText.value.trim()} type='button'>
              确认导入（刷新后生效）
            </button>
            {importMsg.value && (
              <span
                role='status'
                aria-live='polite'
                style={{ fontSize: '0.85em', color: importMsg.value.startsWith('✅') ? '#4caf50' : '#f44336' }}
              >
                {importMsg.value}
              </span>
            )}
          </div>
        )}
        <p style={{ color: '#666', fontSize: '0.8em', margin: '.25em 0 0' }}>
          导出包含所有设置、模板、替换规则和跟车配置（不含烂梗缓存）。
        </p>
      </div>
    </details>
  )
}
