<template>
  <el-config-provider :locale="elementLocale">
    <router-view/>
    <el-dialog
      v-model="adminAuthWarningVisible"
      :title="$t('adminAuthWarning.title')"
      :width="'min(480px, 90vw)'"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <el-alert
        :title="$t('adminAuthWarning.message')"
        type="warning"
        show-icon
        :closable="false"
        class="admin-auth-warning-message"
      />
      <template #footer>
        <el-button @click="openSecuritySettings">{{ $t('adminAuthWarning.configure') }}</el-button>
        <el-button type="primary" @click="$store.commit('dismissAdminAuthWarning')">{{ $t('adminAuthWarning.close') }}</el-button>
      </template>
    </el-dialog>
  </el-config-provider>
</template>

<script>
import { mapGetters } from 'vuex'
import { OverlayScrollbars } from 'overlayscrollbars'
import zhCnLocale from 'element-plus/es/locale/lang/zh-cn'
import enLocale from 'element-plus/es/locale/lang/en'

export default {
  data() {
    return {
      osInstance: null,
      imageViewerObserver: null
    }
  },
  computed: {
    adminAuthWarningVisible: {
      get() { return this.$store.state.adminAuthWarningVisible },
      set(value) { if (!value) this.$store.commit('dismissAdminAuthWarning') }
    },
    ...mapGetters(['userConfig', 'useDarkMode']),
    elementLocale() {
      return this.$i18n.locale === 'zh-CN' ? zhCnLocale : enLocale
    }
  },
  mounted() {
    // 初始化 OverlayScrollbars 悬浮滚动条
    this.$nextTick(() => {
      this.initOverlayScrollbars()
      this.setupImageViewerObserver()
    })
  },
  beforeUnmount() {
    // 清理 MutationObserver
    if (this.imageViewerObserver) {
      this.imageViewerObserver.disconnect()
    }
  },
  watch: {
  },
  methods: {
    openSecuritySettings() {
      this.$store.commit('dismissAdminAuthWarning')
      this.$router.push('/systemConfig#security')
    },
    initOverlayScrollbars() {
      try {
        // 检查是否已经初始化
        if (OverlayScrollbars.valid(document.body)) {
          this.osInstance = OverlayScrollbars(document.body)
          return
        }
        
        // 应用到 body 实现全局悬浮滚动条
        this.osInstance = OverlayScrollbars(document.body, {
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
    setupImageViewerObserver() {
      // 监听图片预览器的打开/关闭，动态控制 OverlayScrollbars
      this.imageViewerObserver = new MutationObserver((mutations) => {
        const imageViewer = document.querySelector('.el-image-viewer__wrapper')
        if (imageViewer) {
          // 图片预览器打开，禁用滚动
          if (this.osInstance) {
            this.osInstance.options({ overflow: { x: 'hidden', y: 'hidden' } })
          }
        } else {
          // 图片预览器关闭，恢复滚动
          if (this.osInstance) {
            this.osInstance.options({ overflow: { x: 'hidden', y: 'scroll' } })
          }
        }
      })
      
      this.imageViewerObserver.observe(document.body, {
        childList: true,
        subtree: true
      })
    }
  }
}
</script>

<style scoped>
.admin-auth-warning-message {
  text-align: left;
  border: 1px solid var(--el-color-warning-light-5);
  background-color: var(--el-color-warning-light-9);
  padding: 16px;
}
.admin-auth-warning-message :deep(.el-alert__title) {
  text-align: left;
  font-size: 15px;
  line-height: 1.7;
}
</style>
