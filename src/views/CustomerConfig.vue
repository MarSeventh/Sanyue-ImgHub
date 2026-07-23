<template>
    <div class="container">
        <el-header>
            <div class="header-content admin-header-content">
                <DashboardTabs activeTab="customerConfig"></DashboardTabs>
                <div class="header-action">
                    <el-tooltip :disabled="disableTooltip" :content="$t('sysConfig.logout')" placement="bottom">
                        <font-awesome-icon icon="sign-out-alt" class="header-icon" @click="handleLogout"></font-awesome-icon>
                    </el-tooltip>
                </div>
            </div>
        </el-header>
        <div class="main-container">
            <el-table :data="paginatedData" :default-sort="{ prop: 'count', order: 'descending' }" row-key="ip" class="main-table" table-layout="fixed" v-loading="loading" @expand-change="handleExpandChange">
                <el-table-column type="expand" width="48">
                    <template v-slot="props">
                        <div style="margin: 8px;">
                            <h3 style="text-align: center;">{{ $t('customerConfig.uploadFileList') }}</h3>
                            <el-table :data="props.row.data" style="width: 100%" :default-sort="{ prop: 'metadata.TimeStamp', order: 'descending' }" table-layout="fixed" :max-height="400" v-loading="props.row.filesLoading">
                                <el-table-column prop="metadata.FileName" :label="$t('customerConfig.fileNameCol')"></el-table-column>
                                <el-table-column :label="$t('customerConfig.filePreview')">
                                    <template v-slot="{ row }">
                                        <el-image v-if="row.metadata?.FileType?.includes('image')" :src="'/file/' + row.id + '?from=admin'" fit="cover" lazy style="width: 100px; height: 100px;"></el-image>
                                        <video v-else-if="row.metadata?.FileType?.includes('video')" :src="'/file/' + row.id + '?from=admin'" controls style="width: 100px; height: 100px;"></video>
                                        <div v-else style="width: 100px; height: 100px; display: flex; justify-content: center; align-items: center;">
                                            <font-awesome-icon icon="file" style="font-size: 2em;"></font-awesome-icon>
                                        </div>
                                    </template>
                                </el-table-column>
                                <el-table-column 
                                    :formatter="formatTimeStamp" 
                                    :label="$t('customerConfig.uploadTimeCol')" 
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
                <el-table-column prop="ip" :label="$t('customerConfig.ipAddress')" min-width="180"></el-table-column>
                <el-table-column prop="address" :label="$t('customerConfig.address')" min-width="220"></el-table-column>
                <el-table-column prop="count" :label="$t('customerConfig.uploadCount')" sortable min-width="110"></el-table-column>
                <el-table-column :label="$t('customerConfig.allowUpload')" :fixed="allowUploadColumnFixed" :width="allowUploadColumnWidth" align="center">
                    <template v-slot="{ row }">
                        <el-switch
                            class="allow-upload-switch"
                            v-model="row.enable"
                            :active-text="$t('customerConfig.allow')"
                            :inactive-text="$t('customerConfig.deny')"
                            @change="handleSwitchEnable(row)"
                        >
                        </el-switch>
                    </template>
                </el-table-column>
            </el-table>

            <!-- 分页组件 -->
            <div class="pagination-container">
                <div class="pagination-center">
                    <el-pagination
                        background
                        layout="prev, pager, next"
                        :total="dealedData.length"
                        :current-page="currentPage"
                        :page-size="pageSize"
                        :pager-count="pagerCount"
                        @current-change="handlePageChange"
                    ></el-pagination>
                    <el-button v-if="currentPage === Math.ceil(dealedData.length / pageSize)" type="primary" @click="loadMoreData" :loading="loading" class="load-more">{{ $t('customerConfig.loadMore') }}</el-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import fetchWithAuth from '@/utils/fetchWithAuth';
import DashboardTabs from '@/components/DashboardTabs.vue';
import backgroundManager from '@/mixins/backgroundManager';

export default {
    name: 'CustomerConfig',
    mixins: [backgroundManager],
    data() {
        return {
            tableData: [],
            dealedData: [], // 根据IP地址处理后的数据，格式为 {ip, count, [data]}
            blockipList: [], // 禁止上传的IP列表

            loading: false,
            viewportWidth: window.innerWidth,

            // 分页数据
            currentPage: 1,
            pageSize: 10, // 默认每页10条
        }
    },
    components: {
        DashboardTabs
    },
    computed: {
        isMobile() {
            return this.viewportWidth < 768;
        },
        disableTooltip() {
            return this.isMobile;
        },
        pagerCount() {
            return this.isMobile ? 3 : 7;
        },
        allowUploadColumnFixed() {
            return this.isMobile ? 'right' : false;
        },
        allowUploadColumnWidth() {
            return this.isMobile ? 96 : 170;
        },
        paginatedData() {
            // 计算分页数据
            const start = (this.currentPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            return this.dealedData.slice(start, end);
        }
    },
    methods: {
        handleLogout() {
            const url = process.env.NODE_ENV === 'production' ? '/api/auth/logout' : '/api/api/auth/logout';
            fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ authType: 'admin' })
            }).finally(() => {
                this.$store.commit('setAdminLoggedIn', false);
                this.$router.push('/adminLogin');
            });
        },
        formatTimeStamp(timeStamp) {
            return new Date(timeStamp).toLocaleString();
        },
        sortByTimestamp(a, b) {
            return new Date(a.metadata.TimeStamp) - new Date(b.metadata.TimeStamp);
        },
        async handleSwitchEnable(row) {
            const ip = row.ip;
            const enable = row.enable;
            if (enable) {
                // 从 blockipList 中移除
                this.blockipList = this.blockipList.filter(item => item !== ip);
                // 更新 blockipList
                await fetchWithAuth("/api/manage/cusConfig/whiteip", {
                    method: 'POST',
                    body: ip
                });
            } else {
                // 添加到 blockipList 中
                this.blockipList.push(ip);
                // 更新 blockipList
                await fetchWithAuth("/api/manage/cusConfig/blockip", {
                    method: 'POST',
                    body: ip
                });
            }
        },
        handlePageChange(page) {
            this.currentPage = page;
            // 到最后一页时，加载更多数据
            if (page === Math.ceil(this.dealedData.length / this.pageSize)) {
                this.loadMoreData();
            }
        },
        async handleExpandChange(row, expandedRows) {
            if (!expandedRows.some(item => item.ip === row.ip) || row.filesLoaded || row.filesLoading) return;

            row.filesLoading = true;
            try {
                const response = await fetchWithAuth(`/api/manage/cusConfig/files?ip=${encodeURIComponent(row.ip)}&count=${row.count}`, { method: 'GET' });
                const result = await response.json();
                row.data = (result.data || []).sort(this.sortByTimestamp).reverse();
                row.filesLoaded = true;
            } catch (err) {
                this.$message.error(this.$t('customerConfig.loadError'));
            } finally {
                row.filesLoading = false;
            }
        },
        loadMoreData() {
            this.loading = true;
            const start = this.dealedData.length;
            const count = 20; // 每次加载20条数据
            fetchWithAuth(`/api/manage/cusConfig/list?start=${start}&count=${count}`, { method: 'GET' })
            .then(response => response.json())
            .then(result => {
                this.dealedData = this.dealedData.concat(result.map(item => {
                    const enable = !this.blockipList.includes(item.ip);
                    return {
                        ip: item.ip,
                        address: item.address,
                        count: item.count,
                        data: [],
                        filesLoaded: false,
                        filesLoading: false,
                        enable: enable
                    };
                }));
            })
            .catch(() => {
                this.$message.error(this.$t('customerConfig.loadError'));
            })
            .finally(() => {
                this.loading = false;
            });
        },
        handleSizeChange(size) {
            this.pageSize = size;
            this.currentPage = 1;
        },
        handleResize() {
            this.viewportWidth = window.innerWidth;
        }
    },
    mounted() {
        window.addEventListener('resize', this.handleResize);

        // 初始化背景图
        this.initializeBackground('adminBkImg', '.container', false, true);

        this.loading = true;

        // 路由守卫已通过 /api/auth/sessionCheck 验证认证状态
        this.showLogoutButton = this.$store.state.adminLoggedIn;
        fetchWithAuth("/api/manage/cusConfig/list?count=20", { method: 'GET' })
        .then(response => response.json())
        .then(async result => {
            // 读取blockipList, 接口返回格式为 'ip1,ip2,ip3'，需要转换为数组
            const blockipList = await fetchWithAuth("/api/manage/cusConfig/blockipList", { method: 'GET' });
            this.blockipList = (await blockipList.text()).split(',');
            this.dealedData = result.map(item => {
                const enable = !this.blockipList.includes(item.ip);
                return {
                    ip: item.ip,
                    address: item.address,
                    count: item.count,
                    data: [],
                    filesLoaded: false,
                    filesLoading: false,
                    enable: enable
                };
            });
        })
        .catch((err) => {
            if (err.message !== 'Unauthorized') {
                this.$message.error(this.$t('customerConfig.syncError'));
            }
        })
        .finally(() => {
            this.loading = false;
        });
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.handleResize);
    }
}
</script>

<style scoped src="@/styles/admin-pagination.css"></style>

<style scoped>
.main-table {
    width: 95%;
    max-width: 1400px;
    border-radius: 16px;
    box-shadow: var(--glass-shadow);
    min-height: 530px;
    overflow: hidden;
    border: 1px solid var(--glass-border);
    background: var(--glass-bg) !important;
    backdrop-filter: blur(20px) saturate(1.4);
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
}

.main-table :deep(.el-table__inner-wrapper) {
    background: transparent !important;
}

.main-table :deep(.el-table__header-wrapper) {
    background: var(--glass-header-bg) !important;
}

.main-table :deep(.el-table__header th) {
    background: transparent !important;
}

.main-table :deep(.el-table__body-wrapper) {
    background: transparent !important;
}

.main-table :deep(.el-table__row) {
    background: transparent !important;
}

.main-table :deep(.el-table__row td) {
    background: transparent !important;
}

.main-table :deep(.el-table__row:hover td) {
    background: var(--glass-header-bg) !important;
}

.main-table :deep(.el-table__expanded-cell) {
    background: var(--glass-header-bg) !important;
}

.container {
    background: var(--admin-container-bg-color);
    min-height: 100vh;
    font-family: 'Arial', sans-serif;
    color: var(--admin-container-color);
    margin: 0;
    padding: 0;
}

.main-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 32px;
}

@media (max-width: 768px) {
    .main-container {
        margin-top: 60px;
    }

    .allow-upload-switch :deep(.el-switch__label) {
        display: none;
    }

    .main-table :deep(.el-table-fixed-column--right),
    .main-table :deep(.el-table__fixed-right-patch) {
        background: var(--glass-bg) !important;
        backdrop-filter: blur(20px) saturate(1.4);
        -webkit-backdrop-filter: blur(20px) saturate(1.4);
    }

    .main-table :deep(.el-table__body-wrapper .el-table__row td.el-table-fixed-column--right) {
        background: var(--glass-bg) !important;
        backdrop-filter: blur(20px) saturate(1.4);
        -webkit-backdrop-filter: blur(20px) saturate(1.4);
    }

    .main-table :deep(.el-table__header-wrapper .el-table-fixed-column--right),
    .main-table :deep(.el-table__body-wrapper .el-table__row:hover .el-table-fixed-column--right) {
        background: var(--glass-header-bg) !important;
        backdrop-filter: blur(20px) saturate(1.4);
        -webkit-backdrop-filter: blur(20px) saturate(1.4);
    }
}

</style>
