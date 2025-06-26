<template>
    <div class="login">
        <ToggleDark class="toggle-dark"/>
        <Logo />
        <div class="login-container">
            <h1 class="login-title">登录到 {{ ownerName }} 图床</h1>
            <div class="input-container">
                <a class="input-name">密码</a>
                <el-input 
                    class="password-input" 
                    v-model="password" 
                    placeholder="请输入认证码" 
                    type="password" 
                    show-password
                    @keyup.enter.native="login"
                >
            </el-input>
            </div>
            <el-button class="submit" type="primary" @click="login">登录</el-button>
        </div>
        <Footer class="footer"/>
    </div>
</template>

<script>
import cookies from 'vue-cookies'
import axios from '@/utils/axios'
import { mapGetters } from 'vuex'
import Footer from '@/components/Footer.vue'
import ToggleDark from '@/components/ToggleDark.vue'
import Logo from '@/components/Logo.vue'
import backgroundManager from '@/mixins/backgroundManager'

export default {
    mixins: [backgroundManager],
    data() {
        return {
            password: '',
            writtenPass: '',
        }
    },
    computed: {
        ...mapGetters(['userConfig']),
        ownerName() {
            return this.userConfig?.ownerName || 'Sanyue'
        },
    },
    components: {
        Footer,
        ToggleDark,
        Logo
    },
    mounted() {
        // 初始化背景图，启用自动创建元素
        this.initializeBackground('loginBkImg', '.login', true, true)
    },
    methods: {
        login() {
            // set authCode to Cookie, expires in 2 weeks
            if (this.password === '') {
                this.writtenPass = 'unset'
            } else {
                this.writtenPass = this.password
            }
            axios.post('/api/login', {
                authCode: this.password
            }).then(res => {
                if (res.status !== 200) {
                    this.$message.error('登录失败，请检查密码是否正确')
                    return
                }
                cookies.set('authCode', this.writtenPass, '14d')
                this.$router.push('/')
                this.$message.success('登录成功')
            }).catch(err => {
                this.$message.error('登录失败，请检查密码是否正确')
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
    flex-direction: column;
    height: 100vh;
    background: var(--bg-color);
}
.login-container {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: center;
    height: 40vh;
    width: 40vw;
    border-radius: 12px;
    box-shadow: var(--login-container-box-shadow);
    background-color: var(--login-container-bg-color);
    backdrop-filter: blur(8px);
    transition: all 0.3s ease;
}
@media (max-width: 768px) {
    .login-container {
        width: 80vw;
    }
}
.login-container:hover {
    box-shadow: var(--login-container-hover-box-shadow);
    transform: translateY(-5px);
}

.login-title {
    font-size: 2.1rem;
    margin-bottom: 15px;
    color: var(--login-title-color);
    font-family: 'Noto Sans SC', sans-serif;
    cursor: pointer;
}
@media (max-width: 768px) {
    .login-title {
        font-size: 1.5rem;
    }
}

.input-container {
    display: flex;
    align-items: center;
    justify-content: start;
    width: 35vw;
}
@media (max-width: 768px) {
    .input-container {
        width: 75vw;
    }
}

.input-name {
    width: 14%;
    color: var(--login-title-color);
    text-align: right;
    margin-right: 10px;
}
@media (max-width: 768px) {
    .input-name {
        width: 20%;
    }
}

.password-input {
    width: 78%;
    height: 140%;
}
.password-input:deep(.el-input__wrapper) {
    border-radius: 12px;
    background-color: var(--password-input-bg-color);
    border: var(--password-input-border);
    box-shadow: none;
}

@media (max-width: 768px) {
    .password-input {
        width: 75%;
    }
}

.submit {
    margin-top: 10px;
    width: 40%;
    height: 15%;
    border-radius: 12px;
    background-color: var(--login-submit-btn-bg-color);
    transition: all 0.3s ease;
    border: none;
}
.footer {
    position: fixed;
    bottom: 0;
    width: 100vw;
}
.toggle-dark {
    position: fixed;
    top: 30px;
    right: 30px;
    border: none;
    transition: all 0.3s ease;
    background-color: var(--toolbar-button-bg-color);
    box-shadow: var(--toolbar-button-shadow);
    backdrop-filter: blur(10px);
    border-radius: 12px;
}
.toggle-dark:hover {
    transform: scale(1.05);
    box-shadow: var(--toolbar-button-shadow-hover);
}
</style>