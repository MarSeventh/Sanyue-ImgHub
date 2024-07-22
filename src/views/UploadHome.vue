<template>
    <div class="upload-home">
        <div class="toolbar">
            <el-tooltip content="上传方式" placement="left">
                <el-button class="toolbar-button" size="large" type="info" @click="changeUploadMethod" circle>
                    <el-icon size="large"><Refresh /></el-icon>
                </el-button>
            </el-tooltip>
            <el-tooltip content="链接格式" placement="left">
                <el-button class="toolbar-button" size="large" type="success" @click="openUrlDialog" circle>
                    <el-icon size="large"><Connection /></el-icon>
                </el-button>
            </el-tooltip>
            <el-tooltip content="管理页面" placement="left">
                <el-button class="toolbar-button" size="large" type="primary" @click="handleManage" circle>
                    <el-icon size="large"><Tools /></el-icon>
                </el-button>
            </el-tooltip>
        </div>
        <div class="header">
            <a href="https://github.com/MarSeventh/CloudFlare-ImgBed">
                <img class="logo" alt="Sanyue logo" src="../assets/logo.png"/>
            </a> 
            <h1><a class="main-title" href="https://github.com/MarSeventh/CloudFlare-ImgBed" target="_blank">Sanyue</a> ImgHub</h1>
        </div>
        <UploadForm :selectedUrlForm="selectedUrlForm" :uploadMethod="uploadMethod" class="upload"/>
        <Footer/>
        <el-dialog title="选择复制链接格式" v-model="showUrlDialog" width="40%" :show-close="false">
            <el-radio-group v-model="selectedUrlForm">
                <el-radio value="url">原始链接</el-radio>
                <el-radio value="md">MarkDown</el-radio>
                <el-radio value="html">HTML</el-radio>
            </el-radio-group>
            <div class="dialog-action">
                <el-button type="primary" @click="showUrlDialog = false">确定</el-button>
            </div>
        </el-dialog>
    </div>
</template>

<script>
import UploadForm from '@/components/UploadForm.vue'
import Footer from '@/components/Footer.vue'
import { ref } from 'vue'
export default {
    name: 'UploadHome',
    data() {
        return {
            selectedUrlForm: ref('url'),
            uploadMethod: ref('drag'),
            showUrlDialog: false
        }
    },
    components: {
        UploadForm,
        Footer
    },
    methods: {
        handleManage() {
            window.location.href = '/admin'
        },
        openUrlDialog() {
            this.showUrlDialog = true
        },
        changeUploadMethod() {
            this.uploadMethod = this.uploadMethod === 'drag' ? 'paste' : 'drag'
        }
    }
}
</script>

<style scoped>
.toolbar {
    position: fixed;
    bottom: 8vh;
    right: 1.5vw;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 100;
}
.toolbar-button {
    border: none;
    transition: all 0.3s ease;
    margin-bottom: 10px;
    margin-left: 0;
}
.toolbar-button:hover {
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
    transform: translateY(-3px);
}
:deep(.el-dialog) {
    border-radius: 12px;
    background-color: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    box-shadow: 0 0 10px 2px rgba(0, 0, 0, 0.1);
}
.dialog-action {
    display: flex;
    justify-content: center;
    margin-top: 20px;
}
.header {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 15px;
    position: fixed;
    top: 5vh;
    color: blanchedalmond;
    user-select: none;
    text-decoration: none;
}
.main-title {
    background: linear-gradient(to right, rgb(239, 250, 195), #f3a060);
    background-clip: text;
    color: transparent;
    text-decoration: none;
}
.logo {
    height: 80px;
    width: 80px;
    margin-right: 5px;
}
.upload-home {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-image: url('https://imgbed.sanyue.site/file/0dbd5add3605a0b2e8994.jpg');
    background-size: cover;
    background-attachment: fixed;
    height: 100vh;
}
.upload {
    position: fixed;
    top: 20vh;
}
</style>