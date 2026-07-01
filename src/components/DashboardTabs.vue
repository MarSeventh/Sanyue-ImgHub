<template>
    <div class="tabs">
        <div
            class="page-switcher"
            :class="{ 'is-open': isPageMenuOpen }"
            role="navigation"
            @click.stop
        >
            <div class="page-switcher-sheet" role="menu">
                <button
                    v-for="option in orderedPageOptions"
                    :key="option.name"
                    class="page-option"
                    :class="{ 'is-current': option.name === activeTab }"
                    type="button"
                    role="menuitem"
                    :aria-current="option.name === activeTab ? 'page' : null"
                    :aria-expanded="option.name === activeTab ? isPageMenuOpen : null"
                    @click="handlePageOptionClick(option.name)"
                >
                    <font-awesome-icon :icon="option.icon" class="page-option-icon"></font-awesome-icon>
                    <span class="page-switcher-title">{{ $t(option.label) }}</span>
                    <font-awesome-icon
                        v-if="option.name === activeTab"
                        icon="chevron-down"
                        class="page-switcher-arrow"
                    ></font-awesome-icon>
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
        orderedPageOptions() {
            const activeOption = this.pageOptions.find(option => option.name === this.activeTab) || this.pageOptions[0];
            return [
                activeOption,
                ...this.pageOptions.filter(option => option.name !== activeOption.name)
            ];
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
        handlePageOptionClick(tab) {
            if (tab === this.activeTab) {
                this.togglePageMenu();
                return;
            }
            this.handleTabClick(tab);
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
    display: grid;
    align-items: start;
    height: 44px;
    overflow: visible;
}

.page-switcher:hover,
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
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    opacity: 0;
    transform: translateY(-4px) scaleY(0.72);
    transform-origin: top center;
    pointer-events: none;
    transition: opacity 0.18s ease, transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: opacity, transform;
}

.page-switcher:hover .page-switcher-sheet::before,
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
    transition: transform 0.22s ease;
}

.page-switcher.is-open .page-switcher-arrow {
    transform: rotate(180deg);
}

@media (hover: hover) and (pointer: fine) {
    .page-switcher:hover .page-switcher-arrow {
        transform: rotate(180deg);
    }
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
    transition: background-color 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
}

.page-option:not(.is-current) {
    position: absolute;
    left: 5px;
    right: 5px;
    width: auto;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-9px) scaleY(0.86);
    transform-origin: top center;
    transition: opacity 0.16s ease, transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.18s ease, color 0.18s ease;
    will-change: opacity, transform;
}

.page-option:nth-child(2) {
    top: 41px;
}

.page-option:nth-child(3) {
    top: 78px;
}

.page-option:nth-child(4) {
    top: 115px;
}

.page-switcher:hover .page-option:not(.is-current),
.page-switcher.is-open .page-option:not(.is-current) {
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
    box-shadow: inset 0 0 0 1px var(--tabs-switcher-current-border-color), var(--tabs-switcher-current-shadow);
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
    background-color: var(--tabs-switcher-hover-bg);
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

    .page-option:not(.is-current) {
        left: 5px;
        right: 5px;
        width: auto;
        transform: translateY(-8px) scaleY(0.86);
    }

    .page-option:nth-child(2) {
        top: 36px;
    }

    .page-option:nth-child(3) {
        top: 68px;
    }

    .page-option:nth-child(4) {
        top: 100px;
    }

    .page-switcher:hover .page-option:not(.is-current),
    .page-switcher.is-open .page-option:not(.is-current) {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0) scaleY(1);
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
</style>
