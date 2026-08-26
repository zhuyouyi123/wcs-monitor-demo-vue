<template>
  <el-container class="layout">
    <el-aside :width="isCollapse ? '64px' : '210px'" class="aside" :class="{ light: !theme.darkMenu }" :style="{ background: menuBg }">
      <div class="logo" :style="{ color: theme.darkMenu ? '#fff' : '#303133' }">
        <el-icon :size="24"><Monitor /></el-icon>
        <span v-show="!isCollapse">{{ sysConfig.systemName || 'WCS 管理系统' }}</span>
      </div>
      <el-menu
        :default-active="$route.path"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        :background-color="menuBg"
        :text-color="menuText"
        active-text-color="#fff"
        class="menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <template #title>首页</template>
        </el-menu-item>
        <el-sub-menu index="/device">
          <template #title>
            <el-icon><Cpu /></el-icon>
            <span>设备监控</span>
          </template>
          <el-menu-item index="/device/stacker">
            <el-icon><Goods /></el-icon>
            <span>堆垛机管理</span>
          </el-menu-item>
          <el-menu-item index="/device/stacker-visual">
            <el-icon><DataBoard /></el-icon>
            <span>堆垛机可视化</span>
          </el-menu-item>
          <el-menu-item index="/device/conveyor">
            <el-icon><Guide /></el-icon>
            <span>输送线管理</span>
          </el-menu-item>
          <el-menu-item index="/device/conveyor-node">
            <el-icon><Share /></el-icon>
            <span>输送线节点管理</span>
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/task">
          <el-icon><List /></el-icon>
          <template #title>任务管理</template>
        </el-menu-item>
        <el-sub-menu index="/config-group">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统配置</span>
          </template>
          <el-menu-item index="/test-config">
            <el-icon><Link /></el-icon>
            <span>通信测试配置</span>
          </el-menu-item>
          <el-menu-item index="/dict">
            <el-icon><Collection /></el-icon>
            <span>字典配置</span>
          </el-menu-item>
          <el-menu-item index="/system">
            <el-icon><Tools /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
          <el-menu-item v-if="loginUser.role === 'admin'" index="/users">
            <el-icon><User /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
          <Expand v-if="isCollapse" />
          <Fold v-else />
        </el-icon>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>WCS 管理系统</el-breadcrumb-item>
          <el-breadcrumb-item>{{ $route.meta.title }}</el-breadcrumb-item>
        </el-breadcrumb>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user">
              <el-avatar :size="28" icon="UserFilled" />
              <span>{{ loginUser.realName || loginUser.username || '未登录' }}</span>
              <el-tag v-if="loginUser.role === 'admin'" size="small" type="danger">管理员</el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout"><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getLoginUser, getToken, post } from '../utils/request'
import { loadSysConfig, sysConfig, updateDocumentTitle } from '../utils/sysConfig'
import { theme } from '../utils/theme'

const router = useRouter()
const isCollapse = ref(false)

const loginUser = getLoginUser()

const menuBg = computed(() => (theme.darkMenu ? '#001529' : '#ffffff'))
const menuText = computed(() => (theme.darkMenu ? 'rgba(255,255,255,0.65)' : '#303133'))

watch(
  () => [router.currentRoute.value.meta?.title, sysConfig.systemName],
  ([title]) => {
    if (title && getToken()) {
      updateDocumentTitle(title)
    }
  },
  { immediate: true }
)

onMounted(() => {
  loadSysConfig()
})

const handleCommand = async (command) => {
  if (command !== 'logout') return
  try {
    if (getToken()) {
      await post('/auth/logout')
    }
  } catch {
    /* ignore */
  }
  localStorage.removeItem('wcs_token')
  localStorage.removeItem('wcs_user')
  router.push('/login')
}
</script>

<style scoped>
.layout {
  height: 100%;
}

.aside {
  transition: width 0.2s, background 0.3s;
}

.aside.light {
  border-right: 1px solid #e8e8e8;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 60px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
}

.menu {
  border-right: none;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid #e8e8e8;
  background: #fff;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
}

.header-right {
  margin-left: auto;
}

.user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.main {
  background-color: #f0f2f5;
  overflow: hidden;
}
</style>
