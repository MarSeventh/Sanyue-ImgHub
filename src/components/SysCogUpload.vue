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
                <!-- 容量限制配置 -->
                <el-form-item>
                    <template #label>
                        容量限制
                        <el-tooltip content="启用后，当存储容量达到阈值时，该渠道将自动停止接收新文件，上传会自动切换到其他可用渠道" placement="top">
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-switch v-model="channel.quota.enabled" @change="(val) => onQuotaEnabledChange(val, channel)"/>
                </el-form-item>
                <el-form-item v-if="channel.quota.enabled" label="容量上限 (GB)">
                    <el-input-number v-model="channel.quota.limitGB" :min="0.1" :step="1" :precision="1"/>
                </el-form-item>
                <el-form-item v-if="channel.quota.enabled">
                    <template #label>
                        阈值 (%)
                        <el-tooltip content="当已用容量达到此百分比时停止写入，默认95%" placement="top">
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-input-number v-model="channel.quota.threshold" :min="50" :max="100" :step="5"/>
                </el-form-item>
                <!-- 容量使用情况显示 -->
                <el-form-item v-if="channel.quota.enabled && channel.name">
                    <template #label>
                        当前用量
                        <el-button link type="primary" @click="refreshQuota" :loading="quotaLoading" style="margin-left: 8px;">
                            <font-awesome-icon icon="sync-alt" />
                        </el-button>
                    </template>
                    <div class="quota-status">
                        <el-progress 
                            :percentage="getQuotaPercentage(channel)" 
                            :status="getQuotaStatus(channel)"
                            :stroke-width="20"
                            :text-inside="true"
                            :format="() => getQuotaText(channel)"
                        />
                        <div class="quota-info" :class="{ 'quota-warning': isQuotaExceeded(channel) }">
                            {{ getQuotaStatusText(channel) }}
                        </div>
                    </div>
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
                    <template #label>
                        路径风格
                        <el-tooltip content="S3 路径风格/虚拟主机风格，使用 OpenList 作为 S3 提供者时需打开此开关 <br> 路径风格：https://s3.example.com/下方存储桶名称/文件路径 <br> 虚拟主机风格：https://下方存储桶名称.s3.example.com/文件路径" placement="top" raw-content>
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
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
                <!-- 容量限制配置 -->
                <el-form-item>
                    <template #label>
                        容量限制
                        <el-tooltip content="启用后，当存储容量达到阈值时，该渠道将自动停止接收新文件，上传会自动切换到其他可用渠道" placement="top">
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-switch v-model="channel.quota.enabled" @change="(val) => onQuotaEnabledChange(val, channel)"/>
                </el-form-item>
                <el-form-item v-if="channel.quota.enabled" label="容量上限 (GB)">
                    <el-input-number v-model="channel.quota.limitGB" :min="0.1" :step="1" :precision="1"/>
                </el-form-item>
                <el-form-item v-if="channel.quota.enabled">
                    <template #label>
                        阈值 (%)
                        <el-tooltip content="当已用容量达到此百分比时停止写入，默认95%" placement="top">
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-input-number v-model="channel.quota.threshold" :min="50" :max="100" :step="5"/>
                </el-form-item>
                <!-- 容量使用情况显示 -->
                <el-form-item v-if="channel.quota.enabled && channel.name">
                    <template #label>
                        当前用量
                        <el-button link type="primary" @click="refreshQuota" :loading="quotaLoading" style="margin-left: 8px;">
                            <font-awesome-icon icon="sync-alt" />
                        </el-button>
                    </template>
                    <div class="quota-status">
                        <el-progress 
                            :percentage="getQuotaPercentage(channel)" 
                            :status="getQuotaStatus(channel)"
                            :stroke-width="20"
                            :text-inside="true"
                            :format="() => getQuotaText(channel)"
                        />
                        <div class="quota-info" :class="{ 'quota-warning': isQuotaExceeded(channel) }">
                            {{ getQuotaStatusText(channel) }}
                        </div>
                    </div>
                </el-form-item>
                <!-- 删除 -->
                <el-form-item>
                    <el-button type="danger" @click="deleteChannel(index)" size="small" :disabled="channel.fixed">
                        <font-awesome-icon icon="trash-alt" />
                    </el-button>
                </el-form-item>
            </el-form>
        </div>

        <div v-if="activeChannel === 'discord'">
            <!-- 负载均衡配置 -->
            <el-form 
                :model="discordSettings" 
                label-position="top"
                class="channel-form"
            >
                <el-form-item label="负载均衡">
                    <el-switch v-model="discordSettings.loadBalance.enabled"/>
                </el-form-item>
            </el-form>

            <el-form
                v-for="(channel, index) in discordSettings.channels"
                :key="index"
                :model="channel"
                label-position="top"
                :rules="discordRules"
                ref="discordChannelForm"
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
                <el-form-item label="Channel ID" prop="channelId">
                    <el-input v-model="channel.channelId" :disabled="channel.fixed" type="password" show-password autocomplete="new-password"/>
                </el-form-item>
                <el-form-item>
                    <template #label>
                        代理域名
                        <el-tooltip content="可选，用于国内访问 Discord CDN，填写代理域名（不含 https://）" placement="top">
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-input v-model="channel.proxyUrl" placeholder="例如: your-proxy.example.com"/>
                </el-form-item>
                <el-form-item>
                    <template #label>
                        Nitro 会员
                        <el-tooltip content="开启后单文件限制提升至 25MB，关闭则为 10MB" placement="top">
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-switch v-model="channel.isNitro"/>
                </el-form-item>
                <el-form-item>
                    <div class="discord-limit-tip">
                        <font-awesome-icon icon="info-circle" style="margin-right: 5px;"/>
                        {{ channel.isNitro ? 'Nitro 会员单文件限制 25MB，超过将自动切换其他渠道' : 'Discord 免费用户单文件限制 10MB，超过将自动切换其他渠道' }}
                    </div>
                </el-form-item>
                <!-- 删除 -->
                <el-form-item>
                    <el-button type="danger" @click="deleteChannel(index)" size="small" :disabled="channel.fixed">
                        <font-awesome-icon icon="trash-alt" />
                    </el-button>
                </el-form-item>
            </el-form>
        </div>

        <div v-if="activeChannel === 'huggingface'">
            <!-- 负载均衡配置 -->
            <el-form 
                :model="huggingfaceSettings" 
                label-position="top"
                class="channel-form"
            >
                <el-form-item label="负载均衡">
                    <el-switch v-model="huggingfaceSettings.loadBalance.enabled"/>
                </el-form-item>
            </el-form>

            <el-form
                v-for="(channel, index) in huggingfaceSettings.channels"
                :key="index"
                :model="channel"
                label-position="top"
                :rules="huggingfaceRules"
                ref="huggingfaceChannelForm"
                class="channel-form"
            >
                <el-form-item label="渠道名" prop="name">
                    <el-input v-model="channel.name" :disabled="channel.fixed"/>
                </el-form-item>
                <el-form-item label="启用渠道" prop="enabled">
                    <el-switch v-model="channel.enabled"/>
                </el-form-item>
                <el-form-item prop="repo">
                    <template #label>
                        仓库名
                        <el-tooltip content="格式：用户名/仓库名，例如 username/my-images" placement="top">
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-input v-model="channel.repo" :disabled="channel.fixed" placeholder="username/repo-name"/>
                </el-form-item>
                <el-form-item label="Access Token" prop="token">
                    <el-input v-model="channel.token" :disabled="channel.fixed" type="password" show-password autocomplete="new-password"/>
                </el-form-item>
                <el-form-item>
                    <template #label>
                        私有仓库
                        <el-tooltip content="开启后仓库将设为私有，访问时需要通过服务器代理" placement="top">
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <el-switch v-model="channel.isPrivate"/>
                </el-form-item>
                <el-form-item>
                    <div class="huggingface-tip">
                        <font-awesome-icon icon="info-circle" style="margin-right: 5px;"/>
                        {{ channel.isPrivate ? '私有仓库限制 100GB，访问时服务器会代理请求' : '公开仓库无容量限制，文件可直接访问' }}
                    </div>
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
        { value: 'cfr2', label: 'CloudFlare R2' },
        { value: 's3', label: 'S3' },
        { value: 'discord', label: 'Discord' },
        { value: 'huggingface', label: 'HuggingFace' }
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

    // 二级设置：Discord 配置
    discordSettings: {
        loadBalance: {},
        channels: []
    },

    // 二级设置：HuggingFace 配置
    huggingfaceSettings: {
        loadBalance: {},
        channels: []
    },

    huggingfaceRules: {
        name: [
            { required: true, message: '请输入渠道名', trigger: 'blur' },
            { validator: (rule, value, callback) => {
                const names = this.huggingfaceSettings.channels.map((item) => item.name);
                if (names.filter((name) => name === value).length > 1) {
                    callback(new Error('渠道名不能重复'));
                } else if (value === 'HuggingFace_env') {
                    const savePath = this.huggingfaceSettings.channels.find((item) => item.name === value).savePath;
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
        token: [
            { required: true, message: '请输入 Access Token', trigger: 'blur' }
        ],
        repo: [
            { required: true, message: '请输入仓库名', trigger: 'blur' }
        ]
    },

    discordRules: {
        name: [
            { required: true, message: '请输入渠道名', trigger: 'blur' },
            { validator: (rule, value, callback) => {
                const names = this.discordSettings.channels.map((item) => item.name);
                if (names.filter((name) => name === value).length > 1) {
                    callback(new Error('渠道名不能重复'));
                } else if (value === 'Discord_env') {
                    const savePath = this.discordSettings.channels.find((item) => item.name === value).savePath;
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
        channelId: [
            { required: true, message: '请输入 Channel ID', trigger: 'blur' }
        ]
    },

    // 容量统计数据
    quotaStats: {},
    quotaLoading: false,

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
                    fixed: false,
                    quota: {
                        enabled: false,
                        limitGB: 10,
                        threshold: 95
                    }
                });
                break;
            case 'discord':
                this.discordSettings.channels.push({
                    id: this.discordSettings.channels.length + 1,
                    name: '',
                    type: 'discord',
                    savePath: 'database',
                    botToken: '',
                    channelId: '',
                    proxyUrl: '',
                    isNitro: false,
                    enabled: true,
                    fixed: false
                });
                break;
            case 'huggingface':
                this.huggingfaceSettings.channels.push({
                    id: this.huggingfaceSettings.channels.length + 1,
                    name: '',
                    type: 'huggingface',
                    savePath: 'database',
                    token: '',
                    repo: '',
                    isPrivate: false,
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
            case 'discord':
                // 调整 id
                this.discordSettings.channels.forEach((item, i) => {
                    if (i > index) {
                        item.id -= 1;
                    }
                });
                this.discordSettings.channels.splice(index, 1);
                break;
            case 'huggingface':
                // 调整 id
                this.huggingfaceSettings.channels.forEach((item, i) => {
                    if (i > index) {
                        item.id -= 1;
                    }
                });
                this.huggingfaceSettings.channels.splice(index, 1);
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

        // Discord
        if (this.$refs.discordChannelForm) {
            this.$refs.discordChannelForm.forEach((form) => {
                validationPromises.push(new Promise((resolve) => {
                    form.validate((valid) => resolve(valid));
                }));
            });
        }

        // HuggingFace
        if (this.$refs.huggingfaceChannelForm) {
            this.$refs.huggingfaceChannelForm.forEach((form) => {
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
                s3: this.s3Settings,
                discord: this.discordSettings,
                huggingface: this.huggingfaceSettings
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
    },
    // 获取容量统计（重新计算）
    async refreshQuota() {
        this.quotaLoading = true;
        try {
            // 使用 POST 请求重新统计容量（会触发索引重建）
            const response = await fetchWithAuth('/api/manage/quota', {
                method: 'POST'
            });
            const data = await response.json();
            if (data.success) {
                this.quotaStats = data.channelStats || {};
            } else {
                // 如果重新统计失败，尝试获取已有数据
                const getResponse = await fetchWithAuth('/api/manage/quota');
                const getData = await getResponse.json();
                if (getData.success) {
                    this.quotaStats = getData.quotaStats || {};
                }
            }
        } catch (error) {
            console.error('Failed to refresh quota stats:', error);
        } finally {
            this.quotaLoading = false;
        }
    },
    // 获取容量统计（仅读取，不重建索引）
    async loadQuotaStats() {
        try {
            const response = await fetchWithAuth('/api/manage/quota');
            const data = await response.json();
            if (data.success) {
                this.quotaStats = data.quotaStats || {};
            }
        } catch (error) {
            console.error('Failed to load quota stats:', error);
        }
    },
    // 获取渠道已用容量 (GB)
    getChannelUsedGB(channel) {
        const stats = this.quotaStats[channel.name];
        if (!stats) return 0;
        return (stats.usedMB || 0) / 1024;
    },
    // 获取容量百分比
    getQuotaPercentage(channel) {
        const usedGB = this.getChannelUsedGB(channel);
        const limitGB = channel.quota?.limitGB || 10;
        const percentage = (usedGB / limitGB) * 100;
        return Math.min(100, Math.round(percentage * 10) / 10);
    },
    // 获取进度条状态
    getQuotaStatus(channel) {
        const percentage = this.getQuotaPercentage(channel);
        const threshold = channel.quota?.threshold || 95;
        if (percentage >= threshold) return 'exception';
        if (percentage >= 80) return 'warning';
        return 'success';
    },
    // 获取容量文本
    getQuotaText(channel) {
        const usedGB = this.getChannelUsedGB(channel);
        const limitGB = channel.quota?.limitGB || 10;
        return `${usedGB.toFixed(2)} / ${limitGB} GB`;
    },
    // 判断是否超过阈值
    isQuotaExceeded(channel) {
        const percentage = this.getQuotaPercentage(channel);
        const threshold = channel.quota?.threshold || 95;
        return percentage >= threshold;
    },
    // 获取状态文本
    getQuotaStatusText(channel) {
        const percentage = this.getQuotaPercentage(channel);
        const threshold = channel.quota?.threshold || 95;
        if (percentage >= threshold) {
            return `⚠️ 已达到容量阈值 (${threshold}%)，渠道写入已暂停`;
        }
        if (percentage >= 80) {
            return `⚡ 容量使用较高，接近阈值`;
        }
        return `✓ 容量正常`;
    },
    // 容量限制开关变化时
    async onQuotaEnabledChange(enabled, channel) {
        if (enabled && channel.name) {
            // 首次启用时，检查是否有该渠道的统计数据
            const stats = this.quotaStats[channel.name];
            if (!stats) {
                // 没有统计数据，提示用户需要重新统计
                this.$confirm(
                    '首次启用容量限制需要统计现有文件容量，这可能需要一些时间。是否立即统计？',
                    '初始化容量统计',
                    {
                        confirmButtonText: '立即统计',
                        cancelButtonText: '稍后手动统计',
                        type: 'info'
                    }
                ).then(async () => {
                    await this.recalculateQuota();
                }).catch(() => {
                    this.$message.info('您可以稍后点击刷新按钮手动统计');
                });
            }
        }
    },
    // 重新统计容量
    async recalculateQuota() {
        this.quotaLoading = true;
        try {
            this.$message.info('正在统计容量，请稍候...');
            const response = await fetchWithAuth('/api/manage/quota', {
                method: 'POST'
            });
            const data = await response.json();
            if (data.success) {
                this.quotaStats = data.channelStats || {};
                this.$message.success('容量统计完成');
            } else {
                this.$message.error('统计失败: ' + (data.error || '未知错误'));
            }
        } catch (error) {
            console.error('Failed to recalculate quota:', error);
            this.$message.error('统计失败');
        } finally {
            this.quotaLoading = false;
        }
    }

},
mounted() {
    this.loading = true;
    // 获取上传设置
    fetchWithAuth('/api/manage/sysConfig/upload')
    .then((response) => response.json())
    .then((data) => {
        this.telegramSettings = data.telegram;
        // 确保 R2 渠道有 quota 默认值
        if (data.cfr2 && data.cfr2.channels) {
            data.cfr2.channels = data.cfr2.channels.map(channel => ({
                ...channel,
                quota: channel.quota || { enabled: false, limitGB: 10, threshold: 95 }
            }));
        }
        this.cfr2Settings = data.cfr2;
        // 确保 S3 渠道有 quota 默认值
        if (data.s3 && data.s3.channels) {
            data.s3.channels = data.s3.channels.map(channel => ({
                ...channel,
                quota: channel.quota || { enabled: false, limitGB: 10, threshold: 95 }
            }));
        }
        this.s3Settings = data.s3;
        // 确保 Discord 渠道有默认值
        if (data.discord && data.discord.channels) {
            data.discord.channels = data.discord.channels.map(channel => ({
                ...channel,
                proxyUrl: channel.proxyUrl || ''
            }));
        }
        this.discordSettings = data.discord || { loadBalance: {}, channels: [] };
        // 确保 HuggingFace 渠道有默认值
        if (data.huggingface && data.huggingface.channels) {
            data.huggingface.channels = data.huggingface.channels.map(channel => ({
                ...channel,
                isPrivate: channel.isPrivate || false
            }));
        }
        this.huggingfaceSettings = data.huggingface || { loadBalance: {}, channels: [] };
        // 加载容量统计（仅读取，不重建索引）
        this.loadQuotaStats();
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

/* 容量状态样式 */
.quota-status {
    width: 100%;
    max-width: 400px;
}

.quota-status :deep(.el-progress) {
    margin-bottom: 8px;
}

.quota-status :deep(.el-progress-bar__inner) {
    transition: width 0.5s ease;
}

.quota-info {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    padding: 8px 12px;
    background: var(--el-fill-color);
    border-radius: 6px;
}

.quota-info.quota-warning {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
    font-weight: 500;
}

/* Discord 限制提示 */
.discord-limit-tip {
    font-size: 13px;
    color: var(--el-color-info);
    padding: 10px 14px;
    background: var(--el-color-info-light-9);
    border-radius: 6px;
    border-left: 3px solid var(--el-color-info);
    white-space: nowrap;
}

/* HuggingFace 提示 */
.huggingface-tip {
    font-size: 13px;
    color: var(--el-color-info);
    padding: 10px 14px;
    background: var(--el-color-info-light-9);
    border-radius: 6px;
    border-left: 3px solid var(--el-color-info);
    white-space: nowrap;
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

    .quota-status {
        max-width: 100%;
    }
}
</style>