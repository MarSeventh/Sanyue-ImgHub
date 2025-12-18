<template>
    <div class="upload-form">
        <el-upload
            v-if="uploadMethod === 'default'"
            class="upload-card"
            :class="{'is-uploading': uploading, 'upload-card-busy': fileList.length}"
            drag
            multiple
            :http-request="uploadFile"
            :onSuccess="handleSuccess"
            :on-error="handleError"
            :before-upload="beforeUpload"
            :on-progress="handleProgress"
            :file-list="fileList"
            :show-file-list="false"
            >
            <el-icon class="el-icon--upload" :class="{'upload-list-busy': fileList.length}">
                <CameraFilled/>
            </el-icon>
            <div class="el-upload__text" :class="{'upload-list-busy': fileList.length}"><em>拖拽</em> <em>点击</em> 或 <em>Ctrl + V</em> 粘贴上传</div>
        </el-upload>
        <div v-else-if="uploadMethod === 'paste'" class="upload-card">
            <el-card 
                class="paste-card"
                :class="{'is-uploading': uploading, 'upload-card-busy': fileList.length}"
            >
                <el-input
                    v-model="pastedUrls"
                    class="upload-card-textarea"
                    placeholder="粘贴外链上传，多个外链用换行分隔"
                    type="textarea"
                    :rows="fileList.length ? 3 : 10"
                />
                <div class="paste-card-actions">
                    <el-button
                        class="paste-card-upload-button"
                        type="primary"
                        :size="pasteCardMethodButtonSize"
                        @click="handleUploadPasteUrls"
                    >
                        上 传
                    </el-button>
                    <el-radio-group 
                        v-model="pasteUploadMethod" 
                        class="paste-card-method-group"
                        :size="pasteCardMethodButtonSize"
                    >
                        <el-radio-button label="save">转存</el-radio-button>
                        <el-radio-button label="external">外链</el-radio-button>
                    </el-radio-group>
                </div>
            </el-card>
        </div>
        <el-card class="upload-list-card" :class="{'upload-list-busy': fileList.length}">
            <div class="upload-list-container" :class="{'upload-list-busy': fileList.length}">
                <el-scrollbar @scroll="handleScroll" ref="scrollContainer">
                    <div class="upload-list-dashboard" :class="{ 'list-scrolled': listScrolled }">
                        <el-text class="upload-list-dashboard-title">
                            <el-icon><List /></el-icon>{{ uploadingCount + waitingCount }}
                            <el-icon><Checked /></el-icon>{{ uploadSuccessCount }}
                            <el-icon><Failed /></el-icon>{{ uploadErrorCount }}
                        </el-text>
                        <div class="upload-list-dashboard-action">
                            <el-button-group>
                                <el-tooltip :disabled="disableTooltip" content="整体复制" placement="top">
                                    <el-button type="primary" round @click="copyAll" alt="整体复制">
                                        <font-awesome-icon icon="copy" />
                                    </el-button>
                                </el-tooltip>
                                <el-tooltip :disabled="disableTooltip" content="失败重试" placement="top">
                                    <el-dropdown>
                                        <el-button type="primary" style="outline: none; border-right: none; border-radius: 0;" @click="retryError">
                                            <font-awesome-icon icon="redo" />
                                        </el-button>
                                        <template #dropdown>
                                            <el-dropdown-menu>
                                                <el-dropdown-item>
                                                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                                                        <span style="margin-right: 10px;">自动重试</span>
                                                        <el-switch v-model="autoReUpload" @change="handleAutoRetryChange" size="small" />
                                                    </div>
                                                </el-dropdown-item>
                                            </el-dropdown-menu>
                                        </template>
                                    </el-dropdown>
                                </el-tooltip>
                                <el-tooltip :disabled="disableTooltip" content="清空列表" placement="top" style="border: none;">
                                    <el-dropdown>
                                        <el-button type="primary" round style="outline: none; border-right: none;">
                                            <font-awesome-icon icon="trash-alt" />
                                        </el-button>
                                        <template #dropdown>
                                            <el-dropdown-menu>
                                                <el-dropdown-item @click="clearFileList">清空全部</el-dropdown-item>
                                                <el-dropdown-item @click="clearSuccessList">清空已上传</el-dropdown-item>
                                            </el-dropdown-menu>
                                        </template>
                                    </el-dropdown>
                                </el-tooltip>
                            </el-button-group>
                        </div>
                    </div>
                    <div class="upload-list-item" v-for="file in fileList.slice().reverse()" :key="file.name" :span="8">
                        <a :href="file.url" target="_blank" class="upload-list-item-preview">
                            <!-- 判断文件类型是否为视频 -->
                            <video
                                v-if="isVideo(file.name)"
                                style="width: 10vw; border-radius: 12px;"
                                autoplay
                                muted
                                playsinline
                                loop
                            >
                                <source :src="file.url" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                            <!-- 判断文件类型是否为图片 -->
                            <img
                                v-else-if="isImage(file.name)"
                                style="width: 10vw; border-radius: 12px;"
                                :src="file.url"
                                @error="file.url = require('@/assets/404.png')"
                            />
                            <!-- 其他文件类型 -->
                            <div v-else style="width: 10vw; border-radius: 12px;">
                                <font-awesome-icon icon="file" class="file-icon"></font-awesome-icon>
                            </div>
                        </a>
                        <div class="upload-list-item-content">
                            <el-text class="upload-list-item-name" truncated>{{ file.name }}</el-text>
                            <div class="upload-list-item-url" v-if="file.status==='done'">
                                <div class="upload-list-item-url-row">
                                    <el-input v-model="file.finalURL" readonly @click="selectAllText" :size="urlSize">
                                        <template #prepend>URL</template>
                                    </el-input>
                                    <el-input v-model="file.mdURL" readonly @click="selectAllText" :size="urlSize">
                                        <template #prepend>MarkDown</template>
                                    </el-input>
                                </div>
                                <div class="upload-list-item-url-row">
                                    <el-input v-model="file.htmlURL" readonly @click="selectAllText" :size="urlSize">
                                        <template #prepend>HTML</template>
                                    </el-input>
                                    <el-input v-model="file.ubbURL" readonly @click="selectAllText" :size="urlSize">
                                        <template #prepend>BBCode</template>
                                    </el-input>
                                </div>
                            </div>
                            <div class="upload-list-item-progress" v-else>
                                <el-progress :percentage="file.progreess" :status="file.status" :show-text="false"/>
                            </div>
                        </div>
                        <div class="upload-list-item-action">
                                <el-button type="primary" circle class="upload-list-item-action-button" @click="handleCopy(file)">
                                    <el-icon><Link /></el-icon>
                                </el-button>
                                <el-button type="danger" circle class="upload-list-item-action-button" @click="handleRemove(file)">
                                    <el-icon><Delete /></el-icon>
                                </el-button>
                        </div>
                    </div>
                </el-scrollbar>
            </div>
        </el-card>
    </div>
</template>

<script>
import axios from '@/utils/axios'
import * as imageConversion from 'image-conversion'
import { mapGetters } from 'vuex'

export default {
name: 'UploadForm',
props: {
    selectedUrlForm: {
        type: String,
        default: 'url',
        required: false
    },
    customerCompress: {
        type: Boolean,
        default: true,
        required: false
    },
    compressQuality: {
        type: Number,
        default: 4,
        required: false
    },
    compressBar: {
        type: Number,
        default: 5,
        required: false
    },
    serverCompress: {
        type: Boolean,
        default: true,
        required: false
    },
    uploadChannel: {
        type: String,
        default: 'telegram',
        required: false
    },
    uploadNameType: {
        type: String,
        default: 'default',
        required: false
    },
    useCustomUrl: {
        type: String,
        default: 'false',
        required: false
    },
    customUrlPrefix: {
        type: String,
        default: '',
        required: false
    },
    autoRetry: {
        type: Boolean,
        default: true,
        required: false
    },
    urlPrefix: {
        type: String,
        default: '',
        required: false
    },
    uploadMethod: {
        type: String,
        default: 'default',
        required: false
    },
    uploadFolder: {
        type: String,
        default: '',
        required: false
    }
},
data() {
    return {
        fileList: [],
        uploading: false,
        maxUploading: 6,
        waitingList: [],
        exceptionList: [],
        listScrolled: false,
        fileListLength: 0,
        uploadCount: 0,
        pastedUrls: '',
        pasteUploadMethod: 'save',
        // 失败文件自动重试相关
        autoReUpload: true,
        maxRetryCount: 10, // 最大重试次数
        retryTimer: null, // 自动重试定时器
        retryDelay: 12000, // 重试延迟时间（毫秒）
    }
},
watch: {
    fileList: {
        handler() {
            if (this.fileList.length > this.fileListLength) {
                this.$nextTick(() => {
                    setTimeout(() => {
                        if (this.$refs.scrollContainer) {
                            // this.$refs.scrollContainer.setScrollTop(this.$refs.scrollContainer.wrapRef.scrollHeight) // 滚动到底部
                            this.$refs.scrollContainer.setScrollTop(0) // 滚动到顶部
                        }
                    }, 100)
                })
            }
            this.fileListLength = this.fileList.length
        },
        deep: true
    },
    useCustomUrl: {
        handler() {
            if (this.useCustomUrl === 'true') {
                this.fileList.forEach(item => {
                    if (item.uploadChannel === 'external') {
                        return
                    }
                    item.finalURL = this.customUrlPrefix + item.srcID
                    item.mdURL = `![${item.name}](${this.customUrlPrefix + item.srcID})`
                    item.htmlURL = `<img src="${this.customUrlPrefix + item.srcID}" alt="${item.name}" width=100% />`
                    item.ubbURL = `[img]${this.customUrlPrefix + item.srcID}[/img]`
                })
            } else {
                this.fileList.forEach(item => {
                    if (item.uploadChannel === 'external') {
                        return
                    }
                    item.finalURL = this.rootUrl + item.srcID
                    item.mdURL = `![${item.name}](${this.rootUrl + item.srcID})`
                    item.htmlURL = `<img src="${this.rootUrl + item.srcID}" alt="${item.name}" width=100% />`
                    item.ubbURL = `[img]${this.rootUrl + item.srcID}[/img]`
                })
            }
        },
        immediate: true
    },
    customUrlPrefix: {
        handler() {
            if (this.useCustomUrl === 'true') {
                this.fileList.forEach(item => {
                    if (item.uploadChannel === 'external') {
                        return
                    }
                    item.finalURL = this.customUrlPrefix + item.srcID
                    item.mdURL = `![${item.name}](${this.customUrlPrefix + item.srcID})`
                    item.htmlURL = `<img src="${this.customUrlPrefix + item.srcID}" alt="${item.name}" width=100% />`
                    item.ubbURL = `[img]${this.customUrlPrefix + item.srcID}[/img]`
                })
            }
        },
        immediate: true
    },
    autoReUpload(val) {
        this.$store.commit('setStoreAutoReUpload', val)
    }
},
computed: {
    ...mapGetters([
        'storeAutoReUpload'
    ]),
    uploadSuccessCount() {
        return this.fileList.filter(item => item.status === 'done' || item.status === 'success').length
    },
    uploadErrorCount() {
        return this.fileList.filter(item => item.status === 'exception').length
    },
    uploadingCount() {
        return this.fileList.filter(item => item.status === 'uploading').length
    },
    waitingCount() {
        return this.waitingList.length
    },
    urlSize() {
        // 移动端为small
        return window.innerWidth < 768 ? 'small' : 'default'
    },
    disableTooltip() {
        return window.innerWidth < 768
    },
    rootUrl() {
        // 链接前缀，优先级：用户自定义 > urlPrefix > 默认
        return this.useCustomUrl === 'true' ? this.customUrlPrefix : this.urlPrefix || `${window.location.protocol}//${window.location.host}/file/`
    },
    pasteCardMethodButtonSize() {
        if (this.fileList.length) {
            return 'small'
        } else {
            return window.innerWidth < 768 ? 'small' : 'medium'
        }
    }
},
mounted() {
    document.addEventListener('paste', this.handlePaste)
    this.autoReUpload = this.storeAutoReUpload
},
beforeUnmount() {
    document.removeEventListener('paste', this.handlePaste)
    // 清理状态
    this.waitingList = []
    this.fileList = []
},
methods: {
    uploadFile(file) {
        // 如果fileList中不存在该文件，说明已被删除，直接返回
        if (!this.fileList.find(item => item.uid === file.file.uid)) {
            return
        }
        if (this.uploadingCount > this.maxUploading) {
            this.waitingList.push(file)
            this.fileList.find(item => item.uid === file.file.uid).status = 'waiting'
            return
        } else {
            this.fileList.find(item => item.uid === file.file.uid).status = 'uploading'
        }

        const uploadChannel = this.fileList.find(item => item.uid === file.file.uid).uploadChannel || this.uploadChannel

        // 如果上传渠道为外链，直接使用外链上传
        if (uploadChannel === 'external') {
            this.uploadSingleFile(file)
            return
        }

        // 其他渠道，检查文件大小，决定是否使用分块上传
        const CHUNK_THRESHOLD = 20 * 1024 * 1024 // 20MB
        if (file.file.size > CHUNK_THRESHOLD) {
            this.uploadFileInChunks(file)
        } else {
            this.uploadSingleFile(file)
        }
    },
    // 单文件上传
    uploadSingleFile(file) {
        const needServerCompress = this.fileList.find(item => item.uid === file.file.uid).serverCompress
        const uploadChannel = this.fileList.find(item => item.uid === file.file.uid).uploadChannel || this.uploadChannel
        const autoRetry = this.autoRetry && uploadChannel !== 'external'
        const uploadNameType = uploadChannel === 'external' ? 'default' : this.uploadNameType
        
        const formData = new FormData()
        formData.append('file', file.file)
        if (uploadChannel === 'external') {
            formData.append('url', file.file.url)
        }

        axios({
            url: '/upload' + 
                '?serverCompress=' + needServerCompress + 
                '&uploadChannel=' + uploadChannel + 
                '&uploadNameType=' + uploadNameType + 
                '&autoRetry=' + autoRetry + 
                '&uploadFolder=' + this.uploadFolder,
            method: 'post',
            data: formData,
            withAuthCode: true,
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded / progressEvent.total) * 100)
                file.onProgress({ percent: percentCompleted, file: file.file })
            }
        }).then(res => {
            file.onSuccess(res, file.file)
        }).catch(err => {
            if (err.response && err.response.status !== 401) {
                this.exceptionList.push(file)
                file.onError(err, file.file)
            }
        }).finally(() => {
            if (this.uploadingCount + this.waitingCount === 0) {
                this.uploading = false
            }
        })
    },
    // 分块上传
    async uploadFileInChunks(file) {
        const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB
        const fileSize = file.file.size
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)
        
        const needServerCompress = this.fileList.find(item => item.uid === file.file.uid).serverCompress
        const uploadChannel = this.fileList.find(item => item.uid === file.file.uid).uploadChannel || this.uploadChannel
        const autoRetry = this.autoRetry && uploadChannel !== 'external'
        const uploadNameType = uploadChannel === 'external' ? 'default' : this.uploadNameType

        try {
            // 第一步：初始化分块上传，获取uploadId
            const initFormData = new FormData()
            initFormData.append('originalFileName', file.file.name)
            initFormData.append('originalFileType', file.file.type)
            initFormData.append('totalChunks', totalChunks.toString())

            const initResponse = await axios({
                url: '/upload' + 
                    '?serverCompress=' + needServerCompress + 
                    '&uploadChannel=' + uploadChannel + 
                    '&uploadNameType=' + uploadNameType + 
                    '&autoRetry=' + autoRetry + 
                    '&uploadFolder=' + this.uploadFolder +
                    '&initChunked=true',
                method: 'post',
                data: initFormData,
                withAuthCode: true
            })

            if (!initResponse.data.success) {
                throw new Error('初始化分块上传失败: ' + initResponse.data.message)
            }

            const uploadId = initResponse.data.uploadId
            console.log('分块上传初始化成功，uploadId:', uploadId)

            // 记录 totalChunks 和 uploadId 到文件项，用于后续清理
            const fileItem = this.fileList.find(item => item.uid === file.file.uid)
            if (fileItem) {
                fileItem.totalChunks = totalChunks
                fileItem.uploadId = uploadId
            }

            // 第二步：并发上传所有分块
            const maxConcurrency = 3 // 最大并发数
            const chunkProgress = new Array(totalChunks).fill(0)
            let nextChunkIndex = 0
            let hasError = false
            let errorMsg = ''

            const uploadChunk = async (chunkIndex) => {
                if (hasError) return

                const start = chunkIndex * CHUNK_SIZE
                const end = Math.min(start + CHUNK_SIZE, fileSize)
                const chunk = file.file.slice(start, end)
                
                const formData = new FormData()
                formData.append('file', chunk, `${file.file.name}.part${chunkIndex.toString().padStart(3, '0')}`)
                formData.append('chunkIndex', chunkIndex.toString())
                formData.append('totalChunks', totalChunks.toString())
                formData.append('uploadId', uploadId)
                formData.append('originalFileName', file.file.name)
                formData.append('originalFileType', file.file.type)

                let retryCount = 0
                const maxRetries = 3

                while (retryCount < maxRetries) {
                    if (hasError) return
                    try {
                        await axios({
                            url: '/upload' + 
                                '?serverCompress=' + needServerCompress + 
                                '&uploadChannel=' + uploadChannel + 
                                '&uploadNameType=' + uploadNameType + 
                                '&autoRetry=' + autoRetry + 
                                '&uploadFolder=' + this.uploadFolder +
                                '&chunked=true',
                            method: 'post',
                            data: formData,
                            withAuthCode: true,
                            onUploadProgress: (progressEvent) => {
                                if (hasError) return
                                const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
                                chunkProgress[chunkIndex] = percent
                                const totalPercent = Math.round(chunkProgress.reduce((a, b) => a + b, 0) / totalChunks)
                                file.onProgress({ percent: totalPercent, file: file.file })
                            }
                        })
                        return // Success
                    } catch (err) {
                        retryCount++
                        console.warn(`分块 ${chunkIndex + 1}/${totalChunks} 上传失败 (重试 ${retryCount}/${maxRetries}):`, err)
                        if (retryCount >= maxRetries) {
                            hasError = true
                            errorMsg = `分块 ${chunkIndex + 1}/${totalChunks} 上传失败: ${err.message}`
                            throw new Error(errorMsg)
                        }
                        // 等待后重试
                        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount))
                    }
                }
            }

            // 创建并发池
            const pool = []
            for (let i = 0; i < maxConcurrency; i++) {
                pool.push((async () => {
                    while (nextChunkIndex < totalChunks && !hasError) {
                        const currentIndex = nextChunkIndex++
                        try {
                            await uploadChunk(currentIndex)
                        } catch (e) {
                            hasError = true
                            errorMsg = e.message
                            break
                        }
                    }
                })())
            }

            await Promise.all(pool)

            if (hasError) {
                throw new Error(errorMsg || '上传过程中发生错误')
            }

            // 第三步：所有分块上传完成，发送合并请求
            this.$message({
                type: 'info',
                message: '分块上传完成，正在合并文件，请耐心等待...',
                duration: 0 // 不自动关闭
            })

            const mergeFormData = new FormData()
            mergeFormData.append('uploadId', uploadId)
            mergeFormData.append('totalChunks', totalChunks.toString())
            mergeFormData.append('originalFileName', file.file.name)
            mergeFormData.append('originalFileType', file.file.type)

            const response = await axios({
                url: '/upload' + 
                    '?serverCompress=' + needServerCompress + 
                    '&uploadChannel=' + uploadChannel + 
                    '&uploadNameType=' + uploadNameType + 
                    '&autoRetry=' + autoRetry + 
                    '&uploadFolder=' + this.uploadFolder +
                    '&chunked=true&merge=true',
                method: 'post',
                data: mergeFormData,
                withAuthCode: true
            })
            
            // 关闭提示
            this.$message.closeAll()

            // 同步处理完成
            file.onSuccess(response, file.file)
        } catch (err) {
            console.error('分块上传失败:', err)
            
            // 如果有uploadId，清理相关资源
            const fileItem = this.fileList.find(item => item.uid === file.file.uid)
            if (fileItem && fileItem.uploadId) {
                this.cleanupUploadResources(fileItem.uploadId, fileItem.totalChunks)
                    .then(() => {
                        console.log(`已清理分块上传失败的资源: ${fileItem.uploadId}`)
                    })
                    .catch(cleanupError => {
                        console.warn('清理分块上传失败资源时出错:', cleanupError)
                    })
            }
            
            if (err.response && err.response.status !== 401) {
                this.exceptionList.push(file)
                file.onError(err, file.file)
            }
        } finally {
            if (this.uploadingCount + this.waitingCount === 0) {
                this.uploading = false
            }
        }
    },
    handleRemove(file) {
        this.fileList = this.fileList.filter(item => item.uid !== file.uid)
        this.$message({
            type: 'info',
            message: file.name + '已删除'
        })
    },

    // 清理上传资源
    async cleanupUploadResources(uploadId, totalChunks = 0) {
        try {
            await axios({
                url: `/upload?cleanup=true&uploadId=${uploadId}&totalChunks=${totalChunks}`,
                method: 'get',
                withAuthCode: true,
                timeout: 5000
            })
            console.log(`清理上传资源成功: ${uploadId}`)
        } catch (error) {
            console.warn('清理上传资源失败:', error)
        }
    },
    handleSuccess(response, file) {
        try {     
            // 对上传渠道为外链的，不修改链接
            const uploadChannel = this.fileList.find(item => item.uid === file.uid).uploadChannel || this.uploadChannel
            if (uploadChannel !== 'external') {
                // 从response.data[0].src中去除/file/前缀
                const srcID = response.data[0].src.replace('/file/', '')
                this.fileList.find(item => item.uid === file.uid).url = `${window.location.protocol}//${window.location.host}/file/` + srcID
                this.fileList.find(item => item.uid === file.uid).finalURL = this.rootUrl + srcID
                this.fileList.find(item => item.uid === file.uid).mdURL = `![${file.name}](${this.rootUrl + srcID})`
                this.fileList.find(item => item.uid === file.uid).htmlURL = `<img src="${this.rootUrl + srcID}" alt="${file.name}" width=100% />`
                this.fileList.find(item => item.uid === file.uid).ubbURL = `[img]${this.rootUrl + srcID}[/img]`
                this.fileList.find(item => item.uid === file.uid).srcID = srcID
            }
            this.fileList.find(item => item.uid === file.uid).progreess = 100
            this.fileList.find(item => item.uid === file.uid).status = 'success'
            
            // Save to history
            this.saveToHistory(this.fileList.find(item => item.uid === file.uid))

            this.$message({
                type: 'success',
                message: file.name + '上传成功'
            })
            setTimeout(() => {
                this.fileList.find(item => item.uid === file.uid).status = 'done'
            }, 1000)
        } catch (error) {
            this.$message.error(file.name + '上传失败')
            this.fileList.find(item => item.uid === file.uid).status = 'exception'
        } finally {
            if (this.uploadingCount + this.waitingCount === 0) {
                this.uploading = false
            }
            if (this.waitingList.length) {
                const file = this.waitingList.shift()
                this.uploadFile(file)
            }
        }
    },
    saveToHistory(fileItem) {
        try {
            const history = JSON.parse(localStorage.getItem('uploadHistory') || '[]')
            const newRecord = {
                name: fileItem.name,
                url: fileItem.finalURL,
                time: Date.now(),
                type: fileItem.name.split('.').pop().toLowerCase()
            }
            history.push(newRecord)
            localStorage.setItem('uploadHistory', JSON.stringify(history))
        } catch (e) {
            console.error('Failed to save history', e)
        }
    },
    handleError(err, file) {
        this.$message.error(file.name + '上传失败')
        this.fileList.find(item => item.uid === file.uid).status = 'exception'
        
        // 如果开启了自动重试，安排自动重试
        if (this.autoReUpload) {
            this.scheduleAutoRetry();
        }
        
        if (this.waitingList.length) {
            const file = this.waitingList.shift()
            this.uploadFile(file)
        }
        if (this.uploadingCount + this.waitingCount === 0) {
            this.uploading = false
        }
    },
    handleCopy(file) {
        const status = this.fileList.find(item => item.uid === file.uid).status
        if (status !== 'done' && status !== 'success') {
            this.$message({
                type: 'warning',
                message: '文件未上传成功，无法复制链接'
            })
            return
        }
        if (this.selectedUrlForm === 'url') {
            navigator.clipboard.writeText(file.finalURL)
        } else if (this.selectedUrlForm === 'md') {
            navigator.clipboard.writeText(file.mdURL)
        } else if (this.selectedUrlForm === 'html') {
            navigator.clipboard.writeText(file.htmlURL)
        } else if (this.selectedUrlForm === 'ubb') {
            navigator.clipboard.writeText(file.ubbURL)
        } else {
            navigator.clipboard.writeText(file.finalURL)
        }
        this.$message({
            type: 'success',
            message: '复制成功'
        })
    },
    beforeUpload(file) {
        return new Promise((resolve, reject) => {
            // 客户端压缩条件：1.文件类型为图片 2.开启客户端压缩，且文件大小大于压缩阈值
            const needCustomCompress = file.type.includes('image') && this.customerCompress && file.size / 1024 / 1024 > this.compressBar
            const isLtLim = file.size / 1024 / 1024 <= 1024 || this.uploadChannel !== 'telegram'

            const pushFileToQueue = (file, serverCompress) => {
                const fileUrl = URL.createObjectURL(file)
                this.fileList.push({
                    uid: file.uid,
                    name: file.name,
                    url: fileUrl,
                    finalURL: '',
                    mdURL: '',
                    htmlURL: '',
                    ubbURL: '',
                    srcID: '',
                    status: 'uploading',
                    progreess: 0,
                    serverCompress: serverCompress,
                    retryCount: 0,
                })
                resolve(file)
            }

            if (needCustomCompress) {
                //尝试压缩图片
                imageConversion.compressAccurately(file, 1024 * this.compressQuality).then((res) => {
                    //如果压缩后大于1024MB，且上传渠道为telegram，则不上传
                    if (res.size / 1024 / 1024 > 1024 && this.uploadChannel === 'telegram') {
                        this.$message.error(file.name + '压缩后文件过大，无法上传!')
                        reject('文件过大')
                    }
                    this.uploading = true
                    //将res包装成新的file
                    const newFile = new File([res], file.name, { type: res.type })
                    newFile.uid = file.uid
                    
                    const myUploadCount = this.uploadCount++

                    //开启服务端压缩条件：1.开启服务端压缩 2.文件大小小于10MB 3.上传渠道为Telegram
                    const needServerCompress = this.serverCompress && newFile.size / 1024 / 1024 < 10 && this.uploadChannel === 'telegram'

                    if (myUploadCount === 0) {
                        pushFileToQueue(newFile, needServerCompress)
                    } else {
                        setTimeout(() => {
                            pushFileToQueue(newFile, needServerCompress)
                            this.uploadCount--
                        }, 300 * myUploadCount)
                    }
                }).catch((err) => {
                    this.$message.error(file.name + '压缩失败，无法上传!')
                    reject(err)
                })
            } else if (isLtLim) {
                this.uploading = true
                
                const myUploadCount = this.uploadCount++

                // 开启服务端压缩条件：1.上传渠道为Telegram 2.开启服务端压缩 3.如果为图片，则文件大小小于10MB，否则不限制大小
                const needServerCompress = this.uploadChannel === 'telegram' && this.serverCompress && (file.type.includes('image') ? file.size / 1024 / 1024 < 10 : true)

                if (myUploadCount === 0) {
                    pushFileToQueue(file, needServerCompress)
                } else {
                    setTimeout(() => {
                        pushFileToQueue(file, needServerCompress)
                        this.uploadCount--
                    }, 300 * myUploadCount)
                }
            } else {
                this.$message.error(file.name + '文件过大，无法上传!')
                reject('文件过大')
            }
        })
    },
    handleProgress(event) {
        this.fileList.find(item => item.uid === event.file.uid).progreess = event.percent
    },
    copyAll() {
        if (this.selectedUrlForm === 'url') {
            const urls = this.fileList.map(item => {
                if (item.status === 'done' || item.status === 'success') {
                    return item.finalURL
                }
            }).join('\n')
            navigator.clipboard.writeText(urls)
        } else if (this.selectedUrlForm === 'md') {
            const urls = this.fileList.map(item => {
                if (item.status === 'done' || item.status === 'success') {
                    return item.mdURL
                }
            }).join('\n')
            navigator.clipboard.writeText(urls)
        } else if (this.selectedUrlForm === 'html') {
            const urls = this.fileList.map(item => {
                if (item.status === 'done' || item.status === 'success') {
                    return item.htmlURL
                }
            }).join('\n')
            navigator.clipboard.writeText(urls)
        } else if (this.selectedUrlForm === 'ubb') {
            const urls = this.fileList.map(item => {
                if (item.status === 'done' || item.status === 'success') {
                    return item.ubbURL
                }
            }).join('\n')
            navigator.clipboard.writeText(urls)
        } else {
            const urls = this.fileList.map(item => {
                if (item.status === 'done' || item.status === 'success') {
                    return item.finalURL
                }
            }).join('\n')
            navigator.clipboard.writeText(urls)
        }
        this.$message({
            type: 'success',
            message: '整体复制成功'
        })
    },
    clearFileList() {
        if (this.fileList.length > 0) {
            this.fileList = []
            this.$message({
                type: 'success',
                message: '文件列表已清空'
            })
        } else {
            this.$message({
                type: 'info',
                message: '文件列表为空'
            })
        }
    },
    clearSuccessList() {
        if (this.uploadSuccessCount > 0) {
            this.fileList = this.fileList.filter(item => item.status !== 'done' && item.status !== 'success')
            this.$message({
                type: 'success',
                message: '成功上传文件已清空'
            })
        } else {
            this.$message({
                type: 'info',
                message: '成功上传文件为空'
            })
        }
    },
    handlePaste(event) {
        // 当粘贴位置是文本框时，不执行该操作
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return
        }
        const items = event.clipboardData.items
        if (items.length > 0) {
            this.uploadFromUrl(items)
        }
    },
    handleUploadPasteUrls() {
        // 用于上传在上传文本框中粘贴的外链
        const urls = this.pastedUrls.split('\n');
        // 处理空行和首尾空字符，链接须符合URL规范
        const validUrls = urls.map(url => url.trim()).
            filter(url => url !== '').
            filter(url => /^(https?:\/\/[^\s$.?#].[^\s]*)$/.test(url));

        // 根据粘贴上传方式进行上传
        if (this.pasteUploadMethod === 'save') {
            // 正常上传
            this.uploadFromUrl(validUrls.map(url => {
                return {
                    kind: 'string',
                    getAsString: (callback) => {
                        callback(url);
                    }
                }
            }));
        } else if (this.pasteUploadMethod === 'external') {
            // 仅保存外链，使用 external 渠道上传
            for (let i = 0; i < validUrls.length; i++) {
                const url = validUrls[i];
                const fileName = url.split('/').pop();
                const mdUrl = `![${fileName}](${url})`;
                const htmlUrl = `<img src="${url}" alt="${fileName}" width=100% />`;
                const ubbUrl = `[img]${url}[/img]`;
                // 将 url 作为文件内容，文件名为 URL 的最后一部分
                const file = new File([], url.split('/').pop(), { type: 'text/plain' });
                file.uid = Date.now() + i;
                file.url = url;
                this.fileList.push({
                    uid: file.uid,
                    name: file.name,
                    url: url,
                    finalURL: url,
                    mdURL: mdUrl,
                    htmlURL: htmlUrl,
                    ubbURL: ubbUrl,
                    srcID: url,
                    status: 'uploading',
                    progreess: 0,
                    serverCompress: false,
                    uploadChannel: 'external',
                    retryCount: 0,
                });
                // 上传
                this.uploadFile({ file: file, 
                    onProgress: (evt) => this.handleProgress(evt), 
                    onSuccess: (response, file) => this.handleSuccess(response, file), 
                    onError: (error, file) => this.handleError(error, file) });
            }
        }
    },
    uploadFromUrl(items) {
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const file = items[i].getAsFile()
                // 判断文件类型是否为图片或视频
                if (file.type.includes('image') || file.type.includes('video')) {
                    file.uid = Date.now() + i
                    //接收beforeUpload的Promise对象
                    const checkResult = this.beforeUpload(file)
                    if (checkResult instanceof Promise) {
                        checkResult.then((newFile) => {
                            if (newFile instanceof File) {
                                this.uploadFile({ file: newFile, 
                                    onProgress: (evt) => this.handleProgress(evt), 
                                    onSuccess: (response, file) => this.handleSuccess(response, file), 
                                    onError: (error, file) => this.handleError(error, file) })
                            }
                        }).catch((err) => {
                            console.log(err)
                        })
                    }
                } else {
                    this.$message({
                        type: 'warning',
                        message: '粘贴板中的文件不是图片或视频'
                    })
                }
            } else if (items[i].kind === 'string') {
                items[i].getAsString((text) => {
                    const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/;
                    let fileName = '';
                    if (urlPattern.test(text)) {
                        axios.post('/api/fetchRes', { url: text }, {
                            responseType: 'blob'
                        }).then(response => {
                            const contentType = response.headers['content-type'];
                            if (response.status == 200 && (contentType.includes('image') || contentType.includes('video'))) {
                                // 提取文件名
                                const disposition = response.headers['content-disposition'];
                                if (disposition) {
                                    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                                    const filenameStarRegex = /filename\*\s*=\s*UTF-8''([^;\n]*)/; // 处理 filename*

                                    let matches = filenameRegex.exec(disposition);
                                    if (matches != null && matches[1]) {
                                        fileName = matches[1].replace(/['"]/g, '');
                                        // 尝试解码
                                        try {
                                            fileName = decodeURIComponent(fileName);
                                        } catch (e) {
                                            fileName = '';
                                        }
                                    } 
                                    if (fileName === '') {
                                        matches = filenameStarRegex.exec(disposition); // 尝试匹配 filename*
                                        if (matches != null && matches[1]) {
                                            fileName = decodeURIComponent(matches[1]);
                                        }
                                    }
                                }
                                // 尝试从URL中提取文件名
                                if (fileName === '') {
                                    const url = new URL(text);
                                    fileName = url.pathname.split('/').pop();
                                }
                                // 未提取到文件名，使用默认文件名
                                if (fileName === '') {
                                    // 获取文件后缀
                                    const url = new URL(text);
                                    let extension = url.pathname.split('.').pop();
                                    // 判断后缀是否有效
                                    if (!['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'mp4', 'webm', 'ogg', 'mkv'].includes(extension)) {
                                        extension = 'jpeg'; // 默认为jpeg
                                    }
                                    fileName = 'PastedFile' + Date.now() + i + '.' + extension;
                                }
                                
                                // 读取文件内容
                                const blob = response.data;
                                const file = new File([blob], fileName, { type: blob.type });
                                file.uid = Date.now() + i;
                                // 接收beforeUpload的Promise对象
                                const checkResult = this.beforeUpload(file);
                                if (checkResult instanceof Promise) {
                                    checkResult.then((newFile) => {
                                        if (newFile instanceof File) {
                                            this.uploadFile({ file: newFile, 
                                                onProgress: (evt) => this.handleProgress(evt), 
                                                onSuccess: (response, file) => this.handleSuccess(response, file), 
                                                onError: (error, file) => this.handleError(error, file) });
                                        }
                                    }).catch((err) => {
                                        console.log(err);
                                    });
                                }
                            } else {
                                throw new Error('URL地址的内容不是图片或视频');
                            }
                        })
                        .catch(error => {
                            this.$message({
                                type: 'warning',
                                message: '粘贴板中的URL地址的内容不是图片或视频'
                            });
                        });
                    }
                });
            }
        }
    },
    selectAllText(event) {
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
    // 判断是否为图片类型
    isImage(fileName) {
        const imageExtensions = [
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'ico', 'avif', 'heic',
            'jfif', 'pjpeg', 'pjp', 'raw', 'cr2', 'nef', 'dng', 'eps', 'ai', 'emf', 'wmf'
        ];
        const extension = fileName.split('.').pop().toLowerCase();
        return imageExtensions.includes(extension);
    },
    // 判断是否为视频类型
    isVideo(fileName) {
        const videoExtensions = ['mp4', 'webm', 'ogg', 'mkv'];
        const extension = fileName.split('.').pop().toLowerCase();
        return videoExtensions.includes(extension);
    },
    handleScroll(event) {
        this.listScrolled = event.scrollTop > 0 && this.fileList.length > 0
    },
    retryError() {
        if (this.exceptionList.length > 0) {
            this.retryFailedFiles(this.exceptionList);
            this.exceptionList = []
        } else {
            this.$message({
                type: 'info',
                message: '无上传失败文件'
            })
        }
    },
    handleAutoRetryChange(val) {
        this.$message({
            type: val ? 'success' : 'info',
            message: val ? '自动重试已开启' : '自动重试已关闭'
        });
        
        // 如果开启自动重试且有失败文件，立即开始重试
        if (val && this.exceptionList.length > 0) {
            this.scheduleAutoRetry();
        }
    },
    retryFailedFiles(files) {
        files.forEach(file => {
            const retryCount = file.retryCount || 0;
            if (retryCount < this.maxRetryCount) {
                file.retryCount = retryCount + 1;
                this.uploadFile({ 
                    file: file.file, 
                    onProgress: (evt) => this.handleProgress(evt), 
                    onSuccess: (response, file) => this.handleSuccess(response, file), 
                    onError: (error, file) => this.handleError(error, file) 
                });
            } else {
                this.$message({
                    type: 'warning',
                    message: `${file.name} 已达到最大重试次数(${this.maxRetryCount})，停止重试`
                });
            }
        });
    },
    scheduleAutoRetry() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
        }
        
        this.retryTimer = setTimeout(() => {
            if (this.autoReUpload && this.exceptionList.length > 0) {
                const filesToRetry = [...this.exceptionList];
                this.exceptionList = [];
                this.retryFailedFiles(filesToRetry);
            }
        }, this.retryDelay);
    },
},
beforeDestroy() {
    // 清理定时器
    if (this.retryTimer) {
        clearTimeout(this.retryTimer);
    }
}
}
</script>

<style scoped> 
@keyframes breathe {
    0%, 100% {
    }
    50% {
        box-shadow: var(--el-upload-dragger-hover-box-shadow);
        opacity: 0.8;
    }
}
.upload-form {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
.upload-list-card {
    width: 55vw;
    height: 7vh;
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 15px;
    background-color: var(--upload-list-card-bg-color);
    backdrop-filter: blur(10px);
    border: var(--upload-list-card-border);
    box-shadow: var(--upload-list-card-box-shadow) !important;
    transition: height 0.3s ease;
    overflow: hidden;
}
.upload-list-card :deep(.el-card__body) {
    padding: 0;
    width: 100%;
    overflow: hidden;
}
.upload-list-container {
    width: 55vw;
    height: 7vh;
    transition: height 0.3s ease;
    overflow: hidden;
}
@media (max-width: 768px) {
    .upload-list-card {
        width: 70vw;
    }
    .upload-list-container {
        width: 70vw;
    }
}
.upload-list-card.upload-list-busy {
    height: 40vh;
}
.upload-list-container.upload-list-busy {
    height: 40vh;
}
.upload-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 5px;
    border: var(--upload-list-item-border);
    padding: 5px;
    border-radius: 15px;
}
.upload-list-item-name {
    font-size: medium;
    font-weight: bold;
    width: 28vw;
    margin-bottom: 5px;
}
.upload-list-item-content {
    display: flex;
    flex-direction: column;
    margin-left: 10px;
}
.upload-list-item-url-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 38vw;
    gap: 8px;
    margin-bottom: 6px;
}
.upload-list-item-url-row:last-child {
    margin-bottom: 0;
}
.upload-list-item-url {
    display: flex;
    flex-direction: column;
}
.upload-list-item-progress {
    margin-top: 3px;
    width: 28vw;
}
@media (max-width: 768px) {
    .upload-list-item-name {
        width: 32vw;
        font-size: small;
    }
    .upload-list-item-content {
        margin-left: 2px;
    }
    .upload-list-item-url-row {
        width: 42vw;
        flex-direction: column;
        gap: 6px;
    }
    .upload-list-item-progress {
        width: 32vw;
    }
}
.upload-list-item-action {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.upload-list-item-action-button {
    margin: 2px;
}
.upload-card {
    width: 55vw;
    padding: 20px;
    background: none;
}
@media (max-width: 768px) {
    .upload-card {
        width: 70vw;
    }
}
.upload-card-busy :deep(.el-upload-dragger) {
    height: 17vh;
}
:deep(.el-upload-dragger)  {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 45vh;
    border-radius: 15px;
    border: var(--el-upload-dragger-border);
    opacity: 0.7;
    background-color: var(--el-upload-dragger-bg-color);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
}
:deep(.el-upload:focus .el-upload-dragger) {
    border-color: var(--el-upload-dragger-border-color);
}
:deep(.el-upload-dragger:hover) {
    opacity: 0.8;
    box-shadow: var(--el-upload-dragger-hover-box-shadow);
}
:deep(.el-upload-dragger.is-dragover) {
    opacity: 0.8;
    box-shadow: var(--el-upload-dragger-hover-box-shadow);
}
.is-uploading :deep(.el-upload-dragger){
    animation: breathe 3s infinite;
}
.el-upload__text {
    font-weight: bold;
    font-size: medium;
    user-select: none;
    transition: all 0.3s ease;
}
@media (max-width: 768px) {
    .el-upload__text {
        font-size: small;
    }
}
.el-upload__text.upload-list-busy {
    font-size: small;
}
.el-icon--upload {
    font-size: 100px;
    transition: font-size 0.3s ease;
    color: var(--el-icon--upload-color);
}
.el-icon--upload.upload-list-busy {
    font-size: 60px;
}
@media (max-width: 768px) {
    .el-icon--upload {
        font-size: 50px;
    }
    .el-icon--upload.upload-list-busy {
        font-size: 30px;
    }
}
.el-upload__tip {
    font-size: medium;
    color: var(--upload-text-color);
    user-select: none;
}
@media (max-width: 768px) {
    .el-upload__tip {
        font-size: small;
    }
}

.paste-card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 45vh;
    border-radius: 15px;
    border: var(--el-upload-dragger-border);
    box-shadow: none;
    opacity: 0.7;
    background-color: var(--el-upload-dragger-bg-color);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
    box-sizing: border-box;
}
.paste-card:hover {
    opacity: 0.8;
    box-shadow: var(--el-upload-dragger-hover-box-shadow);
}
.upload-card-busy.paste-card {
    height: 17vh;
}
.upload-card-textarea {
    width: 50vw;
    border-radius: 12px;
    background-color: var(--el-upload-dragger-bg-color);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
    box-sizing: border-box;
    display: flex;
}
:deep(.el-textarea__inner) {
    border-radius: 12px;
    background-color: var(--el-upload-dragger-bg-color);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
    resize: none;
}
:deep(.el-textarea__inner.is-focus) {
    border-color: var(--paste-card-textarea-border-color);
    box-shadow: var(--paste-card-textarea-box-shadow);
}
/* 修改滚动条的整体样式 */
.upload-card-textarea ::-webkit-scrollbar {
  width: 8px; /* 滚动条宽度 */
  height: 8px; /* 滚动条高度（水平滚动条） */
}
/* 修改滚动条的轨道样式 */
.upload-card-textarea ::-webkit-scrollbar-track {
  background: #f1f1f1; /* 轨道背景色 */
  border-radius: 12px; /* 轨道圆角 */
}
/* 修改滚动条的滑块样式 */
.upload-card-textarea ::-webkit-scrollbar-thumb {
  background: #888; /* 滑块背景色 */
  border-radius: 4px; /* 滑块圆角 */
}
/* 修改滚动条滑块在悬停时的样式 */
.upload-card-textarea ::-webkit-scrollbar-thumb:hover {
  background: #555; /* 滑块悬停时的背景色 */
}
.paste-card-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 50vw;
    margin-top: 3%;
}
.paste-card-upload-button {
    border-radius: 12px;
    transition: all 0.3s ease;
}
.paste-card-method-group :deep(.el-radio-button__inner) {
    transition: all 0.3s ease, color 0.1s ease;
}

.upload-list-dashboard {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 7vh;
    padding: 0 15px;
    position: sticky;
    top: 0;
    z-index: 1;
    border-radius: 15px;
    transition: all 0.3s ease;
}
.upload-list-dashboard.list-scrolled {
    background-color: var(--upload-list-dashboard-bg-color);
    box-shadow: var(--upload-list-dashboard-shadow);
}
.upload-list-dashboard-title {
    font-size: medium;
    font-weight: bold;
}

.file-icon {
    font-size: 30px;
    color: var(--upload-list-file-icon-color);
}

/* Modern URL Input Styles */
.upload-list-item-url :deep(.el-input) {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.upload-list-item-url :deep(.el-input:hover) {
    transform: translateY(-1px);
}

.upload-list-item-url :deep(.el-input__wrapper) {
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: var(--el-fill-color-blank);
    border: 1px solid var(--el-border-color-lighter);
    overflow: hidden;
    position: relative;
    padding: 0;
}

.upload-list-item-url :deep(.el-input-group > .el-input__wrapper) {
    border-radius: 0 9px 9px 0 !important;
}

.upload-list-item-url :deep(.el-input__wrapper:hover) {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    border-color: var(--el-color-primary-light-5);
}

.upload-list-item-url :deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 2px var(--el-color-primary-light-8),
                0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: var(--el-color-primary);
}

/* Gradient animation on focus */
.upload-list-item-url :deep(.el-input__wrapper.is-focus::before) {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
        transparent, 
        rgba(64, 158, 255, 0.08), 
        transparent);
    animation: shimmer 2s infinite;
    z-index: 0;
}

@keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
}

.upload-list-item-url :deep(.el-input__inner) {
    font-size: 13px;
    font-family: 'Courier New', Monaco, monospace;
    color: var(--el-text-color-regular);
    transition: all 0.3s ease;
    padding-left: 12px;
    position: relative;
    z-index: 1;
    border-radius: 0 10px 10px 0;
}

.upload-list-item-url :deep(.el-input__inner::selection) {
    background-color: var(--el-color-primary-light-7);
}

.upload-list-item-url :deep(.el-input-group__prepend) {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 600;
    font-size: 12px;
    border: none;
    padding: 0 14px;
    margin: 0;
    border-radius: 9px 0 0 9px;
    box-shadow: none;
    transition: all 0.3s ease;
    letter-spacing: 0.5px;
    position: relative;
    z-index: 1;
}

/* 去除prepend和input之间的分隔 */
.upload-list-item-url :deep(.el-input-group__prepend::after) {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    height: 60%;
    width: 1px;
    background: var(--el-color-primary-light-7);
    opacity: 0.3;
    transition: all 0.3s ease;
}

.upload-list-item-url :deep(.el-input:hover .el-input-group__prepend) {
    background: var(--el-color-primary-light-8);
}

.upload-list-item-url :deep(.el-input:hover .el-input-group__prepend::after) {
    opacity: 0.5;
}

.upload-list-item-url :deep(.el-input.is-focus .el-input-group__prepend) {
    background: var(--el-color-primary);
    color: white;
}

.upload-list-item-url :deep(.el-input.is-focus .el-input-group__prepend::after) {
    background: rgba(255, 255, 255, 0.3);
    opacity: 1;
}

/* Add subtle pulse animation to focused prepend */
.upload-list-item-url :deep(.el-input.is-focus .el-input-group__prepend) {
    animation: prependPulse 2s ease-in-out infinite;
}

@keyframes prependPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.95; }
}

/* Mobile optimizations */
@media (max-width: 768px) {
    .upload-list-item-url :deep(.el-input__wrapper) {
        border-radius: 8px;
    }
    
    .upload-list-item-url :deep(.el-input__inner) {
        font-size: 12px;
    }
    
    .upload-list-item-url :deep(.el-input-group__prepend) {
        font-size: 11px;
        padding: 0 8px;
        border-radius: 8px 0 0 8px;
    }
}

/* Enhanced Starry Sky Effect */
:deep(.el-upload-dragger) {
    position: relative;
    overflow: hidden;
}

/* Layer 1: Distant stars (Small, slow, dense) */
:deep(.el-upload-dragger::before) {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: 
        radial-gradient(2px 2px at 10% 10%, var(--el-upload-dragger-uniform-color) 50%, transparent 0),
        radial-gradient(2px 2px at 20% 30%, var(--el-upload-dragger-uniform-color) 50%, transparent 0),
        radial-gradient(2px 2px at 30% 10%, var(--el-upload-dragger-uniform-color) 50%, transparent 0),
        radial-gradient(2px 2px at 40% 30%, var(--el-upload-dragger-uniform-color) 50%, transparent 0),
        radial-gradient(2px 2px at 50% 10%, var(--el-upload-dragger-uniform-color) 50%, transparent 0),
        radial-gradient(2px 2px at 60% 30%, var(--el-upload-dragger-uniform-color) 50%, transparent 0),
        radial-gradient(2px 2px at 70% 10%, var(--el-upload-dragger-uniform-color) 50%, transparent 0),
        radial-gradient(2px 2px at 80% 30%, var(--el-upload-dragger-uniform-color) 50%, transparent 0),
        radial-gradient(2px 2px at 90% 10%, var(--el-upload-dragger-uniform-color) 50%, transparent 0),
        radial-gradient(2px 2px at 15% 70%, var(--el-upload-dragger-uniform-color) 50%, transparent 0);
    background-size: 200px 200px;
    opacity: 0;
    z-index: 0;
    transition: opacity 0.6s ease;
}

/* Layer 2: Close stars (Larger, faster, sparse) */
:deep(.el-upload-dragger::after) {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: 
        radial-gradient(3px 3px at 15% 15%, var(--el-upload-dragger-uniform-color) 50%, transparent 0),
        radial-gradient(3px 3px at 50% 50%, var(--el-upload-dragger-uniform-color) 50%, transparent 0),
        radial-gradient(3px 3px at 85% 85%, var(--el-upload-dragger-uniform-color) 50%, transparent 0),
        radial-gradient(2.5px 2.5px at 35% 65%, var(--el-upload-dragger-uniform-color) 50%, transparent 0),
        radial-gradient(2.5px 2.5px at 65% 35%, var(--el-upload-dragger-uniform-color) 50%, transparent 0);
    background-size: 150px 150px;
    opacity: 0;
    z-index: 0;
    transition: opacity 0.6s ease;
}

.upload-card:hover :deep(.el-upload-dragger::before) {
    opacity: 0.3;
    animation: starScroll 60s linear infinite;
}

.upload-card:hover :deep(.el-upload-dragger::after) {
    opacity: 0.6;
    animation: starScroll 40s linear infinite, starPulse 4s ease-in-out infinite;
}

@keyframes starScroll {
    from { background-position: 0 0; }
    to { background-position: 100px 100px; }
}

@keyframes starPulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 0.3; }
}
</style>
