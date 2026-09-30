export function settingsSnapshot(settings) {
    return JSON.stringify(settings, (_key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]]));
        }
        return value;
    });
}

export default {
    data() {
        return { savedSettingsSnapshot: null };
    },
    computed: {
        hasUnsavedChanges() {
            return this.savedSettingsSnapshot !== null
                && settingsSnapshot(this.editableSettings) !== this.savedSettingsSnapshot;
        }
    },
    methods: {
        markSettingsSaved(settings = this.editableSettings) {
            this.savedSettingsSnapshot = settingsSnapshot(settings);
        }
    }
};
