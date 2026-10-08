<template>
    <div class="admin-header-actions">
        <AdminToggleDark class="admin-header-control" />
        <LanguageSwitcher class="admin-header-control" />
        <el-tooltip v-if="showLinkFormat" :disabled="disableTooltip" :content="$t('dashboard.linkFormat')" placement="bottom" :show-after="1000">
            <button class="admin-header-control" type="button" :aria-label="$t('dashboard.linkFormat')" @click="$emit('link-format')">
                <font-awesome-icon icon="link" />
            </button>
        </el-tooltip>
        <el-tooltip :disabled="disableTooltip" :content="$t('dashboard.logout')" placement="bottom" :show-after="1000">
            <button class="admin-header-control" type="button" :aria-label="$t('dashboard.logout')" @click="$emit('logout')">
                <font-awesome-icon icon="sign-out-alt" />
            </button>
        </el-tooltip>
    </div>
</template>

<script>
import AdminToggleDark from './AdminToggleDark.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';

export default {
    name: 'AdminHeaderActions',
    components: { AdminToggleDark, LanguageSwitcher },
    props: {
        showLinkFormat: Boolean,
        disableTooltip: Boolean
    },
    emits: ['link-format', 'logout']
};
</script>

<style scoped>
.admin-header-actions {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    gap: var(--admin-header-action-gap, 8px);
}

.admin-header-control,
.admin-header-actions :deep(#themeToggle) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    box-sizing: border-box;
    width: var(--admin-header-action-size, 32px);
    height: var(--admin-header-action-size, 32px);
    padding: 0;
    border: 0;
    border-radius: 6px;
    color: var(--admin-theme-toggle-color);
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    font-size: var(--admin-header-action-font-size, 20px);
    cursor: pointer;
    transition: color 0.2s ease;
    --lang-icon-size: 1em;
    --lang-icon-color: currentColor;
}

.admin-header-control:hover {
    color: var(--primary-color-accent);
}

.admin-header-control:focus-visible {
    outline: 2px solid var(--primary-color-accent);
    outline-offset: 2px;
}

.admin-header-actions :deep(.theme_toggle_svg),
.admin-header-actions :deep(.auto-icon) {
    width: 1em;
    height: 1em;
    font-size: inherit !important;
}

@media (prefers-reduced-motion: reduce) {
    .admin-header-control,
    .admin-header-actions :deep(#themeToggle) {
        transition: none;
    }
}
</style>
