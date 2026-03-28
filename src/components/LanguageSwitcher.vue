<template>
  <span class="language-switcher" @click="toggleLocale" role="button" :title="$t('language.switchTo')">
    <font-awesome-icon icon="globe" class="lang-icon" />
  </span>
</template>

<script>
import { setLocale } from '@/locales'

export default {
  name: 'LanguageSwitcher',
  computed: {
    isZh() {
      return this.$i18n.locale === 'zh-CN'
    }
  },
  methods: {
    toggleLocale() {
      const next = this.isZh ? 'en' : 'zh-CN'
      setLocale(next)
    }
  }
}
</script>

<style scoped>
.language-switcher {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  transition: all 0.3s ease;
}

.lang-icon {
  font-size: 1.2em;
}
</style>
