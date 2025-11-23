<template>
    <div class="history-container" :class="{ 'active': show }">
        <div class="history-header">
            <div class="header-left">
                <h2>历史记录</h2>
                <span class="record-count">共 {{ historyList.length }} 条</span>
            </div>
            <div class="header-right">
                <el-tooltip content="切换视图" placement="bottom">
                    <el-button circle @click="toggleViewMode">
                        <font-awesome-icon :icon="viewMode === 'grid' ? 'list' : 'th-large'" />
                    </el-button>
                </el-tooltip>
                <el-tooltip content="清空记录" placement="bottom">
                    <el-button circle type="danger" @click="clearHistory">
                        <font-awesome-icon icon="trash-alt" />
                    </el-button>
                </el-tooltip>
                <el-button circle @click="$emit('close')">
                    <font-awesome-icon icon="times" />
                </el-button>
            </div>
        </div>
        
        <div class="history-content" v-if="historyList.length > 0">
            <div v-for="group in groupedHistory" :key="group.date" class="history-group">
                <div class="timeline-header">
                    <div class="timeline-dot"></div>
                    <span class="date-label">{{ group.date }}</span>
                </div>

                <!-- Grid View -->
                <div v-if="viewMode === 'grid'" class="grid-view">
                    <div v-for="(item, index) in group.items" :key="item.time" class="grid-item">
                        <div class="grid-preview">
                            <img v-if="isImage(item.name)" :src="item.url" loading="lazy" @error="handleImageError" />
                            <video v-else-if="isVideo(item.name)" :src="item.url" muted></video>
                            <div v-else class="file-icon-wrapper">
                                <font-awesome-icon icon="file" class="file-icon" />
                            </div>
                            <div class="grid-overlay">
                                <div class="grid-actions">
                                    <el-button circle size="default" type="primary" @click="copyLink(item.url)">
                                        <font-awesome-icon icon="copy" />
                                    </el-button>
                                    <el-button circle size="default" class="action-btn-view" @click="openLink(item.url)">
                                        <font-awesome-icon icon="external-link-alt" />
                                    </el-button>
                                    <el-button circle size="default" type="danger" @click="deleteItem(item)">
                                        <font-awesome-icon icon="trash-alt" />
                                    </el-button>
                                </div>
                            </div>
                        </div>
                        <div class="grid-info">
                            <div class="file-name" :title="item.name">{{ item.name }}</div>
                            <div class="upload-time">{{ formatTime(item.time) }}</div>
                        </div>
                    </div>
                </div>

                <!-- List View -->
                <div v-else class="list-view">
                    <div v-for="(item, index) in group.items" :key="item.time" class="list-item">
                        <div class="list-preview">
                            <img v-if="isImage(item.name)" :src="item.url" loading="lazy" @error="handleImageError" />
                            <video v-else-if="isVideo(item.name)" :src="item.url" muted></video>
                            <div v-else class="file-icon-wrapper-small">
                                <font-awesome-icon icon="file" />
                            </div>
                        </div>
                        <div class="list-info">
                            <div class="file-name" :title="item.name">{{ item.name }}</div>
                            <div class="file-url" :title="item.url">{{ item.url }}</div>
                        </div>
                        <div class="list-meta">
                            <div class="upload-time">{{ formatTime(item.time) }}</div>
                        </div>
                        <div class="list-actions">
                            <el-button circle size="small" type="primary" @click="copyLink(item.url)">
                                <font-awesome-icon icon="copy" />
                            </el-button>
                            <el-button circle size="small" class="action-btn-view" @click="openLink(item.url)">
                                <font-awesome-icon icon="external-link-alt" />
                            </el-button>
                            <el-button circle size="small" type="danger" @click="deleteItem(item)">
                                <font-awesome-icon icon="trash-alt" />
                            </el-button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div v-else class="empty-state">
            <font-awesome-icon icon="history" class="empty-icon" />
            <p>暂无上传记录</p>
        </div>
    </div>
</template>

<script>
export default {
    name: 'UploadHistory',
    props: {
        show: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            historyList: [],
            viewMode: 'grid', // 'grid' or 'list'
        }
    },
    watch: {
        show(val) {
            if (val) {
                this.loadHistory()
            }
        }
    },
    computed: {
        groupedHistory() {
            const groups = {}
            this.historyList.forEach(item => {
                const date = new Date(item.time)
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                if (!groups[dateStr]) {
                    groups[dateStr] = []
                }
                groups[dateStr].push(item)
            })
            
            // Sort dates descending
            return Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).map(date => ({
                date,
                items: groups[date]
            }))
        }
    },
    mounted() {
        // Load view mode preference
        const savedMode = localStorage.getItem('historyViewMode')
        if (savedMode) {
            this.viewMode = savedMode
        }
    },
    methods: {
        loadHistory() {
            try {
                const history = JSON.parse(localStorage.getItem('uploadHistory') || '[]')
                
                // Sort by time desc
                this.historyList = history.sort((a, b) => b.time - a.time)
            } catch (e) {
                console.error('Failed to load history', e)
                this.historyList = []
            }
        },
        toggleViewMode() {
            this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid'
            localStorage.setItem('historyViewMode', this.viewMode)
        },
        clearHistory() {
            this.$confirm('确定要清空所有上传记录吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                this.historyList = []
                localStorage.removeItem('uploadHistory')
                this.$message.success('记录已清空')
            }).catch(() => {})
        },
        deleteItem(item) {
            this.$confirm('确定要删除这条记录吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                // Remove from list
                this.historyList = this.historyList.filter(i => i.time !== item.time)
                
                // Update localStorage
                try {
                    const history = JSON.parse(localStorage.getItem('uploadHistory') || '[]')
                    const newHistory = history.filter(i => i.time !== item.time)
                    localStorage.setItem('uploadHistory', JSON.stringify(newHistory))
                    this.$message.success('记录已删除')
                } catch (e) {
                    console.error('Failed to update history', e)
                }
            }).catch(() => {})
        },
        isImage(fileName) {
            const imageExtensions = [
                'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'ico', 'avif', 'heic',
                'jfif', 'pjpeg', 'pjp'
            ];
            const extension = fileName ? fileName.split('.').pop().toLowerCase() : '';
            return imageExtensions.includes(extension);
        },
        isVideo(fileName) {
            const videoExtensions = ['mp4', 'webm', 'ogg', 'mkv'];
            const extension = fileName ? fileName.split('.').pop().toLowerCase() : '';
            return videoExtensions.includes(extension);
        },
        formatTime(timestamp) {
            const date = new Date(timestamp)
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            const seconds = String(date.getSeconds()).padStart(2, '0')
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
        },
        copyLink(url) {
            navigator.clipboard.writeText(url).then(() => {
                this.$message.success('链接已复制')
            }).catch(() => {
                this.$message.error('复制失败')
            })
        },
        openLink(url) {
            window.open(url, '_blank')
        },
        handleImageError(e) {
            e.target.src = require('@/assets/404.png')
        }
    }
}
</script>

<style scoped>
.history-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--bg-color);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    transform: translateY(100%);
    transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.8);
    color: var(--upload-text-color);
}

/* Dark mode support */
.dark .history-container {
    background: rgba(30, 30, 30, 0.9);
    color: var(--upload-text-color);
}

.history-container.active {
    transform: translateY(0);
}

.history-header {
    padding: 20px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(0,0,0,0.1);
}

.dark .history-header {
    border-bottom: 1px solid rgba(255,255,255,0.1);
}

.header-left {
    display: flex;
    align-items: baseline;
    gap: 15px;
}

.header-left h2 {
    margin: 0;
    font-size: 24px;
    color: var(--upload-header-color);
}

.record-count {
    color: var(--upload-text-color);
    font-size: 14px;
    opacity: 0.8;
}

.header-right {
    display: flex;
    gap: 10px;
}

.history-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px 40px;
}

/* Grid View */
.grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 20px;
}

.grid-item {
    background: var(--upload-list-card-bg-color);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: var(--upload-list-card-box-shadow);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    border: var(--upload-list-card-border);
}

.grid-item:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}

.dark .grid-item:hover {
    box-shadow: 0 8px 20px rgba(255,255,255,0.1);
}

.grid-preview {
    height: 160px;
    position: relative;
    background: rgba(0,0,0,0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.dark .grid-preview {
    background: rgba(255,255,255,0.05);
}

.grid-preview img, .grid-preview video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.file-icon-wrapper {
    font-size: 48px;
    color: var(--upload-list-file-icon-color);
}

.grid-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.grid-item:hover .grid-overlay {
    opacity: 1;
}

.grid-actions {
    display: flex;
    gap: 15px;
}

.grid-info {
    padding: 10px;
}

.file-name {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 5px;
    color: var(--upload-text-color);
}

.upload-time {
    font-size: 12px;
    color: var(--upload-text-color);
    opacity: 0.7;
}

/* List View */
.list-view {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.list-item {
    display: flex;
    align-items: center;
    padding: 10px;
    background: var(--upload-list-card-bg-color);
    border-radius: 8px;
    border: var(--upload-list-item-border);
    transition: background 0.2s ease;
}

.list-item:hover {
    background: rgba(255,255,255,0.8);
}

.dark .list-item:hover {
    background: rgba(255,255,255,0.1);
}

.list-preview {
    width: 50px;
    height: 50px;
    border-radius: 6px;
    overflow: hidden;
    margin-right: 15px;
    background: rgba(0,0,0,0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.dark .list-preview {
    background: rgba(255,255,255,0.05);
}

.list-preview img, .list-preview video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.file-icon-wrapper-small {
    font-size: 24px;
    color: var(--upload-list-file-icon-color);
}

.list-info {
    flex: 1;
    min-width: 0;
    margin-right: 20px;
}

.file-url {
    font-size: 12px;
    color: var(--upload-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.8;
}

.list-meta {
    margin-right: 20px;
    text-align: right;
    min-width: 140px;
}

.list-actions {
    display: flex;
    gap: 5px;
}

.empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--upload-text-color);
    font-size: 18px;
    opacity: 0.6;
}

.empty-icon {
    font-size: 64px;
    margin-bottom: 20px;
}

/* Scrollbar styling */
.history-content::-webkit-scrollbar {
    width: 8px;
}
.history-content::-webkit-scrollbar-track {
    background: transparent;
}
.history-content::-webkit-scrollbar-thumb {
    background: rgba(0,0,0,0.2);
    border-radius: 4px;
}
.history-content::-webkit-scrollbar-thumb:hover {
    background: rgba(0,0,0,0.3);
}
.dark .history-content::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.2);
}
.dark .history-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.3);
}

.action-btn-view {
    background-color: #f5f7fa;
    border-color: #dcdfe6;
    color: #606266;
}
.action-btn-view:hover {
    background-color: #e6e8eb;
    color: #409eff;
}

.dark .action-btn-view {
    background-color: rgba(255, 255, 255, 0.4);
    border-color: transparent;
    color: #fff;
}
.dark .action-btn-view:hover {
    background-color: rgba(255, 255, 255, 0.8);
}

.history-group {
    position: relative;
    padding-left: 30px;
    border-left: 2px solid rgba(0,0,0,0.1);
    margin-left: 10px;
    padding-bottom: 30px;
}

.dark .history-group {
    border-left: 2px solid rgba(255,255,255,0.1);
}

.history-group:last-child {
    border-left: 2px solid transparent;
}

.timeline-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    position: relative;
}

.timeline-dot {
    position: absolute;
    left: -38px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 3px solid var(--theme-toggle-color);
    background: #fff;
    z-index: 2;
    box-sizing: border-box;
}

.dark .timeline-dot {
    background: #1a1a1a;
}

.date-label {
    font-size: 20px;
    font-weight: bold;
    color: var(--upload-header-color);
}
</style>
