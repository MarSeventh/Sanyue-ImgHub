import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import UploadForm from '@/components/upload/UploadForm.vue';
import { mountTemplate } from './helpers/renderTemplate';

const entrySource = readFileSync(resolve(process.cwd(), 'src/entry/entry-loader.js'), 'utf8');
const animationDescriptors = Object.fromEntries(['animate', 'getAnimations'].map(name =>
    [name, Object.getOwnPropertyDescriptor(Element.prototype, name)]));
const timelineDescriptor = Object.getOwnPropertyDescriptor(document, 'timeline');
let mounted;
let pageHide;

afterEach(() => {
    pageHide?.();
    mounted?.unmount();
    pageHide = undefined;
    mounted = undefined;
    document.getElementById('app')?.remove();
    document.getElementById('entry-loader')?.remove();
    document.documentElement.classList.remove('entry-loading');
    delete window.__siteEntry;
    delete window.__siteEntryBootstrap;
    for (const [name, descriptor] of Object.entries(animationDescriptors)) {
        if (descriptor) Object.defineProperty(Element.prototype, name, descriptor);
        else delete Element.prototype[name];
    }
    if (timelineDescriptor) Object.defineProperty(document, 'timeline', timelineDescriptor);
    else delete document.timeline;
    vi.useRealTimers();
});

async function enterUploadPage(uploadMethod, reducedMotion = false, withFooter = false) {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', callback => setTimeout(callback, 16));
    vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }));
    Object.defineProperty(document, 'timeline', { configurable: true, value: { currentTime: 0 } });
    Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => [] });
    const animations = [];
    Object.defineProperty(Element.prototype, 'animate', {
        configurable: true,
        value(frames, timing) {
            let resolveFinished;
            const animation = {
                finished: new Promise(resolve => { resolveFinished = resolve; }),
                cancel: vi.fn(() => resolveFinished()),
            };
            animations.push({ element: this, frames, timing, animation });
            return animation;
        },
    });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
        const isList = this.classList.contains('upload-list-card');
        const isFooter = this.classList.contains('test-footer');
        const isEmptyWrapper = uploadMethod === 'paste' && this.classList.contains('upload-card-wrapper');
        let top = 100;
        let height = 350;
        if (isList) {
            top = 470;
            height = 60;
        } else if (isFooter) {
            top = 550;
            height = 20;
        } else if (isEmptyWrapper) {
            height = 0;
        }
        return { top, bottom: top + height, left: 100, right: 600, width: 500, height };
    });

    const app = document.createElement('div');
    app.id = 'app';
    app.setAttribute('inert', '');
    document.body.appendChild(app);
    const loader = document.createElement('div');
    loader.id = 'entry-loader';
    loader.innerHTML = '<span class="entry-loader-name"></span>';
    document.body.appendChild(loader);
    mounted = mountTemplate(UploadForm, 'src/components/upload/UploadForm.vue', {
        props: { uploadMethod },
        globals: { $store: { getters: { storeAutoReUpload: false }, commit: vi.fn() } },
    });
    app.appendChild(mounted.el);
    if (withFooter) {
        const footer = document.createElement('footer');
        footer.className = 'test-footer';
        footer.dataset.entry = 'up';
        app.appendChild(footer);
    }
    // Happy DOM does not load component CSS; model the nested glass surfaces.
    const input = mounted.find(uploadMethod === 'paste' ? '.paste-card' : '.upload-card');
    input.style.backdropFilter = 'blur(20px)';
    input.style.opacity = '0.7';
    mounted.find('.upload-list-card').style.backdropFilter = 'blur(20px)';
    mounted.find('.upload-list-card').style.opacity = '1';
    mounted.find('.upload-list-dashboard').style.backdropFilter = 'blur(20px)';
    mounted.find('.upload-list-dashboard').style.opacity = '0.7';
    window.__siteEntryBootstrap = { config: { ownerName: 'Test' }, configReady: Promise.resolve({ ownerName: 'Test' }) };
    const addListener = window.addEventListener.bind(window);
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
        if (type === 'pagehide') {
            pageHide = listener;
            return;
        }
        return addListener(type, listener, options);
    });
    new Function(entrySource)();
    const completion = window.__siteEntry.finish();
    expect(window.__siteEntry.finish()).toBe(completion);
    await vi.advanceTimersByTimeAsync(1600);
    await completion;
    return { app, animations, input };
}

describe('upload page entry animations', () => {
    it.each(['default', 'paste'])('animates the %s input and the complete list separately', async method => {
        const { app, animations, input } = await enterUploadPage(method);
        const movements = animations.filter(({ frames }) => frames[0].translate);
        const inputMovement = movements.find(({ element }) => element.contains(input));
        const list = mounted.find('.upload-list-card');
        const listMovement = movements.find(({ element }) => element === list);

        expect(movements).toHaveLength(2);
        expect(inputMovement.element).not.toBe(mounted.find('.upload-form'));
        expect(inputMovement.timing.delay).toBe(listMovement.timing.delay);
        expect(inputMovement.frames[0].translate).toBe('0px 44px');
        expect(listMovement.frames[0].translate).toBe('0px 44px');
        expect(listMovement.frames[0]).toMatchObject({ opacity: 0 });
        expect(listMovement.frames[1]).toMatchObject({ opacity: '1' });
        expect(animations.some(({ element }) => element === mounted.find('.upload-list-dashboard'))).toBe(false);
        expect(app.hasAttribute('inert')).toBe(false);

        pageHide();
        expect(animations.every(({ animation }) => animation.cancel.mock.calls.length > 0)).toBe(true);
    });

    it('shows the page without entry animations when reduced motion is requested', async () => {
        const { app, animations } = await enterUploadPage('default', true);
        expect(animations).toHaveLength(0);
        expect(document.documentElement.classList.contains('entry-loading')).toBe(false);
        expect(app.hasAttribute('inert')).toBe(false);
        expect(document.getElementById('entry-loader')).toBeNull();
    });

    it('keeps grouped cards together when the footer limits their movement', async () => {
        const { animations } = await enterUploadPage('default', false, true);
        const movements = animations.filter(({ element, frames }) => frames[0].translate && element.closest('.upload-form'));
        expect(movements).toHaveLength(2);
        expect(movements.map(({ frames }) => frames[0].translate)).toEqual(['0px 9px', '0px 9px']);
    });
});
