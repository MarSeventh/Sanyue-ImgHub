<template>
    <el-dialog :title="$t('fileDetail.title')" v-model="visible" :width="dialogWidth" class="file-detail-dialog" @open="resetDetailView" @opened="handleDetailOpened">
        <div ref="detailStart" class="detail-actions">
            <div v-if="!isEditing" class="detail-toolbar" @mouseleave="actionsHovered = false">
                <div
                    id="file-detail-extra-actions"
                    class="detail-secondary-actions"
                    :class="{ 'is-expanded': actionsExpanded }"
                    :style="{ '--secondary-actions-width': `${secondaryWidth}px` }"
                    :aria-hidden="!actionsExpanded"
                    :inert="!actionsExpanded"
                >
                    <div ref="secondaryContent" class="detail-secondary-content">
                        <el-button type="primary" @click="$emit('tagManagement')" round size="small" class="detail-action">
                            <font-awesome-icon icon="tags" style="margin-right: 3px;"></font-awesome-icon> {{ $t('fileDetail.tags') }}
                        </el-button>
                        <el-button type="primary" @click="$emit('block')" round size="small" class="detail-action">
                            <font-awesome-icon icon="ban" style="margin-right: 3px;"></font-awesome-icon> {{ $t('fileDetail.blacklist') }}
                        </el-button>
                        <el-button type="primary" @click="$emit('white')" round size="small" class="detail-action">
                            <font-awesome-icon icon="shield-alt" style="margin-right: 3px;"></font-awesome-icon> {{ $t('fileDetail.whitelist') }}
                        </el-button>
                        <el-button type="info" @click="openRenameDialog()" round size="small" class="detail-action">
                            <font-awesome-icon icon="i-cursor" style="margin-right: 3px;"></font-awesome-icon> {{ $t('fileDetail.rename') }}
                        </el-button>
                    </div>
                </div>
                <el-button
                    circle size="small" class="detail-action detail-actions-toggle"
                    :type="actionsPinned ? 'primary' : 'default'"
                    :aria-label="$t(actionsPinned ? 'fileDetail.collapseActions' : 'fileDetail.expandActions')"
                    :aria-expanded="actionsExpanded"
                    :aria-pressed="actionsPinned"
                    aria-controls="file-detail-extra-actions"
                    @mouseenter="actionsHovered = true"
                    @click="toggleActions"
                >
                    <font-awesome-icon icon="chevron-left" :class="{ 'actions-arrow-expanded': actionsExpanded }"/>
                </el-button>
                <el-button type="primary" @click="$emit('download')" round size="small" class="detail-action">
                    <font-awesome-icon icon="download" style="margin-right: 3px;"></font-awesome-icon> {{ $t('fileDetail.download') }}
                </el-button>
                <el-button type="warning" @click="startEdit()" round size="small" class="detail-action">
                    <font-awesome-icon icon="edit" style="margin-right: 3px;"></font-awesome-icon> {{ $t('fileDetail.edit') }}
                </el-button>
                <el-button type="danger" @click="$emit('delete')" round size="small" class="detail-action">
                    <font-awesome-icon icon="trash-alt" style="margin-right: 3px;"></font-awesome-icon> {{ $t('fileDetail.deleteBtn') }}
                </el-button>
            </div>
            <el-button type="success" @click="saveMetadata()" round size="small" class="detail-action" v-if="isEditing" :loading="editSaving">
                <font-awesome-icon icon="save" style="margin-right: 3px;" v-if="!editSaving"></font-awesome-icon> {{ $t('fileDetail.save') }}
            </el-button>
            <el-button @click="cancelEdit()" round size="small" class="detail-action" v-if="isEditing">
                {{ $t('fileDetail.cancel') }}
            </el-button>
        </div>
        <div class="link-section">
            <el-tabs v-model="activeTab">
                <el-tab-pane v-for="entry in linkEntries" :key="entry.key" :label="entry.label" :name="entry.key">
                    <el-input :model-value="entry.value" :aria-label="entry.label" readonly @click="handleUrlClick"></el-input>
                </el-tab-pane>
            </el-tabs>
            <div class="link-content-picker">
                <span class="link-label">{{ $t('settings.linkContent') }}</span>
                <el-radio-group v-model="selectedContent" :aria-label="$t('settings.linkContent')">
                    <el-radio v-for="content in availableContents" :key="content" :label="content">
                        {{ contentLabel(content) }}
                    </el-radio>
                </el-radio-group>
            </div>
            <p v-if="contentFallback" class="link-content-hint">{{ $t('settings.linkContentFallback') }}</p>
        </div>
        <div ref="detailLayout" class="detail-body-layout" :class="[`preview-layout-${previewLayout}`, { 'is-side-by-side': sideBySide }]">
            <!-- 竖向媒体在大屏与信息并排，其余内容使用适合各自类型的紧凑布局。 -->
            <div class="preview-section">
                <div ref="previewContent" class="preview-content" :class="{ 'is-loading': previewLoading, 'is-ready': mediaReady }" :aria-busy="previewLoading">
                    <Transition name="preview-loading">
                        <div v-if="previewLoading && visible" class="preview-skeleton" aria-hidden="true"></div>
                    </Transition>
                    <video v-if="isVideo && !previewFailed" :key="`video:${fileLink}`" :src="fileLink" autoplay muted loop playsinline class="video-preview" @loadedmetadata="handleMediaLoad" @loadeddata="handleMediaReady" @error="handleMediaError" @click="openImageLink"></video>
                    <audio v-else-if="isAudio && !previewFailed" :key="`audio:${fileLink}`" :src="fileLink" controls autoplay class="audio-preview" @loadeddata="handleMediaReady" @error="handleMediaError"></audio>
                    <el-image
                        v-else-if="isImage && !previewFailed"
                        :key="`image:${fileLink}`"
                        :src="fileLink"
                        :preview-src-list="[fileLink]"
                        :preview-teleported="true"
                        fit="contain"
                        class="image-preview"
                        @load="handleMediaLoad"
                        @error="handleMediaError"
                    >
                        <template #placeholder><span></span></template>
                    </el-image>
                    <template v-else>
                        <font-awesome-icon icon="file" class="file-icon-detail"></font-awesome-icon>
                        <div class="file-preview-summary">
                            <span class="file-preview-name">{{ file?.metadata?.FileName || file?.name }}</span>
                            <span class="file-preview-type">{{ file?.metadata?.FileType || $t('fileDetail.unknown') }}</span>
                        </div>
                    </template>
                </div>
            </div>
            <!-- 列数切换会复用单元格；禁用标签的独立进出动画，避免旧标签残留占位。 -->
            <el-descriptions border :column="descColumn" class="file-detail-metadata">
                <el-descriptions-item :label="$t('fileDetail.fileNameLabel')">
                    <el-input v-if="isEditing" v-model="editForm.FileName" size="small" :placeholder="$t('fileDetail.fileNamePlaceholder')"></el-input>
                    <span v-else>{{ file?.metadata?.FileName || file?.name }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('fileDetail.fileType')">
                    <el-input v-if="isEditing" v-model="editForm.FileType" size="small" :placeholder="$t('fileDetail.fileTypePlaceholder')"></el-input>
                    <span v-else>{{ file?.metadata?.FileType || $t('fileDetail.unknown') }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('fileDetail.fileSizeLabel')">{{ fileSizeDisplay }}</el-descriptions-item>
                <el-descriptions-item :label="$t('fileDetail.imageDimensions')">
                    <div v-if="imageDimensions" class="image-dimensions">
                        <span>{{ file?.metadata?.Width }} × {{ file?.metadata?.Height }}</span>
                        <el-tag disable-transitions size="small" type="info" style="display: inline-flex; align-items: center; justify-content: center;">{{ orientationIcon }}</el-tag>
                    </div>
                    <span v-else style="color: var(--el-text-color-secondary);">{{ $t('fileDetail.noDimensions') }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('fileDetail.uploadTimeLabel')">{{ uploadTime }}</el-descriptions-item>
                <el-descriptions-item :label="$t('fileDetail.channelTypeAndName')">
                    <el-tag disable-transitions size="small" type="info" style="margin-right: 6px;">{{ file?.metadata?.Channel || $t('fileDetail.unknown') }}</el-tag>
                    <span>{{ file?.metadata?.ChannelName || '-' }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('fileDetail.accessStatusAndReview')">
                    <el-tag disable-transitions size="small" :type="accessTagType" style="margin-right: 6px;">{{ accessType }}</el-tag>
                    <span>{{ file?.metadata?.Label || $t('fileDetail.noTags') }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('fileDetail.uploadIP')">{{ file?.metadata?.UploadIP || $t('fileDetail.unknown') }}</el-descriptions-item>
                <el-descriptions-item :label="$t('fileDetail.uploadAddressLabel')">{{ file?.metadata?.UploadAddress || $t('fileDetail.unknown') }}</el-descriptions-item>
                <el-descriptions-item :label="$t('fileDetail.fileTags')">
                    <div v-if="file?.metadata?.Tags && file?.metadata?.Tags.length > 0" style="display: flex; flex-wrap: wrap; gap: 5px;">
                        <el-tag v-for="tag in file?.metadata?.Tags" :key="tag" disable-transitions size="small">{{ tag }}</el-tag>
                    </div>
                    <span v-else style="color: var(--el-text-color-secondary);">{{ $t('fileDetail.noTags') }}</span>
                </el-descriptions-item>
            </el-descriptions>
        </div>
        <!-- 重命名弹窗 -->
        <el-dialog
            v-model="showRenameDialog"
            :title="$t('fileDetail.renameTitle')"
            :width="dialogWidth"
            append-to-body
        >
            <el-form @submit.prevent="submitRename">
                <el-form-item :label="$t('fileDetail.renameLabel')" :error="renameValidation.error">
                    <el-input
                        v-model="renameForm.newFileId"
                        :placeholder="$t('fileDetail.renamePlaceholder')"
                        @input="validateRenameInput"
                        clearable
                    ></el-input>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="closeRenameDialog()">{{ $t('fileDetail.renameCancel') }}</el-button>
                <el-button type="primary" @click="submitRename()" :loading="renameSaving" :disabled="!renameValidation.valid">{{ $t('fileDetail.renameConfirm') }}</el-button>
            </template>
        </el-dialog>
    </el-dialog>
</template>

<script>
import { ElMessage } from 'element-plus';
import { ref } from 'vue';
import { useElementSize, useWindowSize } from '@vueuse/core';
import fetchWithAuth from '@/utils/fetchWithAuth';
import { validateFileId } from '@/utils/fileIdValidator';
import { isImageFile, isVideoFile, isAudioFile } from '@/utils/mimeTypes';
import { LINK_FORMATS, LINK_CONTENT_LABELS, getAvailableLinkContents, getLinkContentGroup, getPreferredLinkContent, buildManagementFileLinks } from '@/utils/dashboard/fileLinks';
import { createDetailPreviewMotion } from '@/utils/dashboard/detailPreviewMotion';

export default {
    name: 'FileDetailDialog',
    setup() {
        const { width: viewportWidth } = useWindowSize();
        const secondaryContent = ref(null);
        const { width: secondaryWidth } = useElementSize(secondaryContent);
        const detailMotion = createDetailPreviewMotion();
        return { viewportWidth, secondaryContent, secondaryWidth, detailMotion };
    },
    props: {
        modelValue: { type: Boolean, default: false },
        file: { type: Object, default: null },
        fileLink: { type: String, default: '' },
        rootUrl: { type: String, default: '' },
        defaultFormat: { type: String, default: 'originUrl' },
        contentPreferences: { type: Object, default: () => ({}) }
    },
    emits: ['update:modelValue', 'download', 'tagManagement', 'block', 'white', 'delete', 'metadataUpdated', 'fileRenamed'],
    watch: {
        visible(val) {
            this.dialogOpened = false;
            this.detailMotion.cancel();
            this.contentOverride = null;
            this.actionsHovered = false;
            this.actionsPinned = false;
            if (val) {
                this.activeFormat = this.defaultFormat;
                // 同一媒体重开时保留已知尺寸；缓存图片不会保证再次触发 load。
                if (this.previewFailed) this.mediaReady = false;
                this.previewFailed = false;
                this.resetDetailView();
            }
            if (!val) {
                // 关闭弹窗时退出编辑状态
                this.isEditing = false;
                this.editSaving = false;
            }
        },
        'file.name'() {
            this.resetPreview();
            this.contentOverride = null;
            this.actionsHovered = false;
            this.actionsPinned = false;
            this.activeFormat = this.defaultFormat;
            if (this.visible) this.resetDetailView();
        },
        fileLink() { this.resetPreview(); },
        layoutState() {
            const layout = this.$refs.detailLayout;
            if (!this.visible || !this.dialogOpened || !layout) return;
            const snapshot = this.detailMotion.capture(layout);
            this.$nextTick(() => { if (this.visible) this.detailMotion.play(layout, snapshot); });
        },
        defaultFormat(format) { this.activeFormat = format; },
        contentPreferences: {
            handler() { this.contentOverride = null; },
            deep: true
        }
    },
    data() {
        return {
            contentOverride: null,
            previewFailed: false,
            mediaReady: false,
            dialogOpened: false,
            loadedMediaSize: null,
            actionsHovered: false,
            actionsPinned: false,
            activeFormat: this.defaultFormat,
            isEditing: false,
            editForm: {
                FileName: '',
                FileType: ''
            },
            editSaving: false,
            showRenameDialog: false,
            renameForm: {
                newFileId: ''
            },
            renameValidation: {
                valid: true,
                error: ''
            },
            renameSaving: false
        }
    },
    computed: {
        actionsExpanded() {
            return this.actionsHovered || this.actionsPinned;
        },
        activeTab: {
            get() {
                if (this.selectedContent === 'tgId') return 'tgId';
                return LINK_FORMATS.includes(this.activeFormat) ? this.activeFormat : 'originUrl';
            },
            set(format) {
                if (LINK_FORMATS.includes(format)) this.activeFormat = format;
            }
        },
        availableContents() {
            return getAvailableLinkContents(this.file);
        },
        selectedContent: {
            get() {
                return this.availableContents.includes(this.contentOverride)
                    ? this.contentOverride : getPreferredLinkContent(this.file, this.contentPreferences);
            },
            set(content) { this.contentOverride = content; }
        },
        contentFallback() {
            const preferred = this.contentPreferences[getLinkContentGroup(this.file?.metadata)];
            return this.contentOverride === null && preferred && !this.availableContents.includes(preferred);
        },
        linkEntries() {
            const { urls, content } = buildManagementFileLinks(this.file, this.rootUrl, this.selectedContent);
            if (content === 'tgId') return [{ key: 'tgId', label: this.contentLabel('tgId'), value: urls.tgId }];
            const labels = { originUrl: this.$t('settings.rawLink'), mdUrl: 'Markdown', htmlUrl: 'HTML', bbUrl: 'BBCode' };
            return LINK_FORMATS.map(key => ({ key, label: labels[key], value: urls[key] || '' }));
        },
        visible: {
            get() { return this.modelValue; },
            set(val) { this.$emit('update:modelValue', val); }
        },
        dialogWidth() {
            if (this.viewportWidth <= 768) return '95%';
            return this.viewportWidth >= 1024 && (this.isImage || this.isVideo) ? 'min(1080px, 94vw)' : 'min(900px, 94vw)';
        },
        descColumn() {
            return this.viewportWidth <= 768 || this.sideBySide ? 1 : 2;
        },
        previewLayout() {
            if (this.previewFailed) return 'file';
            if (this.isAudio) return 'audio';
            if (!this.isImage && !this.isVideo) return 'file';
            const size = this.loadedMediaSize || this.file?.metadata;
            return Number(size?.Height) > 0 && Number(size?.Width) > 0 && Number(size.Height) > Number(size.Width)
                ? 'portrait' : 'landscape';
        },
        sideBySide() {
            return this.viewportWidth >= 1024 && this.previewLayout === 'portrait';
        },
        previewLoading() {
            return !this.previewFailed && !this.mediaReady && (this.isImage || this.isVideo || this.isAudio);
        },
        layoutState() {
            return `${this.sideBySide}:${this.previewLayout}:${this.previewLoading}`;
        },
        isVideo() {
            return isVideoFile(this.file);
        },
        isAudio() {
            return isAudioFile(this.file);
        },
        isImage() {
            return isImageFile(this.file);
        },
        uploadTime() {
            if (this.file?.metadata?.TimeStamp) {
                return new Date(this.file.metadata.TimeStamp).toLocaleString();
            }
            return this.$t('fileDetail.unknown');
        },
        accessType() {
            const listType = this.file?.metadata?.ListType;
            const label = this.file?.metadata?.Label;
            if (listType === 'White') return this.$t('fileDetail.accessNormalWhitelist');
            if (listType === 'Block') return this.$t('fileDetail.accessBlockedBlacklist');
            if (label === 'adult') return this.$t('fileDetail.accessBlockedReview');
            return this.$t('fileDetail.accessNormal');
        },
        accessTagType() {
            const listType = this.file?.metadata?.ListType;
            const label = this.file?.metadata?.Label;
            if (listType === 'White') return 'success';
            if (listType === 'Block') return 'danger';
            if (label === 'adult') return 'danger';
            return 'success';
        },
        imageDimensions() {
            const width = this.file?.metadata?.Width;
            const height = this.file?.metadata?.Height;
            if (width && height) return true;
            return null;
        },
        orientationIcon() {
            const width = this.file?.metadata?.Width;
            const height = this.file?.metadata?.Height;
            if (!width || !height) return '';
            const ratio = width / height;
            if (ratio > 1.1) return this.$t('fileDetail.orientationLandscape');
            if (ratio < 0.9) return this.$t('fileDetail.orientationPortrait');
            return this.$t('fileDetail.orientationSquare');
        },
        fileSizeDisplay() {
            const sizeBytes = this.file?.metadata?.FileSizeBytes;
            const sizeMB = this.file?.metadata?.FileSize;
            if (sizeBytes) {
                // 根据大小选择合适的单位
                if (sizeBytes < 1024) {
                    return `${sizeBytes} B`;
                } else if (sizeBytes < 1024 * 1024) {
                    return `${(sizeBytes / 1024).toFixed(2)} KB`;
                } else {
                    return `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`;
                }
            } else if (sizeMB) {
                return `${sizeMB} MB`;
            }
            return this.$t('fileDetail.unknown');
        }
    },
    beforeUnmount() {
        this.detailMotion.cancel();
    },
    methods: {
        handleDetailOpened() {
            this.dialogOpened = true;
            return this.resetDetailView();
        },
        resetDetailView() {
            return this.$nextTick(() => {
                // 仅复位当前详情内容区，避免影响文件列表及嵌套弹窗的滚动。
                const body = this.$refs.detailStart?.closest('.el-dialog__body');
                if (body) {
                    body.scrollTop = 0;
                    body.scrollLeft = 0;
                }
                // 打开过渡结束后也读取现有节点，恢复缓存图片或视频的真实方向。
                const media = this.$refs.previewContent?.querySelector('.image-preview img, .video-preview, .audio-preview');
                if (media) this.handleMediaLoad({ target: media });
            });
        },
        resetPreview() {
            this.detailMotion.cancel();
            this.previewFailed = false;
            this.mediaReady = false;
            this.loadedMediaSize = null;
        },
        handleMediaLoad(event) {
            const media = event.target;
            // 切换文件后，忽略已移出当前预览容器的旧媒体回调。
            if (this.$refs.previewContent && !this.$refs.previewContent.contains(media)) return;
            const Width = media.naturalWidth || media.videoWidth;
            const Height = media.naturalHeight || media.videoHeight;
            if (Width > 0 && Height > 0) this.loadedMediaSize = { Width, Height };
            if (media.naturalWidth > 0 || media.readyState >= 2) this.mediaReady = true;
        },
        handleMediaReady(event) {
            if (this.$refs.previewContent && !this.$refs.previewContent.contains(event.target)) return;
            this.mediaReady = true;
        },
        handleMediaError(event) {
            if (this.$refs.previewContent && !this.$refs.previewContent.contains(event.target)) return;
            this.mediaReady = false;
            this.previewFailed = true;
        },
        toggleActions() {
            this.actionsPinned = !this.actionsPinned;
            this.actionsHovered = false;
        },
        contentLabel(content) {
            if (content === 'originUrl' && this.file?.metadata?.Channel === 'External') return this.$t('settings.externalLink');
            return this.$t(LINK_CONTENT_LABELS[content]);
        },
        handleVideoClick(e) {
            const video = e.target;
            if (video.paused) video.play();
            else video.pause();
        },
        handleUrlClick(e) {
            const input = e.target;
            input.select();
            navigator.clipboard.writeText(input.value).then(() => {
                ElMessage.success(this.$t('fileDetail.linkCopied'));
            });
        },
        openImageLink() {
            if (this.fileLink) {
                window.open(this.fileLink, '_blank');
            }
        },
        startEdit() {
            this.editForm.FileName = this.file?.metadata?.FileName || '';
            this.editForm.FileType = this.file?.metadata?.FileType || '';
            this.isEditing = true;
        },
        cancelEdit() {
            this.isEditing = false;
            this.editForm.FileName = this.file?.metadata?.FileName || '';
            this.editForm.FileType = this.file?.metadata?.FileType || '';
            this.editSaving = false;
        },
        async saveMetadata() {
            this.editSaving = true;
            try {
                const fileId = this.file.name;
                const response = await fetchWithAuth(`/api/manage/metadata/${fileId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ FileName: this.editForm.FileName, FileType: this.editForm.FileType })
                });

                if (response.ok) {
                    const data = await response.json();
                    ElMessage.success(this.$t('fileDetail.metadataSaved'));
                    this.isEditing = false;
                    this.$emit('metadataUpdated', fileId, data.metadata);
                } else {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.message || this.$t('fileDetail.metadataSaveFailed'));
                }
            } catch (error) {
                console.error('Error saving metadata:', error);
                ElMessage.error(error.message || this.$t('fileDetail.metadataSaveFailed'));
            } finally {
                this.editSaving = false;
            }
        },
        openRenameDialog() {
            this.renameForm.newFileId = this.file?.name || '';
            this.renameValidation = { valid: true, error: '' };
            this.showRenameDialog = true;
        },
        closeRenameDialog() {
            this.showRenameDialog = false;
            this.renameForm.newFileId = '';
            this.renameValidation = { valid: true, error: '' };
        },
        validateRenameInput() {
            const result = validateFileId(this.renameForm.newFileId, this.file?.name || '');
            this.renameValidation = {
                valid: result.valid,
                error: result.error || ''
            };
        },
        async submitRename() {
            if (this.renameSaving) return;

            // Validate input first
            this.validateRenameInput();
            if (!this.renameValidation.valid) {
                return;
            }

            this.renameSaving = true;
            try {
                const oldFileId = this.file.name;
                const response = await fetchWithAuth(`/api/manage/rename/${oldFileId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ newFileId: this.renameForm.newFileId })
                });

                if (response.ok) {
                    const data = await response.json();
                    ElMessage.success(this.$t('fileDetail.renameSuccess'));
                    this.showRenameDialog = false;
                    this.$emit('fileRenamed', oldFileId, this.renameForm.newFileId, data.metadata);
                } else if (response.status === 409) {
                    // Conflict — target File_ID already exists
                    this.renameValidation = {
                        valid: false,
                        error: this.$t('fileDetail.renameConflict')
                    };
                } else {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.message || this.$t('fileDetail.renameFailed'));
                }
            } catch (error) {
                console.error('Error renaming file:', error);
                ElMessage.error(error.message || this.$t('fileDetail.renameFailed'));
            } finally {
                this.renameSaving = false;
            }
        }
    }
}
</script>

<style scoped>
.link-section {
    margin-bottom: 16px;
}
.link-content-picker {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 16px;
    margin-top: 12px;
}
.link-content-picker :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
}
.link-content-picker :deep(.el-radio) {
    margin-right: 0;
    height: auto;
    min-height: 32px;
    white-space: normal;
}
.link-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--el-text-color-regular);
}
.link-content-hint {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 1.6;
}
.detail-actions {
    display: flex;
    justify-content: right;
    margin-bottom: 10px;
    flex-wrap: wrap;
    gap: 8px;
}
.detail-toolbar,
.detail-secondary-content {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
    max-width: 100%;
}
.detail-secondary-actions {
    min-width: 0;
    max-width: 0;
    opacity: 0;
    visibility: hidden;
    overflow: hidden;
    transition: max-width 260ms cubic-bezier(0.22, 1, 0.36, 1),
        opacity 180ms ease, visibility 0s 260ms;
}
.detail-secondary-actions.is-expanded {
    max-width: var(--secondary-actions-width);
    opacity: 1;
    visibility: visible;
    transition-delay: 0s;
}
.detail-secondary-content {
    /* Keep the content against the arrow while its container opens to the left. */
    justify-self: end;
    width: max-content;
    max-width: none;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    flex-wrap: nowrap;
}
.detail-actions-toggle svg {
    transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}
.actions-arrow-expanded {
    transform: scaleX(-1);
}
.detail-action {
    margin-left: 0 !important;
}
.detail-body-layout {
    --detail-content-radius: 12px;
    position: relative;
    display: grid;
    gap: 16px;
    align-items: start;
    align-content: start;
    min-width: 0;
    overflow-anchor: none;
}
.detail-body-layout > * {
    min-width: 0;
    box-sizing: border-box;
}
.is-layout-animating > * {
    overflow: hidden;
    will-change: transform, width, height;
}
.detail-body-layout.is-side-by-side {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.25fr);
    gap: 20px;
}
.video-preview {
    width: 100%;
    max-height: min(380px, 45vh);
    border-radius: var(--detail-content-radius);
    cursor: pointer;
    object-fit: contain;
}
.audio-preview {
    width: 100%;
    min-width: 0;
    border-radius: var(--detail-content-radius);
}
.image-preview {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: min(380px, 45vh);
    border-radius: var(--detail-content-radius);
    cursor: pointer;
}
.image-preview :deep(img) {
    max-width: 100%;
    max-height: min(380px, 45vh);
    object-fit: contain;
    border-radius: inherit;
}
.file-icon-detail {
    flex-shrink: 0;
    font-size: 36px;
    color: var(--el-text-color-secondary);
}
.preview-section {
    display: flex;
    justify-content: center;
    padding: 12px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--detail-content-radius);
    min-height: 0;
}
.preview-content {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    min-width: 0;
}
/* Reserve space while media loads; keep the media mounted beneath the skeleton. */
.preview-content.is-loading {
    min-height: min(280px, 36vh);
}
.is-side-by-side .preview-content.is-loading {
    min-height: min(480px, 55vh);
}
.preview-layout-audio .preview-content.is-loading {
    min-height: 54px;
}
.preview-content.is-loading > .image-preview,
.preview-content.is-loading > .video-preview,
.preview-content.is-loading > .audio-preview {
    /* Decoding must not change the skeleton's size before the layout is captured. */
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
}
.preview-skeleton {
    position: absolute;
    inset: 0;
    z-index: 1;
    overflow: hidden;
    border-radius: var(--detail-content-radius);
    background: var(--el-fill-color);
    pointer-events: none;
}
.preview-skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 15%, var(--el-fill-color-extra-light) 50%, transparent 85%);
    transform: translateX(-100%);
    animation: preview-shimmer 1.5s ease-in-out infinite;
}
@keyframes preview-shimmer {
    to { transform: translateX(100%); }
}
.preview-content > .image-preview,
.preview-content > .video-preview,
.preview-content > .audio-preview {
    opacity: 0;
    transition: opacity 180ms ease;
}
.preview-content.is-ready > .image-preview,
.preview-content.is-ready > .video-preview,
.preview-content.is-ready > .audio-preview {
    opacity: 1;
}
.preview-loading-leave-active {
    transition: opacity 180ms ease;
}
.preview-loading-leave-to {
    opacity: 0;
}
.is-side-by-side .preview-section {
    align-self: stretch;
}
.is-side-by-side .image-preview,
.is-side-by-side .image-preview :deep(img),
.is-side-by-side .video-preview {
    max-height: min(560px, 62vh);
}
.preview-layout-file .preview-content {
    justify-content: flex-start;
    gap: 14px;
}
.file-preview-summary {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}
.file-preview-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--el-text-color-primary);
}
.file-preview-type {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    overflow-wrap: anywhere;
}
:deep(.el-descriptions__content) {
    word-break: break-all;
    word-wrap: break-word;
}
:deep(.el-descriptions__content .el-tag) {
    vertical-align: middle;
}
:deep(.el-descriptions__content .el-tag + span) {
    vertical-align: middle;
}
:deep(.el-descriptions__label) {
    width: 120px !important;
    min-width: 100px !important;
    max-width: 120px !important;
}
:deep(.el-descriptions__body table) {
    table-layout: fixed;
}
.file-detail-metadata {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--detail-content-radius);
    overflow: hidden;
    background: var(--el-bg-color);
    box-shadow: 0 2px 10px rgb(0 0 0 / 4%);
}
.file-detail-metadata :deep(.el-descriptions__body .el-descriptions__table) {
    border-collapse: separate;
    border-spacing: 0;
}
/* Override the component's full bordered-cell selector so each divider is drawn once. */
.file-detail-metadata :deep(.el-descriptions__body .el-descriptions__table.is-bordered .el-descriptions__cell) {
    padding: 12px 14px;
    border: 0;
    border-right: 1px solid var(--el-border-color-lighter);
    border-bottom: 1px solid var(--el-border-color-lighter);
    font-size: 13px;
    line-height: 1.7;
    overflow-wrap: anywhere;
}
.file-detail-metadata :deep(.el-descriptions__body .el-descriptions__table.is-bordered tr > .el-descriptions__cell:last-child) {
    border-right: 0;
}
.file-detail-metadata :deep(.el-descriptions__body .el-descriptions__table.is-bordered tr:last-child > .el-descriptions__cell) {
    border-bottom: 0;
}
.file-detail-metadata :deep(.el-descriptions__label) {
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    font-weight: 500;
}
.file-detail-metadata :deep(.el-descriptions__content) {
    color: var(--el-text-color-primary);
    background: transparent;
}
.file-detail-metadata :deep(.el-tag) {
    max-width: 100%;
    height: auto;
    min-height: 20px;
    border-radius: 6px;
    white-space: normal;
    text-align: left;
}
.file-detail-metadata :deep(.el-tag__content) {
    white-space: normal;
    overflow-wrap: anywhere;
}
.image-dimensions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
}
.image-dimensions > span {
    white-space: nowrap;
}
@media (max-width: 768px) {
    .detail-body-layout {
        --detail-content-radius: 10px;
    }
    .image-preview,
    .image-preview :deep(img),
    .video-preview {
        max-height: 300px;
    }
    .detail-secondary-actions {
        display: grid;
        order: 1;
        flex-basis: 100%;
        max-width: 100%;
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: 0fr;
        margin-top: 0;
        transform: translateY(-4px);
        transition: grid-template-rows 260ms cubic-bezier(0.22, 1, 0.36, 1),
            margin-top 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease,
            transform 260ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s 260ms;
    }
    .detail-secondary-actions.is-expanded {
        max-width: 100%;
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: 1fr;
        margin-top: 8px;
        transform: translateY(0);
        transition-delay: 0s;
    }
    .detail-secondary-content {
        justify-self: stretch;
        width: auto;
        flex-wrap: wrap;
        justify-content: center;
    }
    .detail-toolbar {
        width: 100%;
        justify-content: center;
        row-gap: 0;
    }
    .detail-actions {
        justify-content: center;
    }
    .file-detail-metadata :deep(.el-descriptions__body .el-descriptions__table.is-bordered .el-descriptions__cell) {
        padding: 10px 12px;
    }
}
@media (prefers-reduced-motion: reduce) {
    .detail-secondary-actions,
    .detail-actions-toggle svg,
    .preview-content > .image-preview,
    .preview-content > .video-preview,
    .preview-content > .audio-preview,
    .preview-loading-leave-active {
        transition: none;
    }
    .preview-skeleton::after {
        animation: none;
    }
}
</style>
