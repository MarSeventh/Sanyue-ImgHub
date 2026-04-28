<template>
    <el-dialog :title="$t('uploadSettings.title')" v-model="visible" :width="dialogWidth" :show-close="false" class="settings-dialog">
        <!-- 上传渠道 -->
        <div class="dialog-section">
            <div class="section-header">
                <span class="section-title">{{ $t('uploadSettings.uploadChannel') }}</span>
            </div>
            <div class="section-content">
                <div class="setting-item">
                    <span class="setting-label">{{ $t('uploadSettings.channelType') }}</span>
                    <el-radio-group :model-value="uploadChannel" @update:model-value="$emit('update:uploadChannel', $event)" class="radio-card-group compact">
                        <el-radio label="telegram" class="radio-card">
                            <font-awesome-icon icon="paper-plane" class="channel-icon"/>
                            <span>TG</span>
                        </el-radio>
                        <el-radio label="cfr2" class="radio-card">
                            <font-awesome-icon icon="cloud" class="channel-icon"/>
                            <span>R2</span>
                        </el-radio>
                        <el-radio label="s3" class="radio-card">
                            <font-awesome-icon icon="database" class="channel-icon"/>
                            <span>S3</span>
                        </el-radio>
                        <el-radio label="discord" class="radio-card">
                            <font-awesome-icon icon="comments" class="channel-icon"/>
                            <span>DC</span>
                        </el-radio>
                        <el-radio label="huggingface" class="radio-card">
                            <font-awesome-icon icon="robot" class="channel-icon"/>
                            <span>HF</span>
                        </el-radio>
                        <el-radio label="webdav" class="radio-card">
                            <font-awesome-icon icon="folder" class="channel-icon"/>
                            <span>WD</span>
                        </el-radio>
                    </el-radio-group>
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

export default {
    name: 'UploadSettingsDialog',
    methods: {
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
    computed: {
        visible: {
            get() { return this.modelValue },
            set(val) { this.$emit('update:modelValue', val) }
        },
        dialogWidth() {
            return window.innerWidth > 768 ? '50%' : '90%'
        }
    }
}
</script>
