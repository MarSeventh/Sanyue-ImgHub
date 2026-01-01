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
export default {
  name: "TransformMedia",
  props: {
    file: { type: Object, required: true },
    src: { type: String, required: true },
    isImage: { type: Boolean, default: true },
    isVideo: { type: Boolean, default: false },
    isAudio: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
  },
  data() {
    return {
      pointers: new Map(),
      scale: 1,
      rotation: 0,
      rotatePreview: 0,
      tx: 0,
      ty: 0,
      naturalWidth: 0,
      naturalHeight: 0,
      startScale: 1,
      startRotation: 0,
      startTx: 0,
      startTy: 0,
      startCenter: null,
      audioPlaying: false,
      audioCurrentTime: 0,
      audioDuration: 0,
      audioProgress: 0,
      audioCover: null,
      audioTitle: '',
      audioArtist: '',
      startDist: 0,
      startAngle: 0,
      dragging: false,
      dragStart: null,
      viewportRect: null,
      minScale: 1,
      maxScale: 4,
      gestureMode: null,
      edgeOverflow: 0,
      edgeDir: 0,
    };
  },
  computed: {
    isActiveTransform() {
      return this.scale > 1.001 || this.pointers.size >= 2 || this.dragging;
    },
    displayRotation() {
      return this.rotation + this.rotatePreview;
    },
    rotateShrink() {
      const p = Math.min(1, Math.abs(this.rotatePreview) / 90);
      const k = Math.sin(Math.PI * p);
      return 1 - 0.12 * k;
    },
    mediaStyle() {
      const finalScale = this.scale * this.rotateShrink;
      const inGesture = this.pointers.size > 0;
      return {
        transform: `translate3d(${this.tx}px, ${this.ty}px, 0) scale(${finalScale}) rotate(${this.displayRotation}deg)`,
        transition: inGesture ? "none" : "transform 0.25s ease",
        transformOrigin: "center center",
      };
    },
  },
  watch: {
    isActiveTransform(v) {
      this.$emit(v ? "lock" : "unlock");
    },
    // 核心：监听 isActive 变化，控制播放/暂停
    isActive: {
      immediate: true,
      handler(active) {
        this.$nextTick(() => {
          const el = this.$refs.mediaEl;
          if (!el) return;
          
          if (!active) {
            try { el.pause(); } catch (e) {}
            try { el.currentTime = 0; } catch (e) {}
            this.audioPlaying = false;
            return;
          }
          
          // 激活时自动播放
          el.play?.().catch(() => {});
          if (this.isAudio) this.audioPlaying = true;
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
    const el = this.$refs.mediaEl;
    if (el) {
      try { el.pause(); } catch (e) {}
    }
    if (this.audioCover) {
      URL.revokeObjectURL(this.audioCover);
    }
  },
  methods: {
    initAudioInfo() {
      const fileName = this.file?.name || this.src;
      const name = fileName.split('/').pop().replace(/\.[^.]+$/, '');
      this.audioTitle = name;
      this.audioArtist = '';
      this.audioCover = null;
      
      // 只有激活页才读取 ID3
      if (this.isActive) {
        this.tryReadMetadata();
      }
    },

    async tryReadMetadata() {
      try {
        const response = await fetch(this.src);
        const blob = await response.blob();
        const arrayBuffer = await blob.slice(0, 128 * 1024).arrayBuffer();
        const dataView = new DataView(arrayBuffer);
        
        if (dataView.getUint8(0) === 0x49 && dataView.getUint8(1) === 0x44 && dataView.getUint8(2) === 0x33) {
          this.parseID3v2(dataView, arrayBuffer);
        }
      } catch (e) {}
    },

    parseID3v2(dataView, arrayBuffer) {
      const size = ((dataView.getUint8(6) & 0x7f) << 21) |
                   ((dataView.getUint8(7) & 0x7f) << 14) |
                   ((dataView.getUint8(8) & 0x7f) << 7) |
                   (dataView.getUint8(9) & 0x7f);
      
      let offset = 10;
      
      while (offset < Math.min(size + 10, arrayBuffer.byteLength - 10)) {
        const frameId = String.fromCharCode(
          dataView.getUint8(offset),
          dataView.getUint8(offset + 1),
          dataView.getUint8(offset + 2),
          dataView.getUint8(offset + 3)
        );
        
        if (frameId === '\0\0\0\0') break;
        
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

    extractCover(data) {
      try {
        let offset = 1;
        while (offset < data.length && data[offset] !== 0) offset++;
        offset++;
        offset++;
        while (offset < data.length && data[offset] !== 0) offset++;
        offset++;
        
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

    onLoad(e) {
      const img = e.target;
      this.naturalWidth = img.naturalWidth;
      this.naturalHeight = img.naturalHeight;
    },

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

    clamp(v, min, max) {
      return Math.max(min, Math.min(max, v));
    },

    rubberBand(distance, dimension, constant = 0.55) {
      return (distance * dimension * constant) / (dimension + constant * distance);
    },

    getViewportRect() {
      return this.$refs.viewport?.getBoundingClientRect();
    },

    getPanBounds() {
      const rect = this.$refs.viewport?.getBoundingClientRect();
      if (!rect) return { maxX: 0, maxY: 0, vw: 0, vh: 0 };
      const vw = rect.width, vh = rect.height;
      const img = this.$el.querySelector('img, video');
      let iw = img?.clientWidth || vw;
      let ih = img?.clientHeight || vh;
      
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

    applyBoundWithRubber(value, max, dimension) {
      if (value > max) {
        return max + this.rubberBand(value - max, dimension, 0.55);
      }
      if (value < -max) {
        return -max - this.rubberBand(-max - value, dimension, 0.55);
      }
      return value;
    },

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

    normalizeAngle(deg) {
      deg = ((deg % 360) + 360) % 360;
      return deg > 180 ? deg - 360 : deg;
    },

    onPointerDown(e) {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      this.viewportRect = this.getViewportRect();
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

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
        this.gestureMode = null;
        this.rotatePreview = 0;
        return;
      }

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

      if (this.pointers.size === 2) {
        e.preventDefault();
        const { dist, angle, center } = this.calcTwoPointer();

        const scaleFactor = dist / (this.startDist || dist);
        const scaleChange = Math.abs(scaleFactor - 1);
        const deltaAngle = this.normalizeAngle(angle - this.startAngle);
        const angleChange = Math.abs(deltaAngle);

        const rotateStartDeg = 8;
        const pinchStartScale = 0.08;

        if (!this.gestureMode) {
          if (angleChange >= rotateStartDeg) {
            this.gestureMode = 'rotate';
          } else if (scaleChange >= pinchStartScale) {
            this.gestureMode = 'pinch';
          } else {
            return;
          }
        }

        if (this.gestureMode === 'rotate') {
          this.scale = this.startScale;
          this.rotatePreview = this.clamp(deltaAngle, -90, 90);
          return;
        }

        if (this.gestureMode === 'pinch') {
          this.scale = this.clamp(this.startScale * scaleFactor, this.minScale, this.maxScale);
          this.rotatePreview = 0;
        }

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

      if (this.dragging && this.scale > 1.001) {
        e.preventDefault();
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        const rawX = this.startTx + dx;
        const rawY = this.startTy + dy;
        const { maxX, maxY, vw, vh } = this.getPanBounds();
        
        let overflow = 0;
        let dir = 0;
        if (rawX > maxX) {
          overflow = rawX - maxX;
          dir = -1;
        } else if (rawX < -maxX) {
          overflow = -maxX - rawX;
          dir = +1;
        }
        
        this.edgeOverflow = overflow;
        this.edgeDir = dir;
        
        this.tx = this.applyBoundWithRubber(rawX, maxX, vw);
        this.ty = this.applyBoundWithRubber(rawY, maxY, vh);
      }
    },

    onPointerUp(e) {
      if (this.pointers.has(e.pointerId)) this.pointers.delete(e.pointerId);

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

      if (this.pointers.size === 0) {
        this.dragging = false;
        
        if (this.edgeOverflow > 60 && this.edgeDir !== 0) {
          const dir = this.edgeDir;
          this.reset();
          this.$emit('edge-swipe', dir);
          return;
        }
        this.edgeOverflow = 0;
        this.edgeDir = 0;
        
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

    finishRotate() {
      const d = this.rotatePreview;
      const commitDeg = 30;
      
      let target = 0;
      if (Math.abs(d) >= commitDeg) {
        target = d > 0 ? 90 : -90;
      }

      const newRot = ((this.rotation + target) % 360 + 360) % 360;
      this.rotation = newRot;
      this.rotatePreview = 0;
      this.updateFillScale();
    },

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
