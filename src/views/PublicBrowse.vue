<template>
  <div class="public-browse" :class="{ 'light-mode': isLightMode }">
    <!-- 顶部导航栏 -->
    <header class="header">
      <div class="header-left">
        <span class="logo" @click="toggleTheme" title="切换日夜模式">{{ siteName }}</span>
      </div>
      <div class="header-center">
        <div class="breadcrumb">
          <span class="breadcrumb-item" @click="goToRoot">{{ rootDirName }}</span>
          <template v-for="(part, index) in pathParts" :key="index">
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-item" @click="goToPath(index)">{{ part }}</span>
          </template>
        </div>
      </div>
      <div class="header-right">
        <span class="file-count">{{ totalCount }} 个文件</span>
      </div>
    </header>

    <!-- 加载状态 -->
    <div v-if="loading && files.length === 0" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="error" class="error-container">
      <p>{{ error }}</p>
      <button v-if="canRetry" @click="loadFiles" class="retry-btn">重试</button>
    </div>

    <!-- 瀑布流容器 -->
    <div v-else class="gallery-container" ref="galleryContainer">
      <!-- 文件夹区域 -->
      <div v-if="folders.length > 0" class="folders-section">
        <div class="folders-grid">
          <div 
            v-for="folder in folders" 
            :key="folder.name"
            class="folder-card"
            @click="enterFolder(folder.name)"
          >
            <div class="folder-icon">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
            </div>
            <span class="folder-name">{{ getFolderName(folder.name) }}</span>
          </div>
        </div>
      </div>

      <!-- 瀑布流图片区域 -->
      <div class="waterfall" ref="waterfall">
        <div 
          v-for="(column, colIndex) in columns" 
          :key="colIndex" 
          class="waterfall-column"
        >
          <div 
            v-for="file in column" 
            :key="file.name"
            class="waterfall-item"
            @click="openPreview(file)"
          >
            <div class="image-wrapper" :class="{ loaded: file.loaded }">
              <img 
                v-if="isImage(file)"
                :src="getFileUrl(file.name)" 
                :alt="file.name"
                loading="lazy"
                @load="onImageLoad($event, file)"
                @error="handleImageError"
              />
              <video 
                v-else-if="isVideo(file)"
                :src="getFileUrl(file.name)"
                muted
                loop
                preload="metadata"
                @loadedmetadata="onVideoLoad($event, file)"
                @pointerenter="e => e.pointerType === 'mouse' && e.target.play()"
                @pointerleave="e => e.pointerType === 'mouse' && e.target.pause()"
              ></video>
              <div v-else-if="isAudio(file)" class="audio-placeholder">
                <svg class="audio-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                <span class="audio-name">{{ getFileName(file.name) }}</span>
              </div>
              <div v-else class="file-placeholder">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>
                <span class="file-name">{{ getFileName(file.name) }}</span>
              </div>
              <!-- 悬浮操作层 -->
              <div class="overlay">
                <div class="overlay-actions">
                  <button class="action-btn" @click.stop="copyLink(file.name)" title="复制链接">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
                  </button>
                  <button class="action-btn" @click.stop="downloadFile(file.name)" title="下载">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多指示器 -->
      <div ref="loadTrigger" class="load-trigger">
        <div v-if="loading && files.length > 0" class="loading-more">
          <div class="loading-spinner-small"></div>
          <span>加载中...</span>
        </div>
        <div v-else-if="!hasMore && mediaFiles.length > 0" class="no-more">
          已加载全部
        </div>
        <a v-if="!hasMore && mediaFiles.length > 0" class="credit-link" href="https://github.com/axibayuit-a11y" target="_blank" rel="noopener">
          林酱贡献
        </a>
      </div>
    </div>

    <!-- 图片预览弹窗 -->
    <div v-if="previewVisible" class="preview-modal" @click.self="closePreview">
      <button class="preview-close" @click.stop="closePreview">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
      
      <!-- 桌面端：简单单图显示 -->
      <div class="preview-content desktop-only" @click.stop>
        <img 
          v-if="currentPreviewFile && isImage(currentPreviewFile)"
          :src="getFileUrl(currentPreviewFile.name)" 
          class="preview-image"
          :style="desktopImageStyle"
          draggable="false"
        />
        <video 
          v-else-if="currentPreviewFile && isVideo(currentPreviewFile)"
          :src="getFileUrl(currentPreviewFile.name)"
          controls
          autoplay
          class="preview-video"
          :style="desktopImageStyle"
        ></video>
      </div>
      
      <!-- 手机端：三页轨道轮播 + TransformMedia -->
      <div class="preview-content mobile-only" @click.stop>
        <div
          class="swipe-viewport"
          ref="mobileViewport"
          @touchstart="onSwipeStart"
          @touchmove="onSwipeMove"
          @touchend="onSwipeEnd"
        >
          <div class="swipe-track" :style="swipeTrackStyle" @transitionend="onSwipeTransitionEnd">
            <div 
              class="swipe-slide" 
              v-for="(f, i) in swipeWindow" 
              :key="getSlideKey(f, i)"
            >
              <TransformMedia
                v-if="f"
                :file="f"
                :src="getFileUrl(f.name)"
                :is-image="isImage(f)"
                :is-video="isVideo(f)"
                :is-audio="isAudio(f)"
                :is-active="i === 1"
                @lock="gestureLocked = true"
                @unlock="gestureLocked = false"
                @edge-swipe="onEdgeSwipe"
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- 桌面端按钮 -->
      <button class="preview-prev desktop-only" @click.stop="prevImage" v-if="previewIndex > 0">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>
      <button class="preview-next desktop-only" @click.stop="nextImage" v-if="previewIndex < mediaFiles.length - 1">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      </button>
      
      <!-- 桌面端旋转按钮 -->
      <button class="rotate-btn desktop-only" @click.stop="rotateImage" title="旋转90°">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/></svg>
      </button>
      
      <!-- 页码指示器 -->
      <div class="page-indicator">
        {{ previewIndex + 1 }} / {{ mediaFiles.length }}
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { mapGetters } from 'vuex';
import TransformMedia from '@/components/TransformMedia.vue';

export default {
  name: 'PublicBrowse',
  components: {
    TransformMedia
  },
  data() {
    return {
      files: [],
      allowedDirs: [],
      rootDir: '',
      currentPath: '',
      totalCount: 0,
      loading: false,
      error: null,
      canRetry: true,
      hasMore: true,
      previewVisible: false,
      previewIndex: 0,
      observer: null,
      pageSize: 24,
      columnCount: 4,
      columnHeights: [0, 0, 0, 0],
      // 桌面端旋转
      imageRotation: 0,
      // 手机端滑动
      swipeX: 0,
      swipeStartX: 0,
      swipeStartY: 0,
      swipeStartT: 0,
      swipeActive: false,
      swipeAnimating: false,
      swipeDir: 0,
      viewportW: 0,
      // 手势锁定（子组件缩放/旋转时锁住轮播）
      gestureLocked: false,
      // 日夜模式
      isLightMode: false,
    };
  },
  computed: {
    ...mapGetters(['userConfig']),
    siteName() {
      return this.userConfig?.siteTitle || '公开相册';
    },
    rootDirName() {
      return this.rootDir.split('/').filter(Boolean).pop() || '根目录';
    },
    pathParts() {
      if (!this.currentPath || !this.rootDir) return [];
      const relative = this.currentPath.replace(this.rootDir, '').replace(/^\/+/, '');
      return relative.split('/').filter(Boolean);
    },
    folders() {
      return this.files.filter(f => f.isFolder);
    },
    mediaFiles() {
      return this.files.filter(f => !f.isFolder);
    },
    columns() {
      const cols = Array.from({ length: this.columnCount }, () => []);
      for (const file of this.mediaFiles) {
        const idx = file.columnIndex ?? 0;
        if (idx < this.columnCount) {
          cols[idx].push(file);
        } else {
          cols[0].push(file);
        }
      }
      return cols;
    },
    currentPreviewFile() {
      return this.mediaFiles[this.previewIndex];
    },
    prevPreviewFile() {
      return this.previewIndex > 0 ? this.mediaFiles[this.previewIndex - 1] : null;
    },
    nextPreviewFile() {
      return this.previewIndex < this.mediaFiles.length - 1 ? this.mediaFiles[this.previewIndex + 1] : null;
    },
    desktopImageStyle() {
      return {
        transform: `rotate(${this.imageRotation}deg)`,
        transition: 'transform 0.3s ease'
      };
    },
    swipeWindow() {
      return [this.prevPreviewFile, this.currentPreviewFile, this.nextPreviewFile];
    },
    swipeTrackStyle() {
      // 默认停在中间那页（-viewportW）
      const base = -this.viewportW;
      const x = base + this.swipeX;
      return {
        transform: `translate3d(${x}px, 0, 0)`,
        transition: this.swipeAnimating ? 'transform 0.28s ease' : 'none',
      };
    }
  },
  watch: {
    '$route.params.dir': {
      handler() {
        this.initFromRoute();
      }
    }
  },
  mounted() {
    this.initTheme();
    this.initFromRoute();
    this.setupIntersectionObserver();
    this.updateColumnCount();
    window.addEventListener('resize', this.updateColumnCount);
  },
  beforeUnmount() {
    if (this.observer) {
      this.observer.disconnect();
    }
    window.removeEventListener('resize', this.updateColumnCount);
  },
  methods: {
    // 初始化主题：10:00-18:00 默认白天，其他时间默认黑夜
    initTheme() {
      const saved = localStorage.getItem('publicBrowseTheme');
      if (saved !== null) {
        this.isLightMode = saved === 'light';
      } else {
        const hour = new Date().getHours();
        this.isLightMode = hour >= 10 && hour < 18;
      }
    },

    toggleTheme() {
      this.isLightMode = !this.isLightMode;
      localStorage.setItem('publicBrowseTheme', this.isLightMode ? 'light' : 'dark');
    },

    // 生成 slide key，切换时让子组件重新挂载以重置 transform
    getSlideKey(f, i) {
      if (!f) return `empty-${i}`;
      // 中间那张用 previewIndex 作为 key 的一部分，确保切换时重新挂载
      if (i === 1) return `${f.name}-${this.previewIndex}`;
      return f.name;
    },

    updateColumnCount() {
      const width = window.innerWidth;
      let newCount;
      if (width < 600) {
        newCount = 2;
      } else if (width < 900) {
        newCount = 3;
      } else {
        newCount = 4;
      }
      
      if (newCount !== this.columnCount) {
        this.columnCount = newCount;
        this.columnHeights = new Array(this.columnCount).fill(0);
        this.mediaFiles.forEach(f => {
          f.columnIndex = undefined;
          this.assignToColumn(f);
        });
      }
    },

    getShortestColumn() {
      let minIndex = 0;
      let minHeight = this.columnHeights[0];
      for (let i = 1; i < this.columnCount; i++) {
        if (this.columnHeights[i] < minHeight) {
          minHeight = this.columnHeights[i];
          minIndex = i;
        }
      }
      return minIndex;
    },

    assignToColumn(file, height = 200) {
      const colIndex = this.getShortestColumn();
      file.columnIndex = colIndex;
      this.columnHeights[colIndex] += height;
      // 音频和其他文件直接标记为已加载（没有 load 事件）
      if (this.isAudio(file) || (!this.isImage(file) && !this.isVideo(file))) {
        file.loaded = true;
      }
    },

    onImageLoad(event, file) {
      const img = event.target;
      const ratio = img.naturalHeight / img.naturalWidth;
      const height = 280 * ratio;
      if (file.columnIndex === undefined) {
        this.assignToColumn(file, height);
      }
      file.loaded = true;
    },

    onVideoLoad(event, file) {
      const video = event.target;
      const ratio = video.videoHeight / video.videoWidth;
      const height = 280 * ratio;
      if (file.columnIndex === undefined) {
        this.assignToColumn(file, height);
      }
      file.loaded = true;
    },

    setupIntersectionObserver() {
      this.observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && this.hasMore && !this.loading) {
            this.loadMore();
          }
        },
        { rootMargin: '200px' }
      );
    },

    observeLoadTrigger() {
      this.$nextTick(() => {
        if (this.$refs.loadTrigger && this.observer) {
          this.observer.observe(this.$refs.loadTrigger);
        }
      });
    },

    async initFromRoute() {
      const dirParam = this.$route.params.dir || '';
      const dirPath = Array.isArray(dirParam) ? dirParam.join('/') : dirParam;
      
      if (!dirPath) {
        this.error = '请指定要浏览的目录，例如: /browse/landscape';
        this.canRetry = false;
        return;
      }
      
      const parts = dirPath.split('/').filter(Boolean);
      this.rootDir = parts[0];
      this.currentPath = dirPath;
      this.files = [];
      this.hasMore = true;
      this.columnHeights = new Array(this.columnCount).fill(0);
      
      await this.loadFiles();
      this.observeLoadTrigger();
    },

    async loadFiles() {
      this.loading = true;
      this.error = null;
      this.canRetry = true;
      
      try {
        const res = await axios.get(`/api/public/list?dir=${encodeURIComponent(this.currentPath)}&count=${this.pageSize}`);
        
        if (res.data.allowedDirs) {
          this.allowedDirs = res.data.allowedDirs;
        }
        
        const dirs = (res.data.directories || []).map(d => ({
          name: d,
          isFolder: true
        }));
        const files = (res.data.files || []).map(f => ({
          name: f.name,
          isFolder: false,
          metadata: f.metadata,
          columnIndex: undefined
        }));
        
        files.forEach(f => this.assignToColumn(f));
        
        this.files = [...dirs, ...files];
        this.totalCount = res.data.totalCount || this.files.length;
        this.hasMore = this.mediaFiles.length < this.totalCount;
      } catch (err) {
        if (err.response?.status === 403) {
          const msg = err.response?.data?.error || '';
          if (msg.includes('disabled')) {
            this.error = '公开浏览功能未启用';
          } else if (msg.includes('not allowed') || msg.includes('No public')) {
            this.error = '该目录不允许公开访问';
          } else {
            this.error = '访问被拒绝';
          }
          this.canRetry = false;
        } else {
          this.error = '加载失败，请重试';
        }
      } finally {
        this.loading = false;
      }
    },

    async loadMore() {
      if (this.loading || !this.hasMore) return;
      this.loading = true;
      try {
        const start = this.mediaFiles.length;
        const res = await axios.get(`/api/public/list?dir=${encodeURIComponent(this.currentPath)}&start=${start}&count=${this.pageSize}`);
        const moreFiles = (res.data.files || []).map(f => ({
          name: f.name,
          isFolder: false,
          metadata: f.metadata,
          columnIndex: undefined
        }));
        
        moreFiles.forEach(f => this.assignToColumn(f));
        this.files.push(...moreFiles);
        this.hasMore = this.mediaFiles.length < this.totalCount;
      } catch (err) {
        console.error('加载更多失败', err);
      } finally {
        this.loading = false;
      }
    },

    enterFolder(folderPath) {
      const newPath = folderPath.replace(/\/+$/, '');
      this.$router.push(`/browse/${newPath}`);
    },

    goToRoot() {
      this.$router.push(`/browse/${this.rootDir}`);
    },

    goToPath(index) {
      const parts = this.pathParts.slice(0, index + 1);
      const newPath = this.rootDir + (parts.length ? '/' + parts.join('/') : '');
      this.$router.push(`/browse/${newPath}`);
    },

    getFolderName(path) {
      return path.split('/').filter(Boolean).pop() || path;
    },

    getFileUrl(name) {
      return `${window.location.origin}/file/${encodeURI(name)}`;
    },

    isImage(file) {
      const ext = file.name.split('.').pop().toLowerCase();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(ext);
    },

    isVideo(file) {
      const ext = file.name.split('.').pop().toLowerCase();
      return ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
    },

    isAudio(file) {
      const ext = file.name.split('.').pop().toLowerCase();
      return ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext);
    },

    getFileName(name) {
      return name.split('/').pop();
    },

    handleImageError(e) {
      e.target.style.display = 'none';
    },

    copyLink(name) {
      const url = this.getFileUrl(name);
      navigator.clipboard?.writeText(url).then(() => {
        this.showToast('已复制');
      }).catch(() => {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        this.showToast('已复制');
      });
    },

    showToast(msg) {
      const existing = document.querySelector('.copy-toast');
      if (existing) existing.remove();
      
      const toast = document.createElement('div');
      toast.className = 'copy-toast';
      toast.textContent = msg;
      document.body.appendChild(toast);
      
      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 1500);
    },

    downloadFile(name) {
      const link = document.createElement('a');
      link.href = this.getFileUrl(name);
      link.download = name.split('/').pop();
      link.click();
    },

    openPreview(file) {
      if (file.isFolder) return;
      const mediaIndex = this.mediaFiles.findIndex(f => f.name === file.name);
      if (mediaIndex >= 0) {
        this.previewIndex = mediaIndex;
        this.previewVisible = true;
        this.imageRotation = 0;
        this.gestureLocked = false;
        document.body.style.overflow = 'hidden';
        this.$nextTick(() => {
          this.viewportW = this.$refs.mobileViewport?.getBoundingClientRect().width || window.innerWidth;
        });
      }
    },

    closePreview() {
      this.previewVisible = false;
      this.imageRotation = 0;
      this.gestureLocked = false;
      document.body.style.overflow = '';
    },

    prevImage() {
      if (this.previewIndex > 0) {
        this.previewIndex--;
        this.imageRotation = 0;
      }
    },

    nextImage() {
      if (this.previewIndex < this.mediaFiles.length - 1) {
        this.previewIndex++;
        this.imageRotation = 0;
      }
    },

    rotateImage() {
      this.imageRotation += 90;
      // 动画结束后归一化（无动画）
      if (this.imageRotation >= 360) {
        setTimeout(() => {
          // 临时禁用 transition
          const el = this.$el.querySelector('.preview-image, .preview-video');
          if (el) {
            el.style.transition = 'none';
            this.imageRotation = 0;
            // 强制重绘后恢复 transition
            el.offsetHeight;
            el.style.transition = '';
          } else {
            this.imageRotation = 0;
          }
        }, 300);
      }
    },

    // 手机端滑动：开始
    onSwipeStart(e) {
      if (this.gestureLocked) return;
      if (this.swipeAnimating) return;
      
      const t = e.touches[0];
      this.swipeStartX = t.clientX;
      this.swipeStartY = t.clientY;
      this.swipeStartT = performance.now();
      this.swipeX = 0;
      this.swipeActive = false;
      
      this.viewportW = this.$refs.mobileViewport?.getBoundingClientRect().width || window.innerWidth;
    },

    // 手机端滑动：移动
    onSwipeMove(e) {
      if (this.gestureLocked) return;
      if (this.swipeAnimating) return;
      
      const t = e.touches[0];
      const dx = t.clientX - this.swipeStartX;
      const dy = t.clientY - this.swipeStartY;
      
      if (!this.swipeActive) {
        if (Math.abs(dx) < 8) return;
        if (Math.abs(dx) <= Math.abs(dy)) return;
        this.swipeActive = true;
      }
      
      e.preventDefault();
      
      let x = dx;
      // 边界阻尼：用 rubberBand 代替线性 *0.3
      if (this.previewIndex === 0 && x > 0) {
        x = this.rubberBand(x, this.viewportW, 0.55);
      } else if (this.previewIndex === this.mediaFiles.length - 1 && x < 0) {
        x = -this.rubberBand(-x, this.viewportW, 0.55);
      }
      
      this.swipeX = x;
    },

    // 手机端滑动：结束
    onSwipeEnd() {
      if (this.gestureLocked) return;
      if (this.swipeAnimating) return;
      
      if (!this.swipeActive) {
        this.swipeX = 0;
        return;
      }
      
      const dt = Math.max(1, performance.now() - this.swipeStartT);
      const vx = this.swipeX / dt;
      const threshold = this.viewportW * 0.2;
      
      let dir = 0;
      if (this.swipeX <= -threshold || vx <= -0.8) dir = +1;
      if (this.swipeX >= threshold || vx >= 0.8) dir = -1;
      
      if ((dir === -1 && this.previewIndex === 0) ||
          (dir === +1 && this.previewIndex === this.mediaFiles.length - 1)) {
        dir = 0;
      }
      
      this.swipeDir = dir;
      this.swipeAnimating = true;
      
      if (dir === +1) this.swipeX = -this.viewportW;
      else if (dir === -1) this.swipeX = +this.viewportW;
      else this.swipeX = 0;
    },

    onSwipeTransitionEnd() {
      if (!this.swipeAnimating) return;
      
      if (this.swipeDir === +1) this.previewIndex++;
      if (this.swipeDir === -1) this.previewIndex--;
      
      this.swipeAnimating = false;
      this.swipeDir = 0;
      this.swipeX = 0;
    },

    // iOS 风格橡皮筋阻尼函数
    rubberBand(distance, dimension, constant = 0.55) {
      return (distance * dimension * constant) / (dimension + constant * distance);
    },

    // 放大状态下边界滑动翻页（带动画）
    onEdgeSwipe(dir) {
      // dir: +1 下一页, -1 上一页
      if ((dir === -1 && this.previewIndex === 0) ||
          (dir === +1 && this.previewIndex === this.mediaFiles.length - 1)) {
        return;
      }
      
      // 触发轮播动画
      this.swipeDir = dir;
      this.swipeAnimating = true;
      
      if (dir === +1) this.swipeX = -this.viewportW;
      else if (dir === -1) this.swipeX = +this.viewportW;
    }
  }
};
</script>


<style scoped>
.public-browse {
  min-height: 100vh;
  background: #0a0a0a;
  color: #fff;
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: rgba(15, 15, 15, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #1a1a1a;
}

.logo {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: opacity 0.2s;
}

.logo:hover {
  opacity: 0.8;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.breadcrumb-item {
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  color: #ccc;
}

.breadcrumb-item:hover {
  background: #252525;
  color: #fff;
}

.breadcrumb-sep {
  color: #444;
}

.file-count {
  color: #666;
  font-size: 14px;
}

.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: #666;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #222;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner-small {
  width: 24px;
  height: 24px;
  border: 2px solid #222;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-btn {
  margin-top: 20px;
  padding: 10px 32px;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #2563eb;
}

.gallery-container {
  padding: 8px;
}

@media (min-width: 1200px) {
  .gallery-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px;
  }
}

.folders-section {
  margin-bottom: 24px;
}

.folders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.folder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: #141414;
  border-radius: 12px;
  border: 1px solid #1a1a1a;
  cursor: pointer;
  transition: all 0.2s;
}

.folder-card:hover {
  background: #1a1a1a;
  border-color: #333;
  transform: translateY(-2px);
}

.folder-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  color: #555;
}

.folder-icon svg {
  width: 100%;
  height: 100%;
}

.folder-name {
  font-size: 14px;
  color: #999;
  text-align: center;
  word-break: break-all;
}

.waterfall {
  display: flex;
  gap: 16px;
}

.waterfall-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.waterfall-item {
  cursor: pointer;
}

.image-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: #141414;
  border: 1px solid #1a1a1a;
  min-height: 180px;
}

.image-wrapper::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #141414 25%, #1a1a1a 50%, #141414 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  z-index: 1;
  pointer-events: none;
}

.image-wrapper.loaded::before {
  display: none;
}

.image-wrapper.loaded {
  min-height: auto;
}

.image-wrapper img, .image-wrapper video {
  width: 100%;
  display: block;
  position: relative;
  z-index: 2;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.image-wrapper:hover {
  border-color: #333;
}

.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent 50%, rgba(0,0,0,0.85));
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 12px;
  z-index: 10;
}

.image-wrapper:hover .overlay {
  opacity: 1;
}

.file-placeholder {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #141414;
  color: #555;
  gap: 12px;
  padding: 16px;
  box-sizing: border-box;
}

.file-placeholder svg {
  width: 48px;
  height: 48px;
}

.file-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  word-break: break-all;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.audio-placeholder {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  gap: 12px;
  padding: 16px;
  box-sizing: border-box;
}

.audio-icon {
  width: 48px;
  height: 48px;
  color: rgba(255, 255, 255, 0.6);
}

.audio-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  word-break: break-all;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.overlay-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.6);
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

.action-btn:hover {
  background: rgba(255,255,255,0.2);
  color: #fff;
  transform: scale(1.1);
}

.load-trigger {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48px;
  min-height: 100px;
}

.loading-more {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #666;
  font-size: 14px;
}

.no-more {
  color: #444;
  font-size: 14px;
}

.credit-link {
  display: block;
  margin-top: 8px;
  color: #555;
  font-size: 12px;
  text-decoration: none;
  transition: color 0.2s;
  text-align: center;
}

.credit-link:hover {
  color: #888;
}

/* 预览弹窗 */
.preview-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0,0,0,0.97);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 80px;
  box-sizing: border-box;
  overflow: hidden;
}

.swipe-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.swipe-track {
  width: 300%;
  height: 100%;
  display: flex;
  will-change: transform;
}

.swipe-slide {
  width: 33.333%;
  flex-shrink: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image, .preview-video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

.preview-close {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(255,255,255,0.1);
  border: none;
  color: #fff;
  cursor: pointer;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 1010;
}

.preview-close:hover {
  background: rgba(255,255,255,0.2);
}

.preview-close svg {
  width: 28px;
  height: 28px;
}

.page-indicator {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.6);
  color: rgba(255,255,255,0.8);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  z-index: 1010;
}

.preview-prev, .preview-next {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.1);
  border: none;
  color: #fff;
  padding: 16px;
  cursor: pointer;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 1010;
}

.preview-prev:hover, .preview-next:hover {
  background: rgba(255,255,255,0.2);
}

.preview-prev svg, .preview-next svg {
  width: 32px;
  height: 32px;
}

.preview-prev { left: 20px; }
.preview-next { right: 20px; }

.rotate-btn {
  position: fixed;
  bottom: 30px;
  right: 20px;
  background: rgba(255,255,255,0.1);
  border: none;
  color: #fff;
  cursor: pointer;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 1010;
}

.rotate-btn:hover {
  background: rgba(255,255,255,0.2);
}

.rotate-btn svg {
  width: 24px;
  height: 24px;
}

/* 桌面端显示，手机端隐藏 */
@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }
  
  .preview-content.mobile-only {
    display: block;
    padding: 0;
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }
  
  .page-indicator {
    bottom: 40px;
  }
}

/* 手机端显示，桌面端隐藏 */
@media (min-width: 769px) {
  .mobile-only {
    display: none !important;
  }
}

/* 平板端 */
@media (max-width: 1199px) and (min-width: 601px) {
  .gallery-container {
    padding: 12px;
  }
  
  .waterfall {
    gap: 10px;
  }
  
  .waterfall-column {
    gap: 10px;
  }
  
  .image-wrapper {
    border-radius: 8px;
  }
}

/* 手机端 */
@media (max-width: 600px) {
  .header {
    padding: 10px 12px;
  }
  
  .header-left .logo {
    font-size: 16px;
  }
  
  .breadcrumb {
    font-size: 12px;
  }
  
  .breadcrumb-item {
    padding: 4px 8px;
  }
  
  .file-count {
    font-size: 12px;
  }
  
  .gallery-container {
    padding: 6px;
  }
  
  .waterfall {
    gap: 6px;
  }
  
  .waterfall-column {
    gap: 6px;
  }
  
  .image-wrapper {
    border-radius: 6px;
    min-height: 120px;
  }
  
  .folders-section {
    margin-bottom: 12px;
  }
  
  .folders-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  
  .folder-card {
    padding: 16px 12px;
    border-radius: 8px;
  }
  
  .folder-icon {
    width: 36px;
    height: 36px;
    margin-bottom: 8px;
  }
  
  .folder-name {
    font-size: 12px;
  }
  
  .load-trigger {
    padding: 24px;
    min-height: 60px;
  }
}

/* Toast 提示 */
:global(.copy-toast) {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: rgba(0,0,0,0.8);
  color: #fff;
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 9999;
  pointer-events: none;
}

:global(.copy-toast.show) {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* 白天模式 */
.public-browse.light-mode {
  background: #f5f5f5;
  color: #333;
}

.light-mode .header {
  background: rgba(255, 255, 255, 0.95);
  border-bottom-color: #e0e0e0;
}

.light-mode .logo {
  color: #333;
}

.light-mode .breadcrumb-item {
  color: #666;
}

.light-mode .breadcrumb-item:hover {
  background: #e8e8e8;
  color: #333;
}

.light-mode .breadcrumb-sep {
  color: #ccc;
}

.light-mode .file-count {
  color: #999;
}

.light-mode .loading-container,
.light-mode .error-container {
  color: #999;
}

.light-mode .loading-spinner {
  border-color: #ddd;
  border-top-color: #3b82f6;
}

.light-mode .loading-spinner-small {
  border-color: #ddd;
  border-top-color: #3b82f6;
}

.light-mode .folder-card {
  background: #fff;
  border-color: #e0e0e0;
}

.light-mode .folder-card:hover {
  background: #fafafa;
  border-color: #ccc;
}

.light-mode .folder-icon {
  color: #999;
}

.light-mode .folder-name {
  color: #666;
}

.light-mode .image-wrapper {
  background: #fff;
  border-color: #e0e0e0;
}

.light-mode .image-wrapper::before {
  background: linear-gradient(90deg, #f5f5f5 25%, #fff 50%, #f5f5f5 75%);
}

.light-mode .image-wrapper:hover {
  border-color: #ccc;
}

.light-mode .file-placeholder {
  background: #f5f5f5;
  color: #ccc;
}

.light-mode .file-placeholder {
  background: #f5f5f5;
  color: #999;
}

.light-mode .file-name {
  color: rgba(0, 0, 0, 0.6);
}

.light-mode .audio-placeholder {
  background: linear-gradient(135deg, #e8f4f8 0%, #d4e5f7 100%);
}

.light-mode .audio-icon {
  color: rgba(0, 0, 0, 0.4);
}

.light-mode .audio-name {
  color: rgba(0, 0, 0, 0.6);
}

.light-mode .no-more {
  color: #bbb;
}

.light-mode .credit-link {
  color: #aaa;
}

.light-mode .credit-link:hover {
  color: #666;
}

.light-mode .loading-more {
  color: #999;
}
</style>
