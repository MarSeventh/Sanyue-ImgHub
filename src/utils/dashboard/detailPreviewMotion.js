const DURATION = 380;
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

// Only measure at the start and end of a layout change; the browser runs the animation.
export function createDetailPreviewMotion() {
    let revision = 0;
    let animations = [];
    let currentLayout;
    let restoreStyles = () => {};

    function cancel() {
        revision++;
        animations.forEach(animation => animation.cancel());
        animations = [];
        restoreStyles();
        restoreStyles = () => {};
        currentLayout?.classList.remove('is-layout-animating');
        currentLayout = null;
    }

    function capture(layout) {
        const snapshot = {
            height: layout.getBoundingClientRect().height,
            panels: [...layout.children].map(element => ({ element, rect: element.getBoundingClientRect() }))
        };
        // Capture the current visual position before cancelling an interrupted transition.
        cancel();
        return { ...snapshot, revision };
    }

    function play(layout, snapshot) {
        if (snapshot.revision !== revision || !layout.isConnected ||
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        const options = { duration: DURATION, easing: EASING };
        const height = layout.getBoundingClientRect().height;
        const origin = layout.getBoundingClientRect();
        const panels = snapshot.panels.filter(({ element }) => element.parentElement === layout)
            .map(({ element, rect }) => ({ element, rect, next: element.getBoundingClientRect() }));
        if (!panels.some(({ rect, next }) => rect.width && next.width &&
            Math.abs(rect.left - next.left) + Math.abs(rect.top - next.top) +
            Math.abs(rect.width - next.width) + Math.abs(rect.height - next.height) >= 1)) return;
        const saved = [];
        const setStyles = (element, styles) => {
            const previous = Object.fromEntries(Object.keys(styles).map(key => [key, element.style[key]]));
            saved.push(() => Object.assign(element.style, previous));
            Object.assign(element.style, styles);
        };
        // Remove animated panels from grid flow so changing one panel's height cannot
        // displace the other mid-transition. Restore normal grid sizing on finish/cancel.
        restoreStyles = () => saved.forEach(restore => restore());
        setStyles(layout, { height: `${height}px` });
        for (const { element, rect, next } of panels) {
            setStyles(element, {
                position: 'absolute', left: `${next.left - origin.left}px`, top: `${next.top - origin.top}px`,
                width: `${next.width}px`, height: `${next.height}px`
            });
            if (!element.animate) continue;
            if (!rect.width || !next.width) continue;
            const dx = rect.left - next.left;
            const dy = rect.top - next.top;
            if (Math.abs(dx) + Math.abs(dy) + Math.abs(rect.width - next.width) + Math.abs(rect.height - next.height) < 1) continue;
            // Animate dimensions instead of scaling text or rounding the corners into ellipses.
            animations.push(element.animate([
                { transform: `translate(${dx}px, ${dy}px)`, width: `${rect.width}px`, height: `${rect.height}px` },
                { transform: 'translate(0px, 0px)', width: `${next.width}px`, height: `${next.height}px` }
            ], options));
        }
        if (!animations.length) { cancel(); return; }
        currentLayout = layout;
        layout.classList.add('is-layout-animating');
        if (layout.animate && Math.abs(snapshot.height - height) >= 1) {
            animations.push(layout.animate([{ height: `${snapshot.height}px` }, { height: `${height}px` }], options));
        }
        Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
            if (snapshot.revision !== revision) return;
            animations = [];
            restoreStyles();
            restoreStyles = () => {};
            layout.classList.remove('is-layout-animating');
            currentLayout = null;
        });
    }

    return { capture, play, cancel };
}
