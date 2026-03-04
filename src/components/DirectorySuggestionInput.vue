<template>
    <div class="directory-suggestion-input" ref="wrapperRef">
        <el-input
            ref="inputRef"
            v-model="inputValue"
            :placeholder="placeholder"
            @focus="handleFocus"
            @blur="handleBlur"
            @input="handleInput"
        />
        <div
            v-show="dropdownVisible && suggestions.length > 0"
            class="suggestion-dropdown"
        >
            <ul class="suggestion-list">
                <li
                    v-for="(item, index) in suggestions"
                    :key="index"
                    class="suggestion-item"
                    :title="item.value"
                    @mousedown.prevent="selectItem(item)"
                >
                    {{ item.value }}
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import axios from '@/utils/axios'

export default {
    name: 'DirectorySuggestionInput',
    props: {
        modelValue: { type: String, default: '' },
        placeholder: { type: String, default: '上传目录' }
    },
    emits: ['update:modelValue', 'focus', 'blur', 'select'],
    data() {
        return {
            directoryTreeRoot: null,
            directoryTreeLoaded: false,
            directoryTreeLoading: false,
            directoryChildrenMap: {},
            focusTime: null,
            dropdownVisible: false,
            isFocused: false,
            suggestions: []
        }
    },
    computed: {
        inputValue: {
            get() { return this.modelValue },
            set(val) { this.$emit('update:modelValue', val) }
        }
    },
    watch: {
        modelValue() {
            // 外部修改 modelValue 时也刷新建议
            if (this.isFocused) {
                this.refreshSuggestions()
            }
        }
    },
    methods: {
        handleFocus() {
            this.isFocused = true
            this.focusTime = Date.now()
            this.ensureDirectoryTreeLoaded()
            this.$emit('focus')
            setTimeout(() => {
                if (this.isFocused) {
                    this.refreshSuggestions()
                    this.dropdownVisible = true
                }
            }, 500)
        },
        handleBlur() {
            this.isFocused = false
            this.dropdownVisible = false
            this.$emit('blur')
        },
        handleInput(val) {
            // val 是 el-input @input 事件传来的最新值
            this.$nextTick(() => {
                this.refreshSuggestions()
                if (this.isFocused) {
                    this.dropdownVisible = true
                }
            })
        },
        selectItem(item) {
            const path = item.value
            this.inputValue = path
            this.$emit('select', path)
            const normalizedPath = this.normalizeDirectoryPath(path)
            const children = this.directoryChildrenMap[normalizedPath]
            if (children && children.length > 0) {
                this.$nextTick(() => {
                    this.refreshSuggestions()
                    this.dropdownVisible = true
                    this.$refs.inputRef?.focus()
                })
            } else {
                this.dropdownVisible = false
            }
        },
        refreshSuggestions() {
            this.suggestions = this.getDirectorySuggestions(this.modelValue || '')
        },
        normalizeDirectoryPath(path) {
            if (!path) return '/'
            let normalized = path
            if (!normalized.startsWith('/')) normalized = '/' + normalized
            if (normalized !== '/' && !normalized.endsWith('/')) normalized += '/'
            return normalized
        },
        buildDirectoryChildrenMap(treeRoot) {
            const map = {}
            const walk = (node) => {
                const parentPath = this.normalizeDirectoryPath(node.path)
                const children = Array.isArray(node.children) ? node.children : []
                map[parentPath] = children.map((child) => ({
                    name: child.name,
                    path: this.normalizeDirectoryPath(child.path)
                }))
                children.forEach(walk)
            }
            walk(treeRoot)
            this.directoryChildrenMap = map
        },
        async ensureDirectoryTreeLoaded() {
            if (this.directoryTreeLoaded || this.directoryTreeLoading) return
            this.directoryTreeLoading = true
            try {
                const response = await axios.get('/api/directoryTree', { withAuthCode: true })
                const tree = response?.data?.tree
                if (tree) {
                    this.directoryTreeRoot = tree
                    this.buildDirectoryChildrenMap(tree)
                    this.directoryTreeLoaded = true
                }
            } catch (error) {
                console.error('Failed to load directory tree for autocomplete:', error)
            } finally {
                this.directoryTreeLoading = false
            }
        },
        parseDirectoryQuery(value) {
            const normalizedInput = value && value.startsWith('/') ? value : `/${value || ''}`
            const raw = normalizedInput.slice(1)
            const parts = raw.split('/')
            const segmentInput = parts[parts.length - 1] || ''
            const parentSegments = parts.slice(0, -1).filter(Boolean)
            const parentPath = parentSegments.length > 0 ? `/${parentSegments.join('/')}/` : '/'
            return { segmentInput, parentPath }
        },
        getDirectorySuggestions(queryString) {
            const { segmentInput, parentPath } = this.parseDirectoryQuery(queryString)
            const parentChildren = this.directoryChildrenMap[parentPath] || []
            if (!segmentInput) {
                return parentChildren.slice(0, 10).map((item) => ({ value: item.path }))
            }
            const keyword = segmentInput.toLowerCase()
            return parentChildren
                .filter((item) => item.name.toLowerCase().startsWith(keyword))
                .slice(0, 10)
                .map((item) => ({ value: item.path }))
        }
    }
}
</script>

<style scoped>
.directory-suggestion-input {
    width: 100%;
    height: 100%;
    position: relative;
}
.suggestion-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    width: 100%;
    z-index: 9999;
    border-radius: 12px;
    border: none;
    background-color: var(--popper-bg-color);
    backdrop-filter: blur(10px);
    box-shadow: var(--popper-shadow);
    padding: 6px 0;
    overflow: hidden;
}
.suggestion-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 260px;
    overflow-y: auto;
}
.suggestion-item {
    padding: 8px 16px;
    font-size: 13px;
    border-radius: 6px;
    margin: 2px 6px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    text-align: left;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.suggestion-item:hover {
    background-color: var(--el-fill-color-light);
}
</style>
