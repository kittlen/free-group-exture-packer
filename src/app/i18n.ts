/**
 * i18n 国际化初始化
 * 使用 i18next + HttpBackend（加载 JSON 翻译文件）
 * 支持 en / zh-cn 两种语言
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpBackend from 'i18next-http-backend'

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh-cn'],
    backend: {
      loadPath: './static/locales/{{lng}}/translation.json',
    },
    // debug: true,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 't-packer-locale',
      convertDetectedLanguage: (lng) => lng.toLowerCase().split('-')[0] + '-' + lng.split('-')[1]
    },
    load: "currentOnly",
    lowerCaseLng: true,
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
