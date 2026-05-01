import { useSignal } from '@preact/signals'

import { exportSettings, importSettings } from '../../lib/backup'
import { notifyUser } from '../../lib/log'

export function BackupSection({ query = '' }: { query?: string }) {
  const importOpen = useSignal(false)
  const importText = useSignal('')
  const importMsg = useSignal('')
  const visible = !query || '配置备份 恢复 导出 导入 JSON 复制 backup export import'.toLowerCase().includes(query)
  if (!visible) return null

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
    navigator.clipboard.writeText(json).then(
      () => notifyUser('success', '配置已复制到剪贴板'),
      () => notifyUser('error', '复制配置失败，请手动复制')
    )
  }

  function handleImport() {
    const result = importSettings(importText.value)
    if (!result.ok) {
      importMsg.value = `❌ 导入失败：${result.error}`
      notifyUser('error', '配置导入失败', result.error)
      return
    }
    importMsg.value = `✅ 已导入 ${result.count} 项，请刷新页面生效`
    notifyUser('success', `配置导入成功（${result.count} 项），请刷新页面`)
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
              <span style={{ fontSize: '0.85em', color: importMsg.value.startsWith('✅') ? '#4caf50' : '#f44336' }}>
                {importMsg.value}
              </span>
            )}
          </div>
        )}
        <p style={{ color: '#999', fontSize: '0.8em', margin: '.25em 0 0' }}>
          导出包含所有设置、模板、替换规则和跟车配置（不含烂梗缓存）。
        </p>
      </div>
    </details>
  )
}
