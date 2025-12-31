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
    <video
      v-else-if="isVideo"
      class="tm-media"
      :src="src"
      controls
      autoplay
      playsinline
      :style="mediaStyle"
    />
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
  },
  data() {
    return {
      pointers: new Map(),
      // transform state
      scale: 1,
      rotation: 0,  // 落地的旋转角度：0, 90, 180, 270
      rotatePreview: 0,  // 旋转预览角度（-90~+90，跟手）
      tx: 0,
      ty: 0,
      // 图片原始尺寸
      naturalWidth: 0,
      naturalHeight: 0,
      // gesture start snapshots
      startScale: 1,
      startRotation: 0,
      startTx: 0,
      startTy: 0,
      startCenter: null,
      startDist: 0,
      startAngle: 0,
      // drag
      dragging: false,
      dragStart: null,
      viewportRect: null,
      // bounds
      minScale: 1,
      maxScale: 4,
      // 手势模式锁定：'pinch' | 'rotate' | null
      gestureMode: null,
      // 边界翻页相关
      edgeOverflow: 0,  // 超出边界的累计距离
      edgeDir: 0,       // 超出方向：-1左 +1右
    };
  },
  computed: {
    isActiveTransform() {
      return this.scale > 1.001 || this.pointers.size >= 2 || this.dragging;
    },
    // 实际显示的旋转角度 = 落地角度 + 预览角度
    displayRotation() {
      return this.rotation + this.rotatePreview;
    },
    // 旋转时缩小系数（中间最小，两端恢复）
    rotateShrink() {
      const p = Math.min(1, Math.abs(this.rotatePreview) / 90);
      const k = Math.sin(Math.PI * p);
      return 1 - 0.12 * k;  // 最多缩小12%
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
  },
  methods: {
    onLoad(e) {
      // 记录图片原始尺寸
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

    // iOS 风格橡皮筋阻尼函数
    rubberBand(distance, dimension, constant = 0.55) {
      return (distance * dimension * constant) / (dimension + constant * distance);
    },

    getViewportRect() {
      return this.$refs.viewport?.getBoundingClientRect();
    },

    // 计算放大后允许的最大平移范围
    getPanBounds() {
      const rect = this.$refs.viewport?.getBoundingClientRect();
      if (!rect) return { maxX: 0, maxY: 0, vw: 0, vh: 0 };
      const vw = rect.width, vh = rect.height;
      const img = this.$el.querySelector('img, video');
      const iw = img?.clientWidth || vw;
      const ih = img?.clientHeight || vh;
      const sw = iw * this.scale;
      const sh = ih * this.scale;
      const maxX = Math.max(0, (sw - vw) / 2);
      const maxY = Math.max(0, (sh - vh) / 2);
      return { maxX, maxY, vw, vh };
    },

    // 应用边界阻尼
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
      const pts = Array.from(this.pointers.values());
      const p0 = pts[0], p1 = pts[1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const center = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      return { dist, angle, center };
    },

    // 角度归一化到 -180~180
    normalizeAngle(deg) {
      deg = ((deg % 360) + 360) % 360;
      return deg > 180 ? deg - 360 : deg;
    },

    onPointerDown(e) {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      this.viewportRect = this.getViewportRect();
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // 2指开始：初始化 pinch/rotate 基准
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

      // 1指：如果已放大，则进入拖拽
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

      // 2指：缩放 + 旋转（带死区锁定）
      if (this.pointers.size === 2) {
        e.preventDefault();
        const { dist, angle, center } = this.calcTwoPointer();

        const scaleFactor = dist / (this.startDist || dist);
        const scaleChange = Math.abs(scaleFactor - 1);
        const deltaAngle = this.normalizeAngle(angle - this.startAngle);
        const angleChange = Math.abs(deltaAngle);

        // 阈值
        const rotateStartDeg = 8;   // 8° 开始进入旋转模式
        const pinchStartScale = 0.08; // 8% 缩放变化开始进入缩放模式

        // 判断手势模式（只在第一次超过死区时锁定）
        // 优先判断旋转：角度变化超过8°就进入旋转模式（不管缩放）
        if (!this.gestureMode) {
          if (angleChange >= rotateStartDeg) {
            this.gestureMode = 'rotate';
          } else if (scaleChange >= pinchStartScale) {
            this.gestureMode = 'pinch';
          } else {
            return; // 还在死区内
          }
        }

        // 旋转模式：预览角跟手，限制在 -90~+90
        if (this.gestureMode === 'rotate') {
          this.scale = this.startScale; // 锁定缩放
          this.rotatePreview = this.clamp(deltaAngle, -90, 90);
          return;
        }

        // 缩放模式
        if (this.gestureMode === 'pinch') {
          this.scale = this.clamp(this.startScale * scaleFactor, this.minScale, this.maxScale);
          this.rotatePreview = 0;
        }

        // 跟随双指中心移动
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

      // 1指：拖拽（只在 scale>1 时）+ 边界阻尼 + 边界翻页检测
      if (this.dragging && this.scale > 1.001) {
        e.preventDefault();
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        const rawX = this.startTx + dx;
        const rawY = this.startTy + dy;
        const { maxX, maxY, vw, vh } = this.getPanBounds();
        
        // 检测是否超出左右边界
        let overflow = 0;
        let dir = 0;
        if (rawX > maxX) {
          overflow = rawX - maxX;
          dir = -1;  // 往右拖 = 上一页
        } else if (rawX < -maxX) {
          overflow = -maxX - rawX;
          dir = +1;  // 往左拖 = 下一页
        }
        
        // 记录超出状态
        this.edgeOverflow = overflow;
        this.edgeDir = dir;
        
        this.tx = this.applyBoundWithRubber(rawX, maxX, vw);
        this.ty = this.applyBoundWithRubber(rawY, maxY, vh);
      }
    },

    onPointerUp(e) {
      if (this.pointers.has(e.pointerId)) this.pointers.delete(e.pointerId);

      // 两指结束：处理旋转吸附
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
        
        // 检查是否触发边界翻页（超出60px触发）
        if (this.edgeOverflow > 60 && this.edgeDir !== 0) {
          const dir = this.edgeDir;
          // 翻页前先重置自身状态，解除 gestureLocked
          this.reset();
          this.$emit('edge-swipe', dir);
          return;
        }
        this.edgeOverflow = 0;
        this.edgeDir = 0;
        
        // 缩放回到1附近，自动归位
        if (this.scale <= 1.001) {
          this.scale = 1;
          this.tx = 0;
          this.ty = 0;
        } else {
          // 放大状态：回弹到合法范围
          const { maxX, maxY } = this.getPanBounds();
          this.tx = Math.max(-maxX, Math.min(maxX, this.tx));
          this.ty = Math.max(-maxY, Math.min(maxY, this.ty));
        }
      }
    },

    // 松手后吸附到 0° 或 ±90°
    finishRotate() {
      const d = this.rotatePreview;
      const commitDeg = 30;  // 超过30°就翻到90°
      
      let target = 0;
      if (Math.abs(d) >= commitDeg) {
        target = d > 0 ? 90 : -90;
      }

      // 计算新的落地角度
      const newRot = ((this.rotation + target) % 360 + 360) % 360;

      // 落地并重置预览角（transition 会自动处理动画）
      this.rotation = newRot;
      this.rotatePreview = 0;

      // 计算旋转后的铺满缩放
      this.updateFillScale();
    },

    // 旋转后铺满屏幕：90°/270°时放大到2倍（类似双击效果）
    updateFillScale() {
      const rot = this.rotation % 360;
      const isRotated = (rot === 90 || rot === 270);

      if (isRotated) {
        // 90°/270° 时放大到2倍铺满
        this.scale = 2;
        this.tx = 0;
        this.ty = 0;
      } else {
        // 0° 或 180° 恢复正常
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
</style>
