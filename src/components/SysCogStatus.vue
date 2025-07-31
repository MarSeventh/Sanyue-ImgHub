<template>
  <div class="status-panel" v-loading="loading">
    <!-- 顶部概览卡片 -->
    <div class="overview-cards">
      <div class="overview-card total-files" @click="fetchIndexInfo">
        <div class="card-icon">
          <font-awesome-icon icon="database" />
        </div>
        <div class="card-content">
          <div class="card-title">文件总数</div>
          <div class="card-value">{{ indexInfo.totalFiles?.toLocaleString() || '0' }}</div>
          <div class="card-subtitle">点击刷新</div>
        </div>
      </div>

      <div class="overview-card index-status">
        <div class="card-icon">
          <font-awesome-icon icon="clock" />
        </div>
        <div class="card-content">
          <div class="card-title">索引更新时间</div>
          <div class="card-value">{{ formatTime(indexInfo.lastUpdated) }}</div>
          <div class="card-subtitle">{{ getTimeAgo(indexInfo.lastUpdated) }}</div>
        </div>
      </div>

      <div class="overview-card system-version">
        <div class="card-icon">
          <font-awesome-icon icon="code-branch" />
        </div>
        <div class="card-content">
          <div class="card-title">系统版本</div>
          <div class="card-value">v{{ version }}</div>
        </div>
      </div>
    </div>

    <!-- 统计图表区域 -->
    <div class="charts-section">
      <!-- 渠道统计 -->
      <div class="chart-card">
        <div class="chart-header">
          <font-awesome-icon icon="share-alt" />
          <span>上传渠道分布</span>
        </div>
        <div class="chart-content">
          <div v-if="Object.keys(indexInfo.channelStats || {}).length === 0" class="empty-state">
            <font-awesome-icon icon="inbox" />
            <span>暂无数据</span>
          </div>
          <div v-else class="stats-list">
            <div 
              v-for="(count, channel) in indexInfo.channelStats" 
              :key="channel"
              class="stats-item"
            >
              <div class="stats-label">{{ channel }}</div>
              <div class="stats-bar">
                <div 
                  class="stats-fill"
                  :style="{ width: getPercentage(count, indexInfo.totalFiles) + '%' }"
                ></div>
              </div>
              <div class="stats-value">{{ count.toLocaleString() }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 文件类型统计 -->
      <div class="chart-card">
        <div class="chart-header">
          <font-awesome-icon icon="file-alt" />
          <span>文件状态分布</span>
        </div>
        <div class="chart-content">
          <div v-if="Object.keys(indexInfo.typeStats || {}).length === 0" class="empty-state">
            <font-awesome-icon icon="inbox" />
            <span>暂无数据</span>
          </div>
          <div v-else class="stats-list">
            <div 
              v-for="(count, type) in indexInfo.typeStats" 
              :key="type"
              class="stats-item"
            >
              <div class="stats-label">{{ type || '未知类型' }}</div>
              <div class="stats-bar">
                <div 
                  class="stats-fill type-fill"
                  :style="{ width: getPercentage(count, indexInfo.totalFiles) + '%' }"
                ></div>
              </div>
              <div class="stats-value">{{ count.toLocaleString() }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作区域 -->
    <div class="actions-section">
      <div class="action-card">
        <div class="action-header">
          <font-awesome-icon icon="tools" />
          <span>系统维护</span>
        </div>
        <div class="action-content">
          <div class="action-buttons">
            <el-tooltip content="重新扫描所有文件并更新索引数据，适用于数据不一致时的修复" placement="top">
              <el-button 
                type="primary" 
                :loading="rebuilding"
                @click="rebuildIndex"
                class="action-btn rebuild-btn"
              >
                <font-awesome-icon icon="sync-alt" />
                {{ rebuilding ? '重建中...' : '重建索引' }}
              </el-button>
            </el-tooltip>

            <el-tooltip content="备份所有文件元数据和系统设置到JSON文件" placement="top">
              <el-button 
                type="success" 
                :loading="backing"
                @click="backupData"
                class="action-btn backup-btn"
              >
                <font-awesome-icon icon="download" />
                {{ backing ? '备份中...' : '备份数据' }}
              </el-button>
            </el-tooltip>

            <el-tooltip content="从备份文件恢复数据，将覆盖现有的文件元数据和系统设置" placement="top">
              <div class="restore-section">
                <input 
                  type="file" 
                  ref="fileInput" 
                  accept=".json"
                  @change="handleFileSelect"
                  style="display: none"
                />
                <el-button 
                  type="warning" 
                  :loading="restoring"
                  @click="selectRestoreFile"
                  class="action-btn restore-btn"
                >
                  <font-awesome-icon icon="upload" />
                  {{ restoring ? '恢复中...' : '恢复数据' }}
                </el-button>
              </div>
            </el-tooltip>
          </div>
        </div>
      </div>
    </div>

    <!-- 最新/最旧文件信息 -->
    <div class="file-info-section" v-if="indexInfo.newestFile || indexInfo.oldestFile">
      <div class="file-info-card" v-if="indexInfo.newestFile">
        <div class="file-info-header">
          <font-awesome-icon icon="arrow-up" />
          <span>最近上传</span>
        </div>
        <div class="file-info-content">
          <div class="file-name">{{ indexInfo.newestFile.metadata?.FileName || indexInfo.newestFile.id }}</div>
          <div class="file-meta">{{ formatTime(indexInfo.newestFile.metadata?.TimeStamp) }}</div>
        </div>
      </div>

      <div class="file-info-card" v-if="indexInfo.oldestFile">
        <div class="file-info-header">
          <font-awesome-icon icon="arrow-down" />
          <span>最早上传</span>
        </div>
        <div class="file-info-content">
          <div class="file-name">{{ indexInfo.oldestFile.metadata?.FileName || indexInfo.oldestFile.id }}</div>
          <div class="file-meta">{{ formatTime(indexInfo.oldestFile.metadata?.TimeStamp) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import fetchWithAuth from '@/utils/fetchWithAuth'
import packageInfo from '../../package.json'

export default {
  name: 'SysCogStatus',
  data() {
    return {
      loading: false,
      rebuilding: false,
      backing: false,
      restoring: false,
      indexInfo: {},
      version: packageInfo.version // 从package.json获取版本号
    }
  },
  mounted() {
    this.fetchIndexInfo()
  },
  methods: {
    // 获取索引信息
    async fetchIndexInfo() {
      this.loading = true
      try {
        const response = await fetchWithAuth('/api/manage/list?action=info', {
          method: 'GET'
        })
        
        if (response.ok) {
          const data = await response.json()
          this.indexInfo = data
        } else {
          throw new Error('API请求失败')
        }
      } catch (error) {
        console.error('获取索引信息失败:', error)
        this.$message.error('获取索引信息失败')
      } finally {
        this.loading = false
      }
    },

    // 重建索引
    async rebuildIndex() {
      this.rebuilding = true
      try {
        const response = await fetchWithAuth('/api/manage/list?action=rebuild', {
          method: 'GET'
        })
        
        if (response.ok) {
          this.$message.success('索引重建已启动，请稍后刷新查看最新状态')
          // 延迟刷新数据
          setTimeout(() => {
            this.fetchIndexInfo()
          }, 3000)
        } else {
          throw new Error('API请求失败')
        }
      } catch (error) {
        console.error('重建索引失败:', error)
        this.$message.error('重建索引失败')
      } finally {
        this.rebuilding = false
      }
    },

    // 备份数据
    async backupData() {
      this.backing = true
      try {
        const response = await fetchWithAuth('/api/manage/sysConfig/backup?action=backup', {
          method: 'GET'
        })
        
        if (response.ok) {
          // 创建下载链接
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `imgbed_backup_${new Date().toISOString().split('T')[0]}.json`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)
          
          this.$message.success('备份文件已下载')
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'API请求失败')
        }
      } catch (error) {
        console.error('备份数据失败:', error)
        this.$message.error('备份数据失败: ' + error.message)
      } finally {
        this.backing = false
      }
    },

    // 选择恢复文件
    selectRestoreFile() {
      if (this.restoring) return
      this.$refs.fileInput.click()
    },

    // 处理文件选择
    async handleFileSelect(event) {
      const file = event.target.files[0]
      if (!file) return

      if (!file.name.endsWith('.json')) {
        this.$message.error('请选择JSON格式的备份文件')
        return
      }

      // 确认恢复操作
      try {
        await this.$confirm(
          '恢复操作将覆盖现有的文件元数据和系统设置，此操作不可逆。确定要继续吗？',
          '确认恢复',
          {
            confirmButtonText: '确定恢复',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        await this.restoreData(file)
      } catch (error) {
        if (error !== 'cancel') {
          console.error('确认恢复失败:', error)
        }
      }
      
      // 清除文件选择
      event.target.value = ''
    },

    // 恢复数据
    async restoreData(file) {
      this.restoring = true
      try {
        const response = await fetchWithAuth('/api/manage/sysConfig/backup?action=restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: await file.text()
        })
        
        if (response.ok) {
          const result = await response.json()
          this.$message.success(
            `恢复完成！已恢复 ${result.stats.restoredFiles} 个文件和 ${result.stats.restoredSettings} 个设置项`
          )
          // 刷新索引信息
          setTimeout(() => {
            this.fetchIndexInfo()
          }, 1000)
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'API请求失败')
        }
      } catch (error) {
        console.error('恢复数据失败:', error)
        this.$message.error('恢复数据失败: ' + error.message)
      } finally {
        this.restoring = false
      }
    },

    // 格式化时间
    formatTime(timestamp) {
      if (!timestamp) return '未知'
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    // 计算百分比
    getPercentage(value, total) {
      if (!total || total === 0) return 0
      return Math.round((value / total) * 100)
    },

    // 计算时间差
    getTimeAgo(timestamp) {
      if (!timestamp) return ''
      const now = Date.now()
      const diff = now - timestamp
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      
      if (days > 0) return `${days}天前`
      if (hours > 0) return `${hours}小时前`
      if (minutes > 0) return `${minutes}分钟前`
      return '刚刚'
    }
  }
}
</script>

<style scoped>
.status-panel {
  padding: 20px;
  background: transparent;
  min-height: 100vh;
}

/* 概览卡片 */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.overview-card {
  background: var(--admin-dashborad-stats-bg-color);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  box-shadow: var(--admin-dashboard-stats-shadow);
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--admin-dashboard-stats-hover-shadow);
  background: var(--admin-dashborad-stats-hover-bg-color);
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 20px;
  background: linear-gradient(135deg, var(--admin-purple), #E1BEE7);
  color: white;
}

.card-content {
  flex: 1;
}

.card-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--admin-container-color);
  line-height: 1;
}

.card-subtitle {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  opacity: 0.8;
}

/* 图表区域 */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart-card {
  background: var(--admin-dashborad-stats-bg-color);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--admin-dashboard-stats-shadow);
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.chart-card:hover {
  box-shadow: var(--admin-dashboard-stats-hover-shadow);
}

.chart-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: 600;
  color: var(--admin-container-color);
}

.chart-header .fa-icon {
  margin-right: 10px;
  color: var(--admin-purple);
}

.chart-content {
  min-height: 160px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 160px;
  color: #999;
  font-size: 14px;
}

.empty-state .fa-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stats-label {
  min-width: 80px;
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.stats-bar {
  flex: 1;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.stats-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--admin-purple), #E1BEE7);
  border-radius: 4px;
  transition: width 0.6s ease;
}

.type-fill {
  background: linear-gradient(90deg, #4CAF50, #81C784);
}

.stats-value {
  min-width: 50px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: var(--admin-container-color);
}

/* 操作区域 */
.actions-section {
  margin-bottom: 30px;
}

.action-card {
  background: var(--admin-dashborad-stats-bg-color);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--admin-dashboard-stats-shadow);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
  font-size: 16px;
  font-weight: 600;
  color: var(--admin-container-color);
}

.action-header .fa-icon {
  margin-right: 10px;
  color: var(--admin-purple);
}

.action-content {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.action-buttons {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.action-btn {
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  margin-left: 0;
  font-weight: 600;
  transition: all 0.3s ease;
  min-width: 140px;
  height: 48px;
}

.action-btn:hover {
  transform: translateY(-2px);
}

.action-btn .fa-icon {
  margin-right: 8px;
}

.rebuild-btn {
  background: linear-gradient(135deg, var(--admin-purple), #E1BEE7);
}

.rebuild-btn:hover {
  box-shadow: 0 6px 16px rgba(179, 157, 219, 0.4);
}

.backup-btn {
  background: linear-gradient(135deg, #4CAF50, #81C784);
}

.backup-btn:hover {
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
}

.restore-btn {
  background: linear-gradient(135deg, #FF9800, #FFB74D);
}

.restore-btn:hover {
  box-shadow: 0 6px 16px rgba(255, 152, 0, 0.4);
}

.restore-section {
  display: inline-block;
}

/* 文件信息区域 */
.file-info-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.file-info-card {
  background: var(--admin-dashborad-stats-bg-color);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--admin-dashboard-stats-shadow);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.file-info-card:hover {
  box-shadow: var(--admin-dashboard-stats-hover-shadow);
}

.file-info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--admin-container-color);
}

.file-info-header .fa-icon {
  margin-right: 8px;
  color: var(--admin-purple);
}

.file-info-content {
  padding-left: 22px;
}

.file-name {
  font-size: 13px;
  color: var(--admin-container-color);
  margin-bottom: 4px;
  word-break: break-all;
  line-height: 1.4;
}

.file-meta {
  font-size: 12px;
  color: #999;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .status-panel {
    padding: 15px;
  }
  
  .overview-cards {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .charts-section {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .file-info-section {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .card-icon {
    width: 50px;
    height: 50px;
    font-size: 20px;
    margin-right: 15px;
  }
  
  .card-value {
    font-size: 24px;
  }

  .action-buttons {
    flex-direction: column;
    gap: 12px;
  }

  .action-btn {
    width: 100%;
    min-width: unset;
  }
}

/* 加载动画 */
.stats-fill {
  animation: fillAnimation 1s ease-out;
}

@keyframes fillAnimation {
  from {
    width: 0;
  }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .card-title {
    color: #aaa;
  }
  
  .file-meta {
    color: #aaa;
  }
  
  .stats-label {
    color: #aaa;
  }
  
  .empty-state {
    color: #666;
  }
}
</style>