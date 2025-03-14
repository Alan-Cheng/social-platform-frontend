import { createRouter, createWebHistory } from 'vue-router'
import LogIn from '../components/LogIn.vue'
import RegisterUser from '../components/RegisterUser.vue'
import SocialMedia from '../components/SocialMedia.vue'

const routes = [
  {
    path: '/login',
    name: 'LogIn',
    component: LogIn
  },
  {
    path: '/RegisterUser',
    name: 'RegisterUser',
    component: RegisterUser
  },
  {
    path: '/SocialMedia',
    name: 'SocialMedia',
    component: SocialMedia,
    meta: { requiresAuth: true } // 需要身份驗證
  },
  {
    path: '/',
    redirect: '/login' // 重新導向到 /login
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守衛：檢查是否已登入
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!sessionStorage.getItem('token'); // 檢查 localStorage 裡是否有 token

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/'); // 如果未登入且要訪問受保護頁面，重定向到登入頁
  } else {
    next(); // 否則繼續導航
  }
});

export default router;
