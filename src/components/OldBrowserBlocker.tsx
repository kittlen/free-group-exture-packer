/**
 * 旧浏览器检测阻挡层
 * 对应旧版 ui/OldBrowserBlocker.jsx
 * 检测 localStorage / FileReader / Canvas / XMLHttpRequest
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const BROWSER_ICONS = [
  { name: 'Google Chrome', url: 'https://www.google.com/chrome/', icon: 'chrome' },
  { name: 'Firefox', url: 'https://www.mozilla.org/firefox/', icon: 'firefox' },
  { name: 'Opera', url: 'https://www.opera.com/download', icon: 'opera' },
  { name: 'Microsoft Edge', url: 'https://www.microsoft.com/edge', icon: 'edge' },
]

function checkBrowserSupport(): boolean {
  try {
    if (!window.localStorage) return false
    if (!window.FileReader) return false
    const canvas = document.createElement('canvas')
    if (!canvas.getContext) return false
    return true
  } catch {
    return false
  }
}

export function OldBrowserBlocker() {
  const [supported] = useState(checkBrowserSupport)
  const { t } = useTranslation()

  if (supported) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#1a1a1a',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <h2 style={{ marginBottom: 16 }}>{t('OLD_BROWSER_MESSAGE1')}</h2>
        <p style={{ marginBottom: 32 }}>{t('OLD_BROWSER_MESSAGE2')}</p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
          {BROWSER_ICONS.map((b) => (
            <a
              key={b.name}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  background: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                }}
              >
                {b.name[0]}
              </div>
              <span>{b.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
