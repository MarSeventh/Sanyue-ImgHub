import { createApp } from 'vue'
import { createHead } from '@vueuse/head'; // 导入 createHead
import ElementPlus from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'

import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons'; // 引入所有 solid 图标
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import App from './App.vue'
import router from './router'
import store from './store'

import * as ElementPlusIconsVue from '@element-plus/icons-vue'

library.add(fas);

const app = createApp(App)
const head = createHead(); // 创建 head 对象

app.component('font-awesome-icon', FontAwesomeIcon);
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

store.dispatch('fetchUserConfig').then(() => {
    app.use(store).use(router).use(ElementPlus).mount('#app');
}).catch(error => {
    console.error('Failed to load user configuration:', error);
    app.use(store).use(router).use(ElementPlus).use(head).mount('#app');
})

