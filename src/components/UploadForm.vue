<template>
    <div class="upload-form">
        <el-upload
            class="upload-card"
            :class="{'is-uploading': uploading, 'upload-card-busy': fileList.length}"
            drag
            multiple
            :http-request="uploadFile"
            :onSuccess="handleSuccess"
            :on-error="handleError"
            :before-upload="beforeUpload"
            :on-progress="handleProgress"
            :file-list="fileList"
            :show-file-list="false"
            accept="image/*, video/*">
            <el-icon class="el-icon--upload">
                <CameraFilled color="blanchedalmond"/>
            </el-icon>
            <div class="el-upload__text">拖拽 或 <em>点击上传</em></div>
            <template #tip>
                <div class="el-upload__tip">支持多文件上传，支持图片和视频，文件大小不超过5MB</div>
            </template>
        </el-upload>
        <el-card class="upload-list-card" :class="{'upload-list-busy': fileList.length}">
            <div class="upload-list-container" :class="{'upload-list-busy': fileList.length}">
                <el-scrollbar>
                    <div class="upload-list-dashboard">
                        <el-text class="upload-list-dashboard-title">
                            <el-icon><List /></el-icon>{{ uploadingCount + waitingCount }}
                            <el-icon><Checked /></el-icon>{{ uploadSuccessCount }}
                            <el-icon><Failed /></el-icon>{{ uploadErrorCount }}
                        </el-text>
                        <div class="upload-list-dashboard-action">
                            <el-button-group>
                                <el-tooltip content="整体复制" placement="top">
                                    <el-button type="primary" round @click="copyAll" alt="整体复制"><el-icon><Grid /></el-icon></el-button>
                                </el-tooltip>
                                <el-tooltip content="清空列表" placement="top">
                                    <el-button type="primary" round @click="clearFileList"><el-icon><CircleClose /></el-icon></el-button>
                                </el-tooltip>
                            </el-button-group>
                        </div>
                    </div>
                    <div class="upload-list-item" v-for="file in fileList" :key="file.name" :span="8">
                        <img
                            style="width: 10vw; border-radius: 12px;"
                            :src="file.url"
                            @error="file.url = 'https://imgbed.sanyue.site/file/b6a4a65b4edba4377492e.png'"
                            >
                        </img>
                        <div class="upload-list-item-content">
                            <el-text class="upload-list-item-name" truncated>{{ file.name }}</el-text>
                            <div class="upload-list-item-url" v-if="file.status==='done'">
                                <el-link :underline="false" :href="file.url" target="_blank">
                                    <el-text class="upload-list-item-url-text" truncated>{{ file.url }}</el-text>
                                </el-link>
                            </div>
                            <div class="upload-list-item-progress" v-else>
                                <el-progress :percentage="file.progreess" :status="file.status" :show-text="false"/>
                            </div>
                        </div>
                        <div class="upload-list-item-action">
                                <el-button type="primary" circle class="upload-list-item-action-button" @click="handleCopy(file)">
                                    <el-icon><Link /></el-icon>
                                </el-button>
                                <el-button type="danger" circle class="upload-list-item-action-button" @click="handleRemove(file)">
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
import cookies from 'vue-cookies'

export default {
name: 'UploadForm',
data() {
    return {
        fileList: [],
        uploading: false,
        maxUploading: 10,
        waitingList: []
    }
},
computed: {
    uploadSuccessCount() {
        return this.fileList.filter(item => item.status === 'done' || item.status === 'success').length
    },
    uploadErrorCount() {
        return this.fileList.filter(item => item.status === 'exception').length
    },
    uploadingCount() {
        return this.fileList.filter(item => item.status === 'uploading').length
    },
    waitingCount() {
        return this.waitingList.length
    }
},
methods: {
    uploadFile(file) {
        if (this.uploadingCount > this.maxUploading) {
            this.waitingList.push(file)
            this.fileList.find(item => item.uid === file.file.uid).status = 'waiting'
            return
        } else {
            this.fileList.find(item => item.uid === file.file.uid).status = 'uploading'
        }
        const formData = new FormData()
        formData.append('file', file.file)
        axios({
            url: '/upload' + '?authcode=' + cookies.get('authCode'),
            method: 'post',
            data: formData,
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded / progressEvent.total) * 100)
                file.onProgress({ percent: percentCompleted, file: file.file })
            }
        }).then(res => {
            file.onSuccess(res)
        }).catch(err => {
            if (err.response && err.response.status === 401) {
                this.waitingList = []
                this.fileList = []
                this.$message.error('认证状态错误！')
                this.$router.push('/login')
            } else {
                file.onError(err)
            }
        }).finally(() => {
            this.uploading = false
        })
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
            const rootUrl = `${window.location.protocol}//${window.location.host}`
            this.fileList.find(item => item.uid === file.uid).url = rootUrl + response.data[0].src
            this.fileList.find(item => item.uid === file.uid).progreess = 100
            this.fileList.find(item => item.uid === file.uid).status = 'success'
            this.$message({
                type: 'success',
                message: file.name + '上传成功'
            })
            setTimeout(() => {
                this.fileList.find(item => item.uid === file.uid).status = 'done'
            }, 3000)
        } catch (error) {
            this.$message.error(file.name + '上传失败')
            this.fileList.find(item => item.uid === file.uid).status = 'exception'
        } finally {
            this.uploading = false
            if (this.waitingList.length) {
                const file = this.waitingList.shift()
                this.uploadFile(file)
            }
        }
    },
    handleError(err, file) {
        this.$message.error(file.name + '上传失败')
        this.uploading = false
        this.fileList.find(item => item.uid === file.uid).status = 'exception'
        if (this.waitingList.length) {
            const file = this.waitingList.shift()
            this.uploadFile(file)
        }
    },
    handleCopy(file) {
        const status = this.fileList.find(item => item.uid === file.uid).status
        if (status !== 'done' && status !== 'success') {
            this.$message({
                type: 'warning',
                message: '文件未上传成功，无法复制链接'
            })
            return
        }
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
            return false
        } else {
            this.uploading = true
            const fileUrl = URL.createObjectURL(file)
            this.fileList.push({
                uid: file.uid,
                name: file.name,
                url: fileUrl,
                status: 'uploading',
                progreess: 0
            })
            return true
    }
    },
    handleProgress(event) {
        this.fileList.find(item => item.uid === event.file.uid).progreess = event.percent
    },
    copyAll() {
        const urls = this.fileList.map(item => {
            if (item.status === 'done' || item.status === 'success') {
                return item.url
            }
        }).join('\n')
        navigator.clipboard.writeText(urls)
        this.$message({
            type: 'success',
            message: '整体复制成功'
        })
    },
    clearFileList() {
        this.fileList = []
        this.$message({
            type: 'info',
            message: '列表已清空'
        })
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
    height: 7vh;
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
    height: 7vh;
}
.upload-list-card.upload-list-busy {
    height: 35vh;
}
.upload-list-container.upload-list-busy {
    height: 35vh;
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
.upload-list-item-progress {
    margin-top: 3px;
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
.upload-card-busy :deep(.el-upload-dragger) {
    height: 25vh;
}
:deep(.el-upload-dragger)  {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 45vh;
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
    user-select: none;
}
.el-upload__tip {
    font-size: small;
    color: antiquewhite;
    user-select: none;
}
.upload-list-dashboard {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
}
.upload-list-dashboard-title {
    font-size: medium;
    font-weight: bold;
}
</style>