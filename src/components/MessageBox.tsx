/**
 * 通用消息弹窗
 * 对应旧版 ui/MessageBox.jsx
 * 支持自定义内容和按钮列表
 */

import { Modal, Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { usePackStore } from '@/app/store'

export interface MessageBoxButton {
  caption: string
  callback?: () => void
}

export function MessageBox() {
  const msg = usePackStore((s) => s.messageBox)
  const setMessageBox = usePackStore((s) => s.setMessageBox)
  const { t } = useTranslation()

  if (!msg) return null

  const buttons: Record<string, MessageBoxButton> = msg.buttons || {
    ok: { caption: t('OK') },
  }

  const handleClose = () => setMessageBox(null)

  return (
    <Modal
      open
      onCancel={handleClose}
      footer={null}
      closable={false}
      width={400}
      centered
    >
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        {msg.content}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Space>
          {Object.entries(buttons).map(([key, btn]) => (
            <Button
              key={key}
              type={key === 'ok' ? 'primary' : 'default'}
              onClick={() => {
                btn.callback?.()
                handleClose()
              }}
            >
              {btn.caption}
            </Button>
          ))}
        </Space>
      </div>
    </Modal>
  )
}
