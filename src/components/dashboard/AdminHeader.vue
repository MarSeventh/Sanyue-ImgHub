<template>
    <header class="admin-header-spacer" :class="{ 'has-search': !!$slots.search }" :style="{ '--admin-header-reserved-space': reservedSpace }">
        <div ref="headerContent" class="admin-header-content" :style="{ '--admin-header-scroll-progress': headerScrollProgress }">
            <DashboardTabs :active-tab="activeTab" />
            <div class="admin-header-tools">
                <div v-if="$slots.search" class="admin-header-search">
                    <slot name="search" />
                </div>
                <AdminHeaderActions
                    :show-link-format="showLinkFormat"
                    :disable-tooltip="isMobile"
                    @link-format="$emit('link-format')"
                    @logout="handleLogout"
                />
            </div>
        </div>
    </header>
</template>

<script>
import DashboardTabs from '@/components/DashboardTabs.vue';
import AdminHeaderActions from './AdminHeaderActions.vue';
import { OverlayScrollbars } from 'overlayscrollbars';

export default {
    name: 'AdminHeader',
    components: { DashboardTabs, AdminHeaderActions },
    props: {
        activeTab: { type: String, default: 'dashboard' },
        showLinkFormat: Boolean
    },
    emits: ['link-format'],
    data() {
        return { isMobile: window.innerWidth <= 768, reservedSpace: null, headerScrollProgress: 0 };
    },
    methods: {
        getHeaderScrollElements() {
            return OverlayScrollbars(document.body)?.elements();
        },
        getHeaderScrollPosition() {
            const scroller = this.getHeaderScrollElements()?.scrollOffsetElement || document.scrollingElement;
            return Math.max(0, scroller?.scrollTop || 0);
        },
        updateHeaderScrollProgress() {
            this.headerScrollProgress = Math.min(this.getHeaderScrollPosition() / 80, 1);
        },
        handleHeaderScroll(event) {
            const elements = this.getHeaderScrollElements();
            // 弹窗、表格等内部滚动不改变页面顶栏。
            if (![document, window, document.scrollingElement, elements?.scrollEventElement, elements?.scrollOffsetElement].includes(event.target)) return;
            if (this.headerScrollFrame !== null) return;
            this.headerScrollFrame = requestAnimationFrame(() => {
                this.headerScrollFrame = null;
                this.updateHeaderScrollProgress();
            });
        },
        updateViewport() {
            this.isMobile = window.innerWidth <= 768;
            this.updateHeaderScrollProgress();
            this.measureReservedSpace();
        },
        measureReservedSpace() {
            const header = this.$refs.headerContent;
            this.reservedSpace = `${header.offsetTop + header.offsetHeight + 12}px`;
        },
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
        }
    },
    mounted() {
        this.headerScrollFrame = null;
        this.updateHeaderScrollProgress();
        document.addEventListener('scroll', this.handleHeaderScroll, { capture: true, passive: true });
        this.measureReservedSpace();
        this.headerResizeObserver = new ResizeObserver(this.measureReservedSpace);
        this.headerResizeObserver.observe(this.$refs.headerContent);
        window.addEventListener('resize', this.updateViewport, { passive: true });
    },
    beforeUnmount() {
        document.removeEventListener('scroll', this.handleHeaderScroll, true);
        if (this.headerScrollFrame !== null) cancelAnimationFrame(this.headerScrollFrame);
        this.headerResizeObserver.disconnect();
        window.removeEventListener('resize', this.updateViewport);
    }
};
</script>

<style scoped>
.admin-header-spacer {
    height: 60px;
    flex: 0 0 auto;
}

.admin-header-tools {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
    margin-left: auto;
}

.admin-header-search {
    display: flex;
    align-items: center;
    min-width: 0;
}

.admin-header-search :deep(.filter-trigger) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--admin-header-action-size, 32px);
    height: var(--admin-header-action-size, 32px);
    font-size: var(--admin-header-action-font-size, 20px);
}

.admin-header-search :deep(.filter-trigger .header-icon) {
    width: 1em;
    height: 1em;
    font-size: inherit;
}

.admin-header-search :deep(.filter-badge) {
    display: inline-flex;
    align-items: center;
}

@media (max-width: 768px) {
    .admin-header-spacer {
        height: var(--admin-header-reserved-space, 76px);
    }

    .admin-header-spacer.has-search {
        height: var(--admin-header-reserved-space, 114px);
    }

    .admin-header-search {
        order: 3;
        flex: 1 0 100%;
    }

    .admin-header-tools {
        display: contents;
    }

    .admin-header-content :deep(.admin-header-actions) {
        margin-left: auto;
    }
}

.admin-header-content {
    --admin-header-gutter: calc(8px + (clamp(12px, 2.5vw, 48px) - 8px) * var(--admin-header-scroll-progress, 0));
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    box-sizing: border-box;
    min-height: 45px;
    padding: 10px calc(12px + (clamp(12px, 1.5vw, 24px) - 12px) * var(--admin-header-scroll-progress, 0));
    position: fixed;
    top: 8px;
    left: 50%;
    width: calc(100% - var(--admin-header-gutter) * 2);
    z-index: 2001;
    border: 1px solid transparent;
    border-radius: 16px;
    transform: translateX(-50%);
    transition: width 0.15s ease, padding-inline 0.15s ease;
}

/* 背景单独渐显，文字、控件和下拉菜单始终保持清晰。 */
.admin-header-content::before {
    content: "";
    position: absolute;
    inset: -1px;
    z-index: -1;
    pointer-events: none;
    border: 1px solid var(--glass-border);
    border-radius: inherit;
    background: var(--glass-bg);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(var(--glass-backdrop-blur)) saturate(1.4);
    -webkit-backdrop-filter: blur(var(--glass-backdrop-blur)) saturate(1.4);
    opacity: var(--admin-header-scroll-progress, 0);
    transition: opacity 0.15s ease;
}

@media (max-width: 768px) {
    .admin-header-content {
        --admin-header-gutter: calc(4px + 8px * var(--admin-header-scroll-progress, 0));
        --admin-header-action-size: 32px;
        --admin-header-action-font-size: 17px;
        --admin-header-action-gap: 4px;
        flex-wrap: wrap;
        top: 6px;
        padding: 6px 8px;
        gap: 4px 6px;
        border-radius: 14px;
    }
}

@media (max-width: 360px) {
    .admin-header-content {
        --admin-header-action-size: 30px;
        --admin-header-action-gap: 2px;
    }
}

@media (prefers-reduced-motion: reduce) {
    .admin-header-content,
    .admin-header-content::before {
        transition: none;
    }
}
</style>
