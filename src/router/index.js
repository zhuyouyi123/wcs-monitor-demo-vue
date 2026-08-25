import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import Layout from '../layout/index.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录', public: true }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'device',
        redirect: '/device/stacker',
        meta: { title: '设备监控' },
        children: [
          {
            path: 'stacker',
            name: 'Stacker',
            component: () => import('../views/Stacker.vue'),
            meta: { title: '堆垛机管理' }
          },
          {
            path: 'stacker-visual',
            name: 'StackerVisual',
            component: () => import('../views/StackerVisual.vue'),
            meta: { title: '堆垛机可视化' }
          },
          {
            path: 'conveyor',
            name: 'Conveyor',
            component: () => import('../views/Conveyor.vue'),
            meta: { title: '输送线管理' }
          },
          {
            path: 'conveyor-node',
            name: 'ConveyorNode',
            component: () => import('../views/ConveyorNode.vue'),
            meta: { title: '输送线节点管理' }
          }
        ]
      },
      {
        path: 'test-config',
        name: 'TestConfig',
        component: () => import('../views/TestConfig.vue'),
        meta: { title: '通信测试配置' }
      },
      {
        path: 'task',
        name: 'Task',
        component: () => import('../views/Task.vue'),
        meta: { title: '任务管理' }
      },
      {
        path: 'system',
        name: 'System',
        component: () => import('../views/System.vue'),
        meta: { title: '系统设置' }
      },
      {
        path: 'users',
        name: 'UserManage',
        component: () => import('../views/UserManage.vue'),
        meta: { title: '用户管理', requiresAdmin: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const getLoginUser = () => {
  try {
    return JSON.parse(localStorage.getItem('wcs_user')) || {}
  } catch {
    return {}
  }
}

router.beforeEach((to) => {
  const token = localStorage.getItem('wcs_token')
  if (!to.meta.public && !token) {
    return { path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }
  if (to.meta.requiresAdmin && getLoginUser().role !== 'admin') {
    ElMessage.error('无权限访问')
    return { path: '/dashboard' }
  }
  if (to.path === '/login' && token) {
    return '/dashboard'
  }
})

export default router
