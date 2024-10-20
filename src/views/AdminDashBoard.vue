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
                <el-tooltip :disabled="disableTooltip" content="排序" placement="bottom">
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
                <el-tooltip :disabled="disableTooltip" content="全选此页" placement="bottom">
                    <font-awesome-icon :icon="selectPageIcon" class="header-icon" @click="handleSelectPage"></font-awesome-icon>
                </el-tooltip>
                <el-tooltip :disabled="disableTooltip" content="批量处理" placement="bottom">
                    <el-dropdown @command="handleBatchAction" :hide-on-click="false" :disabled="selectedFiles.length === 0">
                        <span class="el-dropdown-link">
                            <font-awesome-icon icon="ellipsis-h" class="header-icon" :class="{ disabled: selectedFiles.length === 0 }"></font-awesome-icon>
                        </span>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item command="copy">
                                    <font-awesome-icon icon="copy" style="margin-right: 5px;"></font-awesome-icon>
                                    批量复制
                                </el-dropdown-item>
                                <el-dropdown-item command="delete">
                                    <font-awesome-icon icon="trash-alt" style="margin-right: 5px;"></font-awesome-icon>
                                    批量删除
                                </el-dropdown-item>
                                <el-dropdown-item command="download">
                                    <font-awesome-icon icon="download" style="margin-right: 5px;"></font-awesome-icon>
                                    批量下载
                                </el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </el-tooltip>
                <el-tooltip :disabled="disableTooltip" content="用户管理" placement="bottom">
                    <font-awesome-icon icon="user-cog" class="header-icon" @click="handleGoToAdmin"></font-awesome-icon>
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
            <el-main class="main-container">
            <div class="content">
                <template v-for="(item, index) in paginatedTableData" :key="index">
                <el-card class="img-card">
                    <el-checkbox v-model="item.selected"></el-checkbox>
                    <video v-if="item.metadata?.FileType?.includes('video') || item.metadata?.FileType?.includes('audio')" :src="'/file/' + item.name" autoplay muted loop class="video-preview" @click="handleVideoClick"></video>
                    <el-image v-else :preview-teleported="true" :src="'/file/' + item.name" :preview-src-list="item.previewSrcList" fit="cover" lazy class="image-preview"></el-image>
                    <div class="image-overlay">
                        <div class="overlay-buttons">
                            <el-tooltip :disabled="disableTooltip" content="复制链接" placement="top">
                                <el-button size="mini" type="primary" @click.stop="handleCopy(index, item.name)">
                                    <font-awesome-icon icon="copy"></font-awesome-icon>
                                </el-button>
                            </el-tooltip>
                            <el-tooltip :disabled="disableTooltip" content="下载" placement="top">
                                <el-button size="mini" type="primary" @click.stop="handleDownload(item.name)">
                                    <font-awesome-icon icon="download"></font-awesome-icon>
                                </el-button>
                            </el-tooltip>
                            <el-tooltip :disabled="disableTooltip" content="详情" placement="top">
                                <el-button size="mini" type="primary" @click.stop="openDetailDialog(index, item.name)">
                                    <font-awesome-icon icon="info"></font-awesome-icon>
                                </el-button>
                            </el-tooltip>
                            <el-tooltip :disabled="disableTooltip" content="删除" placement="top">
                                <el-button size="mini" type="danger" @click.stop="handleDelete(index, item.name)">
                                    <font-awesome-icon icon="trash-alt"></font-awesome-icon>
                                </el-button>
                            </el-tooltip>
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
        <el-dialog title="文件详情" v-model="showdetailDialog" :width="dialogWidth" center>
            <el-descriptions direction="vertical" border :column="tableColumnNum">
                <template #extra>
                    <div class="detail-actions">
                        <el-button type="primary" @click="handleDownload(detailFile?.name)" round size="small">
                            <font-awesome-icon icon="download" style="margin-right: 3px;"></font-awesome-icon> 下载
                        </el-button>
                        <el-button type="primary" @click="handleBlock(detailFile?.name)" round size="small">
                            <font-awesome-icon icon="ban" style="margin-right: 3px;"></font-awesome-icon> 黑名单
                        </el-button>
                        <el-button type="primary" @click="handleWhite(detailFile?.name)" round size="small">
                            <font-awesome-icon icon="user-plus" style="margin-right: 3px;"></font-awesome-icon> 白名单
                        </el-button>
                        <el-button type="danger" @click="handleDetailDelete(detailFile?.name)" round size="small">
                            <font-awesome-icon icon="trash-alt" style="margin-right: 3px;"></font-awesome-icon> 删除
                        </el-button>
                    </div> 
                </template>
                <el-descriptions-item 
                    label="文件预览"
                    :rowspan="tablePreviewSpan"
                    :width="300"
                    align="center"
                    >
                    <video v-if="detailFile?.metadata?.FileType?.includes('video') || detailFile?.metadata?.FileType?.includes('audio')" :src="'/file/' + detailFile?.name" autoplay muted loop class="video-preview" @click="handleVideoClick"></video>
                    <el-image v-else :src="'/file/' + detailFile?.name" fit="cover" lazy class="image-preview"></el-image>
                </el-descriptions-item>
                <el-descriptions-item label="文件名" class-name="description-item">{{ detailFile?.metadata?.FileName || detailFile?.name }}</el-descriptions-item>
                <el-descriptions-item label="访问状态" class-name="description-item">{{ accessType }}</el-descriptions-item>
                <el-descriptions-item label="上传时间" class-name="description-item">{{ new Date(detailFile?.metadata?.TimeStamp).toLocaleString() || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="上传IP" class-name="description-item">{{ detailFile?.metadata?.UploadIP || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="上传渠道" class-name="description-item">{{ detailFile?.metadata?.Channel || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="文件类型" class-name="description-item">{{ detailFile?.metadata?.FileType || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="审查结果" class-name="description-item">{{ detailFile?.metadata?.Label || '无' }}</el-descriptions-item>
            </el-descriptions>
            <el-divider></el-divider>
            <el-tabs  v-model="activeUrlTab" @tab-click="handleTabClick">
                <el-tab-pane label="原始链接" name="originUrl">
                    <el-input v-model="allUrl.originUrl" readonly @click="handleUrlClick"></el-input>
                </el-tab-pane>
                <el-tab-pane label="Markdown" name="mdUrl">
                    <el-input v-model="allUrl.mdUrl" readonly @click="handleUrlClick"></el-input>
                </el-tab-pane>
                <el-tab-pane label="HTML" name="htmlUrl">
                    <el-input v-model="allUrl.htmlUrl" readonly @click="handleUrlClick"></el-input>
                </el-tab-pane>
                <el-tab-pane label="BBCode" name="bbUrl">
                    <el-input v-model="allUrl.bbUrl" readonly @click="handleUrlClick"></el-input>
                </el-tab-pane>
                <el-tab-pane label="TG文件ID" v-if="detailFile?.metadata?.TgFileId" name="tgId">
                    <el-input v-model="allUrl.tgId" readonly @click="handleUrlClick"></el-input>
                </el-tab-pane>
            </el-tabs>
        </el-dialog>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
import JSZip from 'jszip';

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
        isUploading: false,
        showdetailDialog: false,
        detailFile: null,
        activeUrlTab: 'originUrl'
    }
},
computed: {
    ...mapGetters(['credentials']),
    filteredTableData() {
        return this.tableData.filter(data => !this.search || data.name.toLowerCase().includes(this.search.toLowerCase()) || data.metadata?.FileName?.toLowerCase().includes(this.search.toLowerCase()));
    },
    paginatedTableData() {
        const sortedData = this.sortData(this.filteredTableData);
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        let data = sortedData.slice(start, end);
        // 增加previewSrcList属性，用于预览图片
        const fullList = data.filter(file => !file.metadata?.FileType?.includes('video')).map(file => `/file/${file.name}`);
        data.forEach(file => {
            if (!file.metadata?.FileType?.includes('video')) {
                // 重新排序，索引大于等于当前索引的元素在前，否则在后
                file.previewSrcList = fullList.slice(fullList.indexOf(`/file/${file.name}`)).concat(fullList.slice(0, fullList.indexOf(`/file/${file.name}`)));
            }
        });
        return data;
    },
    sortIcon() {
        return this.sortOption === 'dateDesc' ? 'sort-amount-down' : 'sort-alpha-up';
    },
    dialogWidth() {
        return window.innerWidth > 768 ? '60%' : '90%';
    },
    accessType() {
        if (this.detailFile?.metadata?.ListType === 'White') {
            return '正常';
        } else if (this.detailFile?.metadata?.ListType === 'Block' || this.detailFile?.metadata?.Label === 'adult') {
            return '受限';
        } else {
            return '正常';
        }
    },
    allUrl() {
        return {
            'originUrl': `${document.location.origin}/file/${this.detailFile?.name}`,
            'mdUrl': `![${this.detailFile?.metadata?.FileName || this.detailFile?.name}](${document.location.origin}/file/${this.detailFile?.name})`,
            'htmlUrl': `<img src="${document.location.origin}/file/${this.detailFile?.name}" alt="${this.detailFile?.metadata?.FileName || this.detailFile?.name}" width=100%>`,
            'bbUrl': `[img]${document.location.origin}/file/${this.detailFile?.name}[/img]`,
            'tgId': this.detailFile?.metadata?.TgFileId || '未知'
        }
    },
    tableColumnNum() {
        return window.innerWidth > 768 ? 3 : 1;
    },
    tablePreviewSpan() {
        return window.innerWidth > 768 ? 2 : 1;
    },
    disableTooltip() {
        return window.innerWidth < 768;
    },
    selectPage() {
        // 如果当前页所有文件都被选中，则返回 true，否则返回 false
        return this.paginatedTableData.every(file => file.selected);
    },
    selectPageIcon() {
        return this.selectPage ? 'check-square' : 'square';
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
    handleDownload(key) {
        const link = document.createElement('a');
        link.href = `/file/${key}`;
        link.download = key;
        link.click();
    },
    openDetailDialog(index, key) {
        this.detailFile = this.paginatedTableData[index];
        this.showdetailDialog = true;
    },
    handleTabClick(tab) {
        this.activeUrlTab = tab.props.name;
    },
    handleUrlClick(event) {
        // 复制到剪贴板
        navigator.clipboard.writeText(event.target.value)
            .then(() => {
                this.$message({
                    type: 'success',
                    message: '复制成功'
                });
            })
            .catch(() => {
                this.$message({
                    type: 'error',
                    message: '复制失败'
                });
            });
    },
    handleDetailDelete(key) {
        this.$confirm('此操作将永久删除该文件, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
        }).then(() => {
        this.fetchWithAuth(`/api/manage/delete/${key}`, { method: 'GET' })
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
            this.showdetailDialog = false;
            })
            .catch(() => this.$message.error('删除失败，请检查网络连接'));
        }).catch(() => this.$message.info('已取消删除'));
    },
    handleBlock(key) {
        this.$confirm('此操作将把该文件加入黑名单, 是否继续?', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }).then(() => {
        this.fetchWithAuth(`/api/manage/block/${key}`, { method: 'GET' })
            .then(response => {
                if (response.ok) {
                    const fileIndex = this.tableData.findIndex(file => file.name === key);
                    if (fileIndex !== -1) {
                        this.tableData[fileIndex].metadata.ListType = 'Block';
                    }
                } else {
                    return Promise.reject('请求失败');
                }
            })
            .then(() => {
                this.$message.success('加入黑名单成功!');
            })
            .catch(() => this.$message.error('加入黑名单失败，请检查网络连接'));
        }).catch(
            () => console.log('已取消加入黑名单')
        );
    },
    handleWhite(key) {
        this.$confirm('此操作将把该文件加入白名单, 是否继续?', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }).then(() => {
        this.fetchWithAuth(`/api/manage/white/${key}`, { method: 'GET' })
            .then(response => {
                if (response.ok) {
                    const fileIndex = this.tableData.findIndex(file => file.name === key);
                    if (fileIndex !== -1) {
                        this.tableData[fileIndex].metadata.ListType = 'White';
                    }
                } else {
                    return Promise.reject('请求失败');
                }
            })
            .then(() => {
                this.$message.success('加入白名单成功!');
            })
            .catch(() => this.$message.error('加入白名单失败，请检查网络连接'));
        }).catch(
            () => console.log('已取消加入白名单')
        );
    },
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
    handleDelete(index, key) {
        this.$confirm('此操作将永久删除该文件, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
        }).then(() => {
        this.fetchWithAuth(`/api/manage/delete/${key}`, { method: 'GET' })
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
        const promises = this.selectedFiles.map(file => this.fetchWithAuth(`/api/manage/delete/${file.name}`, { method: 'GET' }));

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
    handleGoUpload() {
        this.$router.push('/');
    },
    handleGoToAdmin() {
        this.$router.push('/customerConfig');
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
    },
    handleLogout() {
        this.$store.commit('setCredentials', null);
        this.$router.push('/adminLogin');
    },
    handleSelectPage() {
        if (this.selectPage) {
            this.paginatedTableData.forEach(file => file.selected = false);
        } else {
            this.paginatedTableData.forEach(file => file.selected = true);
        }
    },
    handleBatchAction(command) {
        if (command === 'copy') {
            this.handleBatchCopy();
        } else if (command === 'delete') {
            this.handleBatchDelete();
        } else if (command === 'download') {
            this.handleBatchDownload();
        }
    },
    handleBatchDownload() {
        // 将选中文件打包成 zip 文件下载
        const zip = new JSZip();
        const folder = zip.folder('files');
        // 构造Promise数组，等待所有文件下载完成后再打包
        const fileNameCount = {}; // 用于跟踪文件名出现的次数

        const downloadPromises = this.selectedFiles.map(file => {
            return fetch(`/file/${file.name}`)
                .then(response => response.blob())
                .then(blob => {
                    // 检查文件名是否已经存在
                    let fileName = file.metadata?.FileName || file.name;
                    if (fileNameCount[fileName]) {
                        // 如果已经存在，则在文件名后加上编号
                        const extension = fileName.substring(fileName.lastIndexOf('.'));
                        const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
                        fileName = `${baseName}(${fileNameCount[fileName]})${extension}`;
                        fileNameCount[file.name]++;
                    } else {
                        // 如果不存在，则初始化为1
                        fileNameCount[fileName] = 1;
                    }

                    // 将文件添加到 zip 文件夹中
                    folder.file(fileName, blob);
                });
        });

        Promise.all(downloadPromises)
            .then(() => zip.generateAsync({ type: 'blob' }))
            .then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'files.zip';
                link.click();
            });
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
            this.tableData = result.map(file => ({ ...file, selected: false }));
            this.updateStats();
            const savedSortOption = localStorage.getItem('sortOption');
            if (savedSortOption) {
                this.sortOption = savedSortOption;
            }
            this.sortData(this.tableData);
        })
        .catch((err) => {
            if (err.message !== 'Unauthorized') {
                this.$message.error('同步数据时出错，请检查网络连接');
            }
        });
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

:deep(.description-item) {
    word-break: break-all;
    word-wrap: break-word;
}

:focus-visible {
    outline: none;
}
</style>, { file }
