<template>
    <BaseLogin
        :title="$t('login.adminTitle')"
        :fields="loginFields"
        :submit-text="$t('login.submit')"
        background-key="adminLoginBkImg"
        :is-admin="true"
        :loading="isLoading"
        @submit="handleLogin"
    />
</template>

<script>
import BaseLogin from '@/components/BaseLogin.vue';
import axios from '@/utils/axios'

export default {
    data() {
        return {
            isLoading: false,
            loginFields: []
        }
    },
    components: {
        BaseLogin
    },
    created() {
        this.updateLoginFields();
    },
    watch: {
        '$i18n.locale'() {
            this.updateLoginFields();
        }
    },
    methods: {
        updateLoginFields() {
            this.loginFields = [
                {
                    key: 'username',
                    label: this.$t('login.username'),
                    placeholder: this.$t('login.usernamePlaceholder'),
                    type: 'text',
                    icon: 'User'
                },
                {
                    key: 'password',
                    label: this.$t('login.password'),
                    placeholder: this.$t('login.adminPasswordPlaceholder'),
                    type: 'password',
                    showPassword: true,
                    icon: 'Lock'
                }
            ];
        },
        async handleLogin(formData) {
            const { username, password } = formData;
            const credentials = btoa(`${username}:${password}`); // Base64 编码
            
            this.isLoading = true;
            
            // Min delay promise
            const minDelayPromise = new Promise(resolve => setTimeout(resolve, 1000));
            // Request promise handling its own error to return it
            const loginPromise = axios.get('/api/manage/check', {
                headers: {
                    'Authorization': `Basic ${credentials}`
                },
                withCredentials: true
            }).then(response => ({ response })).catch(error => ({ error }));

            try {
                const [result] = await Promise.all([loginPromise, minDelayPromise]);
                
                if (result.response && result.response.status === 200) {
                    // 认证成功，标记已登录状态（不再存储密码）
                    // 会话 Token 已通过 HttpOnly Cookie 由后端设置
                    this.$store.commit('setAdminLoggedIn', true);
                    this.$router.push('/dashboard');
                } else {
                    const error = result.error || new Error('Unknown error');
                    this.isLoading = false;
                    if (error.response && error.response.status === 401) {
                        this.$message.error(this.$t('login.adminFailed'));
                    } else {
                        this.$message.error(this.$t('login.serverError'));
                    }
                }
            } catch (error) {
                // Should not reach here due to inner catch, but just in case
                this.isLoading = false;
                this.$message.error(this.$t('login.systemError'));
            }
        }
    }
}
</script>

<style scoped>
</style>
