import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import store from '../store'
import axios from '@/utils/axios'
import i18n from '@/locales'

// 通用的管理员认证守卫
const adminAuthGuard = (to, from, next) => {
  // 先通过 session cookie 检查会话
  axios.get('/api/sessionCheck', {
    withCredentials: true
  }).then(res => {
    if (res.data?.valid && res.data?.authType === 'admin') {
      store.commit('setAdminLoggedIn', true);
      return next()
    }
    throw new Error('no valid admin session')
  }).catch(() => {
    // session 无效，尝试无密码情况（管理端未设密码）
    const credentials = btoa('unset:unset')
    axios.get('/api/manage/check', {
      headers: { 'Authorization': 'Basic ' + credentials },
      withCredentials: true
    }).then(res => {
      if (res.status !== 200) {
        throw new Error(i18n.global.t('login.authFailed'))
      }
      store.commit('setAdminLoggedIn', true);
      next()
    }).catch(() => {
      store.commit('setAdminLoggedIn', false);
      if (to.name !== 'adminLogin') {
        ElMessage.error(i18n.global.t('login.authRequired'))
        next({ name: 'adminLogin' })
      } else {
        next()
      }
    })
  })
}

// 通用的用户认证守卫
const userAuthGuard = (to, from, next) => {
  // 先通过 session cookie 检查会话
  axios.get('/api/sessionCheck', {
    withCredentials: true
  }).then(res => {
    if (res.data?.valid) {
      store.commit('setUserLoggedIn', true);
      return next()
    }
    throw new Error('no valid session')
  }).catch(() => {
    // session 无效，尝试无密码情况（用户端未设密码）
    axios.post('/api/login', {
      authCode: 'unset'
    }, {
      withCredentials: true
    }).then(res => {
      if (res.status !== 200) {
        throw new Error(i18n.global.t('login.authFailed'))
      }
      store.commit('setUserLoggedIn', true);
      next()
    }).catch(() => {
      store.commit('setUserLoggedIn', false);
      if (to.name !== 'login') {
        ElMessage.error(i18n.global.t('login.authRequired'))
        next({ name: 'login' })
      } else {
        next()
      }
    })
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
