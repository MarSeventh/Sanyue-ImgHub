<template>
    <div class="container">
        <h1>用户管理</h1>
        <el-table :data="dealedData" style="width: 90%;">
            <el-table-column prop="ip" label="IP地址"></el-table-column>
            <el-table-column prop="count" label="上传次数" sortable></el-table-column>
        </el-table>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
    name: 'UserConfig',
    data() {
        return {
            tableData: [],
            dealedData: [], // 根据IP地址处理后的数据，格式为 {ip, count, [data]}
        }
    },
    computed: {
        ...mapGetters(['credentials'])
    },
    methods: {
        async fetchWithAuth(url, options = {}) {
            // 开发环境, url 前面加上 /api
            // url = `/api${url}`;
            if (this.credentials) {
                // 设置 Authorization 头
                options.headers = {
                    ...options.headers,
                    'Authorization': `Basic ${this.credentials}`
                };
                // 确保包含凭据，如 cookies
                options.credentials = 'include'; 
            }

            const response = await fetch(url, options);

            if (response.status === 401) {
                // Redirect to the login page if a 401 Unauthorized is returned
                this.$message.error('认证状态错误，请重新登录');
                this.$router.push('/adminLogin'); 
                throw new Error('Unauthorized');
            }

            return response;
        },
        dealByIP(data) {
            let dealedData = [];
            let ipSet = new Set();
            data.forEach(item => {
                if (item.metadata?.UploadIP) {
                    ipSet.add(item.metadata.UploadIP);
                }
            });
            ipSet.forEach(ip => {
                let ipData = data.filter(item => item.metadata?.UploadIP === ip);
                let count = ipData.length;
                dealedData.push({ip, count, data: ipData});
            });
            return dealedData;
        },
    },
    mounted() {
        this.fetchWithAuth("/api/manage/check", { method: 'GET' })
        .then(response => response.text())
        .then(result => {
            if(result == "true"){
                this.showLogoutButton=true;
                // 在 check 成功后再执行 list 的 fetch 请求
                return this.fetchWithAuth("/api/manage/list", { method: 'GET' });
            } else if(result=="Not using basic auth."){
                return this.fetchWithAuth("/api/manage/list", { method: 'GET' });
            } else{
                throw new Error('Unauthorized');
            }
        })
        .then(response => response.json())
        .then(result => {
            this.tableData = result;
            this.dealedData = this.dealByIP(result); // 根据IP地址处理数据
        })
        .catch((err) => {
            if (err.message !== 'Unauthorized') {
                this.$message.error('同步数据时出错，请检查网络连接');
            }
        });
    }
}
</script>

<style>
.container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}
</style>