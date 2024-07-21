<template>
    <div class="upload-home">
        <div class="toolbar">
            <el-button class="toolbar-button" size="large" type="primary" @click="handleManage" circle>
                <el-icon size="large"><Tools /></el-icon>
            </el-button>
        </div>
        <div class="header">
            <a href="https://sanyue.site">
                <img class="logo" alt="Sanyue logo" src="../assets/logo.png"/>
            </a> 
            <h1><a class="main-title" href="https://sanyue.site" target="_blank">Sanyue</a> ImgHub</h1>
        </div>
        <UploadForm class="upload"/>
        <Footer/>
    </div>
</template>

<script>
import UploadForm from '@/components/UploadForm.vue'
import Footer from '@/components/Footer.vue'
export default {
    name: 'UploadHome',
    components: {
        UploadForm,
        Footer
    },
    methods: {
        handleManage() {
            window.location.href = '/admin'
        }
    }
}
</script>

<style scoped>
.toolbar {
    position: fixed;
    bottom: 8vh;
    right: 1.5vw;
}
.toolbar-button {
    border: none;
    transition: all 0.3s ease;
}
.toolbar-button:hover {
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
    transform: translateY(-3px);
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