import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import store from './store'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}
store.dispatch('fetchUserConfig').then(() => {
    app.use(store).use(router).use(ElementPlus).mount('#app');
}).catch(error => {
    console.error('Failed to load user configuration:', error);
    app.use(store).use(router).use(ElementPlus).mount('#app');
})

