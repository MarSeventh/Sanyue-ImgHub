import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import cookies from 'vue-cookies'
import store from '../store'

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
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/AdminDashBoard.vue'),
    beforeEnter: (to, from, next) => {
      // 从store中获取凭据
      const credentials = store.getters.credentials
      if (credentials === null && to.name !== 'adminLogin') {
        ElMessage.error('请先登录！')
        next({ name: 'adminLogin' })
      } else {
        next()
      }
    }
  },
  {
    path: '/adminLogin',
    name: 'adminLogin',
    component: () => import('../views/AdminLogin.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
