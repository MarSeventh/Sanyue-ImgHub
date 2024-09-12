<template>
    <div class="container">
        <el-container>
            <el-header>
            <div class="header-content">
                <span class="title" @click="refreshDashboard">Dashboard</span>
                <div class="search-card">
                <el-input v-model="search" size="mini" placeholder="输入关键字搜索"></el-input>
                </div>
                <span class="stats">
                    <font-awesome-icon icon="database" class="fa-database"></font-awesome-icon> 记录总数量: {{ Number }}
                </span>
                <div class="actions">
                <el-tooltip content="排序" placement="bottom">
                    <el-dropdown @command="sort" :hide-on-click="false">
                        <span class="el-dropdown-link">
                            <font-awesome-icon :icon="sortIcon" class="header-icon"></font-awesome-icon>
                        </span>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item command="dateDesc">按时间倒序</el-dropdown-item>
                                <el-dropdown-item command="nameAsc">按名称升序</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </el-tooltip>
                <el-tooltip content="批量复制" placement="bottom">
                    <font-awesome-icon icon="link" class="header-icon" :class="{ disabled: selectedFiles.length === 0 }" @click="handleBatchCopy"></font-awesome-icon>
                </el-tooltip>
                <el-tooltip content="批量删除" placement="bottom">
                    <font-awesome-icon icon="trash-alt" class="header-icon" :class="{ disabled: selectedFiles.length === 0 }" @click="handleBatchDelete"></font-awesome-icon>
                </el-tooltip>
                <el-tooltip content="黑白名单管理" placement="bottom">
                    <font-awesome-icon icon="user-cog" class="header-icon" @click="handleGoToAdmin"></font-awesome-icon>
                </el-tooltip>
                <el-tooltip content="返回上传页" placement="bottom">
                    <font-awesome-icon icon="home" class="header-icon" @click="handleLogout"></font-awesome-icon>
                </el-tooltip>
                </div>
            </div>
            </el-header>
            <el-main class="main-container">
            <div class="content">
                <template v-for="(item, index) in paginatedTableData" :key="index">
                <el-card class="img-card">
                    <el-checkbox v-model="item.selected"></el-checkbox>
                    <video v-if="item.metadata?.FileType?.includes('video')" :src="'/file/' + item.name" autoplay muted loop class="video-preview" @click="handleVideoClick"></video>
                    <el-image v-else :preview-teleported="true" :src="'/file/' + item.name" :preview-src-list="previewSrcList" fit="cover" lazy class="image-preview"></el-image>
                    <div class="image-overlay">
                    <div class="overlay-buttons">
                        <el-button size="mini" type="primary" @click.stop="handleCopy(index, item.name)">复制地址</el-button>
                        <el-button size="mini" type="danger" @click.stop="handleDelete(index, item.name)">删除</el-button>
                    </div>
                    </div>
                    <div class="file-info">{{ item.metadata?.FileName || item.name }}</div>
                </el-card>
                </template>
            </div>
            <div class="pagination-container">
                <el-pagination background layout="prev, pager, next" :total="filteredTableData.length" :page-size="pageSize" @current-change="handlePageChange" :current-page.sync="currentPage"></el-pagination>
            </div>
            </el-main>
        </el-container>
    </div>
</template>

<script>
export default {
data() {
    return {
    Number: 0,
    showLogoutButton: false,
    tableData: [],
    search: '',
    currentPage: 1,
    pageSize: 15,
    selectedFiles: [],
    sortOption: 'dateDesc',
    isUploading: false
    };
},
computed: {
    filteredTableData() {
        return this.tableData.filter(data => !this.search || data.name.toLowerCase().includes(this.search.toLowerCase()));
    },
    paginatedTableData() {
        const sortedData = this.sortData(this.filteredTableData);
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return sortedData.slice(start, end);
    },
    sortIcon() {
        return this.sortOption === 'dateDesc' ? 'sort-amount-down' : 'sort-alpha-up';
    },
    previewSrcList() {
        // 过滤掉视频文件，保留非视频文件的路径
        return this.paginatedTableData
        .filter(file => !file.metadata?.FileType?.includes('video')) // 过滤出非视频文件
        .map(file => `/file/${file.name}`); // 返回文件路径数组
    }
},
watch: {
    tableData: {
        handler(newData) {
        this.selectedFiles = newData.filter(file => file.selected);
        },
        deep: true
    },
    sortOption(newOption) {
        localStorage.setItem('sortOption', newOption);
    }
},
methods: {
    refreshDashboard() {
        location.reload();
    },
    handleDelete(index, key) {
        this.$confirm('此操作将永久删除该文件, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
        }).then(() => {
        fetch(`./api/manage/delete/${key}`, { method: 'GET', credentials: 'include' })
            .then(response => {
            if (response.ok) {
                const fileIndex = this.tableData.findIndex(file => file.name === key);
                if (fileIndex !== -1) {
                this.tableData.splice(fileIndex, 1);
                }
            } else {
                return Promise.reject('请求失败');
            }
            })
            .then(() => {
            this.updateStats();
            this.$message.success('删除成功!');
            })
            .catch(() => this.$message.error('删除失败，请检查网络连接'));
        }).catch(() => this.$message.info('已取消删除'));
    },
    handleBatchDelete() {
        this.$confirm('此操作将永久删除选中的文件, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
        }).then(() => {
        const promises = this.selectedFiles.map(file => fetch(`./api/manage/delete/${file.name}`, { method: 'GET', credentials: 'include' }));

        Promise.all(promises)
            .then(results => {
            results.forEach((response, index) => {
                if (response.ok) {
                const fileIndex = this.tableData.findIndex(file => file.name === this.selectedFiles[index].name);
                if (fileIndex !== -1) {
                    this.tableData.splice(fileIndex, 1);
                }
                }
            });
            this.selectedFiles = [];
            this.updateStats();
            this.$message.success('批量删除成功!');
            })
            .catch(() => this.$message.error('批量删除失败，请检查网络连接'));
        }).catch(() => this.$message.info('已取消批量删除'));
    },
    handleBatchCopy() {
        const links = this.selectedFiles.map(file => `${document.location.origin}/file/${file.name}`).join('\n');
        navigator.clipboard ? navigator.clipboard.writeText(links).then(() => this.$message.success('批量复制链接成功~')) :
        this.copyToClipboardFallback(links);
    },
    copyToClipboardFallback(text) {
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        textarea.style.position = 'fixed';
        textarea.style.clip = 'rect(0 0 0 0)';
        textarea.style.top = '10px';
        textarea.value = text;
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.$message.success('批量复制链接成功~');
    },
    handleLogout() {
        this.$router.push('/');
    },
    handleGoToAdmin() {
        window.location.href = '/admin-detail';
    },
    handleCopy(index, key) {
        const text = `${document.location.origin}/file/${key}`;
        navigator.clipboard ? navigator.clipboard.writeText(text).then(() => this.$message.success('复制文件链接成功~')) :
        this.copyToClipboardFallback(text);
    },
    handlePageChange(page) {
        this.currentPage = page;
    },
    updateStats() {
        this.Number = this.tableData.length;
    },
    sort(command) {
        this.sortOption = command;
    },
    sortData(data) {
        return this.sortOption === 'nameAsc' ? data.sort((a, b) => a.name.localeCompare(b.name)) :
        data.sort((a, b) => b.metadata.TimeStamp - a.metadata.TimeStamp);
    },
    handleVideoClick(event) {
        const videoElement = event.target;
        if (videoElement.requestFullscreen) {
            videoElement.requestFullscreen();
        } else if (videoElement.webkitRequestFullscreen) {
            // Safari/Old Chrome
            videoElement.webkitRequestFullscreen();
        } else if (videoElement.mozRequestFullScreen) {
            // Firefox
            videoElement.mozRequestFullScreen();
        } else if (videoElement.msRequestFullscreen) {
            // IE/Edge
            videoElement.msRequestFullscreen();
        }
    }
},
mounted() {
    fetch("/api/manage/check", { method: 'GET', credentials: 'include' })
        .then(response => response.text())
        .then(result => {
        if(result == "true"){
            this.showLogoutButton=true;
            // 在 check 成功后再执行 list 的 fetch 请求
            return fetch("/api/manage/list", { method: 'GET', credentials: 'include' });
        } else if(result=="Not using basic auth."){
            return fetch("/api/manage/list", { method: 'GET', credentials: 'include' });
        }
        else{
            // window.location.reload();
            return Promise.reject();
        }
        })
        .then(response => response.json())
        .then(result => {
        this.tableData = result.map(file => ({ ...file, selected: false }));
        this.updateStats();
        const savedSortOption = localStorage.getItem('sortOption');
        if (savedSortOption) {
            this.sortOption = savedSortOption;
        }
        this.sortData(this.tableData);
        })
        .catch(() => this.$message.error('同步数据时出错，请检查网络连接'));
    }
};
</script>

<style scoped>
.container {
    background: linear-gradient(90deg, #ffd7e4 0%, #c8f1ff 100%);
    min-height: 100vh;
    font-family: 'Arial', sans-serif;
    color: #333;
    margin: 0;
    padding: 0;
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

.stats {
    font-size: 1.2em;
    margin-right: 20px;
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.9);
    padding: 5px 10px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: background-color 0.3s ease, box-shadow 0.3s ease;
    color: #333;
}

@media (max-width: 768px) {
    .stats {
        margin-right: 0;
        margin-top: 10px;
    }
}

.stats .fa-database {
    margin-right: 10px;
    font-size: 1.5em;
    transition: color 0.3s ease;
    color: inherit;
}

.stats:hover {
    background-color: #f0eaf8; /* 使用柔和的淡紫色 */
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
    color: #B39DDB; /* 使用柔和的淡紫色 */
}

.stats:hover .fa-database {
    color: #B39DDB; /* 使用柔和的淡紫色 */
}

.header-content .actions {
    display: flex;
    align-items: center;
    gap: 15px;
}

@media (max-width: 768px) {
    .header-content .actions {
        margin-top: 10px;
    }
}

.header-content .actions i {
    font-size: 1.5em;
    cursor: pointer;
    transition: color 0.3s, transform 0.3s;
    color: #333;
}

.header-content .actions i:hover {
    color: #B39DDB; /* 使用柔和的淡紫色 */
    transform: scale(1.2);
}

.header-content .actions .el-dropdown-link i {
    color: #333;
}

.header-content .actions .el-dropdown-link i:hover {
    color: #B39DDB; /* 使用柔和的淡紫色 */
}

.header-content .actions .disabled {
    color: #bbb;
    pointer-events: none;
}

.header-content .actions .enabled {
    color: #B39DDB; /* 使用柔和的淡紫色 */
}

.search-card {
    margin-left: auto;
    margin-right: 20px;
}

@media (max-width: 768px) {
    .search-card {
        margin-right: 0;
        margin-left: 0;
        margin-top: 10px;
    }
}

.search-card :deep(.el-input__wrapper) {
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    transition: background-color 0.3s;
}

.search-card :deep(.el-input__inner) {
    width: 300px;
    height: 40px;
    font-size: 1.2em;
    border: none;
    transition: width 0.3s;
    background: none;
}

@media (max-width: 768px) {
    .search-card :deep(.el-input__inner) {
        width: 60vw;
    }
}

.search-card :deep(.el-input__inner:focus) {
    width: 400px;
}

@media (max-width: 768px) {
    .search-card :deep(.el-input__inner:focus) {
        width: 80vw;
    }
}

.main-container {
    display: flex;
    flex-direction: column;
    padding: 20px;
    min-height: calc(100vh - 80px);
}

@media (max-width: 768px) {
    .main-container {
        margin-top: 18vh;
    }
}

.content {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 20px;
    padding: 10px;
    flex-grow: 1;
}

/* 在小屏幕上，将所有内容放入一列 */
@media (max-width: 768px) {
    .content {
        grid-template-columns: 1fr; /* 将所有内容放入一列 */
        grid-template-rows: none;   /* 行根据内容高度自动调整 */
    }
}

.img-card {
    width: 100%;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    position: relative;
    transition: transform 0.3s ease;
}

.img-card:hover {
    transform: scale(1.05);
}

.image-preview {
    width: 100%;
    height: 200px;
    object-fit: cover;
    transition: opacity 0.3s ease;
}

.image-preview:hover {
    opacity: 0.8;
}


.file-info {
    padding: 10px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    text-align: center;
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
}

.image-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
}

.el-card:hover .image-overlay {
    opacity: 1;
}

.overlay-buttons {
    display: flex;
    gap: 10px;
    pointer-events: auto;
}

.pagination-container {
    display: flex;
    justify-content: center;
    margin-top: 20px;
    padding-bottom: 20px;
}

.el-checkbox {
    position: absolute;
    top: 10px;
    right: 10px;
    transform: scale(1.5);
    z-index: 10;
}

.video-preview {
    width: 100%; 
    height: 200px;
    display: block;
    cursor: pointer;
}
</style>
