<template>
    <div class="container">
        <el-header>
            <div class="header-content">
                <span class="title">用户管理</span>
                <div class="header-action">
                    <el-tooltip :disabled="disableTooltip" content="返回主管理页" placement="bottom">
                        <font-awesome-icon icon="home" class="header-icon" @click="handleGoHome"></font-awesome-icon>
                    </el-tooltip>
                    <el-tooltip :disabled="disableTooltip" content="返回上传页" placement="bottom">
                        <font-awesome-icon icon="upload" class="header-icon" @click="handleGoUpload"></font-awesome-icon>
                    </el-tooltip>
                    <el-tooltip :disabled="disableTooltip" content="退出登录" placement="bottom">
                        <font-awesome-icon icon="sign-out-alt" class="header-icon" @click="handleLogout"></font-awesome-icon>
                    </el-tooltip>
                </div>
            </div>
        </el-header>
        <div class="main-container">
            <el-table :data="dealedData" :default-sort="{ prop: 'count', order: 'descending' }" class="main-table" table-layout="fixed">
                <el-table-column type="expand">
                    <template v-slot="props">
                        <div style="margin: 8px;">
                            <h3 style="text-align: center;">上传文件列表</h3>
                            <el-table :data="props.row.data" style="width: 100%" :default-sort="{ prop: 'metadata.TimeStamp', order: 'descending' }" table-layout="fixed">
                                <el-table-column prop="metadata.FileName" label="文件名"></el-table-column>
                                <el-table-column prop="name" label="文件预览">
                                    <template v-slot="{ row }">
                                        <el-image v-if="row.metadata?.FileType?.includes('image')" :src="'/file/' + row.name" fit="cover" lazy style="width: 100px; height: 100px;"></el-image>
                                        <video v-else :src="'/file/' + row.name" controls style="width: 100px; height: 100px;"></video>
                                    </template>
                                </el-table-column>
                                <el-table-column 
                                    :formatter="formatTimeStamp" 
                                    label="上传时间" 
                                    prop="metadata.TimeStamp"
                                    sortable 
                                    :sort-method="sortByTimestamp">
                                    <template v-slot="{ row }">
                                        {{ formatTimeStamp(row.metadata.TimeStamp) }}
                                    </template>
                                </el-table-column>
                            </el-table>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column prop="ip" label="IP地址"></el-table-column>
                <el-table-column prop="count" label="上传次数" sortable></el-table-column>
            </el-table>
        </div>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
    name: 'CustomerConfig',
    data() {
        return {
            tableData: [],
            dealedData: [], // 根据IP地址处理后的数据，格式为 {ip, count, [data]}
        }
    },
    computed: {
        ...mapGetters(['credentials']),
        disableTooltip() {
            return window.innerWidth < 768;
        }
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
        handleGoUpload() {
            this.$router.push('/');
        },
        handleLogout() {
            this.$store.commit('setCredentials', null);
            this.$router.push('/adminLogin');
        },
        handleGoHome() {
            this.$router.push('/dashboard');
        },
        formatTimeStamp(timeStamp) {
            return new Date(timeStamp).toLocaleString();
        },
        sortByTimestamp(a, b) {
            return new Date(a.metadata.TimeStamp) - new Date(b.metadata.TimeStamp);
        }
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

<style scoped>
.main-table {
    width: 90%;
}

.container {
    background: linear-gradient(90deg, #ffd7e4 0%, #c8f1ff 100%);
    min-height: 100vh;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    background-color: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: background-color 0.5s ease, box-shadow 0.5s ease;
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
}

@media (max-width: 768px) {
    .header-content {
        flex-direction: column;
    }
}

.header-content:hover {
    background-color: rgba(255, 255, 255, 0.85);
    box-shadow: 0 6px 10px rgba(0, 0, 0, 0.2);
}

.title {
    font-size: 1.8em;
    font-weight: bold;
    cursor: pointer;
    transition: color 0.3s ease;
    color: #333;
}

.title:hover {
    color: #B39DDB; /* 使用柔和的淡紫色 */
}

.header-icon {
    font-size: 1.5em;
    cursor: pointer;
    transition: all 0.3s ease;
    color: #333;
    outline: none;
}

.header-icon:hover {
    color: #B39DDB; /* 使用柔和的淡紫色 */
    transform: scale(1.2);
}

.header-action {
    display: flex;
    gap: 10px;
}

.main-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 20px;
}

@media (max-width: 768px) {
    .main-container {
        margin-top: 35px;
    }
}
</style>import { format } from 'core-js/core/date';
