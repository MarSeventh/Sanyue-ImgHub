<template>
    <div class="upload-home">
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
    }
}
</script>

<style scoped>
.header {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 15px;
    position: relative;
    bottom: 20px;
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
    position: relative;
    bottom: 30px;
}
</style>