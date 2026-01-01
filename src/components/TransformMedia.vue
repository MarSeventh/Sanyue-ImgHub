<template>
  <div
    class="tm-viewport"
    ref="viewport"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @dblclick.prevent="onDblClick"
  >
    <img
      v-if="isImage"
      class="tm-media"
      :src="src"
      draggable="false"
      :style="mediaStyle"
      @load="onLoad"
    />
    <!-- 视频：只有 isActive 才渲染真实 video -->
    <video
      v-else-if="isVideo && isActive"
      ref="mediaEl"
      class="tm-media"
      :src="src"
      controls
      playsinline
      :style="mediaStyle"
    />
    <div v-else-if="isVideo" class="video-placeholder">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
    </div>
    <!-- 音频：只有 isActive 才渲染真实 audio -->
    <div v-else-if="isAudio && isActive" class="tm-audio" @pointerdown.stop @pointermove.stop>
      <div class="audio-cover">
        <img v-if="audioCover" :src="audioCover" class="cover-img" />
        <svg v-else class="audio-icon-large" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
      </div>
      <div class="audio-info">
        <div class="audio-title">{{ audioTitle }}</div>
        <div class="audio-artist" v-if="audioArtist">{{ audioArtist }}</div>
      </div>
      <div class="audio-controls">
        <button class="ctrl-btn" @click="togglePlay">
          <svg v-if="!audioPlaying" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <div class="progress-wrap" @click="seekAudio">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: audioProgress + '%' }"></div>
          </div>
          <div class="time-display">
            <span>{{ formatTime(audioCurrentTime) }}</span>
            <span>{{ formatTime(audioDuration) }}</span>
          </div>
        </div>
      </div>
      <audio 
        ref="mediaEl"
        :src="src" 
        @loadedmetadata="onAudioLoaded"
        @timeupdate="onTimeUpdate"
        @ended="audioPlaying = false"
      ></audio>
    </div>
    <!-- 音频占位（非激活页） -->
    <div v-else-if="isAudio" class="audio-placeholder">
      <svg class="audio-icon-large" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
      <span class="audio-name">{{ audioTitle }}</span>
    </div>
  </div>
</template>

<script>
/**
 * TransformMedia - 媒体预览组件（支持图片/视频/音频）
 * 
 * 核心功能：
 * 1. 双指缩放 (pinch-to-zoom)
 * 2. 双指旋转 (90°步进，小米相册风格)
 * 3. 单指拖拽平移 (放大状态下)
 * 4. iOS风格橡皮筋阻尼效果
 * 5. 边界滑动翻页 (edge-swipe)
 * 6. 音频播放器 (ID3标签解析、封面、进度条)
 * 
 * 重要：手机端三页轮播会同时挂载3个此组件(prev/current/next)
 * 只有 isActive=true 的才渲染真实 <video>/<audio>，防止多个媒体同时播放
 */
export default {
  name: "TransformMedia",
  props: {
    file: { type: Object, required: true },
    src: { type: String, required: true },
    isImage: { type: Boolean, default: true },
    isVideo: { type: Boolean, default: false },
    isAudio: { type: Boolean, default: false },
    // 是否为当前激活页（只有激活页才渲染真实media标签，防止音视频大杂汇）
    isActive: { type: Boolean, default: false },
  },
  data() {
    return {
      // ===== 手势状态 =====
      pointers: new Map(),        // 当前触点 Map<pointerId, {x, y}>
      scale: 1,                   // 当前缩放比例
      rotation: 0,                // 已确认的旋转角度 (0/90/180/270)
      rotatePreview: 0,           // 旋转预览角度 (手势中实时变化，松手后归零)
      tx: 0,                      // X轴平移
      ty: 0,                      // Y轴平移
      naturalWidth: 0,            // 图片原始宽度
      naturalHeight: 0,           // 图片原始高度
      
      // ===== 手势起始状态（用于计算增量） =====
      startScale: 1,
      startRotation: 0,
      startTx: 0,
      startTy: 0,
      startCenter: null,          // 双指中心点
      startDist: 0,               // 双指起始距离
      startAngle: 0,              // 双指起始角度
      
      // ===== 音频播放器状态 =====
      audioPlaying: false,
      audioCurrentTime: 0,
      audioDuration: 0,
      audioProgress: 0,
      audioCover: null,           // ID3封面 (blob URL)
      audioTitle: '',             // ID3标题
      audioArtist: '',            // ID3艺术家
      
      // ===== 拖拽状态 =====
      dragging: false,
      dragStart: null,
      viewportRect: null,
      minScale: 1,
      maxScale: 4,
      
      // ===== 手势模式判定 =====
      gestureMode: null,          // 'pinch' | 'rotate' | null (先到阈值的优先)
      
      // ===== 边界滑动翻页 =====
      edgeOverflow: 0,            // 超出边界的距离
      edgeDir: 0,                 // 翻页方向 (-1:上一页, +1:下一页)
    };
  },
  computed: {
    // 是否处于变换状态（放大/双指/拖拽中），用于通知父组件锁定轮播
    isActiveTransform() {
      return this.scale > 1.001 || this.pointers.size >= 2 || this.dragging;
    },
    // 显示用旋转角度 = 已确认角度 + 预览角度
    displayRotation() {
      return this.rotation + this.rotatePreview;
    },
    // 旋转时的缩小效果（小米相册风格：旋转过程中图片略微缩小）
    // 使用 sin 曲线让缩放更自然，最大缩小12%
    rotateShrink() {
      const p = Math.min(1, Math.abs(this.rotatePreview) / 90);
      const k = Math.sin(Math.PI * p);
      return 1 - 0.12 * k;
    },
    // 媒体元素的 transform 样式
    mediaStyle() {
      const finalScale = this.scale * this.rotateShrink;
      const inGesture = this.pointers.size > 0;
      return {
        transform: `translate3d(${this.tx}px, ${this.ty}px, 0) scale(${finalScale}) rotate(${this.displayRotation}deg)`,
        // 手势中禁用过渡，松手后启用平滑过渡
        transition: inGesture ? "none" : "transform 0.25s ease",
        transformOrigin: "center center",
      };
    },
  },
  watch: {
    // 变换状态变化时通知父组件锁定/解锁轮播
    isActiveTransform(v) {
      this.$emit(v ? "lock" : "unlock");
    },
    /**
     * 核心：监听 isActive 变化，控制播放/暂停
     * 
     * 为什么需要这个？
     * 手机端三页轮播会同时挂载3个 TransformMedia (prev/current/next)
     * 如果不控制，prev/next 虽然不可见但也会播放，导致"音乐大杂汇"
     * 
     * 关键：isActive 变 false 时要"立刻 pause"，不能 nextTick！
     * 因为 v-if="isActive" 会立刻删除 DOM，nextTick 时 ref 已经没了
     */
    isActive: {
      immediate: true,
      handler(active) {
        // 先拿当前 mediaEl（这时 DOM 还没被 v-if 删掉）
        const el = this.$refs.mediaEl;
        
        if (!active) {
          // 非激活：立刻 pause，不要 nextTick
          if (el) {
            try { el.pause(); } catch (e) {}
            // 这两句对 iOS/Safari 特别有效：彻底"熄火"音轨
            try { el.removeAttribute('src'); } catch (e) {}
            try { el.load?.(); } catch (e) {}
          }
          this.audioPlaying = false;
          return;
        }
        
        // 激活：等渲染完成再处理
        this.$nextTick(() => {
          const el2 = this.$refs.mediaEl;
          if (!el2) return;
          
          // 只自动播放音频，视频不自动 play（避免滑动时体验乱）
          if (this.isAudio) {
            el2.play?.().then(() => {
              this.audioPlaying = true;
            }).catch(() => {});
          }
        });
      }
    }
  },
  mounted() {
    // 初始化音频信息（只读取元数据，不播放）
    if (this.isAudio) {
      this.initAudioInfo();
    }
  },
  beforeUnmount() {
    // 组件销毁前清理：暂停播放、释放封面 blob URL
    const el = this.$refs.mediaEl;
    if (el) {
      try { el.pause(); } catch (e) {}
    }
    if (this.audioCover) {
      URL.revokeObjectURL(this.audioCover);
    }
  },
  methods: {
    // ===== 音频相关方法 =====
    
    /**
     * 初始化音频信息
     * 先用文件名作为标题，然后尝试读取 ID3 标签获取真实信息
     */
    initAudioInfo() {
      const fileName = this.file?.name || this.src;
      const name = fileName.split('/').pop().replace(/\.[^.]+$/, '');
      this.audioTitle = name;
      this.audioArtist = '';
      this.audioCover = null;
      
      // 只有激活页才读取 ID3（避免 prev/next 页浪费请求）
      if (this.isActive) {
        this.tryReadMetadata();
      }
    },

    /**
     * 尝试读取 ID3v2 元数据
     * 只读取文件前 128KB，足够解析大部分 ID3 标签
     */
    async tryReadMetadata() {
      try {
        const response = await fetch(this.src);
        const blob = await response.blob();
        const arrayBuffer = await blob.slice(0, 128 * 1024).arrayBuffer();
        const dataView = new DataView(arrayBuffer);
        
        // ID3v2 标识：'ID3' (0x49 0x44 0x33)
        if (dataView.getUint8(0) === 0x49 && dataView.getUint8(1) === 0x44 && dataView.getUint8(2) === 0x33) {
          this.parseID3v2(dataView, arrayBuffer);
        }
      } catch (e) {}
    },

    /**
     * 解析 ID3v2 标签
     * 支持 TIT2(标题)、TPE1(艺术家)、APIC(封面)
     */
    parseID3v2(dataView, arrayBuffer) {
      // ID3v2 size 使用 syncsafe integer (每字节只用7位)
      const size = ((dataView.getUint8(6) & 0x7f) << 21) |
                   ((dataView.getUint8(7) & 0x7f) << 14) |
                   ((dataView.getUint8(8) & 0x7f) << 7) |
                   (dataView.getUint8(9) & 0x7f);
      
      let offset = 10; // 跳过 ID3v2 header
      
      while (offset < Math.min(size + 10, arrayBuffer.byteLength - 10)) {
        // 读取 frame ID (4字节)
        const frameId = String.fromCharCode(
          dataView.getUint8(offset),
          dataView.getUint8(offset + 1),
          dataView.getUint8(offset + 2),
          dataView.getUint8(offset + 3)
        );
        
        if (frameId === '\0\0\0\0') break; // 遇到空帧，结束
        
        // frame size (4字节)
        const frameSize = (dataView.getUint8(offset + 4) << 24) |
                         (dataView.getUint8(offset + 5) << 16) |
                         (dataView.getUint8(offset + 6) << 8) |
                         dataView.getUint8(offset + 7);
        
        if (frameSize <= 0 || frameSize > arrayBuffer.byteLength) break;
        
        const frameData = new Uint8Array(arrayBuffer, offset + 10, Math.min(frameSize, arrayBuffer.byteLength - offset - 10));
        
        if (frameId === 'TIT2') {
          this.audioTitle = this.decodeText(frameData) || this.audioTitle;
        } else if (frameId === 'TPE1') {
          this.audioArtist = this.decodeText(frameData);
        } else if (frameId === 'APIC') {
          this.extractCover(frameData);
        }
        
        offset += 10 + frameSize;
      }
    },

    /**
     * 解码 ID3 文本帧
     * 第一个字节是编码标识：0=ISO-8859-1, 1=UTF-16, 3=UTF-8
     */
    decodeText(data) {
      if (data.length < 2) return '';
      const encoding = data[0];
      const textData = data.slice(1);
      
      try {
        if (encoding === 0) {
          return new TextDecoder('iso-8859-1').decode(textData).replace(/\0/g, '');
        } else if (encoding === 1) {
          return new TextDecoder('utf-16').decode(textData).replace(/\0/g, '');
        } else if (encoding === 3) {
          return new TextDecoder('utf-8').decode(textData).replace(/\0/g, '');
        }
      } catch (e) {}
      return '';
    },

    /**
     * 从 APIC 帧提取封面图片
     * APIC 结构：encoding(1) + MIME(null-terminated) + type(1) + desc(null-terminated) + data
     */
    extractCover(data) {
      try {
        let offset = 1; // 跳过 encoding
        while (offset < data.length && data[offset] !== 0) offset++; // 跳过 MIME
        offset++; // 跳过 null
        offset++; // 跳过 picture type
        while (offset < data.length && data[offset] !== 0) offset++; // 跳过 description
        offset++; // 跳过 null
        
        if (offset < data.length) {
          const imageData = data.slice(offset);
          const blob = new Blob([imageData], { type: 'image/jpeg' });
          this.audioCover = URL.createObjectURL(blob);
        }
      } catch (e) {}
    },

    onAudioLoaded() {
      if (this.$refs.mediaEl) {
        this.audioDuration = this.$refs.mediaEl.duration;
      }
    },

    onTimeUpdate() {
      if (this.$refs.mediaEl) {
        this.audioCurrentTime = this.$refs.mediaEl.currentTime;
        this.audioProgress = (this.audioCurrentTime / this.audioDuration) * 100 || 0;
      }
    },

    togglePlay() {
      if (!this.$refs.mediaEl) return;
      if (this.audioPlaying) {
        this.$refs.mediaEl.pause();
      } else {
        this.$refs.mediaEl.play();
      }
      this.audioPlaying = !this.audioPlaying;
    },

    seekAudio(e) {
      if (!this.$refs.mediaEl || !this.audioDuration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      this.$refs.mediaEl.currentTime = percent * this.audioDuration;
    },

    formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    // ===== 图片/视频相关方法 =====

    onLoad(e) {
      const img = e.target;
      this.naturalWidth = img.naturalWidth;
      this.naturalHeight = img.naturalHeight;
    },

    /** 重置所有变换状态 */
    reset() {
      this.scale = 1;
      this.rotation = 0;
      this.rotatePreview = 0;
      this.tx = 0;
      this.ty = 0;
      this.pointers.clear();
      this.dragging = false;
      this.edgeOverflow = 0;
      this.edgeDir = 0;
      this.$emit("unlock");
    },

    // ===== 工具函数 =====

    clamp(v, min, max) {
      return Math.max(min, Math.min(max, v));
    },

    /**
     * iOS 风格橡皮筋阻尼函数
     * 越拉越难拉，松手后回弹
     * @param distance 拉动距离
     * @param dimension 容器尺寸
     * @param constant 阻尼系数 (默认0.55)
     */
    rubberBand(distance, dimension, constant = 0.55) {
      return (distance * dimension * constant) / (dimension + constant * distance);
    },

    getViewportRect() {
      return this.$refs.viewport?.getBoundingClientRect();
    },

    /**
     * 计算平移边界
     * 放大后图片可以平移的最大范围
     * 注意：90°/270° 旋转时需要交换宽高
     */
    getPanBounds() {
      const rect = this.$refs.viewport?.getBoundingClientRect();
      if (!rect) return { maxX: 0, maxY: 0, vw: 0, vh: 0 };
      const vw = rect.width, vh = rect.height;
      const img = this.$el.querySelector('img, video');
      let iw = img?.clientWidth || vw;
      let ih = img?.clientHeight || vh;
      
      // 90°/270° 旋转时交换宽高
      const rot = this.rotation % 360;
      if (rot === 90 || rot === 270) {
        [iw, ih] = [ih, iw];
      }
      
      const sw = iw * this.scale;
      const sh = ih * this.scale;
      const maxX = Math.max(0, (sw - vw) / 2);
      const maxY = Math.max(0, (sh - vh) / 2);
      return { maxX, maxY, vw, vh };
    },

    /** 应用橡皮筋阻尼的边界限制 */
    applyBoundWithRubber(value, max, dimension) {
      if (value > max) {
        return max + this.rubberBand(value - max, dimension, 0.55);
      }
      if (value < -max) {
        return -max - this.rubberBand(-max - value, dimension, 0.55);
      }
      return value;
    },

    /**
     * 计算双指手势参数
     * 按 pointerId 排序确保手指顺序一致，避免逆时针旋转问题
     */
    calcTwoPointer() {
      const sorted = Array.from(this.pointers.entries()).sort((a, b) => a[0] - b[0]);
      const p0 = sorted[0][1], p1 = sorted[1][1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const center = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      return { dist, angle, center };
    },

    /** 将角度归一化到 -180 ~ 180 */
    normalizeAngle(deg) {
      deg = ((deg % 360) + 360) % 360;
      return deg > 180 ? deg - 360 : deg;
    },

    // ===== 手势事件处理 =====

    onPointerDown(e) {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      this.viewportRect = this.getViewportRect();
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // 双指：初始化缩放/旋转手势
      if (this.pointers.size === 2) {
        const { dist, angle, center } = this.calcTwoPointer();
        this.startDist = dist;
        this.startAngle = angle;
        this.startCenter = center;
        this.startScale = this.scale;
        this.startRotation = this.rotation;
        this.startTx = this.tx;
        this.startTy = this.ty;
        this.dragging = false;
        this.gestureMode = null;  // 等待判定是 pinch 还是 rotate
        this.rotatePreview = 0;
        return;
      }

      // 单指 + 已放大：开始拖拽
      if (this.scale > 1.001) {
        this.dragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.startTx = this.tx;
        this.startTy = this.ty;
      }
    },

    onPointerMove(e) {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // 双指手势处理
      if (this.pointers.size === 2) {
        e.preventDefault();
        const { dist, angle, center } = this.calcTwoPointer();

        const scaleFactor = dist / (this.startDist || dist);
        const scaleChange = Math.abs(scaleFactor - 1);
        const deltaAngle = this.normalizeAngle(angle - this.startAngle);
        const angleChange = Math.abs(deltaAngle);

        // 手势模式判定阈值
        const rotateStartDeg = 8;    // 旋转超过8°才进入旋转模式
        const pinchStartScale = 0.08; // 缩放超过8%才进入缩放模式

        // 首次判定手势模式（先到阈值的优先）
        if (!this.gestureMode) {
          if (angleChange >= rotateStartDeg) {
            this.gestureMode = 'rotate';
          } else if (scaleChange >= pinchStartScale) {
            this.gestureMode = 'pinch';
          } else {
            return; // 还没到阈值，不处理
          }
        }

        // 旋转模式：只旋转，不缩放
        if (this.gestureMode === 'rotate') {
          this.scale = this.startScale;
          this.rotatePreview = this.clamp(deltaAngle, -90, 90); // 限制在 ±90°
          return;
        }

        // 缩放模式：只缩放，不旋转
        if (this.gestureMode === 'pinch') {
          this.scale = this.clamp(this.startScale * scaleFactor, this.minScale, this.maxScale);
          this.rotatePreview = 0;
        }

        // 跟随双指中心点移动
        if (this.startCenter && this.viewportRect) {
          const cx0 = this.startCenter.x - this.viewportRect.left - this.viewportRect.width / 2;
          const cy0 = this.startCenter.y - this.viewportRect.top - this.viewportRect.height / 2;
          const cx1 = center.x - this.viewportRect.left - this.viewportRect.width / 2;
          const cy1 = center.y - this.viewportRect.top - this.viewportRect.height / 2;
          this.tx = this.startTx + (cx1 - cx0);
          this.ty = this.startTy + (cy1 - cy0);
        }
        return;
      }

      // 单指拖拽（放大状态下）
      if (this.dragging && this.scale > 1.001) {
        e.preventDefault();
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        const rawX = this.startTx + dx;
        const rawY = this.startTy + dy;
        const { maxX, maxY, vw, vh } = this.getPanBounds();
        
        // 检测边界溢出（用于边界滑动翻页）
        let overflow = 0;
        let dir = 0;
        if (rawX > maxX) {
          overflow = rawX - maxX;
          dir = -1; // 向右拉 = 上一页
        } else if (rawX < -maxX) {
          overflow = -maxX - rawX;
          dir = +1; // 向左拉 = 下一页
        }
        
        this.edgeOverflow = overflow;
        this.edgeDir = dir;
        
        // 应用橡皮筋阻尼
        this.tx = this.applyBoundWithRubber(rawX, maxX, vw);
        this.ty = this.applyBoundWithRubber(rawY, maxY, vh);
      }
    },

    onPointerUp(e) {
      if (this.pointers.has(e.pointerId)) this.pointers.delete(e.pointerId);

      // 旋转手势结束：判定是否提交旋转
      if (this.pointers.size < 2 && this.gestureMode === 'rotate') {
        this.finishRotate();
        this.gestureMode = null;
      }

      if (this.pointers.size < 2) {
        this.startCenter = null;
        this.startDist = 0;
        this.startAngle = 0;
        this.gestureMode = null;
      }

      // 所有手指抬起
      if (this.pointers.size === 0) {
        this.dragging = false;
        
        // 边界滑动翻页：溢出超过60px触发
        if (this.edgeOverflow > 60 && this.edgeDir !== 0) {
          const dir = this.edgeDir;
          this.reset();
          this.$emit('edge-swipe', dir);
          return;
        }
        this.edgeOverflow = 0;
        this.edgeDir = 0;
        
        // 回弹到边界内
        if (this.scale <= 1.001) {
          this.scale = 1;
          this.tx = 0;
          this.ty = 0;
        } else {
          const { maxX, maxY } = this.getPanBounds();
          this.tx = Math.max(-maxX, Math.min(maxX, this.tx));
          this.ty = Math.max(-maxY, Math.min(maxY, this.ty));
        }
      }
    },

    /**
     * 完成旋转手势
     * 超过30°提交旋转，否则回弹
     * 90°/270° 旋转后自动放大2倍以填充屏幕
     */
    finishRotate() {
      const d = this.rotatePreview;
      const commitDeg = 30; // 提交阈值
      
      let target = 0;
      if (Math.abs(d) >= commitDeg) {
        target = d > 0 ? 90 : -90;
      }

      const newRot = ((this.rotation + target) % 360 + 360) % 360;
      this.rotation = newRot;
      this.rotatePreview = 0;
      this.updateFillScale();
    },

    /**
     * 根据旋转角度更新缩放
     * 90°/270° 时自动放大2倍，让图片填充屏幕
     */
    updateFillScale() {
      const rot = this.rotation % 360;
      const isRotated = (rot === 90 || rot === 270);

      if (isRotated) {
        this.scale = 2;
        this.tx = 0;
        this.ty = 0;
      } else {
        this.scale = 1;
        this.tx = 0;
        this.ty = 0;
      }
    },

    /** 双击切换放大/还原 */
    onDblClick() {
      if (this.scale > 1.001) {
        this.scale = 1;
        this.tx = 0;
        this.ty = 0;
      } else {
        this.scale = 2;
      }
    },
  },
};
</script>

<style scoped>
.tm-viewport {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  user-select: none;
}

.tm-media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  -webkit-user-drag: none;
}

.video-placeholder,
.audio-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: rgba(255, 255, 255, 0.4);
}

.video-placeholder svg {
  width: 80px;
  height: 80px;
}

.audio-placeholder .audio-icon-large {
  width: 80px;
  height: 80px;
}

.audio-placeholder .audio-name {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tm-audio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 24px;
  width: 100%;
  max-width: 360px;
}

.audio-cover {
  width: 200px;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.audio-icon-large {
  width: 80px;
  height: 80px;
  color: rgba(255, 255, 255, 0.4);
}

.audio-info {
  text-align: center;
  width: 100%;
}

.audio-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-artist {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.audio-controls {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
}

.ctrl-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.ctrl-btn svg {
  width: 24px;
  height: 24px;
}

.progress-wrap {
  flex: 1;
  cursor: pointer;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
  transition: width 0.1s linear;
}

.time-display {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.tm-audio audio {
  display: none;
}
</style>
