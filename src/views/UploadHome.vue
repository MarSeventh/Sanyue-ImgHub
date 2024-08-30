<template>
    <div class="upload-home">
        <img id="bg1" class="background-image1" alt="Background Image"/>
        <img id="bg2" class="background-image2" alt="Background Image"/>
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
            <el-tooltip content="退出登录" placement="left">
                <el-button class="toolbar-button" size="large" type="danger" @click="handleLogout" circle>
                    <el-icon size="large"><Close /></el-icon>
                </el-button>
            </el-tooltip>
        </div>
        <div class="header">
            <a href="https://github.com/MarSeventh/CloudFlare-ImgBed">
                <img class="logo" alt="Sanyue logo" :src="logoUrl"/>
            </a> 
            <h1><a class="main-title" href="https://github.com/MarSeventh/CloudFlare-ImgBed" target="_blank">{{ ownerName }}</a> ImgHub</h1>
        </div>
        <UploadForm :selectedUrlForm="selectedUrlForm" :uploadMethod="uploadMethod" class="upload"/>
        <Footer/>
        <el-dialog title="选择复制链接格式" v-model="showUrlDialog" width="40%" :show-close="false">
            <el-radio-group v-model="selectedUrlForm">
                <el-radio value="url">原始链接</el-radio>
                <el-radio value="md">MarkDown</el-radio>
                <el-radio value="html">HTML</el-radio>
                <el-radio value="ubb">BBCode</el-radio>
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
import cookies from 'vue-cookies'
import { mapGetters } from 'vuex'

export default {
    name: 'UploadHome',
    data() {
        return {
            selectedUrlForm: ref('url'),
            uploadMethod: ref('drag'),
            showUrlDialog: false,
            bingWallPaperIndex: 0,
            customWallPaperIndex: 0
        }
    },
    computed: {
        ...mapGetters(['userConfig', 'bingWallPapers']),
        ownerName() {
            return this.userConfig?.ownerName || 'CloudFlare'
        },
        logoUrl() {
            return this.userConfig?.logoUrl || require('../assets/logo.png')
        }
    },
    mounted() {
        const bg1 = document.getElementById('bg1')
        const bg2 = document.getElementById('bg2')
        if (this.userConfig?.uploadBkImg === 'bing') {
            //bing壁纸轮播
            this.$store.dispatch('fetchBingWallPapers').then(() => {
                bg1.src = this.bingWallPapers[this.bingWallPaperIndex]?.url
                bg1.onload = () => {
                    bg1.style.opacity = 1
                }
                setInterval(() => {
                    //如果bing壁纸组为空，跳过
                    let curBg = bg1.style.opacity != 0 ? bg1 : bg2
                    let nextBg = bg1.style.opacity != 0 ? bg2 : bg1
                    curBg.style.opacity = 0
                    this.bingWallPaperIndex = (this.bingWallPaperIndex + 1) % this.bingWallPapers.length
                    nextBg.src = this.bingWallPapers[this.bingWallPaperIndex]?.url
                    nextBg.onload = () => {
                        nextBg.style.opacity = 1
                    }
                }, 20000)
            })
        } else if (this.userConfig?.uploadBkImg instanceof Array && this.userConfig?.uploadBkImg?.length > 1) {
            //自定义壁纸组轮播
            bg1.src = this.userConfig.uploadBkImg[this.customWallPaperIndex]
            bg1.onload = () => {
                bg1.style.opacity = 1
            }
            setInterval(() => {
                let curBg = bg1.style.opacity != 0 ? bg1 : bg2
                let nextBg = bg1.style.opacity != 0 ? bg2 : bg1
                curBg.style.opacity = 0
                this.customWallPaperIndex = (this.customWallPaperIndex + 1) % this.userConfig.uploadBkImg.length
                nextBg.src = this.userConfig.uploadBkImg[this.customWallPaperIndex]
                nextBg.onload = () => {
                    nextBg.style.opacity = 1
                }
            }, 20000)
        } else if (this.userConfig?.uploadBkImg instanceof Array && this.userConfig?.uploadBkImg.length == 1) {
            //单张自定义壁纸
            bg1.src = this.userConfig.uploadBkImg[0]
            bg1.onload = () => {
                bg1.style.opacity = 1
            }
        } else {
            //默认壁纸
            bg1.src = 'https://imgbed.sanyue.site/file/0dbd5add3605a0b2e8994.jpg'
            bg1.onload = () => {
                bg1.style.opacity = 1
            }
        }
    },
    components: {
        UploadForm,
        Footer
    },
    methods: {
        handleManage() {
            window.location.href = '/admin-imgtc'
        },
        openUrlDialog() {
            this.showUrlDialog = true
        },
        changeUploadMethod() {
            this.uploadMethod = this.uploadMethod === 'drag' ? 'paste' : 'drag'
        },
        handleLogout() {
            cookies.remove('authCode')
            this.$router.push('/login')
            this.$message.success('已退出登录~')
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
    transition: background-image 1s ease-in-out;
    background-size: cover;
    background-attachment: fixed;
    height: 100vh;
}
.upload {
    position: fixed;
    top: 20vh;
}
.background-image1 {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    opacity: 0;
    transition: all 1s ease-in-out;
}
.background-image2 {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    opacity: 0;
    transition: all 1s ease-in-out;
}
</style>
