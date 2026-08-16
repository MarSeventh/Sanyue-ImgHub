<template>
    <el-dialog :title="$t('uploadSettings.title')" v-model="visible" :width="dialogWidth" :show-close="false" class="settings-dialog settings-dialog-scope upload-settings-dialog">
        <!-- 上传渠道 -->
        <div class="dialog-section">
            <div class="section-header">
                <span class="section-title">{{ $t('uploadSettings.uploadChannel') }}</span>
            </div>
            <div class="section-content">
                <div class="setting-item channel-type-setting">
                    <div class="channel-type-toolbar">
                        <span class="setting-label">{{ $t('uploadSettings.channelType') }}</span>
                        <el-radio-group v-model="channelVisibility" size="small" class="channel-visibility-filter" @change="handleChannelVisibilityChange">
                            <el-radio-button label="all">{{ $t('uploadSettings.allChannels') }}</el-radio-button>
                            <el-radio-button label="configured">{{ $t('uploadSettings.configuredChannelsOnly') }}</el-radio-button>
                        </el-radio-group>
                    </div>
                    <el-radio-group :model-value="uploadChannel" @update:model-value="$emit('update:uploadChannel', $event)" class="radio-card-group compact">
                        <el-radio v-for="channel in visibleChannelOptions" :key="channel.value" :label="channel.value" class="radio-card">
                            <ChannelIcon :type="channel.value" class="channel-icon"/>
                            <span>{{ channel.label }}</span>
                        </el-radio>
                    </el-radio-group>
                    <div v-if="channelVisibility === 'configured' && visibleChannelOptions.length === 0" class="channel-empty-state">
                        {{ $t('uploadSettings.noConfiguredChannels') }}
                    </div>
                </div>
                <div class="setting-item" v-if="currentChannelList.length > 1">
                    <span class="setting-label">
                        {{ $t('uploadSettings.channelName') }}
                        <el-tooltip :content="$t('uploadSettings.channelNameTooltip')" placement="top">
                            <font-awesome-icon icon="question-circle" class="inline-help-icon"/>
                        </el-tooltip>
                    </span>
                    <el-select :model-value="channelName" @update:model-value="$emit('update:channelName', $event)" :placeholder="$t('uploadSettings.autoSelect')" clearable class="setting-input">
                        <el-option
                            v-for="ch in currentChannelList"
                            :key="ch.name"
                            :label="ch.name"
                            :value="ch.name"
                        />
                    </el-select>
                </div>
                <div class="setting-item">
                    <span class="setting-label">{{ $t('uploadSettings.uploadDirectory') }}</span>
                    <el-input :model-value="uploadFolder" @update:model-value="handleUploadFolderInput" :placeholder="$t('uploadSettings.uploadDirectoryPlaceholder')" class="setting-input"></el-input>
                </div>
                <div class="setting-item">
                    <span class="setting-label">
                        {{ $t('uploadSettings.autoSwitch') }}
                        <el-tooltip :content="$t('uploadSettings.autoSwitchTooltip')" placement="top">
                            <font-awesome-icon icon="question-circle" class="inline-help-icon"/>
                        </el-tooltip>
                    </span>
                    <el-switch :model-value="autoRetry" @update:model-value="$emit('update:autoRetry', $event)" />
                </div>
            </div>
        </div>
        
        <!-- 文件命名方式 -->
        <div class="dialog-section">
            <div class="section-header">
                <span class="section-title">{{ $t('uploadSettings.fileNaming') }}</span>
            </div>
            <div class="section-content">
                <el-radio-group :model-value="uploadNameType" @update:model-value="$emit('update:uploadNameType', $event)" class="radio-card-group grid-2x2">
                    <el-radio label="default" class="radio-card">
                        <font-awesome-icon icon="cog" class="radio-icon"/>
                        <span>{{ $t('uploadSettings.namingDefault') }}</span>
                    </el-radio>
                    <el-radio label="index" class="radio-card">
                        <font-awesome-icon icon="hashtag" class="radio-icon"/>
                        <span>{{ $t('uploadSettings.namingIndex') }}</span>
                    </el-radio>
                    <el-radio label="origin" class="radio-card">
                        <font-awesome-icon icon="file-signature" class="radio-icon"/>
                        <span>{{ $t('uploadSettings.namingOrigin') }}</span>
                    </el-radio>
                    <el-radio label="short" class="radio-card">
                        <font-awesome-icon icon="compress-alt" class="radio-icon"/>
                        <span>{{ $t('uploadSettings.namingShort') }}</span>
                    </el-radio>
                </el-radio-group>
            </div>
        </div>
        
        <!-- 客户端预处理 -->
        <div class="dialog-section">
            <div class="section-header">
                <span class="section-title">{{ $t('uploadSettings.filePreprocess') }}</span>
                <el-tooltip :content="$t('uploadSettings.filePreprocessTooltip')" placement="top">
                    <font-awesome-icon icon="question-circle" class="section-help-icon"/>
                </el-tooltip>
            </div>
            <div class="section-content">
                <div class="setting-item">
                    <span class="setting-label">
                        {{ $t('uploadSettings.convertToWebp') }}
                        <el-tooltip :content="$t('uploadSettings.convertToWebpTooltip')" placement="top">
                            <font-awesome-icon icon="question-circle" class="inline-help-icon"/>
                        </el-tooltip>
                    </span>
                    <el-switch :model-value="convertToWebp" @update:model-value="$emit('update:convertToWebp', $event)" />
                </div>
                <div class="setting-item">
                    <span class="setting-label">{{ $t('uploadSettings.fileCompress') }}</span>
                    <el-switch :model-value="customerCompress" @update:model-value="$emit('update:customerCompress', $event)" />
                </div>
                <div class="setting-item slider-item" v-if="customerCompress">
                    <span class="setting-label">
                        {{ $t('uploadSettings.compressThreshold') }}
                        <el-tooltip :content="$t('uploadSettings.compressThresholdTooltip')" placement="top">
                            <font-awesome-icon icon="question-circle" class="inline-help-icon"/>
                        </el-tooltip>
                    </span>
                    <div class="slider-wrapper">
                        <el-slider :model-value="compressBar" @update:model-value="$emit('update:compressBar', $event)" :min="1" :max="20" :format-tooltip="(value) => `${value} MB`"/>
                        <div class="slider-input-wrapper">
                            <el-input-number :model-value="compressBar" @update:model-value="$emit('update:compressBar', $event)" :min="1" :max="20" :step="1" :value-on-clear="1" class="slider-input" controls-position="right"/>
                            <span class="slider-unit">MB</span>
                        </div>
                    </div>
                </div>
                <div class="setting-item slider-item" v-if="customerCompress">
                    <span class="setting-label">
                        {{ $t('uploadSettings.expectedSize') }}
                        <el-tooltip :content="$t('uploadSettings.expectedSizeTooltip')" placement="top">
                            <font-awesome-icon icon="question-circle" class="inline-help-icon"/>
                        </el-tooltip>
                    </span>
                    <div class="slider-wrapper">
                        <el-slider :model-value="compressQuality" @update:model-value="$emit('update:compressQuality', $event)" :min="0.5" :max="compressBar" :step="0.1" :format-tooltip="(value) => `${value} MB`"/>
                        <div class="slider-input-wrapper">
                            <el-input-number :model-value="compressQuality" @update:model-value="$emit('update:compressQuality', $event)" :min="0.5" :max="compressBar" :step="0.1" :precision="1" :value-on-clear="0.5" class="slider-input" controls-position="right"/>
                            <span class="slider-unit">MB</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 服务端压缩 - 仅 Telegram -->
        <div class="dialog-section" v-if="uploadChannel === 'telegram'">
            <div class="section-header">
                <span class="section-title">{{ $t('uploadSettings.serverCompress') }}</span>
                <el-tooltip :content="$t('uploadSettings.serverCompressTooltip')" placement="top" raw-content>
                    <font-awesome-icon icon="question-circle" class="section-help-icon"/>
                </el-tooltip>
            </div>
            <div class="section-content">
                <div class="setting-item">
                    <span class="setting-label">{{ $t('uploadSettings.enableCompress') }}</span>
                    <el-switch :model-value="serverCompress" @update:model-value="$emit('update:serverCompress', $event)" />
                </div>
            </div>
        </div>
        
        <div class="dialog-action">
            <el-button type="primary" @click="visible = false" class="confirm-btn">{{ $t('uploadSettings.confirm') }}</el-button>
        </div>
    </el-dialog>
</template>

<script>
import ChannelIcon from '@/components/icons/ChannelIcon.vue';

const CHANNEL_OPTIONS = [
    { value: 'telegram', label: 'TG' },
    { value: 'cfr2', label: 'R2' },
    { value: 's3', label: 'S3' },
    { value: 'discord', label: 'DC' },
    { value: 'huggingface', label: 'HF' },
    { value: 'webdav', label: 'WD' }
]

export default {
    name: 'UploadSettingsDialog',
    components: {
        ChannelIcon
    },
    data() {
        return {
            channelVisibility: 'configured'
        }
    },
    methods: {
        hasConfiguredChannels(channelType) {
            const channels = this.availableChannels[channelType]
            return Array.isArray(channels) && channels.length > 0
        },
        handleChannelVisibilityChange(visibility) {
            if (visibility !== 'configured') {
                return
            }

            this.ensureConfiguredChannelSelected()
        },
        ensureConfiguredChannelSelected() {
            if (this.channelVisibility !== 'configured' || this.hasConfiguredChannels(this.uploadChannel)) {
                return
            }

            const firstConfiguredChannel = this.visibleChannelOptions[0]
            if (firstConfiguredChannel) {
                this.$emit('update:uploadChannel', firstConfiguredChannel.value)
            }
        },
        handleUploadFolderInput(val) {
            // 自动补全前导 /
            if (val && !val.startsWith('/')) {
                val = '/' + val
            }
            this.$emit('update:uploadFolder', val)
        }
    },
    props: {
        modelValue: { type: Boolean, default: false },
        uploadChannel: { type: String, default: 'telegram' },
        channelName: { type: String, default: '' },
        availableChannels: { type: Object, default: () => ({}) },
        currentChannelList: { type: Array, default: () => [] },
        uploadFolder: { type: String, default: '' },
        autoRetry: { type: Boolean, default: true },
        uploadNameType: { type: String, default: 'default' },
        convertToWebp: { type: Boolean, default: false },
        customerCompress: { type: Boolean, default: true },
        compressBar: { type: Number, default: 5 },
        compressQuality: { type: Number, default: 4 },
        serverCompress: { type: Boolean, default: true }
    },
    emits: [
        'update:modelValue',
        'update:uploadChannel',
        'update:channelName',
        'update:uploadFolder',
        'update:autoRetry',
        'update:uploadNameType',
        'update:convertToWebp',
        'update:customerCompress',
        'update:compressBar',
        'update:compressQuality',
        'update:serverCompress'
    ],
    watch: {
        availableChannels: {
            handler() {
                this.ensureConfiguredChannelSelected()
            },
            deep: true
        }
    },
    computed: {
        visible: {
            get() { return this.modelValue },
            set(val) { this.$emit('update:modelValue', val) }
        },
        visibleChannelOptions() {
            if (this.channelVisibility === 'all') {
                return CHANNEL_OPTIONS
            }

            return CHANNEL_OPTIONS.filter(channel => this.hasConfiguredChannels(channel.value))
        },
        dialogWidth() {
            return window.innerWidth > 768 ? '50%' : '90%'
        }
    }
}
</script>

<style src="@/styles/settings-dialog.css"></style>
<style scoped>
.channel-type-setting {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
}

.channel-type-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
}

.channel-visibility-filter {
    flex-shrink: 0;
}

.channel-visibility-filter :deep(.el-radio-button__inner) {
    padding: 6px 10px;
    font-size: 12px;
}

.channel-empty-state {
    width: 100%;
    padding: 12px;
    box-sizing: border-box;
    border: 1px dashed var(--el-border-color);
    border-radius: 8px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
    text-align: center;
}

.radio-card-group.compact {
    gap: 8px;
    width: 100%;
}

.radio-card-group.compact .radio-card {
    padding: 8px 12px;
    font-size: 13px;
}

.radio-card-group.compact .radio-card :deep(.el-radio__label) {
    display: flex;
    align-items: center;
    gap: 6px;
}

.radio-card-group.compact .channel-icon {
    width: 18px;
    font-size: 18px;
    text-align: center;
    flex-shrink: 0;
}

.slider-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
}

.slider-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
}

.slider-wrapper .el-slider {
    flex: 1;
    min-width: 0;
}

.slider-input {
    width: 96px !important;
    flex-shrink: 0;
}

.slider-input :deep(.el-input__inner) {
    text-align: center;
}

.slider-input-wrapper {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
}

.slider-unit {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
    .channel-type-toolbar {
        align-items: flex-start;
        flex-direction: column;
    }

    .channel-visibility-filter {
        display: flex;
        width: 100%;
    }

    .channel-visibility-filter .el-radio-button {
        flex: 1;
    }

    .channel-visibility-filter :deep(.el-radio-button__inner) {
        width: 100%;
    }

    .setting-item .radio-card-group.compact {
        width: 100%;
    }

    .radio-card-group.compact {
        flex-direction: row;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        width: 100%;
    }

    .radio-card-group.compact .radio-card {
        width: 100%;
        box-sizing: border-box;
        justify-content: center;
        flex: 1;
    }

    .radio-card-group.compact .radio-card :deep(.el-radio__label) {
        justify-content: center;
    }

    .slider-wrapper {
        gap: 8px;
    }
}
</style>
