<template>
    <BaseLogin
        :title="loginTitle"
        :fields="loginFields"
        :submit-text="$t('login.submit')"
        background-key="loginBkImg"
        :is-admin="false"
        :loading="isLoading"
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
            isLoading: false,
            loginFields: []
        }
    },
    computed: {
        ...mapGetters(['userConfig']),
        ownerName() {
            return this.userConfig?.ownerName || 'Sanyue'
        },
        loginTitle() {
            return this.$t('login.title', { owner: this.ownerName })
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
                    key: 'password',
                    label: this.$t('login.password'),
                    placeholder: this.$t('login.passwordPlaceholder'),
                    type: 'password',
                    showPassword: true,
                    icon: 'Lock'
                }
            ];
        },
        async handleLogin(formData) {
            const { password } = formData;
            const writtenPass = password === '' ? 'unset' : password;
            
            this.isLoading = true;
            
            const minDelayPromise = new Promise(resolve => setTimeout(resolve, 500));
            const loginPromise = axios.post('/api/login', {
                authCode: password
            }).then(res => ({ res })).catch(err => ({ err }));

            try {
                const [result] = await Promise.all([loginPromise, minDelayPromise]);
                
                if (result.res && result.res.status === 200) {
                    cookies.set('authCode', writtenPass, '14d')
                    this.$router.push('/')
                    this.$message.success(this.$t('login.success'))
                    // Keep loading true to show animation relative to redirect
                } else {
                    this.isLoading = false;
                    this.$message.error(this.$t('login.failed'))
                }
            } catch (err) {
                this.isLoading = false;
                this.$message.error(this.$t('login.systemError'))
            }
        }
    }
}
</script>

<style scoped>
</style>