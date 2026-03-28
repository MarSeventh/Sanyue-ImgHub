<template>
    <div class="upload-settings" v-loading="loading">
        <!-- 页面标题和操作 -->
        <div class="page-header">
            <h3 class="first-title">
                {{ $t('sysUpload.title') }}
                <el-tooltip :content="$t('sysUpload.titleTooltip')" placement="right">
                    <font-awesome-icon icon="question-circle" class="help-icon"/>
                </el-tooltip>
            </h3>
            <div class="header-actions">
                <CustomSelect
                    v-model="channelFilter"
                    :options="filterOptions"
                    :placeholder="$t('sysUpload.filterPlaceholder')"
                    width="160px"
                />
                <el-button type="primary" @click="showAddDialog = true" class="add-btn">
                    <font-awesome-icon icon="plus" style="margin-right: 6px;"/>
                    {{ $t('sysUpload.addChannel') }}
                </el-button>
            </div>
        </div>

        <!-- 渠道卡片列表 - 按类型分组 -->
        <div v-for="channelType in filteredChannels" :key="channelType.value" class="channel-group">
            <div class="group-header">
                <div class="group-title">
                    <font-awesome-icon :icon="getChannelIcon(channelType.value)" class="group-icon"/>
                    <span>{{ channelType.label }}</span>
                    <el-tag size="small" type="info" class="channel-count">
                        {{ getChannelList(channelType.value).length }}
                    </el-tag>
                </div>
                <!-- 负载均衡开关 -->
                <div v-if="hasLoadBalance(channelType.value)" class="load-balance-switch">
                    <span class="switch-label">{{ $t('sysUpload.loadBalance') }}</span>
                    <el-switch v-model="getSettings(channelType.value).loadBalance.enabled" size="small" @change="saveSettings"/>
                </div>
            </div>

            <!-- 渠道卡片网格 -->
            <div class="channel-cards" v-if="getChannelList(channelType.value).length > 0">
                <div
                    v-for="(channel, index) in getChannelList(channelType.value)"
                    :key="channel.name || index"
                    class="channel-card"
                    :class="[channelType.value, { 'disabled': !channel.enabled, 'fixed': channel.fixed }]"
                    @mousemove="handleCardMouseMove($event, channelType.value, index)"
                    @mouseleave="handleCardMouseLeave(channelType.value, index)"
                >
                    <div class="card-glow" :ref="`glow-${channelType.value}-${index}`"></div>
                    <div class="card-header">
                        <div class="card-title">
                            <span class="channel-name">{{ channel.name || $t('sysUpload.unnamedChannel') }}</span>
                            <el-tag v-if="channel.fixed" size="small" type="warning">{{ $t('sysUpload.envVariable') }}</el-tag>
                        </div>
                        <el-switch v-model="channel.enabled" size="small" @click.stop @change="saveSettings"/>
                    </div>
                    <div class="card-body">
                        <div class="card-info">
                            <template v-if="channelType.value === 'telegram'">
                                <div class="info-item">
                                    <font-awesome-icon icon="robot" class="info-icon"/>
                                    <span class="info-text">Bot: {{ maskText(channel.botToken) }}</span>
                                </div>
                                <div class="info-item" v-if="channel.chatId">
                                    <font-awesome-icon icon="comments" class="info-icon"/>
                                    <span class="info-text">Channel: {{ maskText(channel.chatId) }}</span>
                                </div>
                            </template>
                            <template v-else-if="channelType.value === 'cfr2'">
                                <div class="info-item">
                                    <font-awesome-icon icon="link" class="info-icon"/>
                                    <span class="info-text" :title="channel.publicUrl">{{ channel.publicUrl || $t('sysUpload.notSet') }}</span>
                                </div>
                            </template>
                            <template v-else-if="channelType.value === 's3'">
                                <div class="info-item">
                                    <font-awesome-icon icon="server" class="info-icon"/>
                                    <span class="info-text">{{ channel.bucketName || $t('sysUpload.notSet') }}</span>
                                </div>
                                <div class="info-item" v-if="channel.endpoint">
                                    <font-awesome-icon icon="link" class="info-icon"/>
                                    <span class="info-text" :title="channel.endpoint">{{ channel.endpoint }}</span>
                                </div>
                            </template>
                            <template v-else-if="channelType.value === 'discord'">
                                <div class="info-item">
                                    <font-awesome-icon icon="robot" class="info-icon"/>
                                    <span class="info-text">Bot: {{ maskText(channel.botToken) }}</span>
                                </div>
                                <div class="info-item">
                                    <font-awesome-icon icon="hashtag" class="info-icon"/>
                                    <span class="info-text">Channel: {{ maskText(channel.channelId) }}</span>
                                </div>
                                <el-tag v-if="channel.isNitro" size="small" type="success">Nitro</el-tag>
                            </template>
                            <template v-else-if="channelType.value === 'huggingface'">
                                <div class="info-item">
                                    <font-awesome-icon icon="database" class="info-icon"/>
                                    <span class="info-text">{{ channel.repo || $t('sysUpload.notSet') }}</span>
                                </div>
                                <el-tag v-if="channel.isPrivate" size="small" type="warning">{{ $t('sysUpload.privateRepo') }}</el-tag>
                            </template>
                        </div>
                        <!-- 容量显示 -->
                        <div v-if="channel.quota?.enabled" class="quota-mini">
                            <el-progress
                                :percentage="getQuotaPercentage(channel)"
                                :status="getQuotaStatus(channel)"
                                :stroke-width="6"
                            />
                            <span class="quota-text">{{ getQuotaText(channel) }}</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <el-button text type="primary" size="small" @click="openDetailDialog(channelType.value, index)">
                            <font-awesome-icon icon="eye" style="margin-right: 4px;"/>{{ $t('sysUpload.detail') }}
                        </el-button>
                        <el-button text type="primary" size="small" @click="openEditDialog(channelType.value, index)">
                            <font-awesome-icon icon="edit" style="margin-right: 4px;"/>{{ $t('sysUpload.editBtn') }}
                        </el-button>
                        <el-button text type="danger" size="small" @click="deleteChannel(channelType.value, index)" :disabled="channel.fixed">
                            <font-awesome-icon icon="trash-alt" style="margin-right: 4px;"/>{{ $t('sysUpload.deleteBtn') }}
                        </el-button>
                    </div>
                </div>
            </div>
            <div v-else class="empty-tip">
                <font-awesome-icon icon="inbox" class="empty-icon"/>
                <span>{{ $t('sysUpload.noChannels', { type: channelType.label }) }}</span>
            </div>
        </div>

        <!-- 添加渠道弹窗 -->
        <el-dialog v-model="showAddDialog" :title="$t('sysUpload.addDialogTitle')" class="channel-dialog" destroy-on-close @closed="resetAddForm">
            <el-form :model="newChannel" label-position="top" ref="addForm" :rules="addRules">
                <el-form-item :label="$t('sysUpload.channelTypeLabel')" prop="type">
                    <el-select v-model="newChannel.type" :placeholder="$t('sysUpload.channelTypePlaceholder')" style="width: 100%;" @change="onChannelTypeChange">
                        <el-option v-for="ch in addableChannels" :key="ch.value" :label="ch.label" :value="ch.value">
                            <font-awesome-icon :icon="getChannelIcon(ch.value)" class="select-option-icon"/>
                            {{ ch.label }}
                        </el-option>
                    </el-select>
                </el-form-item>
                <template v-if="newChannel.type === 'cfr2'">
                    <div class="form-warning" style="margin-top: 0;">
                        <font-awesome-icon icon="info-circle" style="margin-right: 6px;"/>
                        <span v-html="$t('sysUpload.r2ConfigNote')"></span>
                    </div>
                </template>
                <template v-else>
                <el-form-item :label="$t('sysUpload.channelNameLabel')" prop="name">
                    <el-input v-model="newChannel.name" :placeholder="$t('sysUpload.channelNamePlaceholder')"/>
                </el-form-item>
                <!-- 根据类型显示不同字段 -->
                <template v-if="newChannel.type === 'telegram'">
                    <el-form-item :label="$t('sysUpload.botTokenLabel')" prop="botToken">
                        <el-input v-model="newChannel.botToken" type="password" show-password :placeholder="$t('sysUpload.botTokenPlaceholder')"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.chatIdLabel')" prop="chatId">
                        <el-input v-model="newChannel.chatId" type="password" show-password :placeholder="$t('sysUpload.chatIdPlaceholder')"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.proxyDomain')">
                        <el-input v-model="newChannel.proxyUrl" :placeholder="$t('sysUpload.proxyDomainPlaceholder')"/>
                    </el-form-item>
                </template>
                <template v-else-if="newChannel.type === 's3'">
                    <el-form-item :label="$t('sysUpload.endpointLabel')" prop="endpoint">
                        <el-input v-model="newChannel.endpoint" :placeholder="$t('sysUpload.endpointPlaceholder')"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.cdnDomain')">
                        <el-input v-model="newChannel.cdnDomain" :placeholder="$t('sysUpload.cdnDomainPlaceholder')"/>
                        <span class="form-tip">{{ $t('sysUpload.cdnDomainTip') }}</span>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.bucketName')" prop="bucketName">
                        <el-input v-model="newChannel.bucketName" :placeholder="$t('sysUpload.bucketNamePlaceholder')"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.bucketRegion')" prop="region">
                        <el-input v-model="newChannel.region" :placeholder="$t('sysUpload.bucketRegionPlaceholder')"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.accessKeyId')" prop="accessKeyId">
                        <el-input v-model="newChannel.accessKeyId" type="password" show-password :placeholder="$t('sysUpload.accessKeyIdPlaceholder')"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.secretAccessKey')" prop="secretAccessKey">
                        <el-input v-model="newChannel.secretAccessKey" type="password" show-password :placeholder="$t('sysUpload.secretAccessKeyPlaceholder')"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.pathStyle')">
                        <el-switch v-model="newChannel.pathStyle"/>
                        <span class="form-tip">{{ $t('sysUpload.pathStyleTip') }}</span>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.quotaLimit')">
                        <el-switch v-model="newChannel.quota.enabled"/>
                    </el-form-item>
                    <template v-if="newChannel.quota?.enabled">
                        <el-form-item :label="$t('sysUpload.quotaLimitGB')">
                            <el-input-number v-model="newChannel.quota.limitGB" :min="0.1" :step="1" :precision="1"/>
                        </el-form-item>
                        <el-form-item :label="$t('sysUpload.quotaThreshold')">
                            <el-input-number v-model="newChannel.quota.threshold" :min="50" :max="100" :step="5"/>
                        </el-form-item>
                    </template>
                </template>
                <template v-else-if="newChannel.type === 'discord'">
                    <el-form-item :label="$t('sysUpload.botTokenLabel')" prop="botToken">
                        <el-input v-model="newChannel.botToken" type="password" show-password :placeholder="$t('sysUpload.botTokenPlaceholder')"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.channelIdLabel')" prop="channelId">
                        <el-input v-model="newChannel.channelId" type="password" show-password :placeholder="$t('sysUpload.channelIdPlaceholder')"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.proxyDomain')">
                        <el-input v-model="newChannel.proxyUrl" :placeholder="$t('sysUpload.proxyDomainPlaceholder')"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.nitroMember')">
                        <el-switch v-model="newChannel.isNitro"/>
                        <span class="form-tip">{{ $t('sysUpload.nitroTip') }}</span>
                    </el-form-item>
                    <div class="form-warning">
                        <font-awesome-icon icon="exclamation-triangle" style="margin-right: 6px;"/>
                        {{ $t('sysUpload.discordWarning') }}
                    </div>
                </template>
                <template v-else-if="newChannel.type === 'huggingface'">
                    <el-form-item :label="$t('sysUpload.repoName')" prop="repo">
                        <el-input v-model="newChannel.repo" :placeholder="$t('sysUpload.repoNamePlaceholder')"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.accessToken')" prop="token">
                        <el-input v-model="newChannel.token" type="password" show-password :placeholder="$t('sysUpload.accessTokenPlaceholder')"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.privateRepo')">
                        <el-switch v-model="newChannel.isPrivate"/>
                        <span class="form-tip">{{ $t('sysUpload.privateRepoTip') }}</span>
                    </el-form-item>
                </template>
                </template>
            </el-form>
            <template #footer>
                <el-button @click="showAddDialog = false">{{ $t('sysUpload.cancel') }}</el-button>
                <el-button type="primary" @click="confirmAddChannel" v-if="newChannel.type !== 'cfr2'">{{ $t('sysUpload.confirmAdd') }}</el-button>
            </template>
        </el-dialog>

        <!-- 详情弹窗 -->
        <el-dialog v-model="showDetailDialog" :title="$t('sysUpload.detailDialogTitle', { name: currentChannel?.name || '' })" class="channel-dialog" @closed="resetDetailData">
            <el-descriptions :column="1" border>
                <el-descriptions-item :label="$t('sysUpload.channelNameDetail')">{{ currentChannel?.name }}</el-descriptions-item>
                <el-descriptions-item :label="$t('sysUpload.channelTypeDetail')">{{ getChannelTypeLabel(currentChannelType) }}</el-descriptions-item>
                <el-descriptions-item :label="$t('sysUpload.statusLabel')">
                    <el-tag :type="currentChannel?.enabled ? 'success' : 'info'">
                        {{ currentChannel?.enabled ? $t('sysUpload.enabled') : $t('sysUpload.disabled') }}
                    </el-tag>
                </el-descriptions-item>
                <el-descriptions-item v-if="currentChannel?.fixed" :label="$t('sysUpload.configSource')">
                    <el-tag type="warning">{{ $t('sysUpload.envVariable') }}</el-tag>
                </el-descriptions-item>
                <template v-if="currentChannelType === 'telegram'">
                    <el-descriptions-item :label="$t('sysUpload.botTokenLabel')">{{ maskText(currentChannel?.botToken, 10) }}</el-descriptions-item>
                    <el-descriptions-item :label="$t('sysUpload.chatIdLabel')">{{ maskText(currentChannel?.chatId, 6) }}</el-descriptions-item>
                    <el-descriptions-item :label="$t('sysUpload.proxyDomain')">{{ currentChannel?.proxyUrl || $t('sysUpload.notSet') }}</el-descriptions-item>
                </template>
                <template v-else-if="currentChannelType === 'cfr2'">
                    <el-descriptions-item :label="$t('sysUpload.publicUrl')">
                        <el-input :model-value="currentChannel?.publicUrl || $t('sysUpload.notSet')" readonly />
                    </el-descriptions-item>
                </template>
                <template v-else-if="currentChannelType === 's3'">
                    <el-descriptions-item :label="$t('sysUpload.endpointLabel')">
                        <el-input :model-value="currentChannel?.endpoint" readonly />
                    </el-descriptions-item>
                    <el-descriptions-item :label="$t('sysUpload.cdnDomain')">
                        <el-input :model-value="currentChannel?.cdnDomain || $t('sysUpload.notSet')" readonly />
                    </el-descriptions-item>
                    <el-descriptions-item :label="$t('sysUpload.bucketName')">{{ currentChannel?.bucketName }}</el-descriptions-item>
                    <el-descriptions-item :label="$t('sysUpload.bucketRegion')">{{ currentChannel?.region }}</el-descriptions-item>
                    <el-descriptions-item :label="$t('sysUpload.pathStyle')">{{ currentChannel?.pathStyle ? $t('sysUpload.isPathStyle') : $t('sysUpload.isNotPathStyle') }}</el-descriptions-item>
                </template>
                <template v-else-if="currentChannelType === 'discord'">
                    <el-descriptions-item :label="$t('sysUpload.botTokenLabel')">{{ maskText(currentChannel?.botToken, 10) }}</el-descriptions-item>
                    <el-descriptions-item :label="$t('sysUpload.channelIdLabel')">{{ maskText(currentChannel?.channelId, 6) }}</el-descriptions-item>
                    <el-descriptions-item :label="$t('sysUpload.proxyDomain')">{{ currentChannel?.proxyUrl || $t('sysUpload.notSet') }}</el-descriptions-item>
                    <el-descriptions-item :label="$t('sysUpload.nitroMember')">{{ currentChannel?.isNitro ? $t('sysUpload.isPathStyle') : $t('sysUpload.isNotPathStyle') }}</el-descriptions-item>
                </template>
                <template v-else-if="currentChannelType === 'huggingface'">
                    <el-descriptions-item :label="$t('sysUpload.repoName')">{{ currentChannel?.repo }}</el-descriptions-item>
                    <el-descriptions-item :label="$t('sysUpload.privateRepo')">{{ currentChannel?.isPrivate ? $t('sysUpload.isPathStyle') : $t('sysUpload.isNotPathStyle') }}</el-descriptions-item>
                </template>
                <!-- 容量信息 -->
                <template v-if="currentChannel?.quota?.enabled">
                    <el-descriptions-item :label="$t('sysUpload.quotaLimit')">{{ currentChannel?.quota?.limitGB }} GB</el-descriptions-item>
                    <el-descriptions-item :label="$t('sysUpload.quotaThreshold')">{{ currentChannel?.quota?.threshold }}%</el-descriptions-item>
                    <el-descriptions-item>
                        <template #label>
                            <span class="quota-label">
                                {{ $t('sysUpload.currentUsage') }}
                                <el-button link type="primary" @click="refreshQuota" class="refresh-btn">
                                    <font-awesome-icon icon="sync-alt" :class="{ 'fa-spin': quotaLoading }" />
                                </el-button>
                            </span>
                        </template>
                        <div class="quota-status">
                            <el-progress
                                :percentage="getQuotaPercentage(currentChannel)"
                                :status="getQuotaStatus(currentChannel)"
                                :stroke-width="16"
                                :text-inside="true"
                                :format="() => getQuotaText(currentChannel)"
                            />
                            <div class="quota-info" :class="{ 'quota-warning': isQuotaExceeded(currentChannel) }">
                                {{ getQuotaStatusText(currentChannel) }}
                            </div>
                        </div>
                    </el-descriptions-item>
                </template>
            </el-descriptions>
            <template #footer>
                <el-button @click="showDetailDialog = false">{{ $t('sysUpload.closeBtn') }}</el-button>
                <el-button type="primary" @click="openEditFromDetail">{{ $t('sysUpload.editBtn') }}</el-button>
            </template>
        </el-dialog>

        <!-- 编辑弹窗 -->
        <el-dialog v-model="showEditDialog" :title="$t('sysUpload.editDialogTitle', { name: editChannel?.name || '' })" class="channel-dialog" destroy-on-close @closed="resetEditData">
            <el-form :model="editChannel" label-position="top" ref="editForm" :rules="editRules">
                <el-form-item :label="$t('sysUpload.channelNameLabel')" prop="name">
                    <el-input v-model="editChannel.name" :disabled="editChannel.fixed"/>
                </el-form-item>
                <el-form-item :label="$t('sysUpload.enableChannel')">
                    <el-switch v-model="editChannel.enabled"/>
                </el-form-item>
                <!-- 根据类型显示不同字段 -->
                <template v-if="currentChannelType === 'telegram'">
                    <el-form-item :label="$t('sysUpload.botTokenLabel')" prop="botToken">
                        <el-input v-model="editChannel.botToken" :disabled="editChannel.fixed" type="password" show-password/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.chatIdLabel')" prop="chatId">
                        <el-input v-model="editChannel.chatId" :disabled="editChannel.fixed" type="password" show-password/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.proxyDomain')">
                        <el-input v-model="editChannel.proxyUrl" :placeholder="$t('sysUpload.proxyDomainPlaceholder')"/>
                    </el-form-item>
                </template>
                <template v-else-if="currentChannelType === 'cfr2'">
                    <el-form-item :label="$t('sysUpload.publicUrl')">
                        <el-input v-model="editChannel.publicUrl"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.quotaLimit')">
                        <el-switch v-model="editChannel.quota.enabled" @change="(val) => onQuotaEnabledChange(val, editChannel)"/>
                    </el-form-item>
                    <template v-if="editChannel.quota?.enabled">
                        <el-form-item :label="$t('sysUpload.quotaLimitGB')">
                            <el-input-number v-model="editChannel.quota.limitGB" :min="0.1" :step="1" :precision="1"/>
                        </el-form-item>
                        <el-form-item :label="$t('sysUpload.quotaThreshold')">
                            <el-input-number v-model="editChannel.quota.threshold" :min="50" :max="100" :step="5"/>
                        </el-form-item>
                    </template>
                </template>
                <template v-else-if="currentChannelType === 's3'">
                    <el-form-item :label="$t('sysUpload.endpointLabel')" prop="endpoint">
                        <el-input v-model="editChannel.endpoint" :disabled="editChannel.fixed"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.cdnDomain')">
                        <el-input v-model="editChannel.cdnDomain" :placeholder="$t('sysUpload.cdnDomainPlaceholder')"/>
                        <span class="form-tip">{{ $t('sysUpload.cdnDomainTip') }}</span>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.bucketName')" prop="bucketName">
                        <el-input v-model="editChannel.bucketName" :disabled="editChannel.fixed"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.bucketRegion')" prop="region">
                        <el-input v-model="editChannel.region" :disabled="editChannel.fixed"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.accessKeyId')" prop="accessKeyId">
                        <el-input v-model="editChannel.accessKeyId" :disabled="editChannel.fixed" type="password" show-password/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.secretAccessKey')" prop="secretAccessKey">
                        <el-input v-model="editChannel.secretAccessKey" :disabled="editChannel.fixed" type="password" show-password/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.pathStyle')">
                        <el-switch v-model="editChannel.pathStyle" :disabled="editChannel.fixed"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.quotaLimit')">
                        <el-switch v-model="editChannel.quota.enabled" @change="(val) => onQuotaEnabledChange(val, editChannel)"/>
                    </el-form-item>
                    <template v-if="editChannel.quota?.enabled">
                        <el-form-item :label="$t('sysUpload.quotaLimitGB')">
                            <el-input-number v-model="editChannel.quota.limitGB" :min="0.1" :step="1" :precision="1"/>
                        </el-form-item>
                        <el-form-item :label="$t('sysUpload.quotaThreshold')">
                            <el-input-number v-model="editChannel.quota.threshold" :min="50" :max="100" :step="5"/>
                        </el-form-item>
                    </template>
                </template>
                <template v-else-if="currentChannelType === 'discord'">
                    <el-form-item :label="$t('sysUpload.botTokenLabel')" prop="botToken">
                        <el-input v-model="editChannel.botToken" :disabled="editChannel.fixed" type="password" show-password/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.channelIdLabel')" prop="channelId">
                        <el-input v-model="editChannel.channelId" :disabled="editChannel.fixed" type="password" show-password/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.proxyDomain')">
                        <el-input v-model="editChannel.proxyUrl" :placeholder="$t('sysUpload.proxyDomainPlaceholder')"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.nitroMember')">
                        <el-switch v-model="editChannel.isNitro"/>
                    </el-form-item>
                </template>
                <template v-else-if="currentChannelType === 'huggingface'">
                    <el-form-item :label="$t('sysUpload.repoName')" prop="repo">
                        <el-input v-model="editChannel.repo" :disabled="editChannel.fixed"/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.accessToken')" prop="token">
                        <el-input v-model="editChannel.token" :disabled="editChannel.fixed" type="password" show-password/>
                    </el-form-item>
                    <el-form-item :label="$t('sysUpload.privateRepo')">
                        <el-switch v-model="editChannel.isPrivate"/>
                    </el-form-item>
                </template>
            </el-form>
            <template #footer>
                <el-button @click="showEditDialog = false">{{ $t('sysUpload.cancel') }}</el-button>
                <el-button type="primary" @click="confirmEditChannel">{{ $t('sysUpload.saveChanges') }}</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script>
import fetchWithAuth from '@/utils/fetchWithAuth';
import CustomSelect from './CustomSelect.vue';

export default {
components: {
    CustomSelect
},
data() {
    return {
    // 渠道类型筛选
    channelFilter: '',
    // 渠道类型列表
    channels: [
        { value: 'telegram', label: 'Telegram' },
        { value: 'cfr2', label: 'CloudFlare R2' },
        { value: 's3', label: 'S3' },
        { value: 'discord', label: 'Discord' },
        { value: 'huggingface', label: 'HuggingFace' }
    ],
    // 可添加的渠道类型
    addableChannels: [
        { value: 'telegram', label: 'Telegram' },
        { value: 'cfr2', label: 'CloudFlare R2' },
        { value: 's3', label: 'S3' },
        { value: 'discord', label: 'Discord' },
        { value: 'huggingface', label: 'HuggingFace' }
    ],

    // 各渠道配置
    telegramSettings: { loadBalance: { enabled: false }, channels: [] },
    cfr2Settings: { channels: [] },
    s3Settings: { loadBalance: { enabled: false }, channels: [] },
    discordSettings: { loadBalance: { enabled: false }, channels: [] },
    huggingfaceSettings: { loadBalance: { enabled: false }, channels: [] },

    // 弹窗控制
    showAddDialog: false,
    showDetailDialog: false,
    showEditDialog: false,

    // 当前操作的渠道
    currentChannelType: '',
    currentChannelIndex: -1,
    currentChannel: null,
    editChannel: {},

    // 新增渠道表单
    newChannel: {
        type: '',
        name: '',
        enabled: true,
        // Telegram
        botToken: '',
        chatId: '',
        proxyUrl: '',
        // S3
        endpoint: '',
        cdnDomain: '',
        bucketName: '',
        region: 'auto',
        accessKeyId: '',
        secretAccessKey: '',
        pathStyle: false,
        quota: { enabled: false, limitGB: 10, threshold: 95 },
        // Discord
        channelId: '',
        isNitro: false,
        // HuggingFace
        repo: '',
        token: '',
        isPrivate: false
    },

    // 容量统计数据
    quotaStats: {},
    quotaLoading: false,

    // 加载状态
    loading: false
    };
},
computed: {
    // 筛选下拉框选项
    filterOptions() {
        const iconMap = {
            telegram: 'paper-plane',
            cfr2: 'cloud',
            s3: 'database',
            discord: 'comments',
            huggingface: 'robot'
        };
        return [
            { value: '', label: this.$t('common.all') },
            ...this.channels.map(ch => ({
                value: ch.value,
                label: ch.label,
                icon: iconMap[ch.value] || 'server'
            }))
        ];
    },
    // 根据筛选条件过滤渠道类型
    filteredChannels() {
        if (!this.channelFilter) {
            return this.channels;
        }
        return this.channels.filter(ch => ch.value === this.channelFilter);
    },
    addRules() {
        return {
            type: [{ required: true, message: this.$t('sysUpload.channelTypePlaceholder'), trigger: 'change' }],
            name: [
                { required: true, message: this.$t('sysUpload.channelNamePlaceholder'), trigger: 'blur' },
                { pattern: /^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/, message: this.$t('sysUpload.channelNamePlaceholder'), trigger: 'blur' }
            ],
            botToken: [{ required: true, message: this.$t('sysUpload.botTokenPlaceholder'), trigger: 'blur' }],
            chatId: [{ required: true, message: this.$t('sysUpload.chatIdPlaceholder'), trigger: 'blur' }],
            channelId: [{ required: true, message: this.$t('sysUpload.channelIdPlaceholder'), trigger: 'blur' }],
            endpoint: [{ required: true, message: this.$t('sysUpload.endpointPlaceholder'), trigger: 'blur' }],
            bucketName: [{ required: true, message: this.$t('sysUpload.bucketNamePlaceholder'), trigger: 'blur' }],
            region: [{ required: true, message: this.$t('sysUpload.bucketRegionPlaceholder'), trigger: 'blur' }],
            accessKeyId: [{ required: true, message: this.$t('sysUpload.accessKeyIdPlaceholder'), trigger: 'blur' }],
            secretAccessKey: [{ required: true, message: this.$t('sysUpload.secretAccessKeyPlaceholder'), trigger: 'blur' }],
            repo: [{ required: true, message: this.$t('sysUpload.repoNamePlaceholder'), trigger: 'blur' }],
            token: [{ required: true, message: this.$t('sysUpload.accessTokenPlaceholder'), trigger: 'blur' }]
        };
    },
    editRules() {
        return {
            name: [
                { required: true, message: this.$t('sysUpload.channelNamePlaceholder'), trigger: 'blur' },
                { pattern: /^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/, message: this.$t('sysUpload.channelNamePlaceholder'), trigger: 'blur' }
            ],
            botToken: [{ required: true, message: this.$t('sysUpload.botTokenPlaceholder'), trigger: 'blur' }],
            chatId: [{ required: true, message: this.$t('sysUpload.chatIdPlaceholder'), trigger: 'blur' }],
            channelId: [{ required: true, message: this.$t('sysUpload.channelIdPlaceholder'), trigger: 'blur' }],
            endpoint: [{ required: true, message: this.$t('sysUpload.endpointPlaceholder'), trigger: 'blur' }],
            bucketName: [{ required: true, message: this.$t('sysUpload.bucketNamePlaceholder'), trigger: 'blur' }],
            region: [{ required: true, message: this.$t('sysUpload.bucketRegionPlaceholder'), trigger: 'blur' }],
            accessKeyId: [{ required: true, message: this.$t('sysUpload.accessKeyIdPlaceholder'), trigger: 'blur' }],
            secretAccessKey: [{ required: true, message: this.$t('sysUpload.secretAccessKeyPlaceholder'), trigger: 'blur' }],
            repo: [{ required: true, message: this.$t('sysUpload.repoNamePlaceholder'), trigger: 'blur' }],
            token: [{ required: true, message: this.$t('sysUpload.accessTokenPlaceholder'), trigger: 'blur' }]
        };
    }
},
methods: {
    // 卡片光斑跟随鼠标
    handleCardMouseMove(event, channelType, index) {
        const card = event.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const refKey = `glow-${channelType}-${index}`;
        const glowEl = this.$refs[refKey];
        if (glowEl && glowEl[0]) {
            glowEl[0].style.opacity = '1';
            glowEl[0].style.left = `${x}px`;
            glowEl[0].style.top = `${y}px`;
        }
    },
    handleCardMouseLeave(channelType, index) {
        const refKey = `glow-${channelType}-${index}`;
        const glowEl = this.$refs[refKey];
        if (glowEl && glowEl[0]) {
            glowEl[0].style.opacity = '0';
        }
    },
    // 获取渠道图标
    getChannelIcon(type) {
        const icons = {
            telegram: 'paper-plane',
            cfr2: 'cloud',
            s3: 'database',
            discord: 'comments',
            huggingface: 'robot'
        };
        return icons[type] || 'server';
    },
    // 获取渠道类型标签
    getChannelTypeLabel(type) {
        const channel = this.channels.find(c => c.value === type);
        return channel ? channel.label : type;
    },
    // 获取渠道列表
    getChannelList(type) {
        return this.getSettings(type)?.channels || [];
    },
    // 获取渠道设置对象
    getSettings(type) {
        const map = {
            telegram: this.telegramSettings,
            cfr2: this.cfr2Settings,
            s3: this.s3Settings,
            discord: this.discordSettings,
            huggingface: this.huggingfaceSettings
        };
        return map[type];
    },
    // 是否有负载均衡选项
    hasLoadBalance(type) {
        return ['telegram', 's3', 'discord', 'huggingface'].includes(type);
    },
    // 文本脱敏
    maskText(text, showLength = 4) {
        if (!text) return this.$t('sysUpload.notSet');
        if (text.length <= showLength * 2) return '****';
        return text.slice(0, showLength) + '****' + text.slice(-showLength);
    },
    // 打开详情弹窗
    openDetailDialog(type, index) {
        this.currentChannelType = type;
        this.currentChannelIndex = index;
        this.currentChannel = this.getChannelList(type)[index];
        this.showDetailDialog = true;
    },
    // 打开编辑弹窗
    openEditDialog(type, index) {
        this.currentChannelType = type;
        this.currentChannelIndex = index;
        const channel = this.getChannelList(type)[index];
        this.editChannel = JSON.parse(JSON.stringify(channel));
        // 确保 quota 对象存在
        if (!this.editChannel.quota) {
            this.editChannel.quota = { enabled: false, limitGB: 10, threshold: 95 };
        }
        this.showEditDialog = true;
    },
    // 从详情页打开编辑
    openEditFromDetail() {
        this.showDetailDialog = false;
        this.openEditDialog(this.currentChannelType, this.currentChannelIndex);
    },
    // 重置添加表单
    resetAddForm() {
        this.newChannel = {
            type: '', name: '', enabled: true,
            botToken: '', chatId: '', proxyUrl: '',
            endpoint: '', bucketName: '', region: 'auto',
            accessKeyId: '', secretAccessKey: '', pathStyle: false,
            quota: { enabled: false, limitGB: 10, threshold: 95 },
            channelId: '', isNitro: false,
            repo: '', token: '', isPrivate: false
        };
    },
    // 重置详情弹窗数据
    resetDetailData() {
        this.currentChannel = null;
    },
    // 重置编辑弹窗数据
    resetEditData() {
        this.editChannel = {};
    },
    // 渠道类型变更时重置表单
    onChannelTypeChange() {
        // 保留 type 和 name，重置其他字段
        const { type, name } = this.newChannel;
        this.newChannel = {
            type,
            name,
            enabled: true,
            botToken: '',
            chatId: '',
            proxyUrl: '',
            endpoint: '',
            cdnDomain: '',
            bucketName: '',
            region: 'auto',
            accessKeyId: '',
            secretAccessKey: '',
            pathStyle: false,
            quota: { enabled: false, limitGB: 10, threshold: 95 },
            channelId: '',
            isNitro: false,
            repo: '',
            token: '',
            isPrivate: false
        };
    },
    // 确认添加渠道
    confirmAddChannel() {
        this.$refs.addForm.validate((valid) => {
            if (!valid) return;

            const { type, name } = this.newChannel;
            const settings = this.getSettings(type);

            // 检查是否为保留名称（{type}_env）
            const reservedNames = ['Telegram_env', 'R2_env', 'S3_env', 'Discord_env', 'HuggingFace_env'];
            if (reservedNames.includes(name)) {
                this.$message.warning(this.$t('sysUpload.reservedName'));
                return;
            }

            // 检查名称是否重复
            const isDuplicate = settings.channels.some(ch => ch.name === name);
            if (isDuplicate) {
                this.$message.warning(this.$t('sysUpload.duplicateName'));
                return;
            }

            let newChannelData = {
                id: settings.channels.length + 1,
                name: this.newChannel.name,
                type: type,
                savePath: 'database',
                enabled: true,
                fixed: false
            };

            // 根据类型添加特定字段
            if (type === 'telegram') {
                Object.assign(newChannelData, {
                    botToken: this.newChannel.botToken,
                    chatId: this.newChannel.chatId,
                    proxyUrl: this.newChannel.proxyUrl
                });
            } else if (type === 's3') {
                Object.assign(newChannelData, {
                    endpoint: this.newChannel.endpoint,
                    cdnDomain: this.newChannel.cdnDomain,
                    bucketName: this.newChannel.bucketName,
                    region: this.newChannel.region,
                    accessKeyId: this.newChannel.accessKeyId,
                    secretAccessKey: this.newChannel.secretAccessKey,
                    pathStyle: this.newChannel.pathStyle,
                    quota: { ...this.newChannel.quota }
                });
            } else if (type === 'discord') {
                Object.assign(newChannelData, {
                    botToken: this.newChannel.botToken,
                    channelId: this.newChannel.channelId,
                    proxyUrl: this.newChannel.proxyUrl,
                    isNitro: this.newChannel.isNitro
                });
            } else if (type === 'huggingface') {
                Object.assign(newChannelData, {
                    repo: this.newChannel.repo,
                    token: this.newChannel.token,
                    isPrivate: this.newChannel.isPrivate
                });
            }

            settings.channels.push(newChannelData);
            this.showAddDialog = false;
            // 自动保存全部设置
            this.saveSettings();
        });
    },
    // 确认编辑渠道
    confirmEditChannel() {
        this.$refs.editForm.validate((valid) => {
            if (!valid) return;

            const settings = this.getSettings(this.currentChannelType);
            const newName = this.editChannel.name;
            const currentIndex = this.currentChannelIndex;
            const isFixedChannel = this.editChannel.fixed;

            // 非环境变量渠道才检查名称
            if (!isFixedChannel) {
                // 检查是否为保留名称（{type}_env）
                const reservedNames = ['Telegram_env', 'R2_env', 'S3_env', 'Discord_env', 'HuggingFace_env'];
                if (reservedNames.includes(newName)) {
                    this.$message.warning(this.$t('sysUpload.reservedName'));
                    return;
                }

                // 检查名称是否与其他渠道重复（排除当前编辑的渠道）
                const isDuplicate = settings.channels.some((ch, idx) => idx !== currentIndex && ch.name === newName);
                if (isDuplicate) {
                    this.$message.warning(this.$t('sysUpload.duplicateName'));
                    return;
                }
            }

            settings.channels[this.currentChannelIndex] = { ...this.editChannel };
            this.showEditDialog = false;
            // 自动保存全部设置
            this.saveSettings();
        });
    },
    // 删除渠道
    deleteChannel(type, index) {
        const channel = this.getChannelList(type)[index];
        if (channel.fixed) {
            this.$message.warning(this.$t('sysUpload.fixedChannelCannotDelete'));
            return;
        }
        this.$confirm(this.$t('sysUpload.deleteChannelConfirm'), this.$t('common.info'), {
            confirmButtonText: this.$t('common.confirm'),
            cancelButtonText: this.$t('common.cancel'),
            type: 'warning'
        }).then(() => {
            const settings = this.getSettings(type);
            settings.channels.splice(index, 1);
            // 重新调整 id
            settings.channels.forEach((item, i) => { item.id = i + 1; });
            // 自动保存
            this.saveSettings();
        }).catch(() => {});
    },
    saveSettings() {
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
            this.$message.success(this.$t('sysOthers.settingsSaved'));
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
                    this.$t('sysUpload.quotaInitConfirm'),
                    this.$t('sysUpload.quotaInitTitle'),
                    {
                        confirmButtonText: this.$t('sysUpload.quotaInitConfirmBtn'),
                        cancelButtonText: this.$t('sysUpload.quotaInitCancelBtn'),
                        type: 'info'
                    }
                ).then(async () => {
                    await this.recalculateQuota();
                }).catch(() => {
                    this.$message.info(this.$t('sysUpload.quotaInitLater'));
                });
            }
        }
    },
    // 重新统计容量
    async recalculateQuota() {
        this.quotaLoading = true;
        try {
            this.$message.info(this.$t('sysUpload.quotaCalculating'));
            const response = await fetchWithAuth('/api/manage/quota', {
                method: 'POST'
            });
            const data = await response.json();
            if (data.success) {
                this.quotaStats = data.channelStats || {};
                this.$message.success(this.$t('sysUpload.quotaCalculateSuccess'));
            } else {
                this.$message.error(this.$t('sysUpload.quotaCalculateError') + (data.error || ''));
            }
        } catch (error) {
            console.error('Failed to recalculate quota:', error);
            this.$message.error(this.$t('sysUpload.quotaCalculateFailed'));
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
    overflow-x: hidden;
}

/* 页面头部 */
.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 12px;
}

.first-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.help-icon {
    cursor: pointer;
    color: var(--el-text-color-secondary);
    font-size: 14px;
}

.add-btn {
    border-radius: 8px;
}

.header-actions {
    display: flex;
    gap: 12px;
}

.header-actions :deep(.el-button) {
    border-radius: 8px;
}

/* 渠道分组 */
.channel-group {
    margin-bottom: 32px;
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 12px;
    border: 1px solid var(--glass-border);
    overflow: hidden;
    box-shadow: var(--glass-shadow);
    transition: all 0.3s ease;
}

.channel-group:hover {
    box-shadow: var(--glass-shadow-hover);
}

.group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: var(--glass-header-bg);
    border-bottom: 1px solid var(--glass-header-border);
}

.group-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.group-icon {
    font-size: 18px;
    color: var(--el-color-primary);
}

.channel-count {
    font-size: 12px;
}

.load-balance-switch {
    display: flex;
    align-items: center;
    gap: 8px;
}

.switch-label {
    font-size: 13px;
    color: var(--el-text-color-secondary);
}

/* 渠道卡片网格 */
.channel-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
    padding: 20px;
}

/* 单个渠道卡片 */
.channel-card {
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: 10px;
    border: 1px solid var(--glass-border);
    border-left: 3px solid var(--el-border-color-light);
    transition: all 0.25s ease;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

/* 光斑效果 */
.card-glow {
    position: absolute;
    width: 150px;
    height: 150px;
    border-radius: 50%;
    pointer-events: none;
    opacity: 0;
    transform: translate(-50%, -50%);
    transition: opacity 0.3s ease;
    z-index: 0;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
}

.channel-card.telegram .card-glow {
    background: radial-gradient(circle, rgba(84, 169, 235, 0.2) 0%, transparent 70%);
}

.channel-card.cfr2 .card-glow {
    background: radial-gradient(circle, rgba(246, 130, 31, 0.2) 0%, transparent 70%);
}

.channel-card.s3 .card-glow {
    background: radial-gradient(circle, rgba(86, 154, 49, 0.2) 0%, transparent 70%);
}

.channel-card.discord .card-glow {
    background: radial-gradient(circle, rgba(88, 101, 242, 0.2) 0%, transparent 70%);
}

.channel-card.huggingface .card-glow {
    background: radial-gradient(circle, rgba(255, 210, 30, 0.2) 0%, transparent 70%);
}

.channel-card:hover {
    border-color: var(--glass-border-hover);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    background: var(--glass-bg-hover);
}

.channel-card.disabled {
    opacity: 0.6;
    background: var(--el-fill-color-lighter);
}

/* 渠道类型边缘颜色 */
.channel-card.telegram {
    border-left-color: #54a9eb;
}

.channel-card.cfr2 {
    border-left-color: #f6821f;
}

.channel-card.s3 {
    border-left-color: #569a31;
}

.channel-card.discord {
    border-left-color: #5865f2;
}

.channel-card.huggingface {
    border-left-color: #ffd21e;
}

.channel-card.fixed {
    border-left-width: 3px;
    border-left-style: dashed;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    background: var(--glass-header-bg);
    border-bottom: 1px solid var(--glass-header-border);
}

.card-title {
    display: flex;
    align-items: center;
    gap: 8px;
}

.channel-name {
    font-weight: 600;
    font-size: 14px;
    color: var(--el-text-color-primary);
}

.card-body {
    padding: 14px 16px;
    min-height: 60px;
    text-align: left;
}

.card-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    width: 100%;
    overflow: hidden;
}

.info-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    min-width: 0;
    width: 100%;
    max-width: 100%;
}

.info-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
    text-align: left;
}

.info-icon {
    width: 14px;
    flex-shrink: 0;
    color: var(--el-text-color-placeholder);
}

/* 容量迷你进度条 */
.quota-mini {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--el-border-color-lighter);
}

.quota-mini :deep(.el-progress) {
    margin-bottom: 4px;
}

.quota-text {
    font-size: 11px;
    color: var(--el-text-color-secondary);
}

.card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
    padding: 10px 16px;
    border-top: 1px solid var(--glass-header-border);
    background: var(--glass-header-bg);
    margin-top: auto;
}

/* 空状态提示 */
.empty-tip {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: var(--el-text-color-placeholder);
    gap: 12px;
}

.empty-icon {
    font-size: 32px;
}

/* 渠道警告提示 */
.channel-warning {
    margin: 0 20px 16px;
    padding: 10px 14px;
    font-size: 13px;
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);
    border-radius: 6px;
    border-left: 3px solid var(--el-color-warning);
}

/* 下拉选项图标样式 */
.select-option-icon {
    width: 18px;
    margin-right: 8px;
    text-align: center;
}

/* 表单提示 */
.form-tip {
    margin-left: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

/* 表单内警告 */
.form-warning {
    padding: 10px 14px;
    font-size: 13px;
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);
    border-radius: 6px;
    border-left: 3px solid var(--el-color-warning);
    margin-top: 8px;
}

/* 弹窗内容量状态 */
.quota-status {
    width: 100%;
}

.quota-status :deep(.el-progress) {
    margin-bottom: 8px;
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

/* 当前用量标签样式 */
.quota-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.refresh-btn {
    padding: 0 !important;
    margin: 0 !important;
    height: auto !important;
    min-height: auto !important;
    vertical-align: middle;
}

.refresh-btn .fa-spin {
    animation: fa-spin 1s linear infinite;
}

@keyframes fa-spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

/* 移动端适配 */
@media (max-width: 768px) {
    .upload-settings {
        padding: 12px;
    }

    .page-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .channel-cards {
        grid-template-columns: 1fr;
        padding: 12px;
    }

    .group-header {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
    }
}

/* 弹窗响应式宽度 */
:deep(.channel-dialog) {
    width: 600px !important;
    max-width: 90vw !important;
}

@media (max-width: 768px) {
    :deep(.channel-dialog) {
        width: 90vw !important;
    }
}
</style>