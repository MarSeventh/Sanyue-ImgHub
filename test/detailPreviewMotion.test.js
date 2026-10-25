import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDetailPreviewMotion } from '@/utils/dashboard/detailPreviewMotion';

const controllers = [];
afterEach(() => {
    controllers.splice(0).forEach(controller => controller.cancel());
    document.body.replaceChildren();
});

function fixture() {
    const layout = document.createElement('div');
    const preview = document.createElement('div');
    const table = document.createElement('div');
    layout.append(preview, table);
    document.body.append(layout);
    const rect = (left, top, width, height) => ({ left, top, width, height });
    let side = false;
    layout.getBoundingClientRect = () => rect(20, 100, 1000, side ? 500 : 780);
    preview.getBoundingClientRect = () => side ? rect(20, 100, 400, 500) : rect(20, 100, 1000, 300);
    table.getBoundingClientRect = () => side ? rect(440, 100, 580, 500) : rect(20, 420, 1000, 460);
    const running = [];
    for (const element of [layout, preview, table]) {
        element.animate = vi.fn(() => {
            let finish;
            const finished = new Promise(resolve => { finish = resolve; });
            const animation = { finished, finish, cancel: vi.fn(finish) };
            running.push(animation);
            return animation;
        });
    }
    const motion = createDetailPreviewMotion();
    controllers.push(motion);
    return { layout, preview, table, motion, running, change: () => { side = true; } };
}

describe('detail preview layout motion', () => {
    it('moves both panels together without scaling text, then restores grid sizing', async () => {
        const { layout, preview, table, motion, running, change } = fixture();
        table.style.width = '100%';
        const snapshot = motion.capture(layout);
        change();
        motion.play(layout, snapshot);
        expect(layout.classList.contains('is-layout-animating')).toBe(true);
        expect(preview.style.position).toBe('absolute');
        expect(table.style.position).toBe('absolute');
        expect(table.animate.mock.calls[0][0][0].transform).toBe('translate(-420px, 320px)');
        expect(preview.animate.mock.calls[0][1]).toEqual(table.animate.mock.calls[0][1]);
        running.forEach(animation => animation.finish());
        await Promise.allSettled(running.map(animation => animation.finished));
        await Promise.resolve();
        expect(layout.classList.contains('is-layout-animating')).toBe(false);
        expect(layout.style.height).toBe('');
        expect(preview.style.position).toBe('');
        expect(table.style.width).toBe('100%');
    });

    it('cancels an interrupted transition and ignores its obsolete pending snapshot', async () => {
        const { layout, table, motion, running, change } = fixture();
        const first = motion.capture(layout);
        change();
        motion.play(layout, first);
        const next = motion.capture(layout);
        expect(running.every(animation => animation.cancel.mock.calls.length === 1)).toBe(true);
        expect(table.style.position).toBe('');
        motion.play(layout, first);
        expect(layout.classList.contains('is-layout-animating')).toBe(false);
        motion.cancel();
        motion.play(layout, next);
        expect(table.animate).toHaveBeenCalledTimes(1);
        await Promise.resolve();
        expect(layout.style.height).toBe('');
    });

    it('leaves reduced-motion and detached layouts in normal document flow', () => {
        const { layout, table, motion, change } = fixture();
        const snapshot = motion.capture(layout);
        change();
        vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true });
        motion.play(layout, snapshot);
        expect(table.animate).not.toHaveBeenCalled();
        expect(table.style.position).toBe('');
        layout.remove();
        motion.play(layout, snapshot);
        expect(table.animate).not.toHaveBeenCalled();
    });
});
