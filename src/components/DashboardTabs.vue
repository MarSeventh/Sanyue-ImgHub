<template>
    <div class="tabs">
        <div
            class="page-switcher"
            :class="{ 'is-open': isPageMenuOpen }"
            role="navigation"
            @click.stop
            @pointerdown.stop
            @mouseenter="handlePageSwitcherEnter"
            @mouseleave="handlePageSwitcherLeave"
        >
            <div class="page-switcher-sheet" role="menu" @click.stop>
                <button
                    class="page-option is-current"
                    type="button"
                    role="menuitem"
                    aria-current="page"
                    :aria-expanded="isPageMenuOpen"
                    @click.stop="handlePageOptionClick(activePageOption.name)"
                >
                    <font-awesome-icon :icon="activePageOption.icon" class="page-option-icon"></font-awesome-icon>
                    <span class="page-switcher-title">{{ $t(activePageOption.label) }}</span>
                    <font-awesome-icon
                        icon="chevron-down"
                        class="page-switcher-arrow"
                    ></font-awesome-icon>
                </button>
                <div class="page-option-list" @mouseleave="clearHoveredPageOption">
                    <span
                        class="page-option-highlight"
                        :class="{ 'is-visible': hoveredPageOptionIndex !== null }"
                        :style="{ '--hovered-option-index': hoveredPageOptionIndex === null ? 0 : hoveredPageOptionIndex }"
                        aria-hidden="true"
                    ></span>
                    <button
                        v-for="(option, index) in inactivePageOptions"
                        :key="option.name"
                        class="page-option"
                        type="button"
                        role="menuitem"
                        @mouseenter="setHoveredPageOption(index)"
                        @click.stop="handlePageOptionClick(option.name)"
                    >
                        <font-awesome-icon :icon="option.icon" class="page-option-icon"></font-awesome-icon>
                        <span class="page-switcher-title">{{ $t(option.label) }}</span>
                    </button>
                </div>
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
            isPageMenuOpen: false,
            hoveredPageOptionIndex: null
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
        activePageOption() {
            return this.pageOptions.find(option => option.name === this.activeTab) || this.pageOptions[0];
        },
        inactivePageOptions() {
            return this.pageOptions.filter(option => option.name !== this.activePageOption.name);
        }
    },
    methods: {
        handleDocumentClick(event) {
            if (this.$el?.contains(event.target)) {
                return;
            }
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
        isTouchViewport() {
            return window.matchMedia('(hover: none), (pointer: coarse)').matches;
        },
        handlePageOptionClick(tab) {
            if (this.isTouchViewport() && !this.isPageMenuOpen && tab !== this.activeTab) {
                this.openPageMenu();
                return;
            }
            if (tab === this.activeTab) {
                if (this.isTouchViewport()) {
                    this.togglePageMenu();
                } else {
                    this.openPageMenu();
                }
                return;
            }
            this.handleTabClick(tab);
        },
        handlePageSwitcherEnter() {
            if (!this.isTouchViewport()) {
                this.openPageMenu();
            }
        },
        handlePageSwitcherLeave() {
            if (!this.isTouchViewport()) {
                this.closePageMenu();
            }
        },
        setHoveredPageOption(index) {
            this.hoveredPageOptionIndex = index;
        },
        clearHoveredPageOption() {
            this.hoveredPageOptionIndex = null;
        },
        openPageMenu() {
            this.isPageMenuOpen = true;
        },
        togglePageMenu() {
            this.isPageMenuOpen = !this.isPageMenuOpen;
        },
        closePageMenu() {
            this.isPageMenuOpen = false;
            this.clearHoveredPageOption();
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
    display: grid;
    align-items: start;
    height: 44px;
    overflow: visible;
}

.page-switcher.is-open {
    z-index: 1200;
}

.page-switcher-sheet {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 4px;
    border: 1px solid transparent;
    border-radius: 14px;
    box-sizing: border-box;
    background-color: transparent;
    overflow: visible;
    transition: none;
}

.page-switcher-sheet::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 0;
    height: 156px;
    border: 1px solid var(--tabs-switcher-border-color);
    border-radius: 14px;
    background: var(--tabs-dropdown-popper-bg-color);
    box-shadow: var(--tabs-dropdown-popper-shadow);
    opacity: 0;
    transform: translateY(-4px) scaleY(0.72);
    transform-origin: top center;
    pointer-events: none;
    transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: opacity, transform;
}

.page-switcher.is-open .page-switcher-sheet::before {
    opacity: 1;
    transform: translateY(0) scaleY(1);
    pointer-events: auto;
}

.page-switcher-title {
    line-height: 1;
}

.page-switcher-arrow {
    margin-left: auto;
    font-size: 0.75em;
    color: var(--tabs-switcher-accent-color);
    transition: transform 0.3s ease;
}

.page-switcher.is-open .page-switcher-arrow {
    transform: rotate(180deg);
}

.page-option {
    position: relative;
    z-index: 1;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    box-sizing: border-box;
    gap: 7px;
    width: 100%;
    min-width: 148px;
    height: 37px;
    padding: 0 12px;
    border: none;
    border-radius: 10px;
    color: var(--admin-container-color);
    background: transparent;
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    white-space: nowrap;
    cursor: pointer;
    transition: none;
}

.page-option-list {
    position: absolute;
    top: 41px;
    left: 5px;
    right: 5px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-9px) scaleY(0.86);
    transform-origin: top center;
    transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.page-option-list .page-option {
    position: relative;
    z-index: 1;
    width: 100%;
}

.page-option-highlight {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 0;
    height: 37px;
    border-radius: 10px;
    background: var(--tabs-switcher-hover-bg);
    opacity: 0;
    pointer-events: none;
    transform: translateY(calc(var(--hovered-option-index) * 37px));
    transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.page-option-highlight.is-visible {
    opacity: 1;
}

.page-switcher.is-open .page-option-list {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0) scaleY(1);
}

.page-option.is-current {
    height: 37px;
    gap: 8px;
    padding: 0 14px;
    color: var(--tabs-switcher-current-color);
    background: var(--tabs-switcher-current-bg);
    border: 1px solid var(--tabs-switcher-current-border-color);
    box-shadow: none;
    font-size: 1.1em;
    font-weight: bold;
    line-height: 1.15;
}

.page-option.is-current > .page-option-icon {
    width: 17px;
    font-size: 1.05em;
}

.page-option.is-current > .page-option-icon,
.page-option.is-current > .page-switcher-title,
.page-option.is-current > .page-switcher-arrow {
    translate: 0 1px;
}

.page-option:hover {
    color: var(--tabs-switcher-accent-color);
    background-color: transparent;
}

.page-option.is-current:hover {
    color: var(--tabs-switcher-current-color);
    background: var(--tabs-switcher-current-bg);
}

.page-option-icon {
    width: 16px;
    color: var(--tabs-switcher-accent-color);
}

/* 移动端适配 */
@media (max-width: 768px) {
    .tabs {
        gap: 6px;
    }

    .page-switcher-title {
        max-width: 6em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .page-switcher-sheet {
        width: max-content;
        max-width: calc(100vw - 96px);
    }

    .page-switcher-sheet::before {
        height: 136px;
        transform: translateY(-3px) scaleY(0.72);
    }

    .page-option {
        justify-content: flex-start;
        min-width: 0;
        height: 32px;
        padding: 0 10px;
        font-size: 12px;
        gap: 6px;
    }

    .page-option-icon {
        width: 15px;
    }

    .page-option-list {
        top: 36px;
        transform: translateY(-8px) scaleY(0.86);
    }

    .page-option-highlight {
        height: 32px;
        transform: translateY(calc(var(--hovered-option-index) * 32px));
    }

    .page-option.is-current {
        height: 32px;
        gap: 5px;
        padding: 0 10px;
        font-size: 1em;
    }

    .page-option.is-current > .page-option-icon {
        width: 16px;
    }

    .page-option.is-current > .page-switcher-arrow {
        margin-left: 4px;
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

/* 导航栏内主题/语言切换按钮:移除有色背景与毛玻璃,仅保留图标 */
.tabs :deep(#themeToggle),
.tabs :deep(#themeToggle:hover),
.tabs :deep(.language-switcher),
.tabs :deep(.language-switcher:hover) {
    background-color: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
}
</style>
