<template>
    <el-autocomplete
        ref="autocompleteRef"
        v-model="inputValue"
        class="directory-suggestion-input"
        :popper-class="showSuggestions ? 'directory-suggestion-popper' : 'directory-suggestion-popper-hidden'"
        :hide-loading="true"
        :placeholder="placeholder"
        value-key="value"
        :fetch-suggestions="querySuggestions"
        :trigger-on-focus="true"
        :debounce="0"
        :fit-input-width="false"
        placement="bottom-start"
        @focus="handleFocus"
        @blur="handleBlur"
        @select="handleSelect"
    />
</template>

<script>
import axios from '@/utils/axios'

export default {
    name: 'DirectorySuggestionInput',
    props: {
        modelValue: {
            type: String,
            default: ''
        },
        placeholder: {
            type: String,
            default: '上传目录'
        }
    },
    emits: ['update:modelValue', 'focus', 'blur', 'select'],
    data() {
        return {
            directoryTreeRoot: null,
            directoryTreeLoaded: false,
            directoryTreeLoading: false,
            directoryChildrenMap: {},
            focusTime: null,
            showSuggestions: false,
            isFocused: false
        }
    },
    computed: {
        inputValue: {
            get() {
                return this.modelValue
            },
            set(val) {
                this.$emit('update:modelValue', val)
            }
        }
    },
    methods: {
        handleFocus() {
            this.isFocused = true
            this.focusTime = Date.now()
            this.showSuggestions = false
            setTimeout(() => {
                if (this.isFocused) {
                    this.showSuggestions = true
                    // 输入框 width 过渡动画可能尚未完全结束，
                    // 延迟一帧让 popper 重新计算定位，避免错位
                    this.$nextTick(() => {
                        // 额外等 50ms 确保 CSS 过渡完成
                        setTimeout(() => {
                            this.updatePopperPosition()
                        }, 50)
                    })
                }
            }, 400)
            this.ensureDirectoryTreeLoaded()
            this.$emit('focus')
        },
        handleBlur() {
            this.isFocused = false
            this.showSuggestions = false
            this.$emit('blur')
        },
        handleSelect(item) {
            const path = item?.value || ''
            this.$emit('select', path)

            // 选中某级目录后，仅当存在下级子目录时才保持下拉框开启
            const normalizedPath = this.normalizeDirectoryPath(path)
            const children = this.directoryChildrenMap[normalizedPath]
            if (children && children.length > 0) {
                setTimeout(() => {
                    const inputEl = this.$refs.autocompleteRef?.inputRef?.input
                    if (inputEl) {
                        inputEl.focus()
                        inputEl.dispatchEvent(new Event('input'))
                        this.showSuggestions = true
                    }
                }, 50)
            }
        },
        normalizeDirectoryPath(path) {
            if (!path) {
                return '/'
            }
            let normalized = path
            if (!normalized.startsWith('/')) {
                normalized = '/' + normalized
            }
            if (normalized !== '/' && !normalized.endsWith('/')) {
                normalized += '/'
            }
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
            if (this.directoryTreeLoaded || this.directoryTreeLoading) {
                return
            }

            this.directoryTreeLoading = true
            try {
                const response = await axios.get('/api/directoryTree', {
                    withAuthCode: true
                })
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
            return {
                segmentInput,
                parentPath
            }
        },
        getDirectorySuggestions(queryString) {
            const { segmentInput, parentPath } = this.parseDirectoryQuery(queryString)

            const parentChildren = this.directoryChildrenMap[parentPath] || []
            if (!segmentInput) {
                return parentChildren.slice(0, 10).map((item) => ({
                    value: item.path
                }))
            }

            const keyword = segmentInput.toLowerCase()
            const matched = parentChildren
                .filter((item) => item.name.toLowerCase().startsWith(keyword))
                .map((item) => ({ value: item.path }))
            return matched.slice(0, 10)
        },
        async querySuggestions(queryString, callback) {
            await this.ensureDirectoryTreeLoaded()

            let waitTime = 0
            if (this.focusTime) {
                const elapsed = Date.now() - this.focusTime
                if (elapsed < 400) {
                    waitTime = 400 - elapsed
                }
            }

            if (waitTime > 0) {
                setTimeout(() => {
                    callback(this.getDirectorySuggestions(queryString))
                }, waitTime)
            } else {
                callback(this.getDirectorySuggestions(queryString))
            }
        },
        updatePopperPosition() {
            try {
                const popperRef = this.$refs.autocompleteRef?.popperRef
                if (popperRef?.popperInstanceRef) {
                    popperRef.popperInstanceRef.update()
                }
            } catch {
                // ignore
            }
        }
    }
}
</script>

<style scoped>
.directory-suggestion-input {
    width: 100%;
    height: 100%;
}
</style>
