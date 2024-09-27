<template>
    <div class="login">
        <div class="login-container">
            <h1>AdminLogin</h1>
            <div class="input-container">
                <a class="input-name">用户名：</a>
                <el-input
                    v-model="username"
                    placeholder="请输入用户名"
                    class="username-input"
                ></el-input>
            </div>
            <div class="input-container">
                <a class="input-name">密码：</a>
                <el-input 
                    v-model="password" 
                    placeholder="请输入密码" 
                    class="password-input"
                    type="password" 
                    show-password
                    @keyup.enter.native="login"
                    >
                </el-input>
            </div>
            <el-button class="submit" type="primary" @click="login">登录</el-button>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            password: '',
            username: ''
        }
    },
    methods: {
        async login() {
            const credentials = btoa(`${this.username}:${this.password}`); // Base64 编码
            try {
                const response = await fetch('/api/manage/check', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${credentials}`
                    },
                    credentials: 'include'
                });

                if (response.status === 401) {
                    this.$message.error('用户名或密码错误');
                } else if (response.status === 200) {
                    // 认证成功，存储认证信息，跳转到管理页面
                    this.$store.commit('setCredentials', credentials);
                    this.$router.push('/dashboard');
                } else {
                    this.$message.error('用户名或密码错误');
                }
            } catch (error) {
                this.$message.error('服务器错误');
            }
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
    background: linear-gradient(90deg, #ffd7e4 0%, #c8f1ff 100%);
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
.input-container {
    display: flex;
    align-items: center;
    width: 35vw;
}
@media (max-width: 768px) {
    .input-container {
        width: 75vw;
    }
}
.input-name {
    width: 12vw;
}
@media (max-width: 768px) {
    .input-name {
        width: 28vw;
    }
}
.submit {
    margin-top: 10px;
}
.password-input {
    height: 40px;
}
.password-input:deep(.el-input__wrapper) {
    border-radius: 12px;
    background-color: rgba(255, 255, 255, 0.9);
    box-shadow: none;
}
.username-input {
    height: 40px;
}
.username-input:deep(.el-input__wrapper) {
    border-radius: 12px;
    background-color: rgba(255, 255, 255, 0.9);
    box-shadow: none;
}
</style>