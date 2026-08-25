<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>用户列表</span>
        <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增用户</el-button>
      </div>
    </template>

    <el-form :inline="true" class="search-form">
      <el-form-item label="关键字">
        <el-input v-model="keyword" placeholder="用户名 / 姓名" clearable @keyup.enter="loadData" />
      </el-form-item>
      <el-form-item label="角色">
        <el-select v-model="queryRole" placeholder="全部" clearable style="width: 140px">
          <el-option label="管理员" value="admin" />
          <el-option label="普通用户" value="user" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadData"><el-icon><Search /></el-icon>查询</el-button>
        <el-button @click="resetQuery"><el-icon><Refresh /></el-icon>重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="filteredList" border stripe v-loading="loading">
      <el-table-column prop="username" label="用户名" width="150" />
      <el-table-column prop="realName" label="姓名" width="150" />
      <el-table-column label="角色" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'info'">{{ roleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'warning'">
            {{ row.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="{ row }">
          <div class="op-grid">
            <el-button link type="primary" @click="openDialog(row)"><el-icon><Edit /></el-icon>修改</el-button>
            <el-button
              v-if="row.status === 1"
              link
              type="warning"
              :disabled="isProtected(row)"
              @click="handleToggleStatus(row, 0)"
            ><el-icon><CircleClose /></el-icon>禁用</el-button>
            <el-button
              v-else
              link
              type="success"
              :disabled="isProtected(row)"
              @click="handleToggleStatus(row, 1)"
            ><el-icon><CircleCheck /></el-icon>启用</el-button>
            <el-button link type="danger" :disabled="isProtected(row)" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="form.id ? '修改用户' : '新增用户'" width="460px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%" :disabled="form.username === 'admin' && !!form.id">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="form.id ? '留空则不修改密码' : '请输入密码'"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false"><el-icon><Close /></el-icon>取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave"><el-icon><Check /></el-icon>确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getLoginUser } from '../utils/request'
import {
  ROLE_LABELS,
  listUsers,
  addUser,
  updateUser,
  updateUserStatus,
  deleteUser
} from '../api/user'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const keyword = ref('')
const queryRole = ref('')
const userList = ref([])
const formRef = ref()

const currentUser = getLoginUser()
const isAdmin = computed(() => currentUser.role === 'admin')

const defaultForm = () => ({
  id: null,
  username: '',
  realName: '',
  role: 'user',
  password: '',
  remark: ''
})

const form = reactive(defaultForm())

const rules = computed(() => ({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  password: form.id
    ? []
    : [{ required: true, message: '请输入密码', trigger: 'blur' }]
}))

const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return userList.value.filter((u) => {
    if (queryRole.value && u.role !== queryRole.value) return false
    if (!kw) return true
    return (
      u.username?.toLowerCase().includes(kw) ||
      u.realName?.toLowerCase().includes(kw)
    )
  })
})

const isProtected = (row) =>
  row.username === 'admin' || (currentUser.userId != null && row.id === Number(currentUser.userId))

const roleLabel = (role) => ROLE_LABELS[role] || role

const formatTime = (time) => (time ? String(time).replace('T', ' ') : '-')

const loadData = async () => {
  loading.value = true
  try {
    userList.value = (await listUsers()) || []
  } catch (e) {
    ElMessage.error(e.message || '加载用户列表失败')
  } finally {
    loading.value = false
  }
}

const resetQuery = () => {
  keyword.value = ''
  queryRole.value = ''
}

const openDialog = (row) => {
  Object.assign(form, defaultForm(), row ? { ...row, password: '' } : {})
  dialogVisible.value = true
}

const handleSave = async () => {
  await formRef.value.validate()
  saving.value = true
  try {
    const data = { ...form }
    if (data.id) {
      await updateUser(data.id, data)
      ElMessage.success('修改成功')
    } else {
      await addUser(data)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleToggleStatus = async (row, status) => {
  const action = status === 1 ? '启用' : '禁用'
  await ElMessageBox.confirm(`确定${action}用户「${row.realName || row.username}」吗？`, '提示', {
    type: 'warning'
  })
  try {
    await updateUserStatus(row.id, status)
    ElMessage.success(`${action}成功`)
    loadData()
  } catch (e) {
    ElMessage.error(e.message || `${action}失败`)
  }
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm(
    `确定删除用户「${row.realName || row.username}」吗？删除后不可恢复。`,
    '提示',
    { type: 'warning' }
  )
  try {
    await deleteUser(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

onMounted(loadData)
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.op-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  justify-items: center;
  gap: 6px 8px;
}

.op-grid :deep(.el-button) {
  margin-left: 0;
  height: auto;
  padding: 2px 0;
}
</style>
