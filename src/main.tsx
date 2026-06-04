/**
 * 应用入口
 * React 19 + Vite + Ant Design 启动配置
 */
import React, { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ConfigProvider, App as AntApp } from 'antd'
import LoadingView from './components/Loading.tsx'
import './app/i18n'

/** 全局错误边界，捕获渲染阶段的未捕获异常 */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: Error) {
    console.error('应用错误:', error)
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 40, textAlign: 'center' }}>应用发生错误，请刷新页面重试</div>
    }
    return this.props.children
  }
}

/** 挂载 React 应用 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<LoadingView />}>
        <ConfigProvider>
          <AntApp>
            <App />
          </AntApp>
        </ConfigProvider>
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
)
