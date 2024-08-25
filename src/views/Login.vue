<template>
    <div class="login" :style="backgroundImg">
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
            <el-button class="submit" type="primary" @click="login">submit</el-button>
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
        backgroundImg() {
            let imgUrl = ''
            if (this.userConfig?.loginBkImg === 'bing') {
                imgUrl = `url(${this.bingWallPapers[this.bingWallPaperIndex]?.url})`
            } else {
                imgUrl = this.userConfig?.loginBkImg.length > 0
                            ? `url(${this.userConfig.loginBkImg[this.customWallPaperIndex]})` :
                            'url(https://imgbed.sanyue.site/file/0dbd5add3605a0b2e8994.jpg)'
            }
            return {
                backgroundImage: imgUrl
            }
        }
    },
    mounted() {
        if (this.userConfig?.loginBkImg === 'bing') {
            this.$store.dispatch('fetchBingWallPapers')
            setInterval(() => {
                this.bingWallPaperIndex = (this.bingWallPaperIndex + 1) % this.bingWallPapers.length
            }, 3000)
        } else if (this.userConfig?.loginBkImg.length > 1) {
            setInterval(() => {
                this.customWallPaperIndex = (this.customWallPaperIndex + 1) % this.userConfig.loginBkImg.length
            }, 3000)
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
.login-container:hover {
    box-shadow: 0 0 12px 4px rgba(0, 0, 0, 0.24);
    transform: translateY(-5px);
}
.password-input {
    margin-bottom: 15px;
    width: 30vw;
}
.submit {
    margin-top: 10px;
}
</style>