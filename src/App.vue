<template>
  <router-view/>
</template>

<script>
import { mapGetters } from 'vuex'
import { OverlayScrollbars } from 'overlayscrollbars'

export default {
  computed: {
    ...mapGetters(['userConfig', 'useDarkMode'])
  },
  mounted() {
    // 初始化 OverlayScrollbars 悬浮滚动条
    this.$nextTick(() => {
      this.initOverlayScrollbars()
    })
  },
  watch: {
    useDarkMode() {
      this.setSiteIcon()
    }
  },
  methods: {
    initOverlayScrollbars() {
      try {
        // 检查是否已经初始化
        if (OverlayScrollbars.valid(document.body)) {
          return
        }
        
        // 应用到 body 实现全局悬浮滚动条
        OverlayScrollbars(document.body, {
          scrollbars: {
            theme: 'os-theme-dark',
            visibility: 'auto',
            autoHide: 'scroll',
            autoHideDelay: 600,
            dragScroll: true,
            clickScroll: true
          },
          overflow: {
            x: 'hidden',
            y: 'scroll'
          }
        })
        
        console.log('OverlayScrollbars initialized successfully')
      } catch (error) {
        console.error('Failed to initialize OverlayScrollbars:', error)
      }
    },
    setSiteIcon() {
      // 同时更改 icon apple-touch-icon 和 mask-icon
      const existingIcons = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="mask-icon"]');
      existingIcons.forEach(icon => icon.remove());

      const iconLink = document.createElement('link');
      const appleIconLink = document.createElement('link');
      const maskIconLink = document.createElement('link');
      iconLink.rel = 'icon';
      appleIconLink.rel = 'apple-touch-icon';
      maskIconLink.rel = 'mask-icon';

      if (this.useDarkMode) {
          iconLink.href = this.userConfig?.siteIcon || '/logo-dark.png';
          appleIconLink.href = this.userConfig?.siteIcon || '/logo-dark.png';
          maskIconLink.href = this.userConfig?.siteIcon || '/logo-dark.png';
      } else {
          iconLink.href = this.userConfig?.siteIcon || '/logo.png';
          appleIconLink.href = this.userConfig?.siteIcon || '/logo.png';
          maskIconLink.href = this.userConfig?.siteIcon || '/logo.png';
      }

      document.head.appendChild(iconLink);
      document.head.appendChild(appleIconLink);
      document.head.appendChild(maskIconLink);
    }
  }
}
</script>
