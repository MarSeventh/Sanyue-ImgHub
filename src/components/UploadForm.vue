<template>
    <div class="upload-form">
        <el-upload
            class="upload-card"
            drag
            :http-request="uploadFile"
            multiple
            :onSuccess="handleSuccess"
            :on-exceed="handleExceed"
            :on-error="handleError"
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
                    <el-row class="upload-list-item" v-for="file in fileList" :key="file.name" :span="8">
                        <el-image
                            style="width: 20%; height: 32%;border-radius: 12px;"
                            :src="file.url"
                            fit="cover">
                        </el-image>
                        <div class="upload-list-item-content">
                            <div class="upload-list-item-name">{{ file.name }}</div>
                            <div class="upload-list-item-url">
                                <el-link :underline="false" :href="file.url" target="_blank">{{ file.url }}</el-link>
                            </div>
                            <div class="upload-list-item-action">
                                <el-button type="text" @click="handleCopy(file)">
                                    <el-icon><Link /></el-icon>复制链接
                                </el-button>
                                <el-button type="text" @click="handleRemove(file)">
                                    <el-icon><Delete /></el-icon>删除
                                </el-button>
                            </div>
                        </div>
                    </el-row>
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
        fileList: []
    }
},
methods: {
    uploadFile(file) {
        console.log(file)
        const formData = new FormData()
        formData.append('file', file.file)
        return axios.post('https://imgbed.sanyue.site/api/upload', formData)
    },
    handlePreview(file) {
        window.open(file.url, '_blank')
    },
    handleRemove(file) {
        this.fileList = this.fileList.filter(item => item.uid !== file.uid)
        this.$message({
            type: 'info',
            message: '已删除'
        })
    },
    handleSuccess(response, file) {
        try {       
            this.fileList.push({
                uid: file.uid,
                name: file.name,
                url: 'https://imgbed.sanyue.site' + response.data[0].src
            })
            this.$message({
                type: 'success',
                message: '上传成功'
            })
            console.log(file)
        } catch (error) {
            this.$message.error('上传失败')
            this.fileList = this.fileList.filter(item => item.uid !== file.uid)
        }
    },
    handleExceed(files) {
        this.$message.warning(`当前限制选择 10 个文件，本次选择了 ${files.length} 个文件`)
    },
    handleError(err) {
        this.$message.error('上传失败')
    },
    handleCopy(file) {
        navigator.clipboard.writeText(file.url)
        this.$message({
            type: 'success',
            message: '复制成功'
        })
    }
}
}
</script>

<style scoped> 
.upload-form {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
.upload-list-card {
    width: 35rem;
    height: 12rem;
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 15px;
    opacity: 0.8;
    backdrop-filter: blur(10px);
}
.upload-list-container {
    width: 35rem;
    height: 12rem;
}
.upload-list-item {
    display: flex;
    align-items: center;
    margin: 5px;
    border: 1px solid #a5bef7;
    padding: 5px;
    border-radius: 15px;
}
.upload-list-item-name {
    font-size: small;
    font-weight: bold;
}
.upload-list-item-content {
    display: flex;
    flex-direction: column;
    margin-left: 10px;
}
.upload-list-item-url {
    margin-top: 3px;
}
.upload-card {
    width: 35rem;
    padding: 20px;
    background: none;
}
/deep/ .el-upload-dragger {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 18rem;
    border-radius: 15px;
    border: 3px dashed #409EFF;
    opacity: 0.6;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
}
/deep/ .el-upload-dragger:hover {
    opacity: 0.8;
    box-shadow: 0 0 10px 5px #409EFF;
}
/deep/ .el-upload-dragger.is-dragover {
    opacity: 0.8;
    box-shadow: 0 0 10px 5px #409EFF;
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