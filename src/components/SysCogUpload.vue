<template>
    <div class="upload-settings" v-loading="loading">   
        <!-- 一级设置：上传渠道 -->
        <div class="upload-channel">
        <h3 class="first-title">上传渠道
            <el-tooltip content="设置每类上传渠道的详细配置 <br> 点击“保存设置”会同时保存对每类配置的修改" placement="right" raw-content>
                <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
            </el-tooltip>
        </h3>
        <el-radio-group v-model="activeChannel">
            <el-radio
            v-for="channel in channels"
            :key="channel.value"
            :label="channel.value"
            >
            {{ channel.label }}
            </el-radio>
        </el-radio-group>
        </div>

        <!-- 二级设置：具体渠道配置 -->
        <div class="channel-settings">
        <h4 class="second-title">{{ activeChannelLabel }} 设置
            <el-tooltip v-if="activeChannel === 'telegram'" content="为保证兼容性，v2版本前设置的 Telegram 相关环境变量请保留" placement="right">
                <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
            </el-tooltip>
        </h4>
        <div v-if="activeChannel === 'telegram'">
            <!-- 负载均衡配置 -->
            <el-form 
                :model="telegramSettings" 
                label-position="top"
                class="channel-form"
            >
                <el-form-item label="负载均衡">
                    <el-switch v-model="telegramSettings.loadBalance.enabled"/>
                </el-form-item>
            </el-form>

            <el-form
                v-for="(channel, index) in telegramSettings.channels"
                :key="index"
                :model="channel"
                label-position="top"
                :rules = "tgRules"
                ref = "tgChannelForm"
                class="channel-form"
            >
                <el-form-item label="渠道名" prop="name">
                    <el-input v-model="channel.name" :disabled="channel.fixed"/>
                </el-form-item>
                <el-form-item label="启用渠道" prop="enabled">
                    <el-switch v-model="channel.enabled"/>
                </el-form-item>
                <el-form-item label="Bot Token" prop="botToken">
                    <el-input v-model="channel.botToken" :disabled="channel.fixed" type="password" show-password autocomplete="new-password"/>
                </el-form-item>
                <el-form-item label="Chat ID" prop="chatId">
                    <el-input v-model="channel.chatId" :disabled="channel.fixed" type="password" show-password autocomplete="new-password"/>
                </el-form-item>
                <!-- 删除 -->
                <el-form-item>
                    <el-button type="danger" @click="deleteChannel(index)" size="small" :disabled="channel.fixed">
                        <font-awesome-icon icon="trash-alt" />
                    </el-button>
                </el-form-item>
            </el-form>
        </div>

        <div v-if="activeChannel === 'cfr2'">
            <el-form 
                v-for="(channel, index) in cfr2Settings.channels"
                :model="channel" 
                label-position="top"
                class="channel-form"
            >
                <el-form-item label="渠道名">
                    <el-input v-model="channel.name" :disabled="channel.fixed"/>
                </el-form-item>
                <el-form-item label="启用渠道">
                    <el-switch v-model="channel.enabled"/>
                </el-form-item>
                <el-form-item>
                    <template #label>
                        公开访问链接
                        <el-tooltip content="若启用图像审查，请设置该项" placement="top">
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-input v-model="channel.publicUrl"/>
                </el-form-item>
            </el-form>
        </div>

        <div v-if="activeChannel === 's3'">
            <!-- 负载均衡配置 -->
            <el-form 
                :model="s3Settings" 
                label-position="top"
                class="channel-form"
            >
                <el-form-item label="负载均衡">
                    <el-switch v-model="s3Settings.loadBalance.enabled"/>
                </el-form-item>
            </el-form>

            <el-form 
                v-for="(channel, index) in s3Settings.channels"
                :model="channel" 
                label-position="top"
                :rules = "s3Rules"
                ref = "s3ChannelForm"
                class="channel-form"
            >
                <el-form-item label="渠道名" prop="name">
                    <el-input v-model="channel.name" :disabled="channel.fixed"/>
                </el-form-item>
                <el-form-item label="启用渠道" prop="enabled">
                    <el-switch v-model="channel.enabled"/>
                </el-form-item>
                <el-form-item prop="endpoint">
                    <template #label>
                        Endpoint
                        <el-tooltip content="服务提供商 Endpoint，例如 https://s3.us-east-005.backblazeb2.com" placement="top">
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-input v-model="channel.endpoint" :disabled="channel.fixed"/>
                </el-form-item>
                <el-form-item label="路径风格" prop="pathStyle">
                    <el-switch v-model="channel.pathStyle" :disabled="channel.fixed"/>
                </el-form-item>
                <el-form-item label="存储桶名称" prop="bucketName">
                    <el-input v-model="channel.bucketName" :disabled="channel.fixed"/>
                </el-form-item>
                <el-form-item label="存储桶区域" prop="region">
                    <el-input v-model="channel.region" placeholder="默认填写 auto 即可" :disabled="channel.fixed"/>
                </el-form-item>
                <el-form-item label="访问密钥 ID" prop="accessKeyId">
                    <el-input v-model="channel.accessKeyId" :disabled="channel.fixed" type="password" show-password autocomplete="new-password"/>
                </el-form-item>
                <el-form-item label="机密访问密钥" prop="secretAccessKey">
                    <el-input v-model="channel.secretAccessKey" :disabled="channel.fixed" type="password" show-password autocomplete="new-password"/>
                </el-form-item>
                <!-- 删除 -->
                <el-form-item>
                    <el-button type="danger" @click="deleteChannel(index)" size="small" :disabled="channel.fixed">
                        <font-awesome-icon icon="trash-alt" />
                    </el-button>
                </el-form-item>
            </el-form>
        </div>

        </div>

        <!-- 操作按钮 -->
        <div class="actions">
            <el-button type="primary" @click="addChannel">
                <font-awesome-icon icon="plus" />
            </el-button>
            <el-button type="primary" @click="saveSettings">保存设置</el-button>
        </div>
    </div>
</template>

<script>
import fetchWithAuth from '@/utils/fetchWithAuth';

export default {
data() {
    return {
    // 一级设置：上传渠道
    channels: [
        { value: 'telegram', label: 'Telegram' },
        { value: 'cfr2', label: 'CloudFlareR2' },
        { value: 's3', label: 'S3' }
    ],
    activeChannel: 'telegram', // 当前选中的上传渠道

    // 二级设置：Telegram 配置
    telegramSettings: {
        loadBalance: {},
        channels: []
    },

    tgRules: {
        name: [
            { required: true, message: '请输入渠道名', trigger: 'blur' },
            { validator: (rule, value, callback) => {
                const names = this.telegramSettings.channels.map((item) => item.name);
                if (names.filter((name) => name === value).length > 1) {
                    callback(new Error('渠道名不能重复'));
                } else if (value === 'Telegram_env') {
                    // 判断该渠道保存位置是否为环境变量
                    const savePath = this.telegramSettings.channels.find((item) => item.name === value).savePath;
                    if (savePath !== 'environment variable') {
                        callback(new Error('渠道名不能为保留值'));
                    } else {
                        callback();
                    }
                } else {
                    callback();
                }
            }, trigger: 'blur' }
        ],
        botToken: [
            { required: true, message: '请输入 Bot Token', trigger: 'blur' }
        ],
        chatId: [
            { required: true, message: '请输入 Chat ID', trigger: 'blur' }
        ]
    },

    // 二级设置：CFR2 配置
    cfr2Settings: {
        channels: []
    },

    // 二级设置：S3 配置
    s3Settings: {
        loadBalance: {},
        channels: []
    },

    s3Rules: {
        name: [
            { required: true, message: '请输入渠道名', trigger: 'blur' },
            { validator: (rule, value, callback) => {
                const names = this.s3Settings.channels.map((item) => item.name);
                if (names.filter((name) => name === value).length > 1) {
                    callback(new Error('渠道名不能重复'));
                } else if (value === 'S3_env') {
                    // 判断该渠道保存位置是否为环境变量
                    const savePath = this.s3Settings.channels.find((item) => item.name === value).savePath;
                    if (savePath !== 'environment variable') {   
                        callback(new Error('渠道名不能为保留值'));
                    } else {
                        callback();
                    }
                } else {
                    callback();
                }
            }, trigger: 'blur' }
        ],
        endpoint: [
            { required: true, message: '请输入 Endpoint', trigger: 'blur' }
        ],
        bucketName: [
            { required: true, message: '请输入存储桶名称', trigger: 'blur' }
        ],
        region: [
            { required: true, message: '请输入存储桶区域', trigger: 'blur' }
        ],
        accessKeyId: [
            { required: true, message: '请输入访问密钥 ID', trigger: 'blur' }
        ],
        secretAccessKey: [
            { required: true, message: '请输入机密访问密钥', trigger: 'blur' }
        ]
    },

    // 加载状态
    loading: false

    };
},
computed: {
    // 当前选中渠道的标签
    activeChannelLabel() {
        const channel = this.channels.find(
            (item) => item.value === this.activeChannel
        );
        return channel ? channel.label : '';
    }
},
methods: {
    addChannel() {
        switch (this.activeChannel) {
            case 'telegram':
                this.telegramSettings.channels.push({
                    id: this.telegramSettings.channels.length + 1,
                    name: '',
                    type: 'telegram',
                    savePath: 'database',
                    botToken: '',
                    chatId: '',
                    enabled: true,
                    fixed: false
                });
                break;
            case 'cfr2':
                // this.cfr2Settings.channels.push({
                //     id: this.cfr2Settings.channels.length + 1,
                //     name: '',
                //     type: 'cfr2',
                //     savePath: 'database',
                //     enabled: true,
                //     fixed: false
                // });
                this.$message.error('R2渠道请通过绑定 R2 存储桶或通过 S3 渠道添加');
                break;
            case 's3':
                this.s3Settings.channels.push({
                    id: this.s3Settings.channels.length + 1,
                    name: '',
                    type: 's3',
                    savePath: 'database',
                    accessKeyId: '',
                    secretAccessKey: '',
                    region: '',
                    bucketName: '',
                    endpoint: '',
                    pathStyle: false,
                    enabled: true,
                    fixed: false
                });
                break;
        }
    },
    deleteChannel(index) {
        switch (this.activeChannel) {
            case 'telegram':
                // 调整 id
                this.telegramSettings.channels.forEach((item, i) => {
                    if (i > index) {
                        item.id -= 1;
                    }
                });
                this.telegramSettings.channels.splice(index, 1);
                break;
            case 'cfr2':
                // 调整 id
                this.cfr2Settings.channels.forEach((item, i) => {
                    if (i > index) {
                        item.id -= 1;
                    }
                });
                this.cfr2Settings.channels.splice(index, 1);
                break;
            case 's3':
                // 调整 id
                this.s3Settings.channels.forEach((item, i) => {
                    if (i > index) {
                        item.id -= 1;
                    }
                });
                this.s3Settings.channels.splice(index, 1);
                break;
        }
    },
    saveSettings() {
        // 所有表单的 Promise 数组
        let validationPromises = [];

        // Telegram
        if (this.$refs.tgChannelForm) {
            this.$refs.tgChannelForm.forEach((form) => {
                validationPromises.push(new Promise((resolve) => {
                    form.validate((valid) => resolve(valid));
                }));
            });
        }

        // S3
        if (this.$refs.s3ChannelForm) {
            this.$refs.s3ChannelForm.forEach((form) => {
                validationPromises.push(new Promise((resolve) => {
                    form.validate((valid) => resolve(valid));
                }));
            });
        }

        // 等待所有验证完成
        Promise.all(validationPromises).then((results) => {
            const isValid = results.every(valid => valid);

            if (!isValid) {
                return;
            }

            // 保存设置
            const settings = {
                telegram: this.telegramSettings,
                cfr2: this.cfr2Settings,
                s3: this.s3Settings
            };
            fetchWithAuth('/api/manage/sysConfig/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            })
            .then(() => {
                this.$message.success('设置已保存');
            });
        });
    }

},
mounted() {
    this.loading = true;
    // 获取上传设置
    fetchWithAuth('/api/manage/sysConfig/upload')
    .then((response) => response.json())
    .then((data) => {
        this.telegramSettings = data.telegram;
        this.cfr2Settings = data.cfr2;
        this.s3Settings = data.s3;
    })
    .finally(() => {
        this.loading = false;
    });
}
};
</script>

<style scoped>
.upload-settings {
    padding: 20px;
    min-height: 500px;
}

.upload-channel {
    margin-bottom: 40px;
}

.first-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
}

/* 渠道切换按钮组美化 */
.upload-channel :deep(.el-radio-group) {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.upload-channel :deep(.el-radio) {
    display: flex;
    align-items: center;
    padding: 10px 20px;
    border-radius: 10px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    transition: all 0.25s ease;
    margin-right: 0;
    height: auto;
}

.upload-channel :deep(.el-radio:hover) {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-fill-color);
}

.upload-channel :deep(.el-radio.is-checked) {
    background: linear-gradient(135deg, rgba(64, 158, 255, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%);
    border-color: var(--el-color-primary);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.upload-channel :deep(.el-radio__input) {
    display: none;
}

.upload-channel :deep(.el-radio__label) {
    padding-left: 0;
    font-weight: 500;
    font-size: 14px;
}

.second-title {
    text-align: start;
    margin-left: 0;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.channel-settings {
    margin-top: 20px;
}

/* 表单样式 - 上下排列左对齐 */
.channel-form {
    margin-bottom: 30px;
    padding: 20px;
    background: var(--el-fill-color-lighter);
    border-radius: 12px;
    border: 1px solid var(--el-border-color-lighter);
}

.channel-form :deep(.el-form-item) {
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.channel-form :deep(.el-form-item__label) {
    text-align: left;
    padding-bottom: 8px;
    font-weight: 500;
    color: var(--el-text-color-primary);
}

.channel-form :deep(.el-form-item__content) {
    width: 100%;
    max-width: 400px;
}

.channel-form :deep(.el-input) {
    width: 100%;
}

.channel-form :deep(.el-switch) {
    --el-switch-on-color: var(--el-color-primary);
}

.actions {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.actions :deep(.el-button) {
    border-radius: 8px;
    padding: 10px 20px;
}

/* 移动端适配 */
@media (max-width: 768px) {
    .upload-settings {
        padding: 15px;
    }
    
    .upload-channel :deep(.el-radio-group) {
        gap: 8px;
    }
    
    .upload-channel :deep(.el-radio) {
        padding: 8px 14px;
        font-size: 13px;
    }
    
    .channel-form {
        padding: 15px;
    }
    
    .channel-form :deep(.el-form-item__content) {
        max-width: 100%;
    }
}
</style>