import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, ref } from 'vue';
import { useDragSelect } from '@/utils/dashboard/useDragSelect';
import { calcSelectionRect, rectIntersects } from '@/utils/dashboard/rectIntersects';

let app;
afterEach(() => {
    app?.unmount();
    app = null;
    document.body.replaceChildren();
    document.body.style.userSelect = '';
});

function mountSelection(width = 1200) {
    vi.stubGlobal('innerWidth', width);
    const host = document.createElement('div');
    document.body.append(host);
    const items = ref([{ selected: false }, { selected: true }]);
    const viewMode = ref('card');
    const containerRef = ref(null);
    let state;
    app = createApp({ setup() {
        state = useDragSelect({ modes: { card: { containerRef, itemSelector: '.file-card' } }, viewMode, items });
        return () => h('main', { class: 'main-container', ref: containerRef }, [h('div', { class: 'file-card' }), h('div', { class: 'file-card' }), h('button', 'action')]);
    } });
    app.mount(host);
    const container = host.querySelector('main');
    container.querySelectorAll('.file-card').forEach((element, index) => {
        vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ left: 100 + index * 200, top: 100, right: 200 + index * 200, bottom: 200 });
    });
    return { container, items, viewMode, state };
}

function mouse(target, type, options = {}) {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, clientX: 80, clientY: 80, ...options }));
}

describe('dashboard selection', () => {
    it('calculates reverse drags and excludes rectangles that merely touch', () => {
        expect(calcSelectionRect({ x: 200, y: 180 }, { x: 80, y: 90 })).toEqual({ left: 80, top: 90, width: 120, height: 90, right: 200, bottom: 180 });
        const first = { left: 0, top: 0, right: 10, bottom: 10 };
        expect(rectIntersects(first, { left: 9, top: 9, right: 20, bottom: 20 })).toBe(true);
        expect(rectIntersects(first, { left: 10, top: 0, right: 20, bottom: 10 })).toBe(false);
    });

    it('selects intersecting cards and restores text selection after mouseup', () => {
        const { container, items, state } = mountSelection();
        document.body.style.userSelect = 'text';
        mouse(container, 'mousedown');
        mouse(document, 'mousemove', { clientX: 220, clientY: 220 });
        expect(items.value.map(item => item.selected)).toEqual([true, false]);
        expect(state.isDragging.value).toBe(true);
        expect(document.body.style.userSelect).toBe('none');
        mouse(document, 'mouseup');
        expect(state.isDragging.value).toBe(false);
        expect(document.body.style.userSelect).toBe('text');
    });

    it('preserves previously selected cards during an append drag', () => {
        const { container, items } = mountSelection();
        mouse(container, 'mousedown', { shiftKey: true });
        mouse(document, 'mousemove', { clientX: 220, clientY: 220 });
        expect(items.value.map(item => item.selected)).toEqual([true, true]);
        mouse(document, 'mouseup');
    });

    it('does not start a drag from a file, a button or the right mouse button', () => {
        const { container, state } = mountSelection();
        mouse(container.querySelector('.file-card'), 'mousedown');
        expect(state.isDragging.value).toBe(false);
        mouse(container.querySelector('button'), 'mousedown');
        expect(state.isDragging.value).toBe(false);
        mouse(container, 'mousedown', { button: 2 });
        expect(state.isDragging.value).toBe(false);
    });

    it('disables dragging at mobile widths', () => {
        const { container, state } = mountSelection(768);
        mouse(container, 'mousedown');
        expect(state.isDragging.value).toBe(false);
    });

    it('cancels active drags when switching modes and removes listeners on unmount', async () => {
        const { container, state, items, viewMode } = mountSelection();
        mouse(container, 'mousedown');
        expect(state.isDragging.value).toBe(true);
        viewMode.value = 'table';
        await nextTick();
        expect(state.isDragging.value).toBe(false);
        mouse(document, 'mousemove', { clientX: 220, clientY: 220 });
        expect(items.value.map(item => item.selected)).toEqual([false, false]);
        app.unmount();
        app = null;
        document.body.append(container);
        mouse(container, 'mousedown');
        expect(state.isDragging.value).toBe(false);
    });
});
