<template>
    <div class="upload-home">
        <div class="header">
            <a href="https://sanyue.site">
                <img class="logo" alt="Sanyue logo" src="../assets/logo.png"/>
            </a> 
            <h1>Sanyue ImgHub</h1>
        </div>
        <UploadForm class="upload"/>
    </div>
</template>

<script>
import UploadForm from '@/components/UploadForm.vue'
export default {
    name: 'UploadHome',
    components: {
        UploadForm
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