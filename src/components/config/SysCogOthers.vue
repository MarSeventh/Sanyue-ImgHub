<template>
    <div class="others-settings" v-loading="loading">
        <!-- 一级设置：其他设置 -->
        <div class="first-settings">
            <h3 class="first-title">{{ $t('sysOthers.remoteTelemetry') }}
                <el-tooltip :content="$t('sysOthers.remoteTelemetryTooltip')" placement="right">
                    <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                </el-tooltip>
            </h3>
            <el-form :model="settings.telemetry" label-width="120px">
                <el-form-item :label="$t('sysOthers.enable')">
                    <el-switch v-model="settings.telemetry.enabled" :disabled="settings.telemetry.fixed"></el-switch>
                </el-form-item>
            </el-form>
            <h3 class="first-title">{{ $t('sysOthers.cloudflareApiToken') }}
                <el-tooltip :content="$t('sysOthers.cloudflareApiTokenTooltip')" placement="right" raw-content>
                    <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                </el-tooltip>
            </h3>
            <el-form :model="settings.cloudflareApiToken" label-width="120px">
                <el-form-item :label="$t('sysOthers.zoneId')">
                    <el-input v-model="settings.cloudflareApiToken.CF_ZONE_ID" :disabled="settings.cloudflareApiToken.fixed"></el-input>
                </el-form-item>
                <el-form-item :label="$t('sysOthers.accountEmail')">
                    <el-input v-model="settings.cloudflareApiToken.CF_EMAIL" :disabled="settings.cloudflareApiToken.fixed"></el-input>
                </el-form-item>
                <el-form-item label="API Key">
                    <el-input v-model="settings.cloudflareApiToken.CF_API_KEY" :disabled="settings.cloudflareApiToken.fixed" type="password" show-password autocomplete="new-password"></el-input>
                </el-form-item>
            </el-form>
            <h3 class="first-title">{{ $t('sysOthers.randomImageApi') }}
                <el-tooltip :content="$t('sysOthers.randomImageApiTooltip')" placement="right">
                    <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                </el-tooltip>
            </h3>
            <el-form :model="settings.randomImageAPI" label-width="120px">
                <el-form-item :label="$t('sysOthers.enable')">
                    <el-switch v-model="settings.randomImageAPI.enabled" :disabled="settings.randomImageAPI.fixed"></el-switch>
                </el-form-item>
                <el-form-item prop="randomImageAPI.allowedDir">
                    <template #label>
                        <span>{{ $t('sysOthers.directory') }}</span>
                        <el-tooltip :content="$t('sysOthers.directoryTooltip')" placement="right" raw-content>
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-input v-model="settings.randomImageAPI.allowedDir" :disabled="settings.randomImageAPI.fixed"></el-input>
                </el-form-item>
            </el-form>
            <h3 class="first-title">{{ $t('sysOthers.publicBrowse') }}
                <el-tooltip :content="$t('sysOthers.publicBrowseTooltip')" placement="right" raw-content>
                    <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                </el-tooltip>
            </h3>
            <el-form :model="settings.publicBrowse" label-width="120px">
                <el-form-item :label="$t('sysOthers.enable')">
                    <el-switch v-model="settings.publicBrowse.enabled" :disabled="settings.publicBrowse.fixed"></el-switch>
                </el-form-item>
                <el-form-item prop="publicBrowse.allowedDir">
                    <template #label>
                        <span>{{ $t('sysOthers.openDirectory') }}</span>
                        <el-tooltip placement="right" raw-content>
                            <template #content>
                                <div style="max-width: 320px; line-height: 1.6;" v-html="$t('sysOthers.openDirectoryTooltip')">
                                </div>
                            </template>
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-input v-model="settings.publicBrowse.allowedDir" :disabled="settings.publicBrowse.fixed" placeholder="wallpaper,photos,album"></el-input>
                </el-form-item>
            </el-form>
            <h3 class="first-title">{{ $t('sysOthers.webdav') }}
                <el-tooltip :content="$t('sysOthers.webdavTooltip')" placement="right" raw-content>
                    <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                </el-tooltip>
            </h3>
            <el-form :model="settings.webDAV" label-width="120px">
                <el-form-item :label="$t('sysOthers.enable')">
                    <el-switch v-model="settings.webDAV.enabled" :disabled="settings.webDAV.fixed"></el-switch>
                </el-form-item>
                <el-form-item :label="$t('sysOthers.webdavUsername')">
                    <el-input v-model="settings.webDAV.username" :disabled="settings.webDAV.fixed"></el-input>
                </el-form-item>
                <el-form-item :label="$t('sysOthers.webdavPassword')">
                    <el-input v-model="settings.webDAV.password" :disabled="settings.webDAV.fixed" type="password" show-password autocomplete="new-password"></el-input>
                </el-form-item>
                <el-form-item :label="$t('sysOthers.webdavUploadChannel')">
                    <el-select v-model="settings.webDAV.uploadChannel" :disabled="settings.webDAV.fixed" :placeholder="$t('sysOthers.webdavDefaultChannel')" clearable>
                        <el-option label="Telegram" value="telegram"></el-option>
                        <el-option label="Cloudflare R2" value="cfr2"></el-option>
                        <el-option label="S3" value="s3"></el-option>
                        <el-option label="Discord" value="discord"></el-option>
                        <el-option label="HuggingFace" value="huggingface"></el-option>
                        <el-option label="WebDAV" value="webdav"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item :label="$t('sysOthers.webdavChannelName')" v-if="settings.webDAV.uploadChannel && webdavChannelList.length > 1">
                    <el-select v-model="settings.webDAV.channelName" :disabled="settings.webDAV.fixed" :placeholder="$t('uploadSettings.autoSelect')" clearable>
                        <el-option
                            v-for="ch in webdavChannelList"
                            :key="ch.name"
                            :label="ch.name"
                            :value="ch.name"
                        ></el-option>
                    </el-select>
                </el-form-item>
            </el-form>
            <template v-if="settings.fileExpiry">
                <h3 class="first-title">{{ $t('fileExpiry.title') }}
                    <el-tooltip :content="$t('fileExpiry.settingsTooltip')" placement="right">
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
                            <el-tooltip :content="$t('fileExpiry.cleanupTooltip')" placement="right">
                                <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                            </el-tooltip>
                        </template>
                        <div class="expiry-cleanup">
                            <div class="expiry-cleanup-row">
                                <span v-if="expiryPending">{{ expiryPending.capped ? $t('fileExpiry.pendingCapped') : $t('fileExpiry.pending', { count: expiryPending.count }) }}</span>
                                <el-button size="small" :loading="cleaningExpired" @click="cleanExpiredFiles">{{ $t('fileExpiry.cleanNow') }}</el-button>
                            </div>
                            <div class="expiry-note">{{ $t('fileExpiry.pendingStuck') }}</div>
                            <div class="expiry-note">{{ $t('fileExpiry.kvNotice') }}</div>
                        </div>
                    </el-form-item>
                </el-form>
            </template>
        </div>

    
        <!-- 悬浮保存按钮 -->
        <FloatingSaveButton :show="!loading" :loading="saving" :dirty="hasUnsavedChanges" @click="saveSettings" />
    </div>
</template>

<script>
import fetchWithAuth from '@/utils/fetchWithAuth';
import FloatingSaveButton from '@/components/FloatingSaveButton.vue';
import unsavedSettings from '@/mixins/unsavedSettings';
import { formatExpireOption, isValidExpireOption, sortExpireOptions, MAX_EXPIRE_OPTIONS } from '@/utils/fileExpiry';

// 可选有效期的候选项，管理员也可以输入其他值
const SUGGESTED_EXPIRE_OPTIONS = ['1h', '12h', '1d', '3d', '7d', '30d', '90d', '365d', 'forever'];

export default {
mixins: [unsavedSettings],
components: {
    FloatingSaveButton
},
data() {
    return {
        settings: {
            telemetry: {},
            randomImageAPI: {},
            cloudflareApiToken: {},
            webDAV: {},
            publicBrowse: {}
        },
        availableChannels: {}, // 可用渠道列表
        expiryPending: null, // 已到期待清理的文件数
        cleaningExpired: false,
        // 加载状态
        loading: true,
        saving: false
    };
},
computed: {
    editableSettings() { return this.settings; },
    // WebDAV 当前渠道类型对应的渠道列表
    webdavChannelList() {
        const channelType = this.settings.webDAV?.uploadChannel;
        return channelType ? (this.availableChannels[channelType] || []) : [];
    },
    expireOptionChoices() {
        return sortExpireOptions([...SUGGESTED_EXPIRE_OPTIONS, ...(this.settings.fileExpiry?.options || [])]);
    }
},
watch: {
    'settings.webDAV.uploadChannel'() {
        // 切换渠道类型时清空指定的渠道名称
        if (!this.loading && this.settings.webDAV) {
            this.settings.webDAV.channelName = '';
        }
    }
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
            this.$message.success(this.$t('fileExpiry.cleaned', { count: data.cleanup?.deleted || 0 }));
        } catch {
            this.$message.error(this.$t('fileExpiry.cleanFailed'));
        } finally {
            this.cleaningExpired = false;
        }
    },
    async saveSettings() {
        if (this.saving) return;
        const submitted = JSON.parse(JSON.stringify(this.settings));
        this.saving = true;
        try {
            const response = await fetchWithAuth('/api/manage/sysConfig/others', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(submitted)
            });
            if (!response.ok) throw new Error(this.$t('floatingSave.failed'));
            this.markSettingsSaved(submitted);
            this.$message.success(this.$t('sysOthers.settingsSaved'));
        } catch {
            this.$message.error(this.$t('floatingSave.failed'));
        } finally {
            this.saving = false;
        }
    },
    async fetchAvailableChannels() {
        try {
            const response = await fetchWithAuth('/api/channels');
            if (response.ok) {
                this.availableChannels = await response.json();
            }
        } catch (error) {
            console.error('Failed to fetch available channels:', error);
        }
    }
},
mounted() {
    this.loading = true;
    // 获取上传设置
    fetchWithAuth('/api/manage/sysConfig/others')
    .then((response) => response.json())
    .then(async (data) => {
        this.settings = data;
        await this.$nextTick();
        this.markSettingsSaved();
        // 后端支持文件有效期时读取待清理数量
        if (data.fileExpiry) {
            this.fetchExpiryPending().catch(() => {});
        }
    })
    .finally(() => {
        this.loading = false;
    });
    // 获取可用渠道列表
    this.fetchAvailableChannels();
}
};
</script>

<style scoped>
.others-settings {
    min-height: 500px;
}

.first-settings {
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

.second-title {
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: start;
    margin-left: 0;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--el-border-color-lighter);
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

.expiry-cleanup {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.expiry-cleanup-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.expiry-note {
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
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
