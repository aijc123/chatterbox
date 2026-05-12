import { Component, type ComponentChildren } from 'preact'

interface ErrorBoundaryProps {
  children: ComponentChildren
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: unknown): void {
    console.error('[Chatterbox] UI crashed', error, errorInfo)
  }

  private handleReload = () => {
    this.setState({ error: null })
    location.reload()
  }

  override render({ children }: ErrorBoundaryProps, { error }: ErrorBoundaryState) {
    if (!error) return children

    return (
      <div
        className='cb-floating-surface cb-error-surface lc-fixed lc-right-2 lc-bottom-[46px] lc-z-[2147483647] lc-w-[320px] lc-max-w-[calc(100vw_-_16px)]'
        style={{
          padding: '12px',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Chatterbox 面板遇到错误</div>
        <div style={{ fontSize: '13px', lineHeight: 1.5, marginBottom: '10px' }}>
          为了避免整个页面功能失效，已停止渲染当前面板。你可以刷新页面后继续使用。
        </div>
        <button type='button' className='cb-button' onClick={this.handleReload}>
          刷新页面
        </button>
      </div>
    )
  }
}
