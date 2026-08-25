<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-title">
        <el-icon :size="34"><Monitor /></el-icon>
        <span>WCS 仓库控制系统</span>
      </div>
      <div class="login-subtitle">请使用系统账号登录</div>
      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" clearable>
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" show-password>
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-button
          type="primary"
          size="large"
          class="login-btn"
          :loading="loading"
          @click="handleLogin"
        >登 录</el-button>
      </el-form>
      <div class="login-tip">默认管理员账号：admin / 123456</div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form })
    })
    const body = await res.json()
    if (!body || body.code !== 200) {
      throw new Error(body?.msg || '登录失败')
    }
    localStorage.setItem('wcs_token', body.data.token)
    const { token, ...user } = body.data
    localStorage.setItem('wcs_user', JSON.stringify(user))
    ElMessage.success(`欢迎，${user.realName || user.username}`)
    router.push('/dashboard')
  } catch (e) {
    ElMessage.error(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #001529 0%, #003a6b 60%, #00509e 100%);
}

.login-card {
  width: 380px;
  padding: 36px 32px 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
}

.login-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 700;
  color: #303133;
}

.login-title .el-icon {
  color: var(--el-color-primary);
}

.login-subtitle {
  margin: 10px 0 26px;
  text-align: center;
  font-size: 13px;
  color: #909399;
}

.login-btn {
  width: 100%;
  margin-top: 4px;
}

.login-tip {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: #c0c4cc;
}
</style>
