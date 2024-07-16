<template>
    <div class="upload-form">
        <el-upload
            class="upload-card"
            :class="{'is-uploading': uploading}"
            drag
            :http-request="uploadFile"
            multiple
            :onSuccess="handleSuccess"
            :on-exceed="handleExceed"
            :on-error="handleError"
            :before-upload="beforeUpload"
            :file-list="fileList"
            :show-file-list="false"
            :limit="10"
            accept="image/*, video/*">
            <el-icon class="el-icon--upload">
                <CameraFilled />
            </el-icon>
            <div class="el-upload__text">拖拽 或 <em>点击上传</em></div>
            <template #tip>
                <div class="el-upload__tip">支持多文件上传（每次最多10个），支持图片和视频，文件大小不超过5MB</div>
            </template>
        </el-upload>
        <el-card class="upload-list-card" v-if="fileList.length">
            <div class="upload-list-container">
                <el-scrollbar>
                    <div class="upload-list-item" v-for="file in fileList" :key="file.name" :span="8">
                        <img
                            style="width: 10vw; border-radius: 12px;"
                            :src="file.url"
                            >
                        </img>
                        <div class="upload-list-item-content">
                            <el-text class="upload-list-item-name" truncated>{{ file.name }}</el-text>
                            <div class="upload-list-item-url">
                                <el-link :underline="false" :href="file.url" target="_blank">
                                    <el-text class="upload-list-item-url-text" truncated>{{ file.url }}</el-text>
                                </el-link>
                            </div>
                        </div>
                        <div class="upload-list-item-action">
                                <el-button type="primary" round size="small" class="upload-list-item-action-button" @click="handleCopy(file)">
                                    <el-icon><Link /></el-icon>
                                </el-button>
                                <el-button type="danger" round size="small" class="upload-list-item-action-button" @click="handleRemove(file)">
                                    <el-icon><Delete /></el-icon>
                                </el-button>
                        </div>
                    </div>
                </el-scrollbar>
            </div>
        </el-card>
    </div>
</template>

<script>
import axios from 'axios'
export default {
name: 'UploadForm',
data() {
    return {
        fileList: [],
        uploading: false,
        file: null
    }
},
methods: {
    uploadFile(file) {
        const formData = new FormData()
        formData.append('file', file.file)
        return axios.post('/upload', formData)
    },
    handlePreview(file) {
        window.open(file.url, '_blank')
    },
    handleRemove(file) {
        this.fileList = this.fileList.filter(item => item.uid !== file.uid)
        this.$message({
            type: 'info',
            message: file.name + '已删除'
        })
    },
    handleSuccess(response, file) {
        try {       
            this.fileList.push({
                uid: file.uid,
                name: file.name,
                url: process.env.VUE_APP_SITE_URL + response.data[0].src
            })
            this.$message({
                type: 'success',
                message: file.name + '上传成功'
            })
        } catch (error) {
            this.$message.error(file.name + '上传失败')
            this.fileList = this.fileList.filter(item => item.uid !== file.uid)
        } finally {
            this.uploading = false
        }
    },
    handleExceed(files) {
        this.$message.warning(`上传文件列表最多 10 个文件，请先删除已上传文件`)
    },
    handleError(err) {
        this.$message.error(this.file.name + '上传失败')
        this.uploading = false
    },
    handleCopy(file) {
        navigator.clipboard.writeText(file.url)
        this.$message({
            type: 'success',
            message: '复制成功'
        })
    },
    beforeUpload(file) {
        const isLt5M = file.size / 1024 / 1024 < 5
        if (!isLt5M) {
            this.$message.error('上传文件大小不能超过 5MB!')
        } else {
            this.uploading = true
            this.file = file
        }
        return isLt5M
    }
}
}
</script>

<style scoped> 
@keyframes breathe {
    0%, 100% {
    }
    50% {
        box-shadow: 0 0 10px 5px #409EFF;
        opacity: 0.8;
    }
}
.upload-form {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
.upload-list-card {
    width: 55vw;
    height: 30vh;
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 15px;
    opacity: 0.8;
    background-color: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
}
.upload-list-container {
    width: 55vw;
    height: 30vh;
}
.upload-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 5px;
    border: 1px solid #a5bef7;
    padding: 5px;
    border-radius: 15px;
}
.upload-list-item-name {
    font-size: small;
    font-weight: bold;
    width: 28vw;
}
.upload-list-item-content {
    display: flex;
    flex-direction: column;
    margin-left: 10px;
}
.upload-list-item-url-text {
    width: 28vw;
}
.upload-list-item-action {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.upload-list-item-action-button {
    margin: 2px;
}
.upload-card {
    width: 55vw;
    padding: 20px;
    background: none;
}
:deep(.el-upload-dragger)  {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 30vh;
    border-radius: 15px;
    border: 3px dashed #409EFF;
    opacity: 0.7;
    background-color: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
}
:deep(.el-upload-dragger:hover) {
    opacity: 0.8;
    box-shadow: 0 0 10px 5px #409EFF;
}
:deep(.el-upload-dragger.is-dragover) {
    opacity: 0.8;
    box-shadow: 0 0 10px 5px #409EFF;
}
.is-uploading :deep(.el-upload-dragger){
    animation: breathe 3s infinite;
}
.el-upload__text {
    font-weight: bold;
    font-size: medium;
}
.el-upload__tip {
    font-size: small;
    color: antiquewhite;
}
</style>