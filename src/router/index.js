import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import store from '../store'
import axios from '@/utils/axios'
import i18n from '@/locales'

// 通用的管理员认证守卫
const adminAuthGuard = (to, from, next) => {
  axios.get('/api/sessionCheck', {
    withCredentials: true
  }).then(res => {
    const data = res.data || {}

    // 不需要管理端认证，直接放行
    if (!data.adminRequired) {
      store.commit('setAdminLoggedIn', true)
      return next()
    }

    // 需要认证，检查是否有有效的 admin session
    if (data.valid && data.authType === 'admin') {
      store.commit('setAdminLoggedIn', true)
      return next()
    }

    // 需要认证但没有有效 session，跳转登录
    store.commit('setAdminLoggedIn', false)
    if (to.name !== 'adminLogin') {
      ElMessage.error(i18n.global.t('login.authRequired'))
      next({ name: 'adminLogin' })
    } else {
      next()
    }
  }).catch(() => {
    store.commit('setAdminLoggedIn', false)
    if (to.name !== 'adminLogin') {
      next({ name: 'adminLogin' })
    } else {
      next()
    }
  })
}

// 通用的用户认证守卫
const userAuthGuard = (to, from, next) => {
  axios.get('/api/sessionCheck', {
    withCredentials: true
  }).then(res => {
    const data = res.data || {}

    // 不需要用户端认证，直接放行
    if (!data.userRequired) {
      store.commit('setUserLoggedIn', true)
      return next()
    }

    // 需要认证，检查是否有有效 session（user 或 admin 都可以）
    if (data.valid) {
      store.commit('setUserLoggedIn', true)
      return next()
    }

    // 需要认证但没有有效 session，跳转登录
    store.commit('setUserLoggedIn', false)
    if (to.name !== 'login') {
      ElMessage.error(i18n.global.t('login.authRequired'))
      next({ name: 'login' })
    } else {
      next()
    }
  }).catch(() => {
    store.commit('setUserLoggedIn', false)
    if (to.name !== 'login') {
      next({ name: 'login' })
    } else {
      next()
    }
  })
}

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/UploadHome.vue'),
    beforeEnter: userAuthGuard
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
    beforeEnter: adminAuthGuard
  },
  {
    path: '/customerConfig',
    name: 'customerConfig',
    component: () => import('../views/CustomerConfig.vue'),
    beforeEnter: adminAuthGuard
  },
  {
    path: '/systemConfig',
    name: 'systemConfig',
    component: () => import('../views/SystemConfig.vue'),
    beforeEnter: adminAuthGuard
  },
  {
    path: '/adminLogin',
    name: 'adminLogin',
    component: () => import('../views/AdminLogin.vue'),
  },
  {
    path: '/blockimg',
    name: 'blockimg',
    component: () => import('../views/BlockImage.vue'),
  },
  {
    path: '/whiteliston',
    name: 'whiteliston',
    component: () => import('../views/WhiteListOn.vue'),
  },
  {
    path: '/browse/:dir*',
    name: 'publicBrowse',
    component: () => import('../views/PublicBrowse.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('../views/NotFound.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
