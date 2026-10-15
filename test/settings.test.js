import { describe, expect, it } from 'vitest';
import unsavedSettings, { settingsSnapshot } from '@/mixins/unsavedSettings';

describe('unsaved settings', () => {
    it('ignores object key order while retaining meaningful nested and array changes', () => {
        expect(settingsSnapshot({ b: 2, a: { y: 1, x: 2 } })).toBe(settingsSnapshot({ a: { x: 2, y: 1 }, b: 2 }));
        expect(settingsSnapshot({ channels: ['a', 'b'] })).not.toBe(settingsSnapshot({ channels: ['b', 'a'] }));
        expect(settingsSnapshot({ nested: { enabled: false } })).not.toBe(settingsSnapshot({ nested: { enabled: true } }));
    });

    it('tracks edits, reverts and successful saves using the actual mixin', () => {
        const context = { ...unsavedSettings.data(), editableSettings: { nested: { enabled: true } } };
        const changed = () => unsavedSettings.computed.hasUnsavedChanges.call(context);
        expect(changed()).toBe(false);
        unsavedSettings.methods.markSettingsSaved.call(context);
        context.editableSettings.nested.enabled = false;
        expect(changed()).toBe(true);
        context.editableSettings.nested.enabled = true;
        expect(changed()).toBe(false);
        context.editableSettings.nested.enabled = false;
        unsavedSettings.methods.markSettingsSaved.call(context);
        expect(changed()).toBe(false);
    });
});
