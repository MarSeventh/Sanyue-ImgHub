import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN.json'
import en from './en.json'

const LOCALE_KEY = 'app-locale'

function getStoredLocale() {
  const stored = localStorage.getItem(LOCALE_KEY)
  if (stored === 'zh-CN' || stored === 'en') return stored
  return 'zh-CN'
}

const i18n = createI18n({
  legacy: true,
  locale: getStoredLocale(),
  fallbackLocale: 'zh-CN',
  messages: { 'zh-CN': zhCN, en }
})

export function setLocale(locale) {
  i18n.global.locale = locale
  localStorage.setItem(LOCALE_KEY, locale)
  document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : 'en'
}

export { LOCALE_KEY, getStoredLocale }
export default i18n
