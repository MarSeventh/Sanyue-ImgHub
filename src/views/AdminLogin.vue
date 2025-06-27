<template>
    <BaseLogin
        title="管理端登录"
        :fields="loginFields"
        submit-text="登录"
        background-key="adminLoginBkImg"
        :is-admin="true"
        @submit="handleLogin"
    />
</template>

<script>
import BaseLogin from '@/components/BaseLogin.vue';
import axios from '@/utils/axios'

export default {
    data() {
        return {
            loginFields: [
                {
                    key: 'username',
                    label: '用户名',
                    placeholder: '请输入用户名',
                    type: 'text'
                },
                {
                    key: 'password',
                    label: '密码',
                    placeholder: '请输入密码',
                    type: 'password',
                    showPassword: true
                }
            ]
        }
    },
    components: {
        BaseLogin
    },
    methods: {
        async handleLogin(formData) {
            const { username, password } = formData;
            const credentials = btoa(`${username}:${password}`); // Base64 编码
            try {
                const response = await axios.get('/api/manage/check', {
                    headers: {
                        'Authorization': `Basic ${credentials}`
                    },
                    withCredentials: true
                });

                if (response.status === 200) {
                    // 认证成功，存储认证信息，跳转到管理页面
                    this.$store.commit('setCredentials', credentials);
                    this.$router.push('/dashboard');
                }
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    this.$message.error('用户名或密码错误');
                } else {
                    this.$message.error('服务器错误');
                }
            }
        }
    }
}
</script>

<style scoped>
</style>