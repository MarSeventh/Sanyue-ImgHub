<template>
    <div class="container">
        <el-header>
            <div class="header-content admin-header-content">
                <DashboardTabs activeTab="systemConfig"></DashboardTabs>
                <div class="header-action">
                    <el-tooltip :disabled="disableTooltip" :content="$t('sysConfig.logout')" placement="bottom">
                        <font-awesome-icon icon="sign-out-alt" class="header-icon" @click="handleLogout"></font-awesome-icon>
                    </el-tooltip>
                </div>
            </div>
        </el-header>
        <SysConfigTabs
            v-model:activeIndex="activeIndex"
            v-model:isCollapse="isSidebarCollapse"
        />
        <!-- 根据锚点动态渲染子页面 -->
        <component :is="currentComponent" :class="['main-container', { 'collapsed': isSidebarCollapse }]" />
    </div>
</template>
<script>
import DashboardTabs from '@/components/DashboardTabs.vue';
import SysConfigTabs from '@/components/config/SysConfigTabs.vue';
import SysCogStatus from '@/components/config/SysCogStatus.vue';
import SysCogUpload from '@/components/config/SysCogUpload.vue';
import SysCogSecurity from '@/components/config/SysCogSecurity.vue';
import SysCogPage from '@/components/config/SysCogPage.vue';
import SysCogOthers from '@/components/config/SysCogOthers.vue';
import backgroundManager from '@/mixins/backgroundManager';

export default {
    name: 'SystemConfig',
    mixins: [backgroundManager],
    data() {
        return {
            activeIndex: 'status',
            isSidebarCollapse: false
        }
    },
    watch: {
        // 监听锚点变化
        '$route.hash': {
            immediate: true,
            handler(newHash) {
                this.activeIndex = newHash.replace('#', '');
                window.scrollTo(0, 0); // 滚动到页面顶部
            }
        },
        activeIndex(newIndex) {
            // 更新锚点
            const hash = `#${newIndex}`;
            this.$router.push({ hash });
        }
    },
    components: {
        DashboardTabs,
        SysConfigTabs,
        SysCogStatus,
        SysCogUpload,
        SysCogSecurity,
        SysCogPage,
        SysCogOthers
    },
    computed: {
        disableTooltip() {
            return window.innerWidth < 768;
        },
        // 根据锚点动态返回对应的组件
        currentComponent() {
            const hash = this.$route.hash.replace('#', '');
            switch (hash) {
                case 'status':
                    return SysCogStatus;
                case 'upload':
                    return SysCogUpload;
                case 'security':
                    return SysCogSecurity;
                case 'page':
                    return SysCogPage;
                case 'others':
                    return SysCogOthers;
                default:
                    return SysCogStatus;
            }
        }
    },
    methods: {
        handleLogout() {
            const url = process.env.NODE_ENV === 'production' ? '/api/auth/logout' : '/api/api/auth/logout';
            fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ authType: 'admin' })
            }).finally(() => {
                this.$store.commit('setAdminLoggedIn', false);
                this.$router.push('/adminLogin');
            });
        },
        // 设置默认锚点
        setDefaultHash() {
            const defaultHash = '#status'; // 默认锚点
            window.location.hash = defaultHash;
            this.activeIndex = defaultHash.replace('#', '');
        },
    },
    mounted() {
        // 初始化背景图
        this.initializeBackground('adminBkImg', '.container', false, true);

        // 如果 URL 中没有锚点，则设置默认锚点
        if (!window.location.hash) {
            this.setDefaultHash();
        }
    },
}
</script>
<style scoped src="@/styles/admin-pagination.css"></style>
<style scoped>
.container {
    background: var(--admin-container-bg-color);
    min-height: 100vh;
    font-family: 'Arial', sans-serif;
    color: var(--admin-container-color);
    margin: 0;
    padding: 0;
    overflow-x: hidden;
}

.main-container {
  margin-top: 60px;
  transition: margin-left 0.3s ease, width 0.3s ease; /* 添加过渡效果 */
  width: calc(100% - 280px); /* 默认宽度（侧边栏展开时） */
  margin-left: 170px; /* 默认左边距（侧边栏展开时） */
}

.main-container.collapsed {
  width: calc(100% - 150px); /* 折叠时的宽度 */
  margin-left: 80px; /* 折叠时的左边距 */
}

/* 移动端不压缩内容，但让出折叠侧边栏宽度 */
@media (max-width: 768px) {
  .main-container,
  .main-container.collapsed {
    width: auto;
    margin-left: 65px;
    margin-right: 15px;
    padding: 0;
    min-height: calc(100vh - 60px);
    box-sizing: border-box;
  }
}
</style>
