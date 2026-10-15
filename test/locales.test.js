import { beforeEach, describe, expect, it } from 'vitest';
import i18n, { initializeLocale, LOCALE_KEY, resolveInitialLocale, setLocale } from '@/locales';

beforeEach(() => {
    localStorage.clear();
    i18n.global.locale = 'zh-CN';
    document.documentElement.removeAttribute('lang');
});

describe('language preference', () => {
    it('prefers a saved supported language over the server default', () => {
        localStorage.setItem(LOCALE_KEY, 'en');
        expect(resolveInitialLocale('zh-CN')).toBe('en');
    });

    it('ignores unsupported preferences and defaults to Chinese when necessary', () => {
        localStorage.setItem(LOCALE_KEY, 'unsupported');
        expect(resolveInitialLocale('en')).toBe('en');
        expect(resolveInitialLocale('unsupported')).toBe('zh-CN');
    });

    it('initializes the document language without overwriting a saved preference', () => {
        expect(initializeLocale('en')).toBe('en');
        expect(i18n.global.locale).toBe('en');
        expect(document.documentElement.lang).toBe('en');
        expect(localStorage.getItem(LOCALE_KEY)).toBeNull();
    });

    it('persists an explicit language change and normalizes unsupported input', () => {
        setLocale('en');
        expect(localStorage.getItem(LOCALE_KEY)).toBe('en');
        expect(document.documentElement.lang).toBe('en');
        setLocale('unsupported');
        expect(i18n.global.locale).toBe('zh-CN');
        expect(localStorage.getItem(LOCALE_KEY)).toBe('zh-CN');
    });
});
