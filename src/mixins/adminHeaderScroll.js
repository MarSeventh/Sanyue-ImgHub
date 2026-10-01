import { OverlayScrollbars } from 'overlayscrollbars';

export default {
    data() {
        return { isHeaderCompact: false };
    },
    methods: {
        getHeaderScrollElements() {
            return OverlayScrollbars(document.body)?.elements();
        },
        getHeaderScrollPosition() {
            const scroller = this.getHeaderScrollElements()?.scrollOffsetElement || document.scrollingElement;
            return Math.max(0, scroller?.scrollTop || 0);
        },
        handleHeaderScroll(event) {
            const elements = this.getHeaderScrollElements();
            // 弹窗、表格等内部滚动不改变页面顶栏。
            if (![document, window, document.scrollingElement, elements?.scrollEventElement, elements?.scrollOffsetElement].includes(event.target)) return;
            if (this.headerScrollFrame !== null) return;
            this.headerScrollFrame = requestAnimationFrame(() => {
                this.headerScrollFrame = null;
                const position = this.getHeaderScrollPosition();
                const distance = position - this.headerScrollAnchor;
                const header = this.$el.querySelector('.admin-header-content');
                if (position <= 32 || header?.matches(':focus-within') || header?.querySelector('.page-switcher.is-open')) {
                    this.isHeaderCompact = false;
                    this.headerScrollAnchor = position;
                } else if (position > 80 && distance >= 16) {
                    this.isHeaderCompact = true;
                    this.headerScrollAnchor = position;
                } else if (distance <= -16) {
                    this.isHeaderCompact = false;
                    this.headerScrollAnchor = position;
                }
            });
        }
    },
    mounted() {
        this.headerScrollFrame = null;
        this.headerScrollAnchor = this.getHeaderScrollPosition();
        this.isHeaderCompact = this.headerScrollAnchor > 80;
        document.addEventListener('scroll', this.handleHeaderScroll, { capture: true, passive: true });
    },
    beforeUnmount() {
        document.removeEventListener('scroll', this.handleHeaderScroll, true);
        if (this.headerScrollFrame !== null) cancelAnimationFrame(this.headerScrollFrame);
    }
};
