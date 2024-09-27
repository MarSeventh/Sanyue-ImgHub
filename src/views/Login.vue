<template>
    <div class="login">
        <img id="bg1" class="background-image1" alt="Background Image"/>
        <img id="bg2" class="background-image2" alt="Background Image"/>
        <div class="login-container">
            <h1>Login</h1>
            <el-input 
                class="password-input" 
                v-model="password" 
                placeholder="输入认证码，若未设置留空即可~" 
                type="password" 
                show-password
                @keyup.enter.native="login"
                >
            </el-input>
            <el-button class="submit" type="primary" @click="login">登录</el-button>
        </div>
    </div>
</template>

<script>
import cookies from 'vue-cookies'
import axios from 'axios'
import { mapGetters } from 'vuex'

export default {
    data() {
        return {
            password: '',
            writtenPass: '',
            bingWallPaperIndex: 0,
            customWallPaperIndex: 0
        }
    },
    computed: {
        ...mapGetters(['userConfig', 'bingWallPapers']),
        bkInterval() {
            return this.userConfig?.bkInterval || 3000
        },
        bkOpacity() {
            return this.userConfig?.bkOpacity || 1
        }
    },
    mounted() {
        const bg1 = document.getElementById('bg1')
        const bg2 = document.getElementById('bg2')
        if (this.userConfig?.loginBkImg === 'bing') {
            //bing壁纸轮播
            this.$store.dispatch('fetchBingWallPapers').then(() => {
                bg1.src = this.bingWallPapers[this.bingWallPaperIndex]?.url
                bg1.onload = () => {
                    bg1.style.opacity = this.bkOpacity
                }
                setInterval(() => {
                    let curBg = bg1.style.opacity != 0 ? bg1 : bg2
                    let nextBg = bg1.style.opacity != 0 ? bg2 : bg1
                    curBg.style.opacity = 0
                    this.bingWallPaperIndex = (this.bingWallPaperIndex + 1) % this.bingWallPapers.length
                    nextBg.src = this.bingWallPapers[this.bingWallPaperIndex]?.url
                    nextBg.onload = () => {
                        nextBg.style.opacity = this.bkOpacity
                    }
                }, this.bkInterval)
            })
        } else if (this.userConfig?.loginBkImg instanceof Array && this.userConfig?.loginBkImg?.length > 1) {
            //自定义壁纸组轮播
            bg1.src = this.userConfig.loginBkImg[this.customWallPaperIndex]
            bg1.onload = () => {
                bg1.style.opacity = this.bkOpacity
            }
            setInterval(() => {
                let curBg = bg1.style.opacity != 0 ? bg1 : bg2
                let nextBg = bg1.style.opacity != 0 ? bg2 : bg1
                curBg.style.opacity = 0
                this.customWallPaperIndex = (this.customWallPaperIndex + 1) % this.userConfig.loginBkImg.length
                nextBg.src = this.userConfig.loginBkImg[this.customWallPaperIndex]
                nextBg.onload = () => {
                    nextBg.style.opacity = this.bkOpacity
                }
            }, this.bkInterval)
        } else if (this.userConfig?.loginBkImg instanceof Array && this.userConfig?.loginBkImg?.length == 1) {
            //单张自定义壁纸
            bg1.src = this.userConfig.loginBkImg[0]
            bg1.onload = () => {
                bg1.style.opacity = this.bkOpacity
            }
        } else {
            //默认壁纸
            bg1.src = require('@/assets/background.jpg')
            bg1.onload = () => {
                bg1.style.opacity = this.bkOpacity
            }
        }
    },
    methods: {
        login() {
            // set authCode to Cookie, expires in 2 weeks
            if (this.password === '') {
                this.writtenPass = 'unset'
            } else {
                this.writtenPass = this.password
            }
            axios.post('/login', {
                authCode: this.password
            }).then(res => {
                if (res.status !== 200) {
                    this.$message.error('登录失败，请检查认证码是否正确~')
                    return
                }
                cookies.set('authCode', this.writtenPass, '14d')
                this.$router.push('/')
                this.$message.success('登录成功~')
            }).catch(err => {
                this.$message.error('登录失败，请检查认证码是否正确~')
            })
        }
    }
}
</script>

<style scoped>
.login {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    transition: background-image 1s ease-in-out;
    background-size: cover;
    background-attachment: fixed;
}
.login-container {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: center;
    height: 40vh;
    width: 40vw;
    border-radius: 12px;
    box-shadow: 0 0 12px rgba(0, 0, 0, 0.12);
    background-color: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(8px);
    transition: all 0.3s ease;
}
@media (max-width: 768px) {
    .login-container {
        width: 80vw;
    }
}
.login-container:hover {
    box-shadow: 0 0 12px 4px rgba(0, 0, 0, 0.24);
    transform: translateY(-5px);
}
.password-input {
    margin-bottom: 15px;
    width: 30vw;
    height: 40px;
}
.password-input:deep(.el-input__wrapper) {
    border-radius: 12px;
    background-color: rgba(255, 255, 255, 0.7);
    box-shadow: none;
}

@media (max-width: 768px) {
    .password-input {
        width: 70vw;
    }
}
.submit {
    margin-top: 10px;
}
.background-image1 {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
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
    object-fit: cover;
    z-index: -1;
    opacity: 0;
    transition: all 1s ease-in-out;
}
</style>