<template>
    <div class="tabs">
        <div
            class="page-switcher"
            :class="{ 'is-open': isPageMenuOpen }"
            role="navigation"
            @click.stop
        >
            <button
                class="title page-switcher-trigger"
                type="button"
                :aria-expanded="isPageMenuOpen"
                @click="togglePageMenu"
            >
                <font-awesome-icon :icon="iconName" class="fa-images"></font-awesome-icon>
                <span class="page-switcher-title">{{ titleName }}</span>
                <font-awesome-icon icon="chevron-down" class="page-switcher-arrow"></font-awesome-icon>
            </button>
            <div class="page-options" role="menu">
                <button
                    v-for="option in pageOptions"
                    :key="option.name"
                    class="page-option"
                    :class="{ 'is-active': activeTab === option.name }"
                    type="button"
                    role="menuitem"
                    @click="handleTabClick(option.name)"
                >
                    <font-awesome-icon :icon="option.icon" class="page-option-icon"></font-awesome-icon>
                    <span>{{ $t(option.label) }}</span>
                </button>
            </div>
        </div>
        <AdminToggleDark/>
        <LanguageSwitcher class="tabs-language-switcher"/>
    </div>
</template>

<script>
import AdminToggleDark from './dashboard/AdminToggleDark.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';

export default {
    name: 'DashboardTabs',
    props: {
        activeTab: {
            type: String,
            default: 'dashboard'
        }
    },
    components: {
        AdminToggleDark,
        LanguageSwitcher
    },
    data() {
        return {
            isPageMenuOpen: false
        }
    },
    computed: {
        pageOptions() {
            return [
                { name: 'dashboard', icon: 'images', label: 'dashboardTabs.fileManagement' },
                { name: 'customerConfig', icon: 'user-cog', label: 'dashboardTabs.userManagement' },
                { name: 'systemConfig', icon: 'cogs', label: 'dashboardTabs.systemSettings' },
                { name: '', icon: 'upload', label: 'dashboardTabs.fileUpload' }
            ];
        },
        titleName() {
            if (this.activeTab === 'dashboard') {
                return this.$t('dashboardTabs.fileManagement');
            } else if (this.activeTab === 'customerConfig') {
                return this.$t('dashboardTabs.userManagement');
            } else if (this.activeTab === 'systemConfig') {
                return this.$t('dashboardTabs.systemSettings');
            } else {
                return this.$t('dashboardTabs.fileUpload');
            }
        },
        iconName() {
            if (this.activeTab === 'dashboard') {
                return 'images';
            } else if (this.activeTab === 'customerConfig') {
                return 'user-cog';
            } else if (this.activeTab === 'systemConfig') {
                return 'cogs';
            } else {
                return 'upload';
            }
        }
    },
    methods: {
        handleDocumentClick() {
            this.closePageMenu();
        },
        refreshDashboard() {
            location.reload();
        },
        handleTabClick(tab) {
            this.closePageMenu();
            if (tab === this.activeTab) {
                this.refreshDashboard();
                return;
            }
            this.$router.push(`/${tab}`);
        },
        togglePageMenu() {
            this.isPageMenuOpen = !this.isPageMenuOpen;
        },
        closePageMenu() {
            this.isPageMenuOpen = false;
        }
    },
    mounted() {
        document.addEventListener('click', this.handleDocumentClick);
    },
    beforeUnmount() {
        document.removeEventListener('click', this.handleDocumentClick);
    }
}
</script>

<style scoped>
.tabs {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.page-switcher {
    position: relative;
    display: flex;
    align-items: center;
}

.title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.1em;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.24s ease, border-color 0.24s ease, transform 0.24s ease;
    color: var(--admin-container-color);
    padding: 9px 14px;
    border-radius: 10px;
    background-color: transparent;
    border: 1px solid transparent;
    font-family: inherit;
}

.title:hover,
.page-switcher.is-open .title {
    background-color: var(--tabs-switcher-hover-bg);
    border-color: var(--tabs-switcher-hover-border-color);
    transform: translateY(-1px);
}

.title .fa-images {
    font-size: 1em;
    color: var(--el-color-primary);
}

.page-switcher-trigger {
    appearance: none;
    outline: none;
    white-space: nowrap;
}

.page-switcher-title {
    line-height: 1;
}

.page-switcher-arrow {
    font-size: 0.75em;
    color: var(--el-color-primary);
    transition: transform 0.22s ease;
}

.page-switcher.is-open .page-switcher-arrow {
    transform: rotate(180deg);
}

.page-options {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 1200;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 3px;
    min-width: 168px;
    padding: 6px;
    border: 1px solid var(--tabs-switcher-border-color);
    border-radius: 14px;
    background: var(--tabs-dropdown-popper-bg-color);
    box-shadow: var(--tabs-dropdown-popper-shadow);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px) scale(0.98);
    transform-origin: top left;
    pointer-events: none;
    transition: opacity 0.18s ease, transform 0.22s ease, visibility 0.18s ease;
}

.page-options::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: -8px;
    height: 8px;
}

.page-switcher.is-open .page-options {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
    pointer-events: auto;
}

@media (hover: hover) and (pointer: fine) {
    .page-switcher:hover .page-switcher-arrow {
        transform: rotate(180deg);
    }

    .page-switcher:hover .page-options {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
        pointer-events: auto;
    }
}

.page-option {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    height: 34px;
    padding: 0 12px;
    border: none;
    border-radius: 10px;
    color: var(--admin-container-color);
    background: transparent;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 0.18s ease, color 0.18s ease;
}

.page-option:hover,
.page-option.is-active {
    color: var(--el-color-primary);
    background-color: var(--tabs-switcher-hover-bg);
}

.page-option-icon {
    width: 15px;
    color: var(--el-color-primary);
}

/* 移动端适配 */
@media (max-width: 768px) {
    .tabs {
        gap: 6px;
    }

    .title {
        font-size: 1em;
        padding: 7px 10px;
        gap: 5px;
    }

    .page-switcher-title {
        max-width: 6em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .page-options {
        top: calc(100% + 6px);
        left: 50%;
        width: min(220px, calc(100vw - 24px));
        min-width: 0;
        max-width: calc(100vw - 24px);
        gap: 3px;
        padding: 6px;
        transform: translate(-50%, -4px) scale(0.98);
        transform-origin: top center;
    }

    .page-options::before {
        top: -6px;
        height: 6px;
    }

    .page-switcher.is-open .page-options {
        transform: translate(-50%, 0) scale(1);
    }

    .page-option {
        justify-content: flex-start;
        height: 32px;
        padding: 0 10px;
        font-size: 12px;
        gap: 6px;
    }

    .tabs-language-switcher {
        --lang-icon-size: 1.1em;
        padding: 3px;
    }
}

.tabs-language-switcher {
    --lang-icon-size: 1.3em;
    --lang-icon-color: var(--admin-theme-toggle-color);
    transition: color 0.3s ease;
    padding: 5px;
}
</style>
