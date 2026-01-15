<template>
    <el-dialog title="文件详情" v-model="visible" :width="dialogWidth">
        <div class="detail-actions">
            <el-button type="primary" @click="$emit('download')" round size="small" class="detail-action">
                <font-awesome-icon icon="download" style="margin-right: 3px;"></font-awesome-icon> 下载
            </el-button>
            <el-button type="primary" @click="$emit('tagManagement')" round size="small" class="detail-action">
                <font-awesome-icon icon="tags" style="margin-right: 3px;"></font-awesome-icon> 标签
            </el-button>
            <el-button type="primary" @click="$emit('block')" round size="small" class="detail-action">
                <font-awesome-icon icon="ban" style="margin-right: 3px;"></font-awesome-icon> 黑名单
            </el-button>
            <el-button type="primary" @click="$emit('white')" round size="small" class="detail-action">
                <font-awesome-icon icon="user-plus" style="margin-right: 3px;"></font-awesome-icon> 白名单
            </el-button>
            <el-button type="danger" @click="$emit('delete')" round size="small" class="detail-action">
                <font-awesome-icon icon="trash-alt" style="margin-right: 3px;"></font-awesome-icon> 删除
            </el-button>
        </div>
        <el-tabs v-model="activeTab" @tab-click="handleTabClick" style="margin-bottom: 10px;">
            <el-tab-pane label="原始链接" name="originUrl">
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
        </el-tabs>
        <el-descriptions direction="vertical" border :column="columnNum">
            <el-descriptions-item label="文件预览" :rowspan="previewSpan" :width="300" align="center">
                <video v-if="isVideo" :src="fileLink" autoplay muted loop class="video-preview" @click="handleVideoClick"></video>
                <audio v-else-if="isAudio" :src="fileLink" controls autoplay class="audio-preview"></audio>
                <el-image v-else-if="isImage" :src="fileLink" fit="cover" lazy class="image-preview"></el-image>
                <font-awesome-icon v-else icon="file" class="file-icon-detail"></font-awesome-icon>
            </el-descriptions-item>
            <el-descriptions-item label="文件名" class-name="description-item">{{ file?.metadata?.FileName || file?.name }}</el-descriptions-item>
            <el-descriptions-item label="文件类型" class-name="description-item">{{ file?.metadata?.FileType || '未知' }}</el-descriptions-item>
            <el-descriptions-item label="文件大小(MB)" class-name="description-item">{{ file?.metadata?.FileSize || '未知' }}</el-descriptions-item>
            <el-descriptions-item label="上传时间" class-name="description-item">{{ uploadTime }}</el-descriptions-item>
            <el-descriptions-item label="访问状态" class-name="description-item">{{ accessType }}</el-descriptions-item>
            <el-descriptions-item label="渠道类型" class-name="description-item">{{ file?.metadata?.Channel || '未知' }}</el-descriptions-item>
            <el-descriptions-item label="渠道名称" class-name="description-item">{{ file?.metadata?.ChannelName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="审查结果" class-name="description-item">{{ file?.metadata?.Label || '无' }}</el-descriptions-item>
            <el-descriptions-item label="上传IP" class-name="description-item">{{ file?.metadata?.UploadIP || '未知' }}</el-descriptions-item>
            <el-descriptions-item label="上传地址" class-name="description-item">{{ file?.metadata?.UploadAddress || '未知' }}</el-descriptions-item>
            <el-descriptions-item label="文件标签" class-name="description-item">
                <div v-if="file?.metadata?.Tags && file?.metadata?.Tags.length > 0" style="display: flex; flex-wrap: wrap; gap: 5px;">
                    <el-tag v-for="tag in file?.metadata?.Tags" :key="tag" size="small">{{ tag }}</el-tag>
                </div>
                <span v-else style="color: #909399;">暂无标签</span>
            </el-descriptions-item>
        </el-descriptions>
    </el-dialog>
</template>

<script>
import { ElMessage } from 'element-plus';

export default {
    name: 'FileDetailDialog',
    props: {
        modelValue: { type: Boolean, default: false },
        file: { type: Object, default: null },
        fileLink: { type: String, default: '' },
        urls: { type: Object, default: () => ({ originUrl: '', mdUrl: '', htmlUrl: '', bbUrl: '', tgId: '', S3Location: '' }) }
    },
    emits: ['update:modelValue', 'download', 'tagManagement', 'block', 'white', 'delete'],
    data() {
        return {
            activeTab: 'originUrl'
        }
    },
    computed: {
        visible: {
            get() { return this.modelValue; },
            set(val) { this.$emit('update:modelValue', val); }
        },
        dialogWidth() {
            return window.innerWidth < 768 ? '95%' : '800px';
        },
        columnNum() {
            return window.innerWidth < 768 ? 1 : 2;
        },
        previewSpan() {
            return window.innerWidth < 768 ? 1 : 6;
        },
        isVideo() {
            const name = this.file?.name?.toLowerCase() || '';
            return name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.mov') || name.endsWith('.avi');
        },
        isAudio() {
            const name = this.file?.name?.toLowerCase() || '';
            return name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.flac');
        },
        isImage() {
            const name = this.file?.name?.toLowerCase() || '';
            return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || 
                   name.endsWith('.gif') || name.endsWith('.webp') || name.endsWith('.svg') || name.endsWith('.bmp');
        },
        uploadTime() {
            if (this.file?.metadata?.TimeStamp) {
                return new Date(this.file.metadata.TimeStamp).toLocaleString();
            }
            return '未知';
        },
        accessType() {
            const listType = this.file?.metadata?.ListType;
            const label = this.file?.metadata?.Label;
            if (listType === 'White') return '白名单';
            if (listType === 'Block' || label === 'adult') return '已屏蔽';
            return '正常';
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
                ElMessage.success('链接已复制');
            });
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
    max-width: 300px;
    border-radius: 8px;
    cursor: pointer;
}
.audio-preview {
    width: 100%;
    max-width: 300px;
    border-radius: 8px;
}
.image-preview {
    width: 100%;
    max-width: 300px;
    border-radius: 8px;
}
.file-icon-detail {
    font-size: 64px;
    color: var(--el-text-color-secondary);
}
:deep(.description-item) {
    word-break: break-all;
    word-wrap: break-word;
}
@media (max-width: 768px) {
    .detail-actions {
        justify-content: center;
    }
}
</style>
