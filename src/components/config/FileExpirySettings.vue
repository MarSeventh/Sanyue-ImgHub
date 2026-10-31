<template>
    <div class="file-expiry-settings first-settings" v-loading="loading">
        <template v-if="settings.fileExpiry">
            <h3 class="first-title">{{ $t('fileExpiry.title') }}
                <el-tooltip placement="top">
                    <template #content>
                        <ul class="tooltip-help-list">
                            <li>{{ $t('fileExpiry.settingsTooltip') }}</li>
                            <li>{{ $t('fileExpiry.expiryAccess') }}</li>
                            <li>{{ $t('fileExpiry.disableTooltip') }}</li>
                        </ul>
                    </template>
                    <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                </el-tooltip>
            </h3>
            <el-form :model="settings.fileExpiry" label-width="120px">
                <el-form-item :label="$t('sysOthers.enable')">
                    <el-switch v-model="settings.fileExpiry.enabled" :disabled="settings.fileExpiry.fixed"></el-switch>
                </el-form-item>
                <el-form-item>
                    <template #label>
                        <span>{{ $t('fileExpiry.options') }}</span>
                        <el-tooltip :content="$t('fileExpiry.optionsTooltip')" placement="right">
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-select
                        :model-value="settings.fileExpiry.options"
                        @update:model-value="handleExpireOptionsChange"
                        :disabled="settings.fileExpiry.fixed"
                        :placeholder="$t('fileExpiry.optionsPlaceholder')"
                        multiple filterable allow-create default-first-option :reserve-keyword="false"
                    >
                        <el-option v-for="option in expireOptionChoices" :key="option" :label="expireLabel(option)" :value="option"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <template #label>
                        <span>{{ $t('fileExpiry.defaultExpire') }}</span>
                        <el-tooltip :content="$t('fileExpiry.defaultExpireTooltip')" placement="right">
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-select v-model="settings.fileExpiry.defaultExpire" :disabled="settings.fileExpiry.fixed">
                        <el-option v-for="option in settings.fileExpiry.options" :key="option" :label="expireLabel(option)" :value="option"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <template #label>
                        <span>{{ $t('fileExpiry.allowCustom') }}</span>
                        <el-tooltip :content="$t('fileExpiry.allowCustomTooltip')" placement="right">
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-switch v-model="settings.fileExpiry.allowCustom" :disabled="settings.fileExpiry.fixed"></el-switch>
                </el-form-item>
                <el-form-item>
                    <template #label>
                        <span>{{ $t('fileExpiry.cleanup') }}</span>
                        <!-- 内容较长，向上弹出，避免窄屏时超出右侧 -->
                        <el-tooltip placement="top">
                            <template #content>
                                <ul class="tooltip-help-list">
                                    <li v-for="key in cleanupMethodKeys" :key="key">{{ $t(key) }}</li>
                                    <li>{{ $t('fileExpiry.cleanupGrace', { minutes: cleanupGraceMinutes }) }}</li>
                                    <li>{{ $t('fileExpiry.pendingTooltip') }}</li>
                                    <li>{{ $t('fileExpiry.manualCleanup') }}</li>
                                </ul>
                            </template>
                            <font-awesome-icon icon="question-circle" class="expiry-cleanup-help" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <div class="expiry-cleanup-row">
                        <span v-if="expiryPending" class="expiry-pending">{{ expiryPending.capped ? $t('fileExpiry.pendingCapped') : $t('fileExpiry.pending', { count: expiryPending.count }) }}</span>
                        <el-button size="small" :loading="cleaningExpired" @click="cleanExpiredFiles">{{ $t('fileExpiry.cleanNow') }}</el-button>
                    </div>
                </el-form-item>
            </el-form>
        </template>
        <FloatingSaveButton v-if="!embedded" :show="!loading && !!settings.fileExpiry" :loading="saving" :dirty="hasUnsavedChanges" @click="saveSettings" />
    </div>
</template>

<script>
import fetchWithAuth from '@/utils/fetchWithAuth';
import FloatingSaveButton from '@/components/FloatingSaveButton.vue';
import unsavedSettings from '@/mixins/unsavedSettings';
import {
    CLEANUP_GRACE_MINUTES, MAX_EXPIRE_OPTIONS, cleanupMethodKeys, describeCleanupResult, formatExpireOption,
    isValidExpireOption, sortExpireOptions
} from '@/utils/fileExpiry';

// 可选有效期的候选项，管理员也可以输入其他值
const SUGGESTED_EXPIRE_OPTIONS = ['1h', '12h', '1d', '3d', '7d', '30d', '90d', '365d', 'forever'];

export default {
    props: { embedded: Boolean },
    emits: ['state-change'],
    components: { FloatingSaveButton },
    mixins: [unsavedSettings],
    data() {
        return {
            settings: { fileExpiry: null },
            expiryPending: null,
            cleaningExpired: false,
            loading: true,
            saving: false
        };
    },
    computed: {
        editableSettings() { return this.settings.fileExpiry; },
        saveState() { return { available: !!this.settings.fileExpiry, loading: this.loading, dirty: this.hasUnsavedChanges }; },
        expireOptionChoices() {
            return sortExpireOptions([...SUGGESTED_EXPIRE_OPTIONS, ...(this.settings.fileExpiry?.options || [])]);
        },
        // 按部署平台说明清理方式；serverRuntime 只用于提示，不作为功能是否可用的判断
        cleanupMethodKeys() {
            return cleanupMethodKeys(this.$store?.getters?.userConfig?.serverRuntime);
        },
        cleanupGraceMinutes() {
            return CLEANUP_GRACE_MINUTES;
        }
    },
    watch: {
        saveState: { immediate: true, handler(state) { this.$emit('state-change', state); } },
    },
    methods: {
        expireLabel(option) {
            return formatExpireOption(option, this.$t);
        },
        handleExpireOptionsChange(values) {
            const invalid = values.find(option => !isValidExpireOption(option));
            if (invalid !== undefined) {
                this.$message.error(this.$t('fileExpiry.invalidOption', { option: invalid }));
                return;
            }
            if (values.length > MAX_EXPIRE_OPTIONS) {
                this.$message.error(this.$t('fileExpiry.tooManyOptions'));
                return;
            }
            if (values.length === 0) {
                this.$message.error(this.$t('fileExpiry.optionsRequired'));
                return;
            }
            const fileExpiry = this.settings.fileExpiry;
            fileExpiry.options = sortExpireOptions(values);
            if (!fileExpiry.options.includes(fileExpiry.defaultExpire)) {
                fileExpiry.defaultExpire = fileExpiry.options[0];
            }
        },
        async fetchExpiryPending(method = 'GET') {
            const response = await fetchWithAuth('/api/manage/expiry', { method });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            this.expiryPending = { count: data.pending, capped: data.pendingCapped };
            return data;
        },
        async cleanExpiredFiles() {
            if (this.cleaningExpired) return;
            this.cleaningExpired = true;
            try {
                const data = await this.fetchExpiryPending('POST');
                const { type, message } = describeCleanupResult(data.cleanup, this.$t);
                this.$message[type](message);
            } catch {
                this.$message.error(this.$t('fileExpiry.cleanFailed'));
            } finally {
                this.cleaningExpired = false;
            }
        },
        async saveSettings(notify = true) {
            if (this.saving || !this.settings.fileExpiry) return false;
            const submitted = JSON.parse(JSON.stringify(this.settings.fileExpiry));
            this.saving = true;
            try {
                // 保存有效期时保留最新的渠道配置
                const current = await fetchWithAuth('/api/manage/sysConfig/upload');
                if (!current.ok) throw new Error(`HTTP ${current.status}`);
                const settings = await current.json();
                const response = await fetchWithAuth('/api/manage/sysConfig/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...settings, fileExpiry: submitted })
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
        }
    },
    async mounted() {
        try {
            const response = await fetchWithAuth('/api/manage/sysConfig/upload');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            this.settings.fileExpiry = data.fileExpiry || null;
            this.markSettingsSaved();
            if (data.fileExpiry) this.fetchExpiryPending().catch(() => {});
        } catch {
            this.$message.error(this.$t('fileExpiry.loadFailed'));
        } finally {
            this.loading = false;
        }
    }
};
</script>

<style scoped>
.file-expiry-settings {
    margin-bottom: 40px;
}

.first-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--el-color-primary-light-7);
}

/* 表单样式 - 上下排列左对齐(对齐系统状态卡片风格,无 hover 动效) */
.first-settings :deep(.el-form) {
    padding: 20px 24px;
    background-color: var(--glass-bg) !important;
    backdrop-filter: blur(20px) saturate(1.4);
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
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

.first-settings :deep(.el-form-item:last-child) {
    margin-bottom: 0;
}

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

.first-settings :deep(.el-form-item__content) {
    width: 100%;
    max-width: 400px;
    margin-left: 0 !important;
}

.first-settings :deep(.el-input) {
    width: 100%;
}

.first-settings :deep(.el-switch) {
    --el-switch-on-color: var(--el-color-primary);
}

.expiry-cleanup-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 12px;
}


/* 移动端适配 */
@media (max-width: 768px) {
    .first-settings :deep(.el-form) {
        padding: 12px 15px;
    }
    
    .first-settings :deep(.el-form-item__content) {
        max-width: 100%;
    }
}
</style>
