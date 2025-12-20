<template>
    <div class="container">
        <el-container>
            <el-header>
            <div class="header-content">
                <DashboardTabs activeTab="dashboard"></DashboardTabs>
                <div class="search-card">
                    <el-input v-model="tempSearch" size="mini" placeholder="搜索：#标签 -#排除标签 关键字" @keyup.enter="handleSearch">
                        <template #suffix>
                            <font-awesome-icon icon="search" class="search-icon" @click="handleSearch"/>
                        </template>
                    </el-input>
                </div>
                <span class="stats">
                    <font-awesome-icon icon="database" class="fa-database"></font-awesome-icon> 文件数量: {{ Number }}
                </span>
                <div class="actions">
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
                <el-tooltip :disabled="disableTooltip" content="全选此页" placement="bottom">
                    <font-awesome-icon :icon="selectPageIcon" class="header-icon" @click="handleSelectPage"></font-awesome-icon>
                </el-tooltip>
                <el-dropdown @command="handleBatchAction" :hide-on-click="false" :disabled="selectedFiles.length === 0">
                    <span class="el-dropdown-link">
                        <font-awesome-icon icon="ellipsis-h" class="header-icon" :class="{ disabled: selectedFiles.length === 0 }"></font-awesome-icon>
                    </span>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item command="copy">
                                <font-awesome-icon icon="copy" class="batch-action-item-icon"></font-awesome-icon>
                                复制
                            </el-dropdown-item>
                            <el-dropdown-item command="delete">
                                <font-awesome-icon icon="trash-alt" class="batch-action-item-icon"></font-awesome-icon>
                                删除
                            </el-dropdown-item>
                            <el-dropdown-item command="download">
                                <font-awesome-icon icon="download" class="batch-action-item-icon"></font-awesome-icon>
                                下载
                            </el-dropdown-item>
                            <el-dropdown-item command="move">
                                <font-awesome-icon icon="file-export" class="batch-action-item-icon"></font-awesome-icon>
                                移动
                            </el-dropdown-item>
                            <el-dropdown-item command="tagManagement">
                                <font-awesome-icon icon="tags" class="batch-action-item-icon"></font-awesome-icon>
                                标签管理
                            </el-dropdown-item>
                            <el-dropdown-item command="ban">
                                <font-awesome-icon icon="ban" class="batch-action-item-icon"></font-awesome-icon>
                                加入黑名单
                            </el-dropdown-item>
                            <el-dropdown-item command="white">
                                <font-awesome-icon icon="user-plus" class="batch-action-item-icon"></font-awesome-icon>
                                加入白名单
                            </el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
                <el-tooltip :disabled="disableTooltip" content="链接格式" placement="bottom">
                    <span class="el-dropdown-link">
                        <font-awesome-icon icon="link" class="header-icon" @click="showUrlDialog = true"></font-awesome-icon>
                    </span>
                </el-tooltip>
                <el-tooltip :disabled="disableTooltip" :content="viewMode === 'card' ? '列表视图' : '卡片视图'" placement="bottom">
                    <font-awesome-icon :icon="viewMode === 'card' ? 'list' : 'th-large'" class="header-icon" @click="toggleViewMode"></font-awesome-icon>
                </el-tooltip>
                <el-tooltip :disabled="disableTooltip" content="退出登录" placement="bottom">
                    <font-awesome-icon icon="sign-out-alt" class="header-icon" @click="handleLogout"></font-awesome-icon>
                </el-tooltip>
                </div>
            </div>
            </el-header>
            <el-main class="main-container">
            <!-- 目录导航 -->
            <div class="breadcrumb">
                <el-breadcrumb separator="/">
                    <el-breadcrumb-item @click="navigateToFolder('')">根目录</el-breadcrumb-item>
                    <el-breadcrumb-item 
                        v-for="(folder, index) in currentPath.split('/').filter(Boolean)" 
                        :key="index"
                        @click="navigateToFolder(currentPath.split('/').filter(Boolean).slice(0, index + 1).join('/'))">
                        {{ folder }}
                    </el-breadcrumb-item>
                </el-breadcrumb>
            </div>
            
            <!-- 卡片视图 -->
            <div v-if="viewMode === 'card'" class="content" v-loading="loading">
                <!-- 文件夹和文件列表 -->
                <template v-for="(item, index) in paginatedTableData" :key="index">
                    <!-- 文件夹卡片 -->
                    <el-card 
                        v-if="isFolder(item)" 
                        class="img-card folder-card"
                        @touchstart="handleFolderTouchStart(item, index)"
                        @touchend="handleTouchEnd"
                        @touchmove="handleTouchEnd"
                    >
                        <el-checkbox v-model="item.selected"></el-checkbox>
                        <div class="folder-icon" @click="enterFolder(item.name)">
                            <font-awesome-icon icon="folder-open" size="4x"/>
                        </div>
                        <!-- 底部统一覆盖层：文件夹名 + 操作栏 -->
                        <div class="card-bottom-overlay">
                            <div class="file-name-row">
                                <span class="file-name">{{ getFolderName(item.name) }}</span>
                            </div>
                            <div v-if="!isSearchMode" class="action-bar">
                                <div class="action-bar-left"></div>
                                <div class="action-bar-right">
                                    <el-tooltip :disabled="disableTooltip" content="移动" placement="top">
                                        <button class="action-btn" @click.stop="handleMove(index, item.name)">
                                            <font-awesome-icon icon="file-export"></font-awesome-icon>
                                        </button>
                                    </el-tooltip>
                                    <el-tooltip :disabled="disableTooltip" content="删除" placement="top">
                                        <button class="action-btn action-btn-danger" @click.stop="handleDelete(index, item.name)">
                                            <font-awesome-icon icon="trash-alt"></font-awesome-icon>
                                        </button>
                                    </el-tooltip>
                                </div>
                            </div>
                        </div>
                    </el-card>
                    
                    <!-- 文件卡片 -->
                    <el-card 
                        v-else 
                        class="img-card"
                        @touchstart="handleTouchStart(item, index)"
                        @touchend="handleTouchEnd"
                        @touchmove="handleTouchEnd"
                    >
                        <el-checkbox v-model="item.selected"></el-checkbox>
                        <div class="file-short-info">
                            <div v-if="item.metadata?.ListType === 'White'" class="success-tag">{{ item.channelTag }}</div>
                            <div v-else-if="item.metadata?.ListType === 'Block' || item.metadata?.Label === 'adult'" class="fail-tag">{{ item.channelTag }}</div>
                            <div v-else class="success-tag">{{ item.channelTag }}</div>
                            <div v-if="item.metadata?.Tags && item.metadata?.Tags.length > 0" class="primary-tag">
                                <font-awesome-icon icon="tag" style="margin-right: 3px; font-size: 12px;"></font-awesome-icon>
                                {{ item.metadata.Tags[0] }}
                                <span v-if="item.metadata.Tags.length > 1" style="margin-left: 2px;">
                                    (+{{ item.metadata.Tags.length - 1 }})
                                </span>
                            </div>
                        </div>
                        <video v-if="isVideo(item)" :src="getFileLink(item.name)" muted loop class="video-preview" @click="handleVideoClick" @mouseenter="handleVideoHover($event, true)" @mouseleave="handleVideoHover($event, false)"></video>
                        <el-image v-else-if="isImage(item)" :preview-teleported="true" :src="getFileLink(item.name)" :preview-src-list="item.previewSrcList" fit="cover" lazy class="image-preview"></el-image>
                        <div v-else class="file-preview">
                            <font-awesome-icon icon="file" class="file-icon" size="4x"></font-awesome-icon>
                        </div>
                        <!-- 底部统一覆盖层：文件名 + 操作栏 -->
                        <div class="card-bottom-overlay">
                            <div class="file-name-row">
                                <span class="file-name">{{ getFileName(item.metadata?.FileName || item.name) }}</span>
                            </div>
                            <div class="action-bar">
                                <div class="action-bar-left">
                                    <el-tooltip :disabled="disableTooltip" content="详情" placement="top">
                                        <button class="action-btn" @click.stop="openDetailDialog(index, item.name)">
                                            <font-awesome-icon icon="info-circle"></font-awesome-icon>
                                        </button>
                                    </el-tooltip>
                                </div>
                                <div class="action-bar-right">
                                    <el-tooltip :disabled="disableTooltip" content="移动" placement="top">
                                        <button class="action-btn" @click.stop="handleMove(index, item.name)">
                                            <font-awesome-icon icon="file-export"></font-awesome-icon>
                                        </button>
                                    </el-tooltip>
                                    <el-tooltip :disabled="disableTooltip" content="删除" placement="top">
                                        <button class="action-btn action-btn-danger" @click.stop="handleDelete(index, item.name)">
                                            <font-awesome-icon icon="trash-alt"></font-awesome-icon>
                                        </button>
                                    </el-tooltip>
                                    <el-tooltip :disabled="disableTooltip" content="下载" placement="top">
                                        <button class="action-btn" @click.stop="handleDownload(item.name)">
                                            <font-awesome-icon icon="download"></font-awesome-icon>
                                        </button>
                                    </el-tooltip>
                                    <el-tooltip :disabled="disableTooltip" content="复制链接" placement="top">
                                        <button class="action-btn" @click.stop="handleCopy(index, item.name)">
                                            <font-awesome-icon icon="copy"></font-awesome-icon>
                                        </button>
                                    </el-tooltip>
                                </div>
                            </div>
                        </div>
                    </el-card>
                </template>
            </div>
            <!-- 列表视图 -->
            <div v-else class="list-view" v-loading="loading">
                <div class="list-header">
                    <div class="list-col list-col-checkbox">
                        <span class="custom-checkbox" :class="{ 'checked': isSelectAll, 'indeterminate': isIndeterminate }" @click="handleSelectAllPage(!isSelectAll)">
                            <font-awesome-icon v-if="isSelectAll" icon="check" class="check-icon"/>
                            <font-awesome-icon v-else-if="isIndeterminate" icon="minus" class="check-icon"/>
                        </span>
                    </div>
                    <div class="list-col list-col-preview">预览</div>
                    <div class="list-col list-col-name">文件名</div>
                    <div class="list-col list-col-tags">标签</div>
                    <div class="list-col list-col-channel">上传渠道</div>
                    <div class="list-col list-col-address">上传地址</div>
                    <div class="list-col list-col-size">大小</div>
                    <div class="list-col list-col-date">上传时间</div>
                    <div class="list-col list-col-actions">操作</div>
                </div>
                <div 
                    v-for="(item, index) in paginatedTableData" 
                    :key="index" 
                    class="list-item"
                    @touchstart="isFolder(item) ? handleFolderTouchStart(item, index) : handleTouchStart(item, index)"
                    @touchend="handleTouchEnd"
                    @touchmove="handleTouchEnd"
                >
                    <div class="list-col list-col-checkbox">
                        <span class="custom-checkbox" :class="{ 'checked': item.selected }" @click.stop="item.selected = !item.selected">
                            <font-awesome-icon v-if="item.selected" icon="check" class="check-icon"/>
                        </span>
                    </div>
                    <div class="list-col list-col-preview" @click="isFolder(item) ? enterFolder(item.name) : openDetailDialog(index, item.name)">
                        <template v-if="isFolder(item)">
                            <font-awesome-icon icon="folder-open" class="list-folder-icon"/>
                        </template>
                        <template v-else-if="isVideo(item)">
                            <video :src="getFileLink(item.name)" class="list-preview-img" muted></video>
                        </template>
                        <template v-else-if="isImage(item)">
                            <img :src="getFileLink(item.name)" class="list-preview-img" />
                        </template>
                        <template v-else>
                            <font-awesome-icon icon="file" class="list-file-icon"/>
                        </template>
                    </div>
                    <div class="list-col list-col-name" @click="isFolder(item) ? enterFolder(item.name) : openDetailDialog(index, item.name)">
                        {{ isFolder(item) ? getFolderName(item.name) : (item.metadata?.FileName || getFileName(item.name)) }}
                    </div>
                    <div class="list-col list-col-tags">
                        <template v-if="!isFolder(item) && item.metadata?.Tags && item.metadata.Tags.length > 0">
                            <span 
                                v-for="(tag, tagIndex) in item.metadata.Tags.slice(0, 3)" 
                                :key="tagIndex" 
                                class="color-tag"
                                :style="{ background: getTagColor(tagIndex) }"
                            >{{ tag }}</span>
                            <span v-if="item.metadata.Tags.length > 3" class="color-tag color-tag-more" :style="{ background: getTagColor(3) }">+{{ item.metadata.Tags.length - 3 }}</span>
                        </template>
                        <span v-else class="list-empty">-</span>
                    </div>
                    <div class="list-col list-col-channel">
                        {{ isFolder(item) ? '-' : (item.metadata?.Channel || item.channelTag || '-') }}
                    </div>
                    <div class="list-col list-col-address">
                        {{ isFolder(item) ? '-' : (item.metadata?.UploadIP || '-') }}
                    </div>
                    <div class="list-col list-col-size">
                        {{ isFolder(item) ? '-' : (item.metadata?.FileSize ? item.metadata.FileSize + ' MB' : '-') }}
                    </div>
                    <div class="list-col list-col-date">
                        {{ item.uploaded ? new Date(item.uploaded).toLocaleDateString() : (item.metadata?.TimeStamp ? new Date(item.metadata.TimeStamp).toLocaleDateString() : '-') }}
                    </div>
                    <div class="list-col list-col-actions">
                        <template v-if="!isFolder(item)">
                            <el-tooltip content="复制链接" placement="top">
                                <button class="list-action-btn" @click.stop="handleCopy(index, item.name)">
                                    <font-awesome-icon icon="copy"/>
                                </button>
                            </el-tooltip>
                            <el-tooltip content="下载" placement="top">
                                <button class="list-action-btn" @click.stop="handleDownload(item.name)">
                                    <font-awesome-icon icon="download"/>
                                </button>
                            </el-tooltip>
                            <el-tooltip content="移动" placement="top">
                                <button class="list-action-btn" @click.stop="handleMoveFile(item.name)">
                                    <font-awesome-icon icon="file-export"/>
                                </button>
                            </el-tooltip>
                        </template>
                        <el-tooltip v-else content="移动" placement="top">
                            <button class="list-action-btn" @click.stop="handleMoveFile(item.name)">
                                <font-awesome-icon icon="file-export"/>
                            </button>
                        </el-tooltip>
                        <el-tooltip content="删除" placement="top">
                            <button class="list-action-btn list-action-danger" @click.stop="handleDelete(index, item.name)">
                                <font-awesome-icon icon="trash-alt"/>
                            </button>
                        </el-tooltip>
                    </div>
                </div>
            </div>
            
            <div class="pagination-container">
                <el-pagination
                    background
                    layout="prev, pager, next"
                    :total="filteredTableData.length"
                    :page-size="pageSize"
                    :current-page="currentPage"
                    :pager-count="pagerCount"
                    @current-change="handlePageChange">
                </el-pagination>
                <div class="pagination-right">
                    <el-button 
                        type="primary" 
                        @click="refreshFileList" 
                        class="refresh-btn">
                        <font-awesome-icon icon="sync" :class="{ 'fa-spin': refreshLoading }"/>
                    </el-button>
                    <el-button
                        v-if="currentPage === Math.ceil(filteredTableData.length / pageSize)" 
                        type="primary" 
                        @click="loadMoreData" 
                        :loading="loading" 
                        class="load-more">
                        加载更多
                    </el-button>
                </div>
            </div>
            </el-main>
        </el-container>
        <el-dialog title="文件详情" v-model="showdetailDialog" :width="dialogWidth">
            <div class="detail-actions">
                <el-button type="primary" @click="handleDownload(detailFile?.name)" round size="small" class="detail-action">
                    <font-awesome-icon icon="download" style="margin-right: 3px;"></font-awesome-icon> 下载
                </el-button>
                <el-button type="primary" @click="handleTagManagement(detailFile?.name)" round size="small" class="detail-action">
                    <font-awesome-icon icon="tags" style="margin-right: 3px;"></font-awesome-icon> 标签
                </el-button>
                <el-button type="primary" @click="handleBlock(detailFile?.name)" round size="small" class="detail-action">
                    <font-awesome-icon icon="ban" style="margin-right: 3px;"></font-awesome-icon> 黑名单
                </el-button>
                <el-button type="primary" @click="handleWhite(detailFile?.name)" round size="small" class="detail-action">
                    <font-awesome-icon icon="user-plus" style="margin-right: 3px;"></font-awesome-icon> 白名单
                </el-button>
                <el-button type="danger" @click="handleDetailDelete(detailFile?.name)" round size="small" class="detail-action">
                    <font-awesome-icon icon="trash-alt" style="margin-right: 3px;"></font-awesome-icon> 删除
                </el-button>
            </div> 
            <el-tabs  v-model="activeUrlTab" @tab-click="handleTabClick" style="margin-bottom: 10px;">
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
                <el-tab-pane label="TG File ID" v-if="detailFile?.metadata?.TgFileId" name="tgId">
                    <el-input v-model="allUrl.tgId" readonly @click="handleUrlClick"></el-input>
                </el-tab-pane>
                <el-tab-pane label="S3 Location" v-if="detailFile?.metadata?.S3Location" name="s3Location">
                    <el-input v-model="allUrl.S3Location" readonly @click="handleUrlClick"></el-input>
                </el-tab-pane>
            </el-tabs>
            <el-descriptions direction="vertical" border :column="tableColumnNum">
                <el-descriptions-item 
                    label="文件预览"
                    :rowspan="tablePreviewSpan"
                    :width="300"
                    align="center"
                    >
                    <video v-if="isVideo(detailFile)" :src="getFileLink(detailFile?.name)" autoplay muted loop class="video-preview" @click="handleVideoClick"></video>
                    <el-image v-else-if="isImage(detailFile)" :src="getFileLink(detailFile?.name)" fit="cover" lazy class="image-preview"></el-image>
                    <font-awesome-icon v-else icon="file" class="file-icon-detail"></font-awesome-icon>
                </el-descriptions-item>
                <el-descriptions-item label="文件名" class-name="description-item">{{ detailFile?.metadata?.FileName || detailFile?.name }}</el-descriptions-item>
                <el-descriptions-item label="文件类型" class-name="description-item">{{ detailFile?.metadata?.FileType || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="文件大小(MB)" class-name="description-item">{{ detailFile?.metadata?.FileSize || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="上传时间" class-name="description-item">{{ new Date(detailFile?.metadata?.TimeStamp).toLocaleString() || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="访问状态" class-name="description-item">{{ accessType }}</el-descriptions-item>
                <el-descriptions-item label="上传渠道" class-name="description-item">{{ detailFile?.metadata?.Channel || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="审查结果" class-name="description-item">{{ detailFile?.metadata?.Label || '无' }}</el-descriptions-item>
                <el-descriptions-item label="上传IP" class-name="description-item">{{ detailFile?.metadata?.UploadIP || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="上传地址" class-name="description-item">{{ detailFile?.metadata?.UploadAddress || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="文件标签" class-name="description-item">
                    <div v-if="detailFile?.metadata?.Tags && detailFile?.metadata?.Tags.length > 0" style="display: flex; flex-wrap: wrap; gap: 5px;">
                        <el-tag 
                            v-for="tag in detailFile?.metadata?.Tags" 
                            :key="tag"
                            size="small"
                        >
                            {{ tag }}
                        </el-tag>
                    </div>
                    <span v-else style="color: #909399;">暂无标签</span>
                </el-descriptions-item>
            </el-descriptions>
        </el-dialog>
        <el-dialog title="链接格式" v-model="showUrlDialog" :width="dialogWidth" :show-close="false">
            <p style="font-size: medium; font-weight: bold">默认复制链接</p>
            <el-radio-group v-model="defaultUrlFormat">
                <el-radio label="originUrl">原始链接</el-radio>
                <el-radio label="mdUrl">Markdown</el-radio>
                <el-radio label="htmlUrl">HTML</el-radio>
                <el-radio label="bbUrl">BBCode</el-radio>
                <el-radio label="tgId">TG File ID</el-radio>
                <el-radio label="s3Location">S3链接</el-radio>
            </el-radio-group>
            <p style="font-size: medium; font-weight: bold">自定义链接
                <el-tooltip content="默认链接为https://your.domain/file/xxx.jpg <br> 如果启用自定义链接格式，只保留xxx.jpg部分，其他部分请自行输入" placement="top" raw-content>
                    <font-awesome-icon icon="question-circle" class="question-icon" size="me"/>
                </el-tooltip>
            </p>
            <el-form label-width="25%">
                <el-form-item label="启用自定义">
                    <el-radio-group v-model="useCustomUrl">
                        <el-radio value="true">是</el-radio>
                        <el-radio value="false">否</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="自定义前缀" v-if="useCustomUrl === 'true'">
                    <el-input v-model="customUrlPrefix" placeholder="请输入自定义链接前缀"/>
                </el-form-item>
            </el-form>
            <div class="dialog-action">
                <el-button type="primary" @click="showUrlDialog = false">确定</el-button>
            </div>
        </el-dialog>

        <!-- Tag Management Dialog -->
        <TagManagementDialog
            v-model="showTagDialog"
            :fileId="currentTagFile"
            @tagsUpdated="handleTagsUpdated"
        />

        <!-- Batch Tag Management Dialog -->
        <BatchTagDialog
            v-model="showBatchTagDialog"
            :selectedFiles="selectedFiles"
            @tagsUpdated="handleBatchTagsUpdated"
        />
        <!-- 移动端操作模态框 - 自定义底部弹出 -->
        <Teleport to="body">
            <Transition name="bottom-sheet">
                <div v-if="showMobileActionModal" class="bottom-sheet-overlay" @click="showMobileActionModal = false">
                    <div class="bottom-sheet" @click.stop>
                        <div class="bottom-sheet-header">
                            <div class="bottom-sheet-handle"></div>
                            <span class="bottom-sheet-title">{{ mobileActionIsFolder ? getFolderName(mobileActionFile?.name || '') : (mobileActionFile?.metadata?.FileName || getFileName(mobileActionFile?.name || '')) }}</span>
                        </div>
                        <div class="bottom-sheet-content">
                            <!-- 文件操作 -->
                            <template v-if="!mobileActionIsFolder">
                                <div class="bottom-sheet-item" @click="handleMobileAction('detail')">
                                    <font-awesome-icon icon="info-circle" class="bottom-sheet-icon"></font-awesome-icon>
                                    <span>查看详情</span>
                                </div>
                                <div class="bottom-sheet-item" @click="handleMobileAction('copy')">
                                    <font-awesome-icon icon="copy" class="bottom-sheet-icon"></font-awesome-icon>
                                    <span>复制链接</span>
                                </div>
                                <div class="bottom-sheet-item" @click="handleMobileAction('download')">
                                    <font-awesome-icon icon="download" class="bottom-sheet-icon"></font-awesome-icon>
                                    <span>下载文件</span>
                                </div>
                                <div class="bottom-sheet-item" @click="handleMobileAction('move')">
                                    <font-awesome-icon icon="file-export" class="bottom-sheet-icon"></font-awesome-icon>
                                    <span>移动文件</span>
                                </div>
                                <div class="bottom-sheet-item" @click="handleMobileAction('tag')">
                                    <font-awesome-icon icon="tags" class="bottom-sheet-icon"></font-awesome-icon>
                                    <span>标签管理</span>
                                </div>
                            </template>
                            <!-- 文件夹操作 -->
                            <template v-else>
                                <div class="bottom-sheet-item" @click="handleMobileAction('move')">
                                    <font-awesome-icon icon="file-export" class="bottom-sheet-icon"></font-awesome-icon>
                                    <span>移动文件夹</span>
                                </div>
                            </template>
                            <!-- 删除操作（通用） -->
                            <div class="bottom-sheet-item bottom-sheet-danger" @click="handleMobileAction('delete')">
                                <font-awesome-icon icon="trash-alt" class="bottom-sheet-icon"></font-awesome-icon>
                                <span>{{ mobileActionIsFolder ? '删除文件夹' : '删除文件' }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
import JSZip from 'jszip';
import DashboardTabs from '@/components/DashboardTabs.vue';
import TagManagementDialog from '@/components/TagManagementDialog.vue';
import BatchTagDialog from '@/components/BatchTagDialog.vue';
import { fileManager } from '@/utils/fileManager';
import fetchWithAuth from '@/utils/fetchWithAuth';

export default {
data() {
    return {
        Number: 0,
        showLogoutButton: false,
        tableData: [],
        tempSearch: '',
        search: '',
        searchKeywords: '', // Keywords only (without tag filters) for backend search
        searchIncludeTags: '', // 包含的标签，逗号分隔
        searchExcludeTags: '', // 排除的标签，逗号分隔
        isSearchMode: false,
        currentPage: 1,
        pageSize: 15,
        selectedFiles: [],
        sortOption: 'dateDesc',
        isUploading: false,
        showdetailDialog: false,
        detailFile: null,
        activeUrlTab: 'originUrl',
        defaultUrlFormat: 'originUrl',
        showUrlDialog: false,
        useCustomUrl: 'false', // 是否启用自定义链接
        customUrlPrefix: '', // 自定义链接前缀
        loading: false, // 加载状态
        currentPath: '', // 当前文件夹路径
        refreshLoading: false,
        showTagDialog: false, // 标签管理对话框
        showBatchTagDialog: false, // 批量标签管理对话框
        currentTagFile: '', // 当前标签管理的文件
        viewMode: 'card', // 视图模式：card 或 list
        showMobileActionModal: false, // 移动端操作模态框
        mobileActionFile: null, // 当前移动端操作的文件
        mobileActionIndex: -1, // 当前移动端操作的文件索引
        mobileActionIsFolder: false, // 是否为文件夹操作
        longPressTimer: null, // 长按计时器
    }
},
components: {
    DashboardTabs,
    TagManagementDialog,
    BatchTagDialog
},
computed: {
    ...mapGetters(['adminUrlSettings', 'userConfig']),
    filteredTableData() {
        return this.tableData;
    },
    paginatedTableData() {
        const sortedData = this.sortData(this.filteredTableData);
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        let data = sortedData.slice(start, end);
        // 增加previewSrcList属性，用于预览图片
        const fullList = data.filter(file => this.isImage(file)).map(file => this.getFileLink(file.name));
        data.forEach(file => {
            if (this.isImage(file)) {
                // 重新排序，索引大于等于当前索引的元素在前，否则在后
                file.previewSrcList = fullList.slice(fullList.indexOf(this.getFileLink(file.name))).concat(fullList.slice(0, fullList.indexOf(this.getFileLink(file.name))));
            }
        });
        // 增加channelTag属性，用于显示渠道信息
        data.forEach(file => {
            if (file.metadata?.Channel === 'TelegramNew') {
                file.channelTag = 'TG';
            } else if (file.metadata?.Channel === 'CloudflareR2') {
                file.channelTag = 'R2';
            } else if (file.metadata?.Channel === 'S3') {
                file.channelTag = 'S3';
            } else if (file.metadata?.Channel === 'External') {
                file.channelTag = '外链';
            } else {
                file.channelTag = '未知';
            }
        });
        return data;
    },
    sortIcon() {
        return this.sortOption === 'dateDesc' ? 'sort-amount-down' : 'sort-alpha-up';
    },
    dialogWidth() {
        return window.innerWidth > 768 ? '50%' : '90%';
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
        // 外链图片均采用外链
        if (this.detailFile?.metadata?.Channel === 'External') {
            return {
                'originUrl': `${this.detailFile?.metadata?.ExternalLink}`,
                'mdUrl': `![${this.detailFile?.metadata?.FileName || this.detailFile?.name}](${this.detailFile?.metadata?.ExternalLink})`,
                'htmlUrl': `<img src="${this.detailFile?.metadata?.ExternalLink}" alt="${this.detailFile?.metadata?.FileName || this.detailFile?.name}" width=100%>`,
                'bbUrl': `[img]${this.detailFile?.metadata?.ExternalLink}[/img]`,
                'tgId': this.detailFile?.metadata?.TgFileId || '未知',
                'S3Location': this.detailFile?.metadata?.S3Location || '未知'
            }
        } else {
            return {
                'originUrl': `${this.rootUrl}${this.detailFile?.name}`,
                'mdUrl': `![${this.detailFile?.metadata?.FileName || this.detailFile?.name}](${this.rootUrl}${this.detailFile?.name})`,
                'htmlUrl': `<img src="${this.rootUrl}${this.detailFile?.name}" alt="${this.detailFile?.metadata?.FileName || this.detailFile?.name}" width=100%>`,
                'bbUrl': `[img]${this.rootUrl}${this.detailFile?.name}[/img]`,
                'tgId': this.detailFile?.metadata?.TgFileId || '未知',
                'S3Location': this.detailFile?.metadata?.S3Location || '未知'
            }
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
    selectedPageFiles() {
        // 如果当前页有文件被选中，则返回 true，否则返回 false
        return this.paginatedTableData.some(file => file.selected);
    },
    selectPageIcon() {
        // 全选为 true 时，返回 check-square；部分选中为 minus-square；全不选为 square
        return this.selectPage ? 'check-square' : this.selectedPageFiles ? 'minus-square' : 'square';
    },
    rootUrl() {
        // 链接前缀，优先级：用户自定义 > urlPrefix > 默认
        return this.useCustomUrl === 'true' ? this.customUrlPrefix : this.userConfig?.urlPrefix || `${document.location.origin}/file/`
    },
    isSelectAll: {
        get() {
            return this.paginatedTableData.length > 0 && this.paginatedTableData.every(file => file.selected);
        },
        set(val) {
            this.paginatedTableData.forEach(file => file.selected = val);
        }
    },
    isIndeterminate() {
        const selectedCount = this.paginatedTableData.filter(file => file.selected).length;
        return selectedCount > 0 && selectedCount < this.paginatedTableData.length;
    },
    pagerCount() {
        return window.innerWidth < 768 ? 3 : 7;
    }
},
watch: {
    tableData: {
        handler(newData) {
            // selectedFiles 增加 newData中新选中，不包含在 selectedFiles 中的文件
            this.selectedFiles = this.selectedFiles.concat(newData.filter(file => file.selected && !this.selectedFiles.includes(file)));
            // selectedFiles 删掉 newData 中已取消选中的文件
            this.selectedFiles = this.selectedFiles.filter(file => file.selected);
            // selectedFiles 删掉 tableData 中已删除的文件
            this.selectedFiles = this.selectedFiles.filter(file => newData.includes(file));
        },
        deep: true
    },
    sortOption(newOption) {
        localStorage.setItem('sortOption', newOption);
    },
    defaultUrlFormat(newFormat) {
        localStorage.setItem('defaultUrlFormat', newFormat);
    },
    showdetailDialog(newVal) {
        if (newVal) {
            this.activeUrlTab = this.defaultUrlFormat || 'originUrl';
        }
    },
    customUrlPrefix(val) {
        this.$store.commit('setAdminUrlSettings', { key: 'customUrlPrefix', value: val })
    },
    useCustomUrl(val) {
        this.$store.commit('setAdminUrlSettings', { key: 'useCustomUrl', value: val })
    },
    currentPath(val) {
        // 页面切换时，取消选择的内容
        this.tableData.forEach(file => file.selected = false);
    }
},
methods: {
    // 切换视图模式
    toggleViewMode() {
        this.viewMode = this.viewMode === 'card' ? 'list' : 'card';
        localStorage.setItem('viewMode', this.viewMode);
    },
    // 列表视图全选当前页
    handleSelectAllPage(val) {
        this.paginatedTableData.forEach(file => file.selected = val);
    },
    // 移动端长按开始
    handleTouchStart(item, index) {
        this.longPressTimer = setTimeout(() => {
            this.mobileActionFile = item;
            this.mobileActionIndex = index;
            this.mobileActionIsFolder = false;
            this.showMobileActionModal = true;
        }, 500); // 500ms 长按触发
    },
    // 移动端长按结束/取消
    handleTouchEnd() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    },
    // 文件夹长按开始
    handleFolderTouchStart(item, index) {
        this.longPressTimer = setTimeout(() => {
            this.mobileActionFile = item;
            this.mobileActionIndex = index;
            this.mobileActionIsFolder = true;
            this.showMobileActionModal = true;
        }, 500);
    },
    // 处理移动端操作
    handleMobileAction(action) {
        const file = this.mobileActionFile;
        const index = this.mobileActionIndex;
        this.showMobileActionModal = false;
        
        if (!file) return;
        
        switch (action) {
            case 'detail':
                this.openDetailDialog(index, file.name);
                break;
            case 'copy':
                this.handleCopy(index, file.name);
                break;
            case 'download':
                this.handleDownload(file.name);
                break;
            case 'move':
                this.handleMove(index, file.name);
                break;
            case 'delete':
                this.handleDelete(index, file.name);
                break;
            case 'tag':
                this.handleTagManagement(file.name);
                break;
        }
    },
    // 获取标签颜色
    getTagColor(index) {
        const colors = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
        ];
        return colors[index % colors.length];
    },
    // 视频hover播放控制
    handleVideoHover(event, isEnter) {
        const video = event.target;
        if (isEnter) {
            video.play().catch(() => {});
        } else {
            video.pause();
            video.currentTime = 0;
        }
    },
    // 格式化文件大小
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '-';
        bytes = Number(bytes);
        if (isNaN(bytes)) return '-';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return bytes.toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
    },
    handleSearch() {
        this.search = this.tempSearch;
        this.isSearchMode = this.search.trim() !== '';
        this.currentPage = 1; // 重置到第一页

        // 解析搜索字符串，提取标签和关键字
        // 支持 #tag 表示包含标签，-#tag 表示排除标签
        if (this.search && this.search.trim()) {
            const includeTags = [];
            const excludeTags = [];
            
            // 匹配 -#tag 和 #tag
            let searchText = this.search;
            
            // 先匹配排除标签 -#tag
            const excludeTagRegex = /-#([\w\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\.\+\-]+)/g;
            searchText = searchText.replace(excludeTagRegex, (match, tag) => {
                excludeTags.push(tag.toLowerCase());
                return ' ';
            });
            
            // 再匹配包含标签 #tag
            const includeTagRegex = /#([\w\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\.\+\-]+)/g;
            searchText = searchText.replace(includeTagRegex, (match, tag) => {
                includeTags.push(tag.toLowerCase());
                return ' ';
            });
            
            // 清理剩余的关键字（去除多余空格）
            this.searchKeywords = searchText.replace(/\s+/g, ' ').trim();
            
            // 构建标签查询字符串
            this.searchIncludeTags = includeTags.join(',');
            this.searchExcludeTags = excludeTags.join(',');
            
            console.log('Search keywords:', this.searchKeywords);
            console.log('Include tags:', this.searchIncludeTags);
            console.log('Exclude tags:', this.searchExcludeTags);
        } else {
            this.searchKeywords = '';
            this.searchIncludeTags = '';
            this.searchExcludeTags = '';
        }

        this.refreshFileList();
    },
    handleDownload(key) {
        const link = document.createElement('a');
        link.href = this.getFileLink(key);
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
        fetchWithAuth(`/api/manage/delete/${key}`, { method: 'GET' })
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
            this.updateStats(-1, false);
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
        fetchWithAuth(`/api/manage/block/${key}`, { method: 'GET' })
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
        fetchWithAuth(`/api/manage/white/${key}`, { method: 'GET' })
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
    handleDelete(index, key) {
        // 判断是否为文件夹
        const isFolder = this.tableData.find(file => file.name === key).isFolder;

        this.$confirm(`此操作将永久删除${isFolder ? '文件夹' : '该文件'}, 是否继续?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
        }).then(() => {
        fetchWithAuth(`/api/manage/delete/${key}?folder=${isFolder}`, { method: 'GET' })
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
                this.updateStats(-1, false);
                fileManager.removeFile(key);
                this.$message.success('删除成功!');
            })
            .catch(() => this.$message.error('删除失败，请检查网络连接'));
        }).catch(() => this.$message.info('已取消删除'));
    },
    handleBatchDelete() {
        this.$confirm('此操作将永久删除选中的文件及文件夹, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
        }).then(() => {
        const promises = this.selectedFiles.map(file => {
            const isFolder = file.isFolder;
            return fetchWithAuth(`/api/manage/delete/${file.name}?folder=${isFolder}`, { method: 'GET' });
        });

        Promise.all(promises)
            .then(results => {
                let successNum = 0;
                results.forEach((response, index) => {
                    if (response.ok) {
                        successNum++;
                        const fileIndex = this.tableData.findIndex(file => file.name === this.selectedFiles[index].name);
                        if (fileIndex !== -1) {
                            this.tableData.splice(fileIndex, 1);
                        }
                        fileManager.removeFile(this.selectedFiles[index].name);
                    }
                });
                this.selectedFiles = [];
                this.updateStats(-successNum, false);
                this.$message.success('批量删除成功!');
            })
            .catch(() => this.$message.error('批量删除失败，请检查网络连接'));
        }).catch(() => this.$message.info('已取消批量删除'));
    },
    handleBatchCopy() {
        let tmpLinks = '';
        switch (this.defaultUrlFormat) {
            case 'originUrl':
                tmpLinks = this.selectedFiles.map(file => {
                    // 跳过文件夹
                    if (file.isFolder) return '';

                    if (file.metadata?.Channel === 'External') {
                        return file.metadata?.ExternalLink;
                    } else {
                        return `${this.rootUrl}${file.name}`;
                    }
                }).join('\n');
                break;
            case 'mdUrl':
                tmpLinks = this.selectedFiles.map(file => {
                    // 跳过文件夹
                    if (file.isFolder) return '';

                    if (file.metadata?.Channel === 'External') {
                        return `![${file.metadata?.FileName || file.name}](${file.metadata?.ExternalLink})`;
                    } else {
                        return `![${file.metadata?.FileName || file.name}](${this.rootUrl}${file.name})`;
                    }
                }).join('\n');
                break;
            case 'htmlUrl':
                tmpLinks = this.selectedFiles.map(file => {
                    // 跳过文件夹
                    if (file.isFolder) return '';

                    if (file.metadata?.Channel === 'External') {
                        return `<img src="${file.metadata?.ExternalLink}" alt="${file.metadata?.FileName || file.name}" width=100%>`;
                    } else {
                        return `<img src="${this.rootUrl}${file.name}" alt="${file.metadata?.FileName || file.name}" width=100%>`;
                    }
                }).join('\n');
                break;
            case 'bbUrl':
                tmpLinks = this.selectedFiles.map(file => {
                    // 跳过文件夹
                    if (file.isFolder) return '';

                    if (file.metadata?.Channel === 'External') {
                        return `[img]${file.metadata?.ExternalLink}[/img]`;
                    } else {
                        return `[img]${this.rootUrl}${file.name}[/img]`;
                    }
                }).join('\n');
                break;
            case 'tgId':
                tmpLinks = this.selectedFiles.map(file => file.metadata?.TgFileId || '').join('\n');
                break;
            case 's3Location':
                tmpLinks = this.selectedFiles.map(file => file.metadata?.S3Location || '').join('\n');
                break;
        }
        // 删除空行
        tmpLinks = tmpLinks.replace(/^\s*[\r\n]/gm, '');

        const links = tmpLinks;
        navigator.clipboard ? navigator.clipboard.writeText(links).then(() => this.$message.success('批量复制链接成功')) :
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
        this.$message.success('批量复制链接成功');
    },
    handleCopy(index, key) {
        let text = '';
        if (this.paginatedTableData[index].metadata?.Channel === 'External') {
            switch (this.defaultUrlFormat) {
                case 'originUrl':
                    text = this.paginatedTableData[index].metadata?.ExternalLink;
                    break;
                case 'mdUrl':
                    text = `![${this.paginatedTableData[index].metadata?.FileName || key}](${this.paginatedTableData[index].metadata?.ExternalLink})`;
                    break;
                case 'htmlUrl':
                    text = `<img src="${this.paginatedTableData[index].metadata?.ExternalLink}" alt="${this.paginatedTableData[index].metadata?.FileName || key}" width=100%>`;
                    break;
                case 'bbUrl':
                    text = `[img]${this.paginatedTableData[index].metadata?.ExternalLink}[/img]`;
                    break;
                case 'tgId':
                    text = this.paginatedTableData[index].metadata?.TgFileId || 'none';
                    break;
                case 's3Location':
                    text = this.paginatedTableData[index].metadata?.S3Location || 'none';
                    break;
            }
        } else {
            switch (this.defaultUrlFormat) {
                case 'originUrl':
                    text = `${this.rootUrl}${key}`;
                    break;
                case 'mdUrl':
                    text = `![${this.paginatedTableData[index].metadata?.FileName || key}](${this.rootUrl}${key})`;
                    break;
                case 'htmlUrl':
                    text = `<img src="${this.rootUrl}${key}" alt="${this.paginatedTableData[index].metadata?.FileName || key}" width=100%>`;
                    break;
                case 'bbUrl':
                    text = `[img]${this.rootUrl}${key}[/img]`;
                    break;
                case 'tgId':
                    text = this.paginatedTableData[index].metadata?.TgFileId || 'none';
                    break;
                case 's3Location':
                    text = this.paginatedTableData[index].metadata?.S3Location || 'none';
                    break;
            }
        }
        navigator.clipboard ? navigator.clipboard.writeText(text).then(() => this.$message.success('复制文件链接成功')) :
        this.copyToClipboardFallback(text);
    },
    async loadMoreData() {
        this.loading = true;

        try {
            // 传递标签参数到后端
            await fileManager.loadMoreFiles(
                this.currentPath, 
                this.searchKeywords,
                this.searchIncludeTags,
                this.searchExcludeTags
            );
            // 获取新的文件列表后
            await this.fetchFileList();
        } catch (error) {
            this.$message.error('加载更多文件失败，请检查网络连接');
        } finally {
            this.loading = false;
        }
    },
    updateStats(num, init = false) {
        if (init) {
            this.Number = num;
        } else {
            this.Number += num;
        }
    },
    sort(command) {
        this.sortOption = command;
    },
    sortData(data) {
        // 文件夹始终在前
        const folders = data.filter(file => file.isFolder);
        const files = data.filter(file => !file.isFolder);

        if (this.sortOption === 'dateDesc') {
            // 按时间降序
            folders.sort((a, b) => new Date(b.metadata?.TimeStamp) - new Date(a.metadata?.TimeStamp));
            files.sort((a, b) => new Date(b.metadata?.TimeStamp) - new Date(a.metadata?.TimeStamp));
        } else {
            // 按文件名升序
            folders.sort((a, b) => a.name.localeCompare(b.name));
            files.sort((a, b) => a.name.localeCompare(b.name));
        }

        return folders.concat(files);
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
        } else if (command === 'move') {
            this.handleBatchMove();
        } else if (command === 'tagManagement') {
            this.handleBatchTagManagement();
        } else if (command === 'ban') {
            this.handleBatchBlock();
        } else if (command === 'white') {
            this.handleBatchWhite();
        }
    },
    handleMove(index, key) {
        // 弹窗输入新的文件夹路径
        this.$prompt('请输入新的目录', '移动文件', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputPattern: /^\/([a-zA-Z0-9_\u4e00-\u9fa5]+(\/[a-zA-Z0-9_\u4e00-\u9fa5]+)*)?$/,
            inputErrorMessage: '请输入/开头的正确目录路径'
        }).then(({ value }) => {
            // 去掉开头的 /，结尾若没有 /，则加上
            const newPath = value.replace(/^\/+/, '') + (value.endsWith('/') ? '' : value === '' ? '' : '/');
            const isFolder = this.tableData.find(file => file.name === key).isFolder;
            // 判断目标文件夹是否是当前文件夹
            if (newPath === this.currentPath) {
                this.$message.warning('目标文件夹不能是当前文件夹');
                return;
            }
            fetchWithAuth(`/api/manage/move/${key}?folder=${isFolder}&dist=${newPath}`, { method: 'GET' })
                .then(response => {
                    if (response.ok) {
                        const fileIndex = this.tableData.findIndex(file => file.name === key);
                        if (fileIndex !== -1) {
                            // 更新本地文件管理器
                            const newKey = newPath + key.split('/').pop();
                            fileManager.moveFile(key, newKey, isFolder, this.currentPath);
                            // 移除文件
                            this.tableData.splice(fileIndex, 1);
                            // 强制重新渲染内容
                            this.$nextTick(() => {
                                // 创建临时数组
                                const tempData = [...this.tableData];
                                // 清空数组
                                this.tableData = [];
                                // 在下一个tick中恢复数据
                                this.$nextTick(() => {
                                    this.tableData = tempData;
                                });
                            });
                        }
                        this.updateStats(-1, false);
                        this.$message.success('移动成功!');
                    } else {
                        return Promise.reject('请求失败');
                    }
                })
                .then(() => {
                    // 刷新本地文件列表
                    this.refreshLocalFileList();
                })
                .catch(() => this.$message.error('移动失败，请检查网络连接'));
        }).catch(() => this.$message.info('已取消移动文件'));
    },
    handleBatchMove() {
        // 弹窗输入新的文件夹路径
        this.$prompt('请输入新的目录', '移动文件', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputPattern: /^\/([a-zA-Z0-9_\u4e00-\u9fa5]+(\/[a-zA-Z0-9_\u4e00-\u9fa5]+)*)?$/,
            inputErrorMessage: '请输入/开头的正确目录路径'
        }).then(({ value }) => {
            // 去掉开头的 /，结尾若没有 /，则加上
            const newPath = value.replace(/^\/+/, '') + (value.endsWith('/') ? '' : value === '' ? '' : '/');
            // 判断目标文件夹是否是当前文件夹
            if (newPath === this.currentPath) {
                this.$message.warning('目标文件夹不能是当前文件夹');
                return;
            }
            const promises = this.selectedFiles.map(file => {
                const isFolder = file.isFolder;
                return fetchWithAuth(`/api/manage/move/${file.name}?folder=${isFolder}&dist=${newPath}`, { method: 'GET' });
            });

            Promise.all(promises)
                .then(results => {
                    let successNum = 0;
                    results.forEach((response, index) => {
                        if (response.ok) {
                            successNum++;
                            const file = this.selectedFiles[index];
                            file.selected = false;
                            const fileIndex = this.tableData.findIndex(f => f.name === file.name);
                            if (fileIndex !== -1) {
                                // 更新本地文件管理器
                                const newKey = newPath + file.name.split('/').pop();
                                fileManager.moveFile(file.name, newKey, file.isFolder, this.currentPath);
                                // 移除文件
                                this.tableData.splice(fileIndex, 1);
                            }
                        }
                    });
                    // 强制重新渲染内容
                    this.$nextTick(() => {
                        // 创建临时数组
                        const tempData = [...this.tableData];
                        // 清空数组
                        this.tableData = [];
                        // 在下一个tick中恢复数据
                        this.$nextTick(() => {
                            this.tableData = tempData;
                        });
                    });
                    this.updateStats(-successNum, false);
                    this.$message.success('移动成功!');
                })
                .then(() => {
                    // 刷新本地文件列表
                    this.refreshLocalFileList();
                })
                .catch(() => this.$message.error('移动失败，请检查网络连接'));
        }).catch(() => this.$message.info('已取消移动文件'));
    },
    handleBatchBlock(){
        this.$confirm('此操作将把选中的文件加入黑名单, 是否继续?', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }).then(() => {
            // 跳过文件夹
            const promises = this.selectedFiles.map(file => {
                if (file.isFolder) {
                    return Promise.resolve({ ok: false });
                }
                return fetchWithAuth(`/api/manage/block/${file.name}`, { method: 'GET' });
            });

            Promise.all(promises)
                .then(results => {
                    results.forEach((response, index) => {
                        if (response.ok) {
                            const fileIndex = this.tableData.findIndex(file => file.name === this.selectedFiles[index].name);
                            if (fileIndex !== -1) {
                                this.tableData[fileIndex].metadata.ListType = 'Block';
                            }
                        }
                    });
                    this.$message.success('批量加入黑名单成功!');
                })
                .catch(() => this.$message.error('批量加入黑名单失败，请检查网络连接'));
        }).catch(() => this.$message.info('已取消批量加入黑名单'));
    },
    handleBatchWhite(){
        this.$confirm('此操作将把选中的文件加入白名单, 是否继续?', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }).then(() => {
            // 跳过文件夹
            const promises = this.selectedFiles.map(file => {
                if (file.isFolder) {
                    return Promise.resolve({ ok: false });
                }
                return fetchWithAuth(`/api/manage/white/${file.name}`, { method: 'GET' });
            });

            Promise.all(promises)
                .then(results => {
                    results.forEach((response, index) => {
                        if (response.ok) {
                            const fileIndex = this.tableData.findIndex(file => file.name === this.selectedFiles[index].name);
                            if (fileIndex !== -1) {
                                this.tableData[fileIndex].metadata.ListType = 'White';
                            }
                        }
                    });
                    this.$message.success('批量加入白名单成功!');
                })
                .catch(() => this.$message.error('批量加入白名单失败，请检查网络连接'));
        }).catch(() => this.$message.info('已取消批量加入白名单'));
    },
    handleBatchDownload() {
        // 将选中文件打包成 zip 文件下载
        const zip = new JSZip();
        const folder = zip.folder('files');
        // 构造Promise数组，等待所有文件下载完成后再打包
        const fileNameCount = {}; // 用于跟踪文件名出现的次数

        const downloadPromises = this.selectedFiles.map(async file => {
            // 跳过文件夹
            if (file.isFolder) {
                return;
            }
            const response = await fetch(this.getFileLink(file.name));
            const blob = await response.blob();
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

        Promise.all(downloadPromises)
            .then(() => zip.generateAsync({ type: 'blob' }))
            .then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'files.zip';
                link.click();
            });
    },
    isVideo(file) {
        let flag = file.metadata?.FileType?.includes('video') || file.metadata?.FileType?.includes('audio');
        // 用文件名后缀判断是否为视频文件
        if (!flag) {
            const videoExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'flv', 'wmv', 'mkv', 'rmvb', '3gp', 'mpg', 'mpeg', 'm4v', 'f4v', 'rm', 'asf', 'dat', 'ts', 'vob', 'swf', 'divx', 'xvid', 'm2ts', 'mts', 'm2v', '3g2', '3gp2', '3gpp', '3gpp2', 'mpe', 'm1v', 'mpv', 'mpv2', 'mp2v', 'm2t', 'm2ts', 'm2v', 'm4b', 'm4p', 'm4v', 'm4r'];
            const extension = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
            flag = videoExtensions.includes(extension);
        }
        return flag;
    },
    isImage(file) {
        let flag = file.metadata?.FileType?.includes('image');
        // 用文件名后缀判断是否为图片文件
        if (!flag) {
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif', 'psd', 'ai', 'eps', 'raw', 'cr2', 'nef', 'orf', 'sr2', 'dng', 'arw', 'rw2', 'raf', 'pef', 'x3f', 'srf', 'erf', 'mrw', 'nrw', 'kdc', 'dcr', 'mef', 'mos', 'crw', 'raf', 'rwl', 'srw', '3fr', 'fff', 'iiq', 'qtk', 'bay', 'k25', 'kdc', 'dcs', 'drf', 'dng', 'erf', 'kdc', 'mdc', 'mef', 'mos', 'mrw', 'nef', 'nrw', 'orf', 'pef', 'ptx', 'pxn', 'r3d', 'raf', 'raw', 'rwl', 'rw2', 'rwz', 'sr2', 'srf', 'x3f'];
            const extension = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
            flag = imageExtensions.includes(extension);
        }
        return flag;
    },
    getFileLink(filename) {
        const fileLink = process.env.NODE_ENV === 'production' ? `/file/${filename}?from=admin` : `/api/file/${filename}?from=admin`;
        return fileLink;
    },
    handlePageChange(page) {
        this.currentPage = page;
        // 到最后一页时，加载更多数据
        if (this.currentPage === Math.ceil(this.tableData.length / this.pageSize)) {
            this.loadMoreData();
        }
    },
    // 判断是否为文件夹
    isFolder(item) {
        // 如果是已经标记为文件夹的项目，直接返回true
        if (item.isFolder) {
            return true;
        }
        
        // 获取真实的文件路径（去除URL前缀）
        let path = item.name;
        if (path.startsWith('http')) {
            path = path.split('/file/')[1];
        }
        
        // 如果文件名包含'/'，需要判断是否是当前路径下的文件
        if (path && path.includes('/')) {
            // 获取相对于当前路径的部分
            const relativePath = this.currentPath ? 
                path.substring(this.currentPath.length) : 
                path;
            
            // 如果在根目录，第一个斜杠前的部分就是文件夹
            if (this.currentPath === '') {
                return !path.split('/')[0].includes('.');
            }
            
            // 如果在子文件夹中，检查相对路径是否还包含其他文件夹
            return relativePath.includes('/');
        }
        
        return false;
    },
    
    // 获取文件夹名称
    getFolderName(path) {
        let folderName = '';
        // 如果是文件夹路径，只返回最后一级文件夹名
        if (path && path.includes('/')) {
            const parts = path.split('/');
            // 如果是根目录下的文件夹
            if (this.currentPath === '') {
                folderName = parts[0];
            } else {
                // 如果是子文件夹
                const relativePath = path.substring(this.currentPath.length);
                folderName = relativePath.split('/')[0];
            }
        } else {
            folderName = path;
        }

        const maxLength = 20; // Adjust max length as needed
        if (folderName.length > maxLength) {
            const startLength = Math.floor((maxLength - 3) / 2);
            const endLength = Math.ceil((maxLength - 3) / 2);
            return `${folderName.substring(0, startLength)}...${folderName.substring(folderName.length - endLength)}`;
        }
        return folderName;
    },
    
    // 获取文件名称（去除路径和URL前缀）
    getFileName(path) {
        let fileName = path.split('/').pop();
        const maxLength = 20; // Adjust max length as needed, ensure it fits in one line
        if (fileName.length > maxLength) {
            const startLength = Math.floor((maxLength - 3) / 2);
            const endLength = Math.ceil((maxLength - 3) / 2);
            return `${fileName.substring(0, startLength)}...${fileName.substring(fileName.length - endLength)}`;
        }
        return fileName;
    },
    
    // 进入文件夹
    enterFolder(folderPath) {
        // 确保路径末尾有 '/'
        this.currentPath = folderPath + (folderPath.endsWith('/') ? '' : '/');
        // 刷新文件列表，到指定currentPath下
        this.refreshFileList();
    },
    
    // 导航到指定文件夹
    navigateToFolder(path) {
        // 确保空路径时不添加 '/'
        this.currentPath = path ? (path + (path.endsWith('/') ? '' : '/')) : '';
        // 刷新文件列表，到指定currentPath下
        this.refreshFileList();
    },
    
    // 获取文件列表
    async fetchFileList() {
        this.loading = true;
        try {
            // 从本地存储获取数据
            const data = fileManager.getLocalFileList();
            
            // 解析返回的数据
            const folders = new Set(data.directories || []);
            const files = data.files || [];

            // 处理文件夹数据
            const folderItems = Array.from(folders).map(folder => ({
                name: folder,
                isFolder: true,
                selected: false,
                metadata: { FileName: folder.split('/').pop() }
            }));

            // 处理文件数据
            const fileItems = files.map(file => ({
                name: file.name,
                isFolder: false,
                selected: false,
                metadata: file.metadata
            }));

            // 更新表格数据
            this.tableData = [...folderItems, ...fileItems];

            // 更新统计信息
            this.updateStats(data.totalCount, true);

        } catch (error) {
            console.error('Error fetching file list:', error);
            this.$message.error('获取文件列表失败');
        } finally {
            this.loading = false;
        }
    },
    // 刷新文件列表
    async refreshFileList() {
        this.refreshLoading = true;
        this.loading = true;
        try {
            // 传递标签参数到后端
            const success = await fileManager.refreshFileList(
                this.currentPath, 
                this.searchKeywords,
                this.searchIncludeTags,
                this.searchExcludeTags
            );
            if (success) {
                await this.fetchFileList();
            } else {
                throw new Error('Refresh failed');
            }
        } catch (error) {
            console.error('Error refreshing file list:', error);
            this.$message.error('刷新失败，请重试');
        } finally {
            this.refreshLoading = false;
            this.loading = false;
        }
    },
    // 刷新本地文件列表
    async refreshLocalFileList() {
        this.refreshLoading = true;
        this.loading = true;
        try {
            await this.fetchFileList();
        } catch (error) {
            console.error('Error refreshing local file list:', error);
            this.$message.error('刷新失败，请重试');
        } finally {
            this.refreshLoading = false;
            this.loading = false;
        }
    },
    // Tag management methods
    handleTagManagement(fileId) {
        this.currentTagFile = fileId;
        this.showTagDialog = true;
    },
    handleBatchTagManagement() {
        if (this.selectedFiles.length === 0) {
            this.$message.warning('请先选择文件');
            return;
        }
        this.showBatchTagDialog = true;
    },
    async handleTagsUpdated(tags) {
        // 更新本地文件数据中的标签
        const fileIndex = this.tableData.findIndex(file => file.name === this.currentTagFile);
        if (fileIndex !== -1) {
            // 更新 tableData 中的标签
            if (!this.tableData[fileIndex].metadata) {
                this.tableData[fileIndex].metadata = {};
            }
            this.tableData[fileIndex].metadata.Tags = tags;
            
            // 如果详情对话框正在显示这个文件，也更新详情数据
            if (this.showdetailDialog && this.detailFile?.name === this.currentTagFile) {
                if (!this.detailFile.metadata) {
                    this.detailFile.metadata = {};
                }
                this.detailFile.metadata.Tags = tags;
            }
        }
    },
    async handleBatchTagsUpdated() {
        // 刷新文件列表以显示更新后的标签
        await this.refreshLocalFileList();
    },
},
mounted() {
    this.loading = true;
    fetchWithAuth("/api/manage/check", { method: 'GET' })
        .then(response => response.text())
        .then(result => {
            if(result == "true"){
                this.showLogoutButton = true;
                return true;
            } else if(result == "Not using basic auth."){
                return true;
            } else {
                throw new Error('Unauthorized');
            }
        })
        .then(() => {
            // 首次加载时刷新文件列表
            return this.refreshFileList();
        })
        .catch((err) => {
            if (err.message !== 'Unauthorized') {
                this.$message.error('同步数据时出错，请检查网络连接');
            }
        })
        .finally(() => {
            this.loading = false;
        });
    
    // 读取自定义链接设置项
    this.customUrlPrefix = this.adminUrlSettings.customUrlPrefix;
    this.useCustomUrl = this.adminUrlSettings.useCustomUrl;
}

};
</script>

<style scoped>
.container {
    background: var(--admin-container-bg-color);
    min-height: 100vh;
    font-family: 'Arial', sans-serif;
    color: var(--admin-container-color);
    margin: 0;
    padding: 0;
}

/* 确保el-container和el-main不裁剪内容 */
:deep(.el-container) {
    overflow: visible;
}

:deep(.el-main) {
    overflow: visible;
}

:deep(.el-dialog) {
    border-radius: 12px;
    background-color: var(--dialog-bg-color);
    backdrop-filter: blur(10px);
    box-shadow: var(--dialog-box-shadow);
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    background-color: var(--admin-header-content-bg-color);
    backdrop-filter: blur(10px);
    border-bottom: var(--admin-header-content-border-bottom);
    box-shadow: var(--admin-header-content-box-shadow);
    transition: background-color 0.5s ease, box-shadow 0.5s ease;
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
    position: fixed;
    top: 0;
    left: 50%; /* 将左边缘移动到页面中间 */
    transform: translateX(-50%); /* 向左移动自身宽度的一半 */
    width: 95%;
    z-index: 1000;
    min-height: 45px;
}

@media (max-width: 768px) {
    .header-content {
        flex-direction: column;
    }
}

.header-content:hover {
    background-color: var(--admin-header-content-hover-bg-color);
    box-shadow: var(--admin-header-content-hover-box-shadow);
}

.header-icon {
    font-size: 1.5em;
    cursor: pointer;
    transition: all 0.3s ease;
    color: var(--admin-container-color);
    outline: none;
}

.header-icon:hover {
    color: var(--admin-purple); /* 使用柔和的淡紫色 */
    transform: scale(1.2);
}


.stats {
    font-size: 1.2em;
    margin-right: 20px;
    display: flex;
    align-items: center;
    background: var(--admin-dashborad-stats-bg-color);
    padding: 5px 10px;
    border-radius: 10px;
    box-shadow: var(--admin-dashboard-stats-shadow);
    transition: background-color 0.3s ease, box-shadow 0.3s ease;
    color: var(--admin-container-color);
    cursor: pointer;
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
    background-color: var(--admin-dashborad-stats-hover-bg-color);
    box-shadow: var(--admin-dashboard-stats-hover-shadow);
    color: var(--admin-purple); /* 使用柔和的淡紫色 */
}

.stats:hover .fa-database {
    color: var(--admin-purple); /* 使用柔和的淡紫色 */
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
    color: var(--admin-container-color);
}

.header-content .actions i:hover {
    color: var(--admin-purple); /* 使用柔和的淡紫色 */
    transform: scale(1.2);
}

.header-content .actions .el-dropdown-link i {
    color: var(--admin-container-color);
}

.header-content .actions .el-dropdown-link i:hover {
    color: var(--admin-purple); /* 使用柔和的淡紫色 */
}

.header-content .actions .disabled {
    color: #bbb;
    pointer-events: none;
}

.header-content .actions .enabled {
    color: var(--admin-purple); /* 使用柔和的淡紫色 */
}

.batch-action-item-icon {
    width: 20px;
    margin-right: 5px;
}

/* 搜索卡片样式 */
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
    background: var(--admin-dashboard-search-card-bg-color);
    box-shadow: var(--admin-dashboard-search-card-box-shadow);
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
.search-icon {
    cursor: pointer;
    color: var(--admin-container-color);
    transition: all 0.3s ease;
    font-size: 1.3em;
    opacity: 0;
    transform: scale(0.8);
    pointer-events: none;
}
.search-card:focus-within .search-icon {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
}
.search-card:focus-within .search-icon:hover {
    color: var(--admin-purple); /* 使用柔和的淡紫色 */
    transform: scale(1.2);
}
.search-card :deep(.el-input__suffix) {
    display: flex;
    align-items: center;
    right: 10px;
}

/* 主容器样式 */
.main-container {
    display: flex;
    flex-direction: column;
    padding: 20px 60px;
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
    padding-bottom: 0px;
    flex-grow: 1;
    min-height: 80vh;
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
    height: 22vh;
    background: var(--admin-dashboard-imgcard-bg-color);
    border-radius: 8px;
    box-shadow: var(--admin-dashboard-imgcard-shadow);
    overflow: hidden;
    position: relative;
    transition: transform 0.3s ease;
}

.img-card :deep(.el-card__body) {
    padding: 0;
    height: 100%;
    overflow: hidden;
}

.img-card:hover {
    transform: scale(1.05);
}

.image-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.3s ease;
    filter: var(--image-preview-filter);
}

.image-preview:hover {
    opacity: 0.8;
}

.file-short-info {
    position: absolute;
    z-index: 10;
    top: 3px;
    left: 3px;
    display: flex;
    gap: 5px;
    align-items: start;
}

.success-tag {
    background-color: rgba(129, 251, 129, 0.3);
    color: rgba(57, 174, 21, 0.8);
    border: 0.5px solid rgba(60, 255, 0, 0.1);
    padding: 2px 5px;
    border-radius: 5px;
    font-size: 12px;
    height: 14px;
}
.fail-tag {
    background-color: rgba(255, 0, 0, 0.3);
    color: rgba(255, 0, 0, 0.8);
    border: 0.5px solid rgba(255, 0, 0, 0.1);
    padding: 2px 5px;
    border-radius: 5px;
    font-size: 12px;
    height: 14px;
}
.primary-tag {
    background-color: rgba(255, 182, 193, 0.5);
    color: rgba(255, 105, 180, 0.9);
    border: 0.5px solid rgba(255, 182, 193, 0.3);
    padding: 2px 5px;
    border-radius: 5px;
    font-size: 12px;
    display: flex;
    align-items: center;
    height: 14px;
}

.file-preview {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
}
.file-icon {
    opacity: 0.6;
}
.file-icon-detail {
    height: 40px;
}

/* 卡片底部统一覆盖层 */
.card-bottom-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    padding: 30px 12px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    z-index: 10;
}

.file-name-row {
    display: flex;
    align-items: center;
    justify-content: center;
}

.file-name {
    color: white;
    font-size: 13px;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* 新版操作栏样式 */
.action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    opacity: 0;
    transform: translateY(4px);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
}

.el-card:hover .action-bar {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
}

.action-bar-left,
.action-bar-right {
    display: flex;
    align-items: center;
    gap: 6px;
}

.action-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.15);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    font-size: 14px;
}

.action-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.08);
}

.action-btn:active {
    transform: scale(0.95);
}

.action-btn-danger:hover {
    background: rgba(239, 68, 68, 0.6);
}

/* 移动端隐藏操作栏 */
@media (max-width: 768px) {
    .action-bar {
        display: none !important;
    }
}

/* 列表视图样式 */
.list-view {
    display: flex;
    flex-direction: column;
    gap: 0;
    background: var(--admin-dashboard-imgcard-bg-color);
    border-radius: 12px;
    overflow-x: auto;
    overflow-y: visible;
    box-shadow: var(--admin-dashboard-imgcard-shadow);
    margin-top: 15px;
}

.list-header {
    display: grid;
    grid-template-columns: 50px 60px minmax(180px, 1fr) 130px 100px 120px 80px 100px 120px;
    padding: 12px 20px;
    background: var(--admin-dashboard-stats-bg);
    font-weight: 600;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    border-bottom: 1px solid var(--el-border-color-lighter);
    min-width: fit-content;
}

.list-item {
    display: grid;
    grid-template-columns: 50px 60px minmax(180px, 1fr) 130px 100px 120px 80px 100px 120px;
    padding: 12px 20px;
    align-items: center;
    transition: background 0.2s ease;
    border-bottom: 1px solid var(--el-border-color-lighter);
    min-width: fit-content;
}

.list-item:last-child {
    border-bottom: none;
}

.list-item:hover {
    background: var(--el-fill-color-light);
}

.list-col {
    display: flex;
    align-items: center;
}

.list-col-checkbox {
    justify-content: center;
    min-width: 40px;
}

.list-col-preview {
    justify-content: center;
    cursor: pointer;
}

.list-col-name {
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-right: 16px;
}

.list-col-name:hover {
    color: #38bdf8;
}

.list-col-size,
.list-col-date,
.list-col-channel,
.list-col-address {
    font-size: 13px;
    color: var(--el-text-color-secondary);
}

.list-col-tags {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: nowrap;
    overflow: hidden;
}

/* 自定义复选框 */
.custom-checkbox {
    width: 18px;
    height: 18px;
    border: 2px solid var(--el-border-color);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
}

.custom-checkbox:hover {
    border-color: #38bdf8;
}

.custom-checkbox.checked {
    background: linear-gradient(135deg, #0ea5e9, #38bdf8);
    border-color: #38bdf8;
}

.custom-checkbox.indeterminate {
    background: linear-gradient(135deg, #0ea5e9, #38bdf8);
    border-color: #38bdf8;
}

.custom-checkbox .check-icon {
    font-size: 10px;
    color: white;
}

/* 彩色标签 */
.color-tag {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    color: white;
    white-space: nowrap;
    max-width: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.color-tag-more {
    min-width: 30px;
    text-align: center;
}

.list-empty {
    color: var(--el-text-color-placeholder);
}

.list-col-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.list-preview-img {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 6px;
}

.list-folder-icon {
    font-size: 28px;
    color: var(--el-color-primary);
}

.list-file-icon {
    font-size: 24px;
    color: var(--el-text-color-secondary);
}

.list-action-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: var(--el-fill-color);
    color: var(--el-text-color-regular);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.list-action-btn:hover {
    background: #38bdf8;
    color: white;
}

.list-action-danger:hover {
    background: var(--el-color-danger);
}

/* 移动端列表视图简化 */
@media (max-width: 768px) {
    .list-header {
        display: none;
    }
    
    .list-item {
        grid-template-columns: 28px 40px 1fr auto;
        padding: 10px 8px;
        gap: 8px;
    }
    
    .list-col-size,
    .list-col-date,
    .list-col-tags,
    .list-col-channel,
    .list-col-address {
        display: none;
    }
    
    .list-col-actions {
        gap: 4px;
    }
    
    .list-action-btn {
        width: 28px;
        height: 28px;
    }
    
    .list-col-checkbox {
        width: 24px;
        min-width: 24px;
    }
    
    .custom-checkbox {
        width: 16px;
        height: 16px;
    }
    
    .custom-checkbox .check-icon {
        font-size: 8px;
    }
    
    .list-preview-img {
        width: 36px;
        height: 36px;
    }
    
    .list-col-name {
        font-size: 12px;
    }
}

.pagination-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 20px;
    padding-bottom: 20px;
    gap: 15px;
}

/* 页码按钮美化 */
.pagination-container :deep(.el-pagination) {
    --el-pagination-button-bg-color: var(--admin-dashboard-btn-bg-color);
    --el-pagination-hover-color: var(--admin-purple);
}

.pagination-container :deep(.el-pager li) {
    background: var(--admin-dashboard-btn-bg-color);
    border-radius: 10px;
    margin: 0 4px;
    min-width: 36px;
    height: 36px;
    line-height: 36px;
    font-weight: 500;
    border: none;
    box-shadow: var(--admin-dashboard-btn-shadow);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pagination-container :deep(.el-pager li:hover) {
    color: #38bdf8;
    transform: translateY(-2px);
    box-shadow: var(--admin-dashboard-btn-hover-shadow);
}

.pagination-container :deep(.el-pager li.is-active) {
    background: linear-gradient(135deg, #0ea5e9, #38bdf8) !important;
    color: white !important;
    border-radius: 10px;
    box-shadow: 
        var(--admin-dashboard-btn-shadow),
        0 4px 12px rgba(56, 189, 248, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pagination-container :deep(.el-pager li.is-active:hover) {
    transform: translateY(-2px) !important;
    box-shadow: 
        var(--admin-dashboard-btn-hover-shadow),
        0 6px 16px rgba(56, 189, 248, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
}

.pagination-container :deep(.btn-prev),
.pagination-container :deep(.btn-next) {
    background: var(--admin-dashboard-btn-bg-color) !important;
    border-radius: 10px !important;
    min-width: 36px;
    height: 36px;
    border: none;
    box-shadow: var(--admin-dashboard-btn-shadow);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pagination-container :deep(.btn-prev:hover),
.pagination-container :deep(.btn-next:hover) {
    color: #38bdf8;
    transform: translateY(-2px);
    box-shadow: var(--admin-dashboard-btn-hover-shadow);
}

.pagination-right {
    display: flex;
    align-items: center;
    gap: 10px;
}

.refresh-btn {
    cursor: pointer;
    background: var(--admin-dashboard-btn-bg-color);
    box-shadow: var(--admin-dashboard-btn-shadow);
    color: #38bdf8;
    border: none;
    border-radius: 10px;
    width: 36px;
    height: 36px;
    min-width: 36px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.refresh-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--admin-dashboard-btn-hover-shadow);
    background: linear-gradient(135deg, #0ea5e9, #38bdf8);
    color: white;
}

.load-more {
    cursor: pointer;
    background: linear-gradient(135deg, #0ea5e9, #38bdf8);
    box-shadow: 0 4px 15px rgba(56, 189, 248, 0.3);
    color: white;
    border: none;
    border-radius: 10px;
    height: 36px;
    padding: 0 16px;
    font-weight: 500;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.load-more:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(56, 189, 248, 0.5);
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
    height: 100%;
    display: block;
    cursor: pointer;
    object-fit: cover;
}

:deep(.description-item) {
    word-break: break-all;
    word-wrap: break-word;
}

.detail-actions {
    display: flex;
    justify-content: right;
    margin-bottom: 10px;
}
@media (max-width: 768px) {
    .detail-actions {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }
    .detail-action {
        margin-left: 0;
    }
}
:deep(.btn-prev){
    border-radius: 100%;
    position: fixed;
    top: 50%;
    left: 8px;
    scale: 1;
    color: var(--admin-dashboard-btn-color);
}
:deep(.btn-next) {
    border-radius: 100%;
    position: fixed;
    top: 50%;
    right: 8px;
    scale: 1;
    color: var(--admin-dashboard-btn-color);
}
@media (min-width: 768px) {
    :deep(.el-pagination.is-background .btn-prev), :deep(.el-pagination.is-background .btn-next) {
        background-color: var(--admin-dashboard-btn-bg-color);
        backdrop-filter: blur(10px);
        box-shadow: var(--admin-dashboard-btn-shadow);
        transition: all 0.3s ease;
    }
    :deep(.el-pagination.is-background .btn-prev:hover), :deep(.el-pagination.is-background .btn-next:hover) {
        transform: translateY(-10%);
        box-shadow: var(--admin-dashboard-btn-hover-shadow);
    }
}

.question-icon {
    margin: 0 3px;
}

.breadcrumb {
    padding: 15px;
    background-color: var(--el-bg-color);
    border-radius: 8px;
    font-size: 1.2em;
    box-shadow: var(--admin-dashboard-stats-shadow);
    transition: all 0.3s ease;
}

.breadcrumb:hover {
    transform: translateY(-2px);
    box-shadow: var(--admin-dashboard-stats-hover-shadow);
}

.folder-card {
    cursor: pointer;
}

.folder-card:hover {
    transform: scale(1.05);
}

.folder-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    color: var(--el-color-primary);
}

.folder-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: end;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
}

.folder-card:hover .folder-overlay {
    opacity: 1;
}

.folder-actions {
    position: absolute;
    bottom: 15%;
    display: flex;
    pointer-events: auto;
}


:deep(.el-breadcrumb__item) {
    cursor: pointer;
}
:deep(.el-breadcrumb__inner:hover) {
    color: var(--el-color-primary);
}

/* 自定义底部弹出模态框样式 */
.bottom-sheet-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    display: flex;
    align-items: flex-end;
    justify-content: center;
}

.bottom-sheet {
    width: 100%;
    max-width: 100%;
    background: var(--bottom-sheet-bg, rgba(255, 255, 255, 0.95));
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 20px 20px 0 0;
    max-height: 70vh;
    overflow: hidden;
    box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.15);
    border-top: 1px solid var(--bottom-sheet-border, rgba(0, 0, 0, 0.05));
}

/* 深色模式底部弹框 */
html.dark .bottom-sheet {
    --bottom-sheet-bg: rgba(40, 44, 52, 0.95);
    --bottom-sheet-border: rgba(255, 255, 255, 0.1);
    box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.4);
}

.bottom-sheet-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.bottom-sheet-handle {
    width: 40px;
    height: 4px;
    background: var(--el-border-color);
    border-radius: 2px;
}

.bottom-sheet-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    text-align: center;
    max-width: 80%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

html.dark .bottom-sheet-title {
    color: #f0f0f0;
}

.bottom-sheet-content {
    padding: 12px 16px;
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.bottom-sheet-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--bottom-sheet-item-bg, rgba(0, 0, 0, 0.04));
    color: var(--el-text-color-primary);
}

html.dark .bottom-sheet-item {
    --bottom-sheet-item-bg: rgba(255, 255, 255, 0.08);
}

.bottom-sheet-item:active {
    transform: scale(0.98);
    background: var(--bottom-sheet-item-active-bg, rgba(0, 0, 0, 0.08));
}

html.dark .bottom-sheet-item:active {
    --bottom-sheet-item-active-bg: rgba(255, 255, 255, 0.15);
}

.bottom-sheet-icon {
    font-size: 20px;
    width: 28px;
    text-align: center;
    color: #38bdf8;
}

.bottom-sheet-danger {
    color: var(--el-color-danger);
}

.bottom-sheet-danger .bottom-sheet-icon {
    color: var(--el-color-danger);
}

/* 底部弹出动画 */
.bottom-sheet-enter-active {
    transition: all 0.3s ease-out;
}
.bottom-sheet-leave-active {
    transition: all 0.2s ease-in;
}
.bottom-sheet-enter-active .bottom-sheet {
    animation: slideUp 0.3s ease-out;
}
.bottom-sheet-leave-active .bottom-sheet {
    animation: slideDown 0.2s ease-in;
}
.bottom-sheet-enter-from,
.bottom-sheet-leave-to {
    opacity: 0;
}
.bottom-sheet-enter-from .bottom-sheet,
.bottom-sheet-leave-to .bottom-sheet {
    transform: translateY(100%);
}

@keyframes slideUp {
    from {
        transform: translateY(100%);
    }
    to {
        transform: translateY(0);
    }
}

@keyframes slideDown {
    from {
        transform: translateY(0);
    }
    to {
        transform: translateY(100%);
    }
}

</style>
