import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import cookies from 'vue-cookies'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/UploadHome.vue'),
    beforeEnter: (to, from, next) => {
      const authCode = cookies.get('authCode')
      if (authCode === null && to.name !== 'login') {
        ElMessage.error('请先认证！')
        next({ name: 'login' })
      } else {
        next()
      }
    }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
