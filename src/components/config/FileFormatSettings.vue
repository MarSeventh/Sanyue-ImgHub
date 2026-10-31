<template>
    <div v-if="loading || settings" class="file-format-settings first-settings" v-loading="loading">
        <h3 class="first-title">
            {{ $t('fileFormat.title') }}
            <el-tooltip placement="top">
                <template #content>
                    <ul class="tooltip-help-list">
                        <li>{{ $t('fileFormat.tooltip') }}</li>
                        <li>{{ $t('fileFormat.noExtensionTooltip') }}</li>
                    </ul>
                </template>
                <font-awesome-icon icon="question-circle" class="format-help" />
            </el-tooltip>
        </h3>
        <el-form v-if="settings" :model="settings" label-width="120px">
            <el-form-item :label="$t('sysOthers.enable')">
                <el-switch v-model="settings.enabled" />
            </el-form-item>
            <el-form-item>
                <template #label>
                    <span>{{ $t('fileFormat.mode') }}</span>
                    <el-tooltip placement="top">
                        <template #content>
                            <ul class="tooltip-help-list">
                                <li>{{ $t('fileFormat.whitelistTooltip') }}</li>
                                <li>{{ $t('fileFormat.blacklistTooltip') }}</li>
                            </ul>
                        </template>
                        <font-awesome-icon icon="question-circle" class="format-help" />
                    </el-tooltip>
                </template>
                <el-select v-model="settings.mode">
                    <el-option value="whitelist" :label="$t('fileFormat.whitelist')" />
                    <el-option value="blacklist" :label="$t('fileFormat.blacklist')" />
                </el-select>
            </el-form-item>
            <el-form-item>
                <template #label>
                    <span>{{ $t('fileFormat.groups') }}</span>
                    <el-tooltip :content="$t('fileFormat.groupsTooltip')" placement="top">
                        <font-awesome-icon icon="question-circle" class="format-help" />
                    </el-tooltip>
                </template>
                <div class="format-groups">
                    <el-button v-for="group in groupNames" :key="group" size="small" @click="addGroup(group)">
                        {{ $t(`fileFormat.${group}`) }}
                    </el-button>
                </div>
            </el-form-item>
            <el-form-item>
                <template #label>
                    <span>{{ $t(settings.mode === 'whitelist' ? 'fileFormat.allowed' : 'fileFormat.blocked') }}</span>
                    <el-button class="format-clear-button" size="small" :disabled="settings.extensions.length === 0"
                        :aria-label="$t('fileFormat.clear')"
                        @click.stop.prevent="changeExtensions([])">
                        <font-awesome-icon icon="trash-alt" />
                    </el-button>
                </template>
                <el-select :model-value="settings.extensions" @update:model-value="changeExtensions"
                    multiple filterable allow-create default-first-option :reserve-keyword="false"
                    :placeholder="$t('fileFormat.placeholder')">
                    <el-option v-for="extension in extensionChoices" :key="extension" :label="extension" :value="extension" />
                </el-select>
            </el-form-item>
        </el-form>
    </div>
</template>

<script>
import fetchWithAuth from '@/utils/fetchWithAuth';
import unsavedSettings from '@/mixins/unsavedSettings';
import { FORMAT_GROUPS, MAX_UPLOAD_EXTENSIONS, normalizeExtensions, isValidExtension } from '@/utils/upload/fileFormat';

export default {
    emits: ['state-change'],
    mixins: [unsavedSettings],
    data() {
        return { settings: null, loading: true, saving: false };
    },
    computed: {
        editableSettings() { return this.settings; },
        saveState() { return { available: !!this.settings, loading: this.loading, dirty: this.hasUnsavedChanges }; },
        groupNames() { return Object.keys(FORMAT_GROUPS); },
        extensionChoices() {
            return [...new Set([...Object.values(FORMAT_GROUPS).flat(), ...(this.settings?.extensions || [])])].sort();
        },
    },
    watch: {
        saveState: { immediate: true, handler(state) { this.$emit('state-change', state); } },
    },
    methods: {
        changeExtensions(values) {
            const extensions = normalizeExtensions(values);
            if (extensions.some(value => !isValidExtension(value))) {
                this.$message.error(this.$t('fileFormat.invalidExtension'));
                return;
            }
            if (extensions.length > MAX_UPLOAD_EXTENSIONS) {
                this.$message.error(this.$t('fileFormat.tooMany', { count: MAX_UPLOAD_EXTENSIONS }));
                return;
            }
            this.settings.extensions = extensions;
        },
        addGroup(group) {
            this.changeExtensions([...this.settings.extensions, ...FORMAT_GROUPS[group]]);
        },
        async saveSettings(notify = true) {
            if (this.saving || !this.settings) return false;
            const submitted = JSON.parse(JSON.stringify(this.settings));
            if (submitted.enabled && submitted.mode === 'whitelist' && !submitted.extensions.length) {
                this.$message.error(this.$t('fileFormat.required'));
                return false;
            }
            this.saving = true;
            try {
                const current = await fetchWithAuth('/api/manage/sysConfig/upload');
                if (!current.ok) throw new Error(`HTTP ${current.status}`);
                const settings = await current.json();
                const response = await fetchWithAuth('/api/manage/sysConfig/upload', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...settings, fileFormat: submitted }),
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                this.markSettingsSaved(submitted);
                if (notify) this.$message.success(this.$t('sysOthers.settingsSaved'));
                return true;
            } catch {
                this.$message.error(this.$t('floatingSave.failed'));
                return false;
            } finally {
                this.saving = false;
            }
        },
    },
    async mounted() {
        try {
            const response = await fetchWithAuth('/api/manage/sysConfig/upload');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.settings = (await response.json()).fileFormat || null;
            this.markSettingsSaved();
        } catch {
            this.$message.error(this.$t('fileFormat.loadFailed'));
        } finally {
            this.loading = false;
        }
    },
};
</script>

<style scoped>
.file-format-settings { margin-bottom: 40px; }
.first-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--el-color-primary-light-7);
}
.first-settings :deep(.el-form) {
    padding: 20px 24px;
    background-color: var(--glass-bg);
    backdrop-filter: blur(20px) saturate(1.4);
    border-radius: 16px;
    border: 1px solid var(--glass-border);
    margin-bottom: 20px;
    box-shadow: var(--glass-shadow);
}
.first-settings :deep(.el-form-item) {
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}
.first-settings :deep(.el-form-item:last-child) { margin-bottom: 0; }
.first-settings :deep(.el-form-item__label) {
    text-align: left;
    padding-bottom: 8px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    width: auto !important;
    display: flex;
    align-items: center;
    gap: 5px;
}
.first-settings :deep(.el-form-item__content) { width: 100%; max-width: 400px; margin-left: 0 !important; }
.first-settings :deep(.el-select) { width: 100%; }
.format-groups { display: flex; flex-wrap: wrap; gap: 8px; }
.format-groups :deep(.el-button) { margin-left: 0; }
.format-clear-button.el-button {
    background: transparent;
    border-color: transparent;
    margin-left: 8px;
}
.format-clear-button.el-button:not(.is-disabled):hover {
    border-color: var(--el-button-hover-border-color);
}
.format-help { cursor: pointer; flex-shrink: 0; }
@media (max-width: 768px) {
    .first-settings :deep(.el-form) { padding: 12px 15px; }
    .first-settings :deep(.el-form-item__content) { max-width: 100%; }
}
</style>
