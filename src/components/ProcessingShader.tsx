/**
 * 处理中遮罩层
 * 延迟 100ms 显示以避免短时闪烁
 */
import { useEffect, useState } from 'react'
import { Spin, Typography } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

interface ProcessingShaderProps {
  visible: boolean
  text?: string
}

export function ProcessingShader({ visible, text }: ProcessingShaderProps) {
  const { t } = useTranslation()
  const displayText = text ?? t('PLEASE_WAIT')
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!visible) {
      const hideTimer = setTimeout(() => setShow(false), 0)
      return () => clearTimeout(hideTimer)
    }
    const showTimer = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(showTimer)
  }, [visible])

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
      <div className="flex flex-col items-center gap-4">
        <Spin indicator={<LoadingOutlined className="text-5xl text-white" spin />} />
        <Text className="text-white text-lg">{displayText}</Text>
      </div>
    </div>
  )
}
