/**
 * Ant Design 语言包映射
 * 将应用的 en/zh-cn 语言标识映射到 Ant Design 的 Locale 对象
 */
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import type { Locale } from 'antd/es/locale'

/** 语言标识 → Ant Design Locale 映射表 */
export const antdLocaleMap: Record<string, Locale> = {
  'en': enUS,
  'zh-cn': zhCN,
}
