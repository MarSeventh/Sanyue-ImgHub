<template>
    <header class="admin-header-spacer" :class="{ 'has-search': !!$slots.search }" :style="{ '--admin-header-reserved-space': reservedSpace }">
        <div ref="headerContent" class="admin-header-content" :class="{ 'is-compact': isHeaderCompact }">
            <DashboardTabs :active-tab="activeTab" />
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
        return { isMobile: window.innerWidth <= 768, reservedSpace: null, isHeaderCompact: false };
    },
    methods: {
        getHeaderScrollElements() {
            return OverlayScrollbars(document.body)?.elements();
        },
        getHeaderScrollPosition() {
            const scroller = this.getHeaderScrollElements()?.scrollOffsetElement || document.scrollingElement;
            return Math.max(0, scroller?.scrollTop || 0);
        },
        handleHeaderScroll(event) {
            const elements = this.getHeaderScrollElements();
            // 弹窗、表格等内部滚动不改变页面顶栏。
            if (![document, window, document.scrollingElement, elements?.scrollEventElement, elements?.scrollOffsetElement].includes(event.target)) return;
            if (this.headerScrollFrame !== null) return;
            this.headerScrollFrame = requestAnimationFrame(() => {
                this.headerScrollFrame = null;
                const position = this.getHeaderScrollPosition();
                const distance = position - this.headerScrollAnchor;
                const header = this.$refs.headerContent;
                if (position <= 32 || header?.matches(':focus-within') || header?.querySelector('.page-switcher.is-open')) {
                    this.isHeaderCompact = false;
                    this.headerScrollAnchor = position;
                } else if (position > 80 && distance >= 16) {
                    this.isHeaderCompact = true;
                    this.headerScrollAnchor = position;
                } else if (distance <= -16) {
                    this.isHeaderCompact = false;
                    this.headerScrollAnchor = position;
                }
            });
        },
        updateViewport() {
            this.isMobile = window.innerWidth <= 768;
            this.isHeaderCompact = false;
            this.headerScrollAnchor = this.getHeaderScrollPosition();
            this.scheduleReservedSpaceMeasurement();
        },
        scheduleReservedSpaceMeasurement() {
            clearTimeout(this.headerMeasureTimer);
            this.headerMeasureTimer = setTimeout(this.measureReservedSpace, 300);
        },
        measureReservedSpace() {
            // 收缩时保留展开高度，避免正文跳动；窗口尺寸变化后重新测量。
            if (this.isHeaderCompact) return;
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
        this.headerScrollAnchor = this.getHeaderScrollPosition();
        this.isHeaderCompact = this.headerScrollAnchor > 80;
        document.addEventListener('scroll', this.handleHeaderScroll, { capture: true, passive: true });
        this.measureReservedSpace();
        this.headerResizeObserver = new ResizeObserver(this.scheduleReservedSpaceMeasurement);
        this.headerResizeObserver.observe(this.$refs.headerContent);
        window.addEventListener('resize', this.updateViewport, { passive: true });
    },
    beforeUnmount() {
        document.removeEventListener('scroll', this.handleHeaderScroll, true);
        if (this.headerScrollFrame !== null) cancelAnimationFrame(this.headerScrollFrame);
        this.headerResizeObserver.disconnect();
        clearTimeout(this.headerMeasureTimer);
        window.removeEventListener('resize', this.updateViewport);
    }
};
</script>

<style scoped>
.admin-header-spacer {
    height: 60px;
    flex: 0 0 auto;
}

.admin-header-search {
    display: flex;
    align-items: center;
    min-width: 0;
    margin-left: auto;
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
        margin-left: 0;
    }
}

.admin-header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    min-height: 45px;
    padding: 10px 24px;
    position: fixed;
    top: 8px;
    left: 50%;
    width: calc(95% - 16px);
    z-index: 2001;
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    background: var(--glass-bg);
    box-shadow: none;
    backdrop-filter: blur(var(--glass-backdrop-blur)) saturate(1.4);
    -webkit-backdrop-filter: blur(var(--glass-backdrop-blur)) saturate(1.4);
    transform: translateX(-50%);
    transition: background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease,
        padding 0.25s ease, min-height 0.25s ease, width 0.25s ease, top 0.25s ease,
        border-radius 0.25s ease, font-size 0.25s ease;
}

.admin-header-content.is-compact {
    --admin-header-action-size: 28px;
    --admin-header-action-font-size: 18px;
    --admin-header-switcher-height: 36px;
    --admin-header-current-height: 30px;
    --admin-header-current-font-size: 14px;
    --admin-header-option-height: 30px;
    --admin-header-option-font-size: 13px;
    --admin-header-sheet-padding: 2px;
    --admin-header-search-width: 240px;
    --admin-header-search-focus-width: 300px;
    --admin-header-search-height: 30px;
    --admin-header-search-font-size: 14px;
    --admin-header-search-placeholder-size: 12px;
    --admin-header-search-padding: 10px;
    min-height: 36px;
    padding: 4px 18px;
    top: 12px;
    width: calc(95% - 48px);
    border-radius: 12px;
    font-size: 14px;
}

@media (max-width: 768px) {
    .admin-header-content {
        --admin-header-action-size: 26px;
        --admin-header-action-font-size: 17px;
        --admin-header-action-gap: 2px;
        box-sizing: border-box;
        flex-wrap: wrap;
        top: 6px;
        width: calc(100% - 24px);
        padding: 6px 8px;
        gap: 4px 8px;
        border-radius: 14px;
    }

    .admin-header-content.is-compact {
        --admin-header-action-size: 26px;
        --admin-header-action-font-size: 16px;
        --admin-header-switcher-height: 34px;
        --admin-header-current-height: 28px;
        --admin-header-current-font-size: 13px;
        --admin-header-option-height: 28px;
        --admin-header-option-font-size: 11px;
        --admin-header-search-height: 26px;
        --admin-header-search-font-size: 12px;
        --admin-header-search-placeholder-size: 11px;
        --admin-header-search-padding: 8px;
        width: calc(100% - 32px);
        padding: 4px 6px;
        gap: 2px 6px;
    }
}

@media (prefers-reduced-motion: reduce) {
    .admin-header-content {
        transition: none;
    }
}
</style>
