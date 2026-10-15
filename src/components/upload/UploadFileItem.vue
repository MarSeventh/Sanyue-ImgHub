<template>
    <div class="upload-list-item">
        <a :href="file.url" target="_blank" class="upload-list-item-preview">
            <!-- 视频 -->
            <video
                v-if="isVideo(file)"
                :src="file.url"
                autoplay
                muted
                playsinline
                loop
            >
                Your browser does not support the video tag.
            </video>
            <!-- 图片 -->
            <img
                v-else-if="isImage(file)"
                :src="file.url"
                @error="$emit('preview-error', file)"
            />
            <!-- 其他文件 -->
            <div v-else class="upload-list-item-placeholder">
                <font-awesome-icon icon="file" class="file-icon"></font-awesome-icon>
            </div>
        </a>
        <div class="upload-list-item-content">
            <div
                class="upload-list-item-name-wrapper"
                tabindex="0"
                :aria-label="$t('uploadForm.fileInformation')"
                @wheel="scrollHorizontally"
            >
                <div class="upload-list-item-heading-track">
                    <span class="upload-list-item-name" :title="file.name" tabindex="0" @wheel="scrollHorizontally">{{ file.name }}</span>
                    <span class="upload-file-badge upload-file-badge-mime" :class="{ 'upload-file-badge-converted': isWebpConverted }" :title="mimeTitle">
                        <el-icon v-if="isWebpConverted" :aria-label="$t('uploadForm.webpConversionSuccess')"><CircleCheck /></el-icon>
                        <span class="upload-file-mime-text" :title="mimeTitle" tabindex="0" @wheel="scrollHorizontally">{{ mimeType }}</span>
                    </span>
                    <span
                        v-if="formattedSize"
                        class="upload-file-badge upload-file-badge-size"
                        :class="{ 'upload-file-badge-compressed': savedPercent !== null }"
                        :title="savedPercent !== null ? compressionTitle : $t('uploadForm.fileSizeLabel', { size: formattedSize })"
                    >
                        {{ formattedSize }}
                        <span v-if="compressionLabel" class="upload-file-size-reduction">
                            <font-awesome-icon icon="arrow-down" aria-hidden="true" />
                            {{ compressionLabel }}
                        </span>
                    </span>
                </div>
            </div>
            <div class="upload-list-item-url" v-if="file.status==='done'">
                <div class="upload-list-item-url-row">
                    <el-input v-model="file.finalURL" readonly @click="selectAllText" :size="urlSize">
                        <template #prepend>URL</template>
                    </el-input>
                    <el-input v-model="file.mdURL" readonly @click="selectAllText" :size="urlSize">
                        <template #prepend>MarkDown</template>
                    </el-input>
                </div>
                <div class="upload-list-item-url-row">
                    <el-input v-model="file.htmlURL" readonly @click="selectAllText" :size="urlSize">
                        <template #prepend>HTML</template>
                    </el-input>
                    <el-input v-model="file.ubbURL" readonly @click="selectAllText" :size="urlSize">
                        <template #prepend>BBCode</template>
                    </el-input>
                </div>
            </div>
            <div class="upload-list-item-progress" v-else>
                <el-progress :percentage="file.progreess" :status="file.status" :show-text="false"/>
            </div>
        </div>
        <div class="upload-list-item-action">
            <button class="modern-file-action-btn modern-file-action-btn-primary" @click="$emit('copy', file)">
                <el-icon><Link /></el-icon>
            </button>
            <button class="modern-file-action-btn modern-file-action-btn-danger" @click="$emit('remove', file)">
                <el-icon><Delete /></el-icon>
            </button>
        </div>
    </div>
</template>

<script>
import { Link, Delete, CircleCheck } from '@element-plus/icons-vue'
import { getFileMimeType, isImageFile, isVideoFile, normalizeMimeType } from '@/utils/mimeTypes'

export default {
    name: 'UploadFileItem',
    components: { Link, Delete, CircleCheck },
    props: {
        file: { type: Object, required: true }
    },
    emits: ['copy', 'remove', 'preview-error'],
    computed: {
        mimeType() {
            return normalizeMimeType(getFileMimeType(this.file))
        },
        isWebpConverted() {
            return this.file.convertedToWebp === true && this.mimeType === 'image/webp'
        },
        mimeTitle() {
            return this.isWebpConverted ? `${this.mimeType} · ${this.$t('uploadForm.webpConversionSuccess')}` : this.mimeType
        },
        formattedSize() {
            return this.formatSize(this.file.size)
        },
        savedPercent() {
            const { size, originalSize } = this.file
            if (!Number.isFinite(size) || !Number.isFinite(originalSize) || size < 0 || originalSize <= 0 || size >= originalSize) return null
            const percent = (1 - size / originalSize) * 100
            return percent < 0.1 ? '<0.1' : String(Math.round(percent * 10) / 10)
        },
        compressionLabel() {
            return this.savedPercent === null ? '' : `${this.savedPercent}%`
        },
        compressionTitle() {
            return this.$t('uploadForm.localSizeReduction', {
                before: this.formatSize(this.file.originalSize),
                after: this.formattedSize,
                percent: this.savedPercent,
            })
        },
        urlSize() {
            return window.innerWidth < 768 ? 'small' : 'default'
        }
    },
    methods: {
        isImage: isImageFile,
        isVideo: isVideoFile,
        formatSize(bytes) {
            if (!Number.isFinite(bytes) || bytes < 0) return ''
            if (bytes === 0) return '0 B'
            const units = ['B', 'KB', 'MB', 'GB', 'TB']
            const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
            return `${Number((bytes / (1024 ** index)).toFixed(index === 0 ? 0 : 2))} ${units[index]}`
        },
        scrollHorizontally(event) {
            const element = event.currentTarget
            if (element.scrollWidth <= element.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
            const next = Math.max(0, Math.min(element.scrollLeft + event.deltaY, element.scrollWidth - element.clientWidth))
            if (next === element.scrollLeft) return
            event.preventDefault()
            event.stopPropagation()
            element.scrollLeft = next
        },
        selectAllText(event) {
            navigator.clipboard.writeText(event.target.value)
                .then(() => {
                    this.$message({ type: 'success', message: this.$t('uploadForm.copySuccess') })
                })
                .catch(() => {
                    this.$message({ type: 'error', message: this.$t('uploadForm.copyFailed') })
                })
        }
    }
}
</script>

<style scoped>
.upload-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    margin: 8px 10px;
    border: 1px solid var(--upload-list-item-border-color, rgba(37, 99, 235, 0.1));
    padding: 10px 12px;
    border-radius: 16px;
    background-color: var(--glass-bg) !important;
    backdrop-filter: blur(20px) saturate(1.4);
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
    box-shadow: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.upload-list-item-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 clamp(48px, 8vw, 112px);
    aspect-ratio: 1;
    min-width: 0;
    border-radius: 12px;
    overflow: hidden;
    background: var(--el-fill-color-light);
}
.upload-list-item-preview > img,
.upload-list-item-preview > video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.upload-list-item-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}
.upload-list-item:hover {
    border-color: var(--upload-list-item-hover-border, rgba(37, 99, 235, 0.25));
    box-shadow: none;
}
.upload-list-item-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}
.upload-list-item-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
}
.upload-list-item-url-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    min-width: 0;
    gap: 8px;
    margin-bottom: 6px;
}
.upload-list-item-url-row > :deep(.el-input) {
    flex: 1;
    min-width: 0;
}
.upload-list-item-url-row:last-child {
    margin-bottom: 0;
}
.upload-list-item-url {
    display: flex;
    flex-direction: column;
}
.file-icon {
    font-size: 30px;
    color: var(--upload-list-file-icon-color);
}

/* Name Wrapper */
.upload-list-item-name-wrapper {
    padding: 6px 8px;
    background: var(--file-name-bg, rgba(37, 99, 235, 0.05));
    border-radius: 10px;
    margin-bottom: 8px;
    border: 1px solid var(--file-name-border, rgba(37, 99, 235, 0.12));
    transition: all 0.3s ease;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: var(--el-border-color) transparent;
    -webkit-overflow-scrolling: touch;
}
.upload-list-item-heading-track {
    display: flex;
    align-items: center;
    gap: 6px;
    width: max-content;
    min-width: 100%;
    min-height: 24px;
}
.upload-file-badge {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 5px;
    height: 22px;
    padding: 0 7px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 11px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    box-sizing: border-box;
}
.upload-file-mime-text {
    display: block;
    max-width: 26ch;
    overflow-x: auto;
    overflow-y: hidden;
    line-height: 18px;
    scrollbar-width: none;
}
.upload-file-badge-size {
    font-variant-numeric: tabular-nums;
}
.upload-file-size-reduction {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding-left: 5px;
    border-left: 1px solid var(--el-color-success-light-7);
}
.upload-file-size-reduction > .svg-inline--fa {
    font-size: 0.8em;
}
.upload-file-badge-converted {
    color: #2563eb;
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);
}
html.dark .upload-file-badge-converted {
    color: #a5b4fc;
}
.upload-file-badge-compressed {
    color: #3f7d24;
    background: var(--el-color-success-light-9);
    border-color: var(--el-color-success-light-7);
}
html.dark .upload-file-badge-compressed {
    color: var(--el-color-success);
}
.upload-list-item-name-wrapper:focus-visible,
.upload-list-item-name:focus-visible,
.upload-file-mime-text:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
}
.upload-list-item-name-wrapper::-webkit-scrollbar {
    height: 3px;
}
.upload-list-item-name-wrapper::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background: var(--el-border-color);
}
.upload-list-item-name::-webkit-scrollbar,
.upload-file-mime-text::-webkit-scrollbar {
    display: none;
}
.upload-list-item-name-wrapper:hover {
    background: var(--file-name-hover-bg, rgba(37, 99, 235, 0.09));
    border-color: var(--file-name-hover-border, rgba(37, 99, 235, 0.2));
}
.upload-list-item-name {
    flex: 0 0 auto;
    font-size: 14px;
    font-weight: 600;
    max-width: clamp(84px, 16vw, 300px);
    color: var(--el-text-color-primary);
    letter-spacing: 0.3px;
    text-align: left;
    white-space: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    line-height: 24px;
}

/* Progress Bar */
.upload-list-item-progress {
    margin-top: 8px;
    width: 100%;
    box-sizing: border-box;
    padding: 4px 8px;
    background: var(--progress-wrapper-bg, rgba(37, 99, 235, 0.04));
    border-radius: 12px;
    border: 1px solid var(--progress-wrapper-border, rgba(37, 99, 235, 0.1));
}
.upload-list-item-progress :deep(.el-progress) {
    --el-color-primary: var(--primary-color);
}
.upload-list-item-progress :deep(.el-progress-bar) {
    padding-right: 0;
    margin-right: 0;
}
.upload-list-item-progress :deep(.el-progress-bar__outer) {
    height: 10px !important;
    border-radius: 8px;
    background: var(--progress-outer-bg, rgba(0, 0, 0, 0.045));
    box-shadow: none;
    overflow: hidden;
}
.upload-list-item-progress :deep(.el-progress-bar__inner) {
    border-radius: 8px;
    background: var(--primary-color) !important;
    box-shadow: none;
    position: relative;
    overflow: hidden;
    transition: width 0.3s ease;
}
.upload-list-item-progress :deep(.el-progress-bar__inner::after) {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(255, 255, 255, 0.12);
    pointer-events: none;
}
.upload-list-item-progress :deep(.el-progress-bar__inner::before) {
    content: '';
    position: absolute;
    top: 0; left: -100%; width: 300%; height: 100%;
    background: repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255, 255, 255, 0.15) 8px, rgba(255, 255, 255, 0.15) 16px);
    animation: progressStripes 1s linear infinite;
}
.upload-list-item-progress :deep(.el-progress.is-success .el-progress-bar__inner) {
    background: #16A34A !important;
    background-size: 200% 100%;
    box-shadow: none;
    animation: none;
}
.upload-list-item-progress :deep(.el-progress.is-success .el-progress-bar__inner::before),
.upload-list-item-progress :deep(.el-progress.is-success .el-progress-bar__inner::after) {
    animation: none;
    background: none;
}
.upload-list-item-progress :deep(.el-progress.is-exception .el-progress-bar__inner) {
    background: #DC2626 !important;
    background-size: 200% 100%;
    box-shadow: none;
    animation: none;
}
.upload-list-item-progress :deep(.el-progress.is-exception .el-progress-bar__inner::before),
.upload-list-item-progress :deep(.el-progress.is-exception .el-progress-bar__inner::after) {
    animation: none;
    background: none;
}
@keyframes progressStripes {
    0% { transform: translateX(0); }
    100% { transform: translateX(22.627px); }
}
/* URL Input Styles */
.upload-list-item-url :deep(.el-input) {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.upload-list-item-url :deep(.el-input__wrapper) {
    border-radius: 10px;
    box-shadow: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: var(--el-fill-color-blank);
    border: 1px solid var(--el-border-color-lighter);
    overflow: hidden;
    position: relative;
    padding: 0;
}
.upload-list-item-url :deep(.el-input-group > .el-input__wrapper) {
    border-radius: 0 9px 9px 0 !important;
}
.upload-list-item-url :deep(.el-input__wrapper:hover) {
    box-shadow: none;
    border-color: var(--el-color-primary-light-5);
}
.upload-list-item-url :deep(.el-input__wrapper.is-focus) {
    box-shadow: none;
    border-color: var(--el-color-primary);
}
.upload-list-item-url :deep(.el-input__wrapper.is-focus::before) {
    content: '';
    position: absolute;
    top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.08), transparent);
    animation: shimmer 2s infinite;
    z-index: 0;
}
@keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
}
.upload-list-item-url :deep(.el-input__inner) {
    font-size: 13px;
    font-family: 'Courier New', Monaco, monospace;
    color: var(--el-text-color-regular);
    transition: all 0.3s ease;
    padding-left: 12px;
    position: relative;
    z-index: 1;
    border-radius: 0 10px 10px 0;
}
.upload-list-item-url :deep(.el-input__inner::selection) {
    background-color: var(--el-color-primary-light-7);
}
html.dark .upload-list-item-url :deep(.el-input-group__prepend) {
    color: var(--primary-color-accent);
}
.upload-list-item-url :deep(.el-input-group__prepend) {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 600;
    font-size: 12px;
    border: none;
    padding: 0 14px;
    margin: 0;
    border-radius: 9px 0 0 9px;
    box-shadow: none;
    transition: all 0.3s ease;
    letter-spacing: 0.5px;
    position: relative;
    z-index: 1;
}
.upload-list-item-url :deep(.el-input-group__prepend::after) {
    content: '';
    position: absolute;
    right: 0; top: 50%;
    transform: translateY(-50%);
    height: 60%; width: 1px;
    background: var(--el-color-primary-light-7);
    opacity: 0.3;
    transition: all 0.3s ease;
}
.upload-list-item-url :deep(.el-input:hover .el-input-group__prepend) {
    background: var(--el-color-primary-light-8);
}
.upload-list-item-url :deep(.el-input:hover .el-input-group__prepend::after) {
    opacity: 0.5;
}
.upload-list-item-url :deep(.el-input.is-focus .el-input-group__prepend) {
    background: var(--el-color-primary);
    color: white;
    animation: prependPulse 2s ease-in-out infinite;
}
.upload-list-item-url :deep(.el-input.is-focus .el-input-group__prepend::after) {
    background: rgba(255, 255, 255, 0.3);
    opacity: 1;
}
@keyframes prependPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.95; }
}

/* File Action Buttons */
.modern-file-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 10px;
    background: var(--upload-action-btn-bg);
    color: var(--upload-action-btn-color);
    box-shadow: var(--upload-action-btn-shadow);
    cursor: pointer;
    transition: background-color 0.22s ease, color 0.22s ease, transform 0.22s ease;
    font-size: 16px;
    position: relative;
    overflow: hidden;
    margin: 4px 0;
    outline: none;
}
.modern-file-action-btn::before {
    content: '';
    position: absolute;
    inset: 2px;
    border-radius: 8px;
    background: currentColor;
    opacity: 0;
    transition: opacity 0.22s ease;
}
.modern-file-action-btn:hover {
    background: var(--upload-action-btn-hover-bg);
}
.modern-file-action-btn:hover::before {
    opacity: 0.08;
}
.modern-file-action-btn:active {
    transform: scale(0.96);
}
.modern-file-action-btn-primary {
    color: var(--upload-action-copy-color);
}
.modern-file-action-btn-danger {
    color: var(--upload-action-danger-color);
    background: var(--upload-action-danger-bg);
}
.modern-file-action-btn-danger:hover {
    background: var(--upload-action-danger-hover-bg);
}

/* Mobile */
@media (max-width: 768px) {
    .upload-list-item {
        margin: 5px 6px;
        padding: 7px 8px;
        border-radius: 12px;
        gap: 8px;
    }
    .upload-list-item-preview {
        flex-basis: 44px;
        border-radius: 8px;
    }
    .upload-list-item-action {
        gap: 3px;
    }
    .upload-list-item-url-row {
        width: 100%;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 4px;
    }
    .upload-list-item-progress {
        width: 100%;
        margin-top: 5px;
        padding: 2px 5px;
        border-radius: 9px;
    }
    .upload-list-item-progress :deep(.el-progress-bar__outer) {
        height: 6px !important;
    }
    .upload-list-item-url :deep(.el-input__wrapper) {
        border-radius: 7px;
    }
    .upload-list-item-url :deep(.el-input__inner) {
        font-size: 10px;
        padding-left: 8px;
    }
    .upload-list-item-url :deep(.el-input-group__prepend) {
        font-size: 9px;
        padding: 0 6px;
        border-radius: 7px 0 0 7px;
    }
    .modern-file-action-btn {
        width: 26px;
        height: 26px;
        margin: 2px 0;
        border-radius: 8px;
        font-size: 12px;
    }
    .upload-list-item-name-wrapper {
        padding: 4px 6px;
        margin-bottom: 5px;
        border-radius: 7px;
    }
    .upload-list-item-name {
        font-size: 12px;
        max-width: clamp(72px, 18vw, 120px);
    }
    .upload-file-badge {
        height: 21px;
        padding: 0 6px;
        font-size: 10px;
    }
    .upload-file-mime-text {
        max-width: 20ch;
    }
}
</style>
