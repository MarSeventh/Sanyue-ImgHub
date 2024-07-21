<template>
    <div class="login">
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
export default {
    data() {
        return {
            password: ''
        }
    },
    methods: {
        login() {
            // set authCode to Cookie, expires in 2 weeks
            if (this.password === '') {
                this.password = 'unset'
            }
            cookies.set('authCode', this.password, '14d')
            this.$router.push('/')
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
    background-image: url('https://imgbed.sanyue.site/file/0dbd5add3605a0b2e8994.jpg');
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