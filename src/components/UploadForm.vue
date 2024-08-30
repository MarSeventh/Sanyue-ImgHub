<template>
    <div class="upload-form" @paste.native="handlePaste" >
        <el-upload
            class="upload-card"
            :class="{'is-uploading': uploading, 'upload-card-busy': fileList.length, 'paste-mode': uploadMethod === 'paste'}"
            drag
            multiple
            :http-request="uploadFile"
            :onSuccess="handleSuccess"
            :on-error="handleError"
            :before-upload="beforeUpload"
            :on-progress="handleProgress"
            :file-list="fileList"
            :show-file-list="false"
            accept="image/*, video/*"
            >
            <el-icon class="el-icon--upload">
                <CameraFilled v-if="uploadMethod === 'drag'" color="blanchedalmond"/>
                <CopyDocument v-else color="blanchedalmond"/>
            </el-icon>
            <div class="el-upload__text" v-if="uploadMethod === 'drag'">拖拽 或 <em>点击上传</em></div>
            <div class="el-upload__text" v-else>复制 <em>粘贴Ctrl-V</em> 上传</div>
         
            <template #tip>
                <div class="el-upload__tip">支持多文件上传，支持图片和视频 <br/>（图片>5MB会自动压缩，暂不支持>5MB的视频）</div>
            </template>
        </el-upload>
        
      <el-card class="upload-list-card" :class="{'upload-list-busy': fileList.length}">
            <div class="upload-list-container" :class="{'upload-list-busy': fileList.length}">
                <el-scrollbar>
                    <div class="upload-list-dashboard">
                        <el-text class="upload-list-dashboard-title">
                            <el-icon><List /></el-icon>{{ uploadingCount + waitingCount }}
                            <el-icon><Checked /></el-icon>{{ uploadSuccessCount }}
                            <el-icon><Failed /></el-icon>{{ uploadErrorCount }}
                        </el-text>
                        <div class="upload-list-dashboard-action">
                            <el-button-group>
                                <el-tooltip content="整体复制" placement="top">
                                    <el-button type="primary" round @click="copyAll" alt="整体复制"><el-icon><Grid /></el-icon></el-button>
                                </el-tooltip>
                                <el-tooltip content="清空列表" placement="top">
                                    <el-button type="primary" round @click="clearFileList"><el-icon><CircleClose /></el-icon></el-button>
                                </el-tooltip>
                            </el-button-group>
                        </div>
                    </div>
                    <div class="upload-list-item" v-for="file in fileList" :key="file.name" :span="8">
                        <a :href="file.url" target="_blank">
                            <img
                                style="width: 10vw; border-radius: 12px;"
                                :src="file.url"
                                @error="file.url = 'https://imgbed.sanyue.site/file/b6a4a65b4edba4377492e.png'"
                                >
                            </img>
                        </a>
                        <div class="upload-list-item-content">
                            <el-text class="upload-list-item-name" truncated>{{ file.name }}</el-text>
                            <div class="upload-list-item-url" v-if="file.status==='done'">
                                <div class="upload-list-item-url-row">
                                    <el-input v-model="file.finalURL" size="small" readonly @focus="selectAllText">
                                        <template #prepend>URL:</template>
                                    </el-input>
                                    <el-input v-model="file.mdURL" size="small" readonly @focus="selectAllText">
                                        <template #prepend>MarkDown:</template>
                                    </el-input>
                                </div>
                                <div class="upload-list-item-url-row">
                                    <el-input v-model="file.htmlURL" size="small" readonly @focus="selectAllText">
                                        <template #prepend>HTML:</template>
                                    </el-input>
                                    <el-input v-model="file.ubbURL" size="small" readonly @focus="selectAllText">
                                        <template #prepend>BBCode:</template>
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
import axios from 'axios'
import cookies from 'vue-cookies'
import * as imageConversion from 'image-conversion'

export default {
name: 'UploadForm',
props: {
    selectedUrlForm: {
        type: String,
        default: 'url',
        required: false
    }, 
    uploadMethod: {
        type: String,
        default: 'drag',
        required: false
    }
},
data() {
    return {
        fileList: [],
        uploading: false,
        maxUploading: 10,
        waitingList: []
    }
},
computed: {
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
    }
},
watch: {
      },
mounted() {
        },
methods: {
    uploadFile(file) {
        if (this.uploadingCount > this.maxUploading) {
            this.waitingList.push(file)
            this.fileList.find(item => item.uid === file.file.uid).status = 'waiting'
            return
        } else {
            this.fileList.find(item => item.uid === file.file.uid).status = 'uploading'
        }
        const formData = new FormData()
        formData.append('file', file.file)
        axios({
            url: '/upload' + '?authCode=' + cookies.get('authCode'),
            method: 'post',
            data: formData,
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded / progressEvent.total) * 100)
                file.onProgress({ percent: percentCompleted, file: file.file })
            }
        }).then(res => {
            file.onSuccess(res, file.file)
        }).catch(err => {
            if (err.response && err.response.status === 401) {
                this.waitingList = []
                this.fileList = []
                this.$message.error('认证状态错误！')
                this.$router.push('/login')
            } else {
                file.onError(err, file.file)
            }
        }).finally(() => {
            if (this.uploadingCount + this.waitingCount === 0) {
                this.uploading = false
            }
        })
    },
    handleRemove(file) {
        this.fileList = this.fileList.filter(item => item.uid !== file.uid)
        this.$message({
            type: 'info',
            message: file.name + '已删除'
        })
    },
    handleSuccess(response, file) {
        try {     
            const rootUrl = `${window.location.protocol}//${window.location.host}`
            this.fileList.find(item => item.uid === file.uid).url = rootUrl + response.data[0].src
            this.fileList.find(item => item.uid === file.uid).finalURL = rootUrl + response.data[0].src
            this.fileList.find(item => item.uid === file.uid).mdURL = `![${file.name}](${rootUrl + response.data[0].src})`
            this.fileList.find(item => item.uid === file.uid).htmlURL = `<img src="${rootUrl + response.data[0].src}" alt="${file.name}" width=100% />`
            this.fileList.find(item => item.uid === file.uid).ubbURL = `[img]${rootUrl + response.data[0].src}[/img]`
            this.fileList.find(item => item.uid === file.uid).progreess = 100
            this.fileList.find(item => item.uid === file.uid).status = 'success'
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
    handleError(err, file) {
        this.$message.error(file.name + '上传失败')
        this.fileList.find(item => item.uid === file.uid).status = 'exception'
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
            const isLt5M = file.size / 1024 / 1024 < 5
            if (!isLt5M) {
                    //尝试压缩图片
                    if (file.type.includes('image')) {
                    imageConversion.compressAccurately(file, 4096).then((res) => {
                        //如果压缩后仍大于5MB，则不上传
                        if (res.size / 1024 / 1024 > 5) {
                            this.$message.error(file.name + '压缩后文件过大，无法上传!')
                            reject('文件过大')
                        }
                        this.uploading = true
                        //将res包装成新的file
                        const newFile = new File([res], file.name, { type: res.type })
                        newFile.uid = file.uid
                        const fileUrl = URL.createObjectURL(newFile)
                        this.fileList.push({
                            uid: file.uid,
                            name: file.name,
                            url: fileUrl,
                            finalURL: '',
                            mdURL: '',
                            htmlURL: '',
                            ubbURL: '',
                            status: 'uploading',
                            progreess: 0
                        })
                        resolve(newFile)
                    }).catch((err) => {
                        this.$message.error(file.name + '文件过大且压缩失败，无法上传!')
                        reject(err)
                    })
                } else {
                    this.$message.error(file.name + '文件过大，无法上传!')
                    reject('文件过大')
                }
            } else {
                this.uploading = true
                const fileUrl = URL.createObjectURL(file)
                this.fileList.push({
                    uid: file.uid,
                    name: file.name,
                    url: fileUrl,
                    finalURL: '',
                    mdURL: '',
                    htmlURL: '',
                    ubbURL: '',
                    status: 'uploading',
                    progreess: 0
                })
                resolve(file)
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
        this.fileList = []
        this.$message({
            type: 'info',
            message: '列表已清空'
        })
    },
    handlePaste(event) {
        if (this.uploadMethod !== 'paste') {
            return
        }
        const items = event.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const file = items[i].getAsFile()
                // 判断文件类型是否为图片或视频
                if (file.type.includes('image') || file.type.includes('video')) {
                    file.uid = Date.now() + i
                    file.file = file
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
                    if (urlPattern.test(text)) {
                        fetch('/api/fetchRes', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ url: text })
                        }).then(response => {
                            const contentType = response.headers.get('content-type');
                            if (response.status == 200 && (contentType.includes('image') || contentType.includes('video'))) {
                                return response.blob();
                            } else {
                                throw new Error('URL地址的内容不是图片或视频');
                            }
                        })
                        .then(blob => {
                            //获取图片名
                            const fileName = text.split('/').pop();
                            const file = new File([blob], fileName, { type: blob.type });
                            file.uid = Date.now() + i;
                            file.file = file;
                            //接收beforeUpload的Promise对象
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
   
    addPasteOverlay() {
            const overlay = document.createElement('div');
            overlay.className = 'paste-overlay';
            overlay.addEventListener('click', this.triggerPaste);
            this.$el.appendChild(overlay);
        },
        removePasteOverlay() {
            const overlay = this.$el.querySelector('.paste-overlay');
            if (overlay) {
                overlay.removeEventListener('click', this.triggerPaste);
                this.$el.removeChild(overlay);
            }
        },
     updatePointerEvents() {
            if (this.uploadMethod === 'paste') {
                document.querySelector('.paste-overlay').style.pointerEvents = 'auto';
                document.querySelector('.el-upload-dragger').style.pointerEvents = 'none';
            } else {
                document.querySelector('.paste-overlay').style.pointerEvents = 'none';
                document.querySelector('.el-upload-dragger').style.pointerEvents = 'auto';
            }
     },
    selectAllText(event) {
        event.target.select()
    }
}
}
</script>

<style scoped> 
@keyframes breathe {
    0%, 100% {
    }
    50% {
        box-shadow: 0 0 10px 5px #409EFF;
        opacity: 0.8;
    }
}
.upload-form {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative; /* Ensure the overlay is positioned relative to this element */
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
    opacity: 0.8;
    background-color: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
}
.upload-list-container {
    width: 55vw;
    height: 7vh;
}
.upload-list-card.upload-list-busy {
    height: 35vh;
}
.upload-list-container.upload-list-busy {
    height: 35vh;
}
.upload-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 5px;
    border: 1px solid #a5bef7;
    padding: 5px;
    border-radius: 15px;
}
.upload-list-item-name {
    font-size: small;
    font-weight: bold;
    width: 28vw;
    margin-bottom: 5px;
}
.upload-list-item-content {
    display: flex;
    flex-direction: column;
    margin-left: 10px;
}
.upload-list-item-url-text {
    width: 28vw;
}
.upload-list-item-url-row {
    display: flex;
    flex-direction: row;
    align-items: center;
}
.upload-list-item-progress {
    margin-top: 3px;
    width: 28vw;
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
.upload-card-busy :deep(.el-upload-dragger) {
    height: 25vh;
}
.paste-mode :deep(.el-upload) {
    pointer-events: none;
}
.paste-mode :deep(.el-upload-dragger) {
    pointer-events: none;
}
.paste-mode :deep(.el-upload-dragger:hover) {
    pointer-events: auto;
}
:deep(.el-upload-dragger)  {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 45vh;
    border-radius: 15px;
    border: 3px dashed #409EFF;
    opacity: 0.7;
    background-color: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
    z-index: 1; /* 确保 z-index 低于 .paste-overlay */
}
:deep(.el-upload-dragger:hover) {
    opacity: 0.8;
    box-shadow: 0 0 10px 5px #409EFF;
}
:deep(.el-upload-dragger.is-dragover) {
    opacity: 0.8;
    box-shadow: 0 0 10px 5px #409EFF;
}
.is-uploading :deep(.el-upload-dragger){
    animation: breathe 3s infinite;
}
.el-upload__text {
    font-weight: bold;
    font-size: medium;
    user-select: none;
}
.el-upload__tip {
    font-size: small;
    color: antiquewhite;
    user-select: none;
}
.upload-list-dashboard {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
}
.upload-list-dashboard-title {
    font-size: medium;
    font-weight: bold;
}
</style>import { split } from 'core-js/fn/symbol'
