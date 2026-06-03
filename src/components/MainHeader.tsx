/**
 * 顶部导航栏
 * 对应旧版 ui/MainHeader.jsx
 * 包含：应用名/版本 / 语言切换 / 关于 / 暗色模式
 */

import { useState } from 'react'
import { Button, Select, Space, Typography, Switch } from 'antd'
import {
  QuestionCircleOutlined,
  InfoCircleOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { usePackStore } from '@/app/store'
import { About } from './About'
import { getFileNameFromPath } from '@/utils/file'
import { getPlatform } from '@/platform'

const { Text } = Typography
export type Language = 'zh-cn' | 'en'
interface LanguagesType {
  value: Language,
  label: string,
}

const languages: LanguagesType[] = [
  { value: 'zh-cn', label: '中文' },
  { value: 'en', label: 'English' },
]

export function MainHeader() {
  const [aboutOpen, setAboutOpen] = useState(false)
  const darkMode = usePackStore((s) => s.darkMode)
  const currentProject = usePackStore(s => s.currentProject);
  const setDarkMode = usePackStore((s) => s.setDarkMode)
  const { t, i18n } = useTranslation()

  const platform = getPlatform()
  const handleLangChange = (value: Language) => {
    i18n.changeLanguage(value)
    if (platform.changeLanguage) {
      platform.changeLanguage(value)
    }
  }

  return (
    <>
      <div className="flex items-center h-14 px-4 border-b border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <InfoCircleOutlined className="text-blue-500 text-xl" />
          <Text strong className="text-base">
            {t('APP_NAME')}
          </Text>
          <Text type="secondary" className="text-xs">
            v{t('APP_VERSION')} {getFileNameFromPath(currentProject ?? "")}
          </Text>
        </div>

        <div className="flex-1" />

        <Space size={8}>
          <Switch
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
            checked={darkMode}
            onChange={setDarkMode}
          />

          <Select
            size="small"
            value={i18n.language as Language}
            onChange={handleLangChange}
            options={languages}
            className="w-[110px]"
          />

          <Button
            type="text"
            icon={<QuestionCircleOutlined />}
            onClick={() => setAboutOpen(true)}
            title={t('MENU_HELP_ABOUT')}
          />
        </Space>
      </div>

      <About open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  )
}
