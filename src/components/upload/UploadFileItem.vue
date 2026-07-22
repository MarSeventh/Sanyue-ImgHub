<template>
    <div class="upload-list-item">
        <a :href="file.url" target="_blank" class="upload-list-item-preview">
            <!-- 视频 -->
            <video
                v-if="isVideo(file.name)"
                style="width: 10vw; border-radius: 12px;"
                autoplay
                muted
                playsinline
                loop
            >
                <source :src="file.url" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <!-- 图片 -->
            <img
                v-else-if="isImage(file.name)"
                style="width: 10vw; border-radius: 12px;"
                :src="file.url"
                @error="$emit('preview-error', file)"
            />
            <!-- 其他文件 -->
            <div v-else style="width: 10vw; border-radius: 12px;">
                <font-awesome-icon icon="file" class="file-icon"></font-awesome-icon>
            </div>
        </a>
        <div class="upload-list-item-content">
            <div class="upload-list-item-name-wrapper">
                <el-text class="upload-list-item-name" truncated>{{ truncateFilename(file.name) }}</el-text>
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
import { Link, Delete } from '@element-plus/icons-vue'

const IMAGE_EXTENSIONS = [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'ico', 'avif', 'heic',
    'jfif', 'pjpeg', 'pjp', 'raw', 'cr2', 'nef', 'dng', 'eps', 'ai', 'emf', 'wmf'
]
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mkv']

export default {
    name: 'UploadFileItem',
    components: { Link, Delete },
    props: {
        file: { type: Object, required: true }
    },
    emits: ['copy', 'remove', 'preview-error'],
    computed: {
        urlSize() {
            return window.innerWidth < 768 ? 'small' : 'default'
        }
    },
    methods: {
        isImage(fileName) {
            const ext = fileName.split('.').pop().toLowerCase()
            return IMAGE_EXTENSIONS.includes(ext)
        },
        isVideo(fileName) {
            const ext = fileName.split('.').pop().toLowerCase()
            return VIDEO_EXTENSIONS.includes(ext)
        },
        truncateFilename(filename, maxLength = 20) {
            if (!filename || filename.length <= maxLength) return filename
            const lastDotIndex = filename.lastIndexOf('.')
            let name, ext
            if (lastDotIndex > 0) {
                name = filename.substring(0, lastDotIndex)
                ext = filename.substring(lastDotIndex)
            } else {
                name = filename
                ext = ''
            }
            const keepEnd = ext.length + 4
            const keepStart = maxLength - keepEnd - 3
            if (keepStart <= 0) return filename.substring(0, maxLength - 3) + '...'
            return name.substring(0, keepStart) + '...' + name.slice(-4) + ext
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
.upload-list-item:hover {
    border-color: var(--upload-list-item-hover-border, rgba(37, 99, 235, 0.25));
    box-shadow: none;
}
.upload-list-item-content {
    display: flex;
    flex-direction: column;
    margin-left: 10px;
}
.upload-list-item-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
}
.upload-list-item-url-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 38vw;
    gap: 8px;
    margin-bottom: 6px;
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
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    background: var(--file-name-bg, rgba(37, 99, 235, 0.05));
    border-radius: 10px;
    margin-bottom: 8px;
    border: 1px solid var(--file-name-border, rgba(37, 99, 235, 0.12));
    transition: all 0.3s ease;
}
.upload-list-item-name-wrapper:hover {
    background: var(--file-name-hover-bg, rgba(37, 99, 235, 0.09));
    border-color: var(--file-name-hover-border, rgba(37, 99, 235, 0.2));
}
.upload-list-item-name {
    font-size: 14px;
    font-weight: 600;
    max-width: 28vw;
    color: var(--el-text-color-primary);
    letter-spacing: 0.3px;
    text-align: center;
}

/* Progress Bar */
.upload-list-item-progress {
    margin-top: 8px;
    width: 28vw;
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
.upload-list-item-progress :deep(.el-progress--success .el-progress-bar__inner) {
    background: #16A34A !important;
    background-size: 200% 100%;
    box-shadow: none;
    animation: none;
}
.upload-list-item-progress :deep(.el-progress--success .el-progress-bar__inner::before),
.upload-list-item-progress :deep(.el-progress--success .el-progress-bar__inner::after) {
    animation: none;
    background: none;
}
.upload-list-item-progress :deep(.el-progress--exception .el-progress-bar__inner) {
    background: #DC2626 !important;
    background-size: 200% 100%;
    box-shadow: none;
    animation: progressPulse 1s ease-in-out infinite;
}
.upload-list-item-progress :deep(.el-progress--exception .el-progress-bar__inner::before) {
    animation: none;
    background: none;
}
@keyframes progressStripes {
    0% { transform: translateX(0); }
    100% { transform: translateX(22.627px); }
}
@keyframes progressPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
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
    }
    .upload-list-item-content {
        margin-left: 2px;
    }
    .upload-list-item-action {
        gap: 3px;
    }
    .upload-list-item-url-row {
        width: 42vw;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 4px;
    }
    .upload-list-item-progress {
        width: 32vw;
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
        padding: 3px 8px;
        margin-bottom: 5px;
        border-radius: 7px;
    }
    .upload-list-item-name {
        font-size: 11px;
        width: 32vw;
    }
}
</style>
