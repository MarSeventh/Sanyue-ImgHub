<template>
    <BaseLogin
        :title="loginTitle"
        :fields="loginFields"
        submit-text="登录"
        background-key="loginBkImg"
        :is-admin="false"
        @submit="handleLogin"
    />
</template>

<script>
import cookies from 'vue-cookies'
import axios from '@/utils/axios'
import { mapGetters } from 'vuex'
import BaseLogin from '@/components/BaseLogin.vue'

export default {
    data() {
        return {
            loginFields: [
                {
                    key: 'password',
                    label: '密码',
                    placeholder: '请输入认证码',
                    type: 'password',
                    showPassword: true
                }
            ]
        }
    },
    computed: {
        ...mapGetters(['userConfig']),
        ownerName() {
            return this.userConfig?.ownerName || 'Sanyue'
        },
        loginTitle() {
            return `登录到 ${this.ownerName} 图床`
        }
    },
    components: {
        BaseLogin
    },
    methods: {
        handleLogin(formData) {
            const { password } = formData;
            const writtenPass = password === '' ? 'unset' : password;
            
            axios.post('/api/login', {
                authCode: password
            }).then(res => {
                if (res.status !== 200) {
                    this.$message.error('登录失败，请检查密码是否正确')
                    return
                }
                cookies.set('authCode', writtenPass, '14d')
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
</style>