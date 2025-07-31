<template>
    <div class="page-settings" v-loading="loading">
        <!-- 根据category分组显示设置 -->
        <div v-for="(categoryGroup, categoryName) in groupedSettings" :key="categoryName" class="first-settings">
            <h3 class="first-title">{{ categoryName }}</h3>
            <el-form :model="settings" label-width="150px">
                <el-form-item v-for="(setting, index) in categoryGroup" :key="setting.id">
                    <template #label>
                        {{ setting.label }}
                        <el-tooltip v-if="setting.tooltip" :content="setting.tooltip" placement="top" raw-content>
                            <font-awesome-icon icon="question-circle" style="margin-left: 5px; cursor: pointer;"/>
                        </el-tooltip>
                    </template>
                    <!-- 如果是select类型则使用下拉选择器 -->
                    <el-select v-if="setting.type === 'select'" v-model="setting.value" :disabled="setting.fixed" :placeholder="setting.placeholder" style="width: 100%">
                        <el-option
                            v-for="option in setting.options"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value">
                        </el-option>
                    </el-select>
                    <!-- 如果是boolean类型则使用切换按钮 -->
                    <el-switch v-else-if="setting.type === 'boolean'" v-model="setting.value" :disabled="setting.fixed"></el-switch>
                    <!-- 否则使用输入框 -->
                    <el-input v-else v-model="setting.value" :disabled="setting.fixed" :placeholder="setting.placeholder"></el-input>
                </el-form-item>
            </el-form>
        </div>

    
        <!-- 保存按钮 -->
        <div class="actions">
            <el-button type="primary" @click="saveSettings">保存设置</el-button>
        </div>
    </div>
</template>

<script>
import fetchWithAuth from '@/utils/fetchWithAuth';

export default {
data() {
    return {
        settings: {
            config: []
        },
        // 加载状态
        loading: false
    };
},
computed: {
    // 根据category将配置项分组
    groupedSettings() {
        const grouped = {};
        if (this.settings.config) {
            this.settings.config.forEach(setting => {
                const category = setting.category || '其他设置';
                if (!grouped[category]) {
                    grouped[category] = [];
                }
                grouped[category].push(setting);
            });
        }
        return grouped;
    }
},
methods: {
    saveSettings() {
        fetchWithAuth('/api/manage/sysConfig/page', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.settings)
        })
        .then(() => this.$message.success('设置已保存'));
    }
},
mounted() {
    this.loading = true;
    // 获取上传设置
    fetchWithAuth('/api/manage/sysConfig/page')
    .then((response) => response.json())
    .then((data) => {
        this.settings = data;
        // 处理布尔类型的值初始化
        if (this.settings.config) {
            this.settings.config.forEach(setting => {
                if (setting.type === 'boolean') {
                    // 将字符串转换为布尔值
                    if (typeof setting.value === 'string') {
                        setting.value = setting.value === 'true';
                    } else if (setting.value === undefined || setting.value === null) {
                        // 如果没有值，使用默认值
                        setting.value = setting.default || false;
                    }
                }
            });
        }
    })
    .finally(() => {
        this.loading = false;
    });
}
};
</script>

<style scoped>
.page-settings {
    padding: 20px;
    min-height: 500px;
}

.first-settings {
    margin-bottom: 40px;
}

.second-title {
    text-align: start;
    margin-left: 20px;
}

.actions {
    margin-top: 20px;
    text-align: right;
}
</style>