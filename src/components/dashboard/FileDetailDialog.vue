<template>
    <el-dialog :title="$t('fileDetail.title')" v-model="visible" :width="dialogWidth">
        <div class="detail-actions">
            <el-button type="primary" @click="$emit('download')" round size="small" class="detail-action" v-if="!isEditing">
                <font-awesome-icon icon="download" style="margin-right: 3px;"></font-awesome-icon> {{ $t('fileDetail.download') }}
            </el-button>
            <el-button type="primary" @click="$emit('tagManagement')" round size="small" class="detail-action" v-if="!isEditing">
                <font-awesome-icon icon="tags" style="margin-right: 3px;"></font-awesome-icon> {{ $t('fileDetail.tags') }}
            </el-button>
            <el-button type="primary" @click="$emit('block')" round size="small" class="detail-action" v-if="!isEditing">
                <font-awesome-icon icon="ban" style="margin-right: 3px;"></font-awesome-icon> {{ $t('fileDetail.blacklist') }}
            </el-button>
            <el-button type="primary" @click="$emit('white')" round size="small" class="detail-action" v-if="!isEditing">
                <font-awesome-icon icon="user-plus" style="margin-right: 3px;"></font-awesome-icon> {{ $t('fileDetail.whitelist') }}
            </el-button>
            <el-button type="danger" @click="$emit('delete')" round size="small" class="detail-action" v-if="!isEditing">
                <font-awesome-icon icon="trash-alt" style="margin-right: 3px;"></font-awesome-icon> {{ $t('fileDetail.deleteBtn') }}
            </el-button>
            <el-button type="warning" @click="startEdit()" round size="small" class="detail-action" v-if="!isEditing">
                <font-awesome-icon icon="edit" style="margin-right: 3px;"></font-awesome-icon> {{ $t('fileDetail.edit') }}
            </el-button>
            <el-button type="info" @click="openRenameDialog()" round size="small" class="detail-action" v-if="!isEditing">
                <font-awesome-icon icon="i-cursor" style="margin-right: 3px;"></font-awesome-icon> {{ $t('fileDetail.rename') }}
            </el-button>
            <el-button type="success" @click="saveMetadata()" round size="small" class="detail-action" v-if="isEditing" :loading="editSaving">
                <font-awesome-icon icon="save" style="margin-right: 3px;" v-if="!editSaving"></font-awesome-icon> {{ $t('fileDetail.save') }}
            </el-button>
            <el-button @click="cancelEdit()" round size="small" class="detail-action" v-if="isEditing">
                {{ $t('fileDetail.cancel') }}
            </el-button>
        </div>
        <el-tabs v-model="activeTab" @tab-click="handleTabClick" style="margin-bottom: 10px;">
            <el-tab-pane :label="$t('fileDetail.originUrl')" name="originUrl">
                <el-input v-model="urls.originUrl" readonly @click="handleUrlClick"></el-input>
            </el-tab-pane>
            <el-tab-pane label="Markdown" name="mdUrl">
                <el-input v-model="urls.mdUrl" readonly @click="handleUrlClick"></el-input>
            </el-tab-pane>
            <el-tab-pane label="HTML" name="htmlUrl">
                <el-input v-model="urls.htmlUrl" readonly @click="handleUrlClick"></el-input>
            </el-tab-pane>
            <el-tab-pane label="BBCode" name="bbUrl">
                <el-input v-model="urls.bbUrl" readonly @click="handleUrlClick"></el-input>
            </el-tab-pane>
            <el-tab-pane label="TG File ID" v-if="file?.metadata?.TgFileId" name="tgId">
                <el-input v-model="urls.tgId" readonly @click="handleUrlClick"></el-input>
            </el-tab-pane>
            <el-tab-pane label="S3 Location" v-if="file?.metadata?.S3Location" name="s3Location">
                <el-input v-model="urls.S3Location" readonly @click="handleUrlClick"></el-input>
            </el-tab-pane>
            <el-tab-pane label="S3 CDN URL" v-if="file?.metadata?.S3CdnFileUrl" name="s3CdnFileUrl">
                <el-input v-model="urls.S3CdnFileUrl" readonly @click="handleUrlClick"></el-input>
            </el-tab-pane>
        </el-tabs>
        <!-- 文件预览区域 -->
        <div class="preview-section">
            <div class="preview-content">
                <video v-if="isVideo" :src="fileLink" autoplay muted loop class="video-preview" @click="openImageLink"></video>
                <audio v-else-if="isAudio" :src="fileLink" controls autoplay class="audio-preview"></audio>
                <el-image 
                    v-else-if="isImage" 
                    :src="fileLink" 
                    :preview-src-list="[fileLink]"
                    :preview-teleported="true"
                    fit="contain" 
                    lazy 
                    class="image-preview"
                ></el-image>
                <font-awesome-icon v-else icon="file" class="file-icon-detail"></font-awesome-icon>
            </div>
        </div>
        <!-- 详细信息 -->
        <el-descriptions border :column="descColumn">
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
                <div v-if="imageDimensions" style="display: flex; align-items: center; gap: 6px;">
                    <span>{{ file?.metadata?.Width }} × {{ file?.metadata?.Height }}</span>
                    <el-tag size="small" type="info" style="display: inline-flex; align-items: center; justify-content: center;">{{ orientationIcon }}</el-tag>
                </div>
                <span v-else style="color: #909399;">{{ $t('fileDetail.noDimensions') }}</span>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('fileDetail.uploadTimeLabel')">{{ uploadTime }}</el-descriptions-item>
            <el-descriptions-item :label="$t('fileDetail.channelTypeAndName')">
                <el-tag size="small" type="info" style="margin-right: 6px;">{{ file?.metadata?.Channel || $t('fileDetail.unknown') }}</el-tag>
                <span>{{ file?.metadata?.ChannelName || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('fileDetail.accessStatusAndReview')">
                <el-tag size="small" :type="accessTagType" style="margin-right: 6px;">{{ accessType }}</el-tag>
                <span>{{ file?.metadata?.Label || $t('fileDetail.noTags') }}</span>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('fileDetail.uploadIP')">{{ file?.metadata?.UploadIP || $t('fileDetail.unknown') }}</el-descriptions-item>
            <el-descriptions-item :label="$t('fileDetail.uploadAddressLabel')">{{ file?.metadata?.UploadAddress || $t('fileDetail.unknown') }}</el-descriptions-item>
            <el-descriptions-item :label="$t('fileDetail.fileTags')">
                <div v-if="file?.metadata?.Tags && file?.metadata?.Tags.length > 0" style="display: flex; flex-wrap: wrap; gap: 5px;">
                    <el-tag v-for="tag in file?.metadata?.Tags" :key="tag" size="small">{{ tag }}</el-tag>
                </div>
                <span v-else style="color: #909399;">{{ $t('fileDetail.noTags') }}</span>
            </el-descriptions-item>
        </el-descriptions>
        <!-- 重命名弹窗 -->
        <el-dialog
            v-model="showRenameDialog"
            :title="$t('fileDetail.renameTitle')"
            :width="dialogWidth"
            append-to-body
        >
            <el-form @submit.prevent>
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
import fetchWithAuth from '@/utils/fetchWithAuth';
import { validateFileId } from '@/utils/fileIdValidator';

export default {
    name: 'FileDetailDialog',
    props: {
        modelValue: { type: Boolean, default: false },
        file: { type: Object, default: null },
        fileLink: { type: String, default: '' },
        urls: { type: Object, default: () => ({ originUrl: '', mdUrl: '', htmlUrl: '', bbUrl: '', tgId: '', S3Location: '', S3CdnFileUrl: '' }) }
    },
    emits: ['update:modelValue', 'download', 'tagManagement', 'block', 'white', 'delete', 'metadataUpdated', 'fileRenamed'],
    watch: {
        visible(val) {
            if (!val) {
                // 关闭弹窗时退出编辑状态
                this.isEditing = false;
                this.editSaving = false;
            }
        }
    },
    data() {
        return {
            activeTab: 'originUrl',
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
        visible: {
            get() { return this.modelValue; },
            set(val) { this.$emit('update:modelValue', val); }
        },
        dialogWidth() {
            return window.innerWidth < 768 ? '95%' : '900px';
        },
        descColumn() {
            return window.innerWidth < 768 ? 1 : 2;
        },
        isVideo() {
            // 先通过 content-type 判断
            const fileType = this.file?.metadata?.FileType?.toLowerCase() || '';
            if (fileType.includes('video')) return true;
            // 再通过文件后缀判断
            const name = this.file?.name?.toLowerCase() || '';
            return name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.mov') || name.endsWith('.avi');
        },
        isAudio() {
            // 先通过 content-type 判断
            const fileType = this.file?.metadata?.FileType?.toLowerCase() || '';
            if (fileType.includes('audio')) return true;
            // 再通过文件后缀判断
            const name = this.file?.name?.toLowerCase() || '';
            return name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.flac');
        },
        isImage() {
            // 先通过 content-type 判断
            const fileType = this.file?.metadata?.FileType?.toLowerCase() || '';
            if (fileType.includes('image')) return true;
            // 再通过文件后缀判断
            const name = this.file?.name?.toLowerCase() || '';
            return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || 
                   name.endsWith('.gif') || name.endsWith('.webp') || name.endsWith('.svg') || 
                   name.endsWith('.bmp') || name.endsWith('.avif') || name.endsWith('.heic') || name.endsWith('.heif');
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
    methods: {
        handleVideoClick(e) {
            const video = e.target;
            if (video.paused) video.play();
            else video.pause();
        },
        handleTabClick() {},
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
.detail-actions {
    display: flex;
    justify-content: right;
    margin-bottom: 10px;
    flex-wrap: wrap;
    gap: 8px;
}
.detail-action {
    margin-left: 0 !important;
}
.video-preview {
    width: 100%;
    max-width: 400px;
    max-height: 300px;
    border-radius: 8px;
    cursor: pointer;
    object-fit: contain;
}
.audio-preview {
    width: 100%;
    max-width: 400px;
    border-radius: 8px;
}
.image-preview {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 300px;
    border-radius: 8px;
    cursor: pointer;
}
.image-preview :deep(img) {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
}
.file-icon-detail {
    font-size: 64px;
    color: var(--el-text-color-secondary);
}
.preview-section {
    display: flex;
    justify-content: center;
    margin-bottom: 15px;
    padding: 12px;
    background: var(--el-fill-color-light);
    border-radius: 8px;
    min-height: 60px;
}
.preview-content {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
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
@media (max-width: 768px) {
    .detail-actions {
        justify-content: center;
    }
}
</style>
