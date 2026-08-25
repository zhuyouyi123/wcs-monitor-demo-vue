<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>通信测试配置</span>
        <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增配置</el-button>
      </div>
    </template>

    <el-form :inline="true" class="search-form">
      <el-form-item label="配置名称">
        <el-input v-model="keyword" placeholder="请输入配置名称" clearable @keyup.enter="loadData" />
      </el-form-item>
      <el-form-item label="设备类型">
        <el-select v-model="queryType" placeholder="全部" clearable style="width: 140px" @change="loadData">
          <el-option v-for="t in DEVICE_TYPES" :key="t.code" :label="t.label" :value="t.code" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadData"><el-icon><Search /></el-icon>查询</el-button>
        <el-button @click="resetQuery"><el-icon><Refresh /></el-icon>重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="filteredList" border stripe v-loading="loading">
      <el-table-column prop="configName" label="配置名称" width="170" />
      <el-table-column label="设备类型" width="100" align="center">
        <template #default="{ row }">{{ deviceTypeLabel(row.deviceType) }}</template>
      </el-table-column>
      <el-table-column prop="dbNumber" label="DB 块号" width="90" align="center" />
      <el-table-column prop="startOffset" label="起始偏移" width="90" align="center" />
      <el-table-column prop="readLength" label="读取长度" width="90" align="center" />
      <el-table-column label="数据类型" width="130" align="center">
        <template #default="{ row }">{{ dataTypeLabelOf(row.dataType) }}</template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)"><el-icon><Edit /></el-icon>修改</el-button>
          <el-button link type="danger" @click="handleDelete(row)"><el-icon><Delete /></el-icon>删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="form.id ? '修改配置' : '新增配置'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="配置名称" prop="configName">
          <el-input v-model="form.configName" placeholder="请输入配置名称" />
        </el-form-item>
        <el-form-item label="设备类型" prop="deviceType">
          <el-select v-model="form.deviceType" :disabled="!!form.id" placeholder="请选择设备类型" style="width: 100%">
            <el-option v-for="t in DEVICE_TYPES" :key="t.code" :label="t.label" :value="t.code" />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="DB 块号" prop="dbNumber">
              <el-input-number v-model="form.dbNumber" :min="1" :max="65535" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="起始偏移" prop="startOffset">
              <el-input-number v-model="form.startOffset" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="读取长度" prop="readLength">
              <el-input-number v-model="form.readLength" :min="1" :max="512" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据类型" prop="dataType">
              <el-select v-model="form.dataType" style="width: 100%">
                <el-option v-for="t in S7_DATA_TYPES" :key="t.code" :label="t.label" :value="t.code" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
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
import { DEVICE_TYPES, S7_DATA_TYPES, deviceTypeLabel } from '../api/device'
import {
  listTestConfigs,
  addTestConfig,
  updateTestConfig,
  deleteTestConfig
} from '../api/testConfig'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const keyword = ref('')
const queryType = ref(null)
const configList = ref([])
const formRef = ref()

const defaultForm = () => ({
  id: null,
  configName: '',
  deviceType: 'STACKER',
  dbNumber: 1,
  startOffset: 0,
  readLength: 4,
  dataType: 'REAL',
  remark: ''
})

const form = reactive(defaultForm())

const rules = {
  configName: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  deviceType: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  dataType: [{ required: true, message: '请选择数据类型', trigger: 'change' }]
}

const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return configList.value
  return configList.value.filter(
    (c) => c.configName?.toLowerCase().includes(kw) || c.remark?.toLowerCase().includes(kw)
  )
})

const dataTypeLabelOf = (code) => S7_DATA_TYPES.find((t) => t.code === code)?.label || code || '-'

const formatTime = (time) => (time ? String(time).replace('T', ' ') : '-')

const loadData = async () => {
  loading.value = true
  try {
    const params = {}
    if (queryType.value) params.deviceType = queryType.value
    configList.value = (await listTestConfigs(params)) || []
  } catch (e) {
    ElMessage.error(e.message || '加载配置列表失败')
  } finally {
    loading.value = false
  }
}

const resetQuery = () => {
  keyword.value = ''
  queryType.value = null
  loadData()
}

const openDialog = (row) => {
  Object.assign(form, defaultForm(), row ? { ...row } : {})
  dialogVisible.value = true
}

const handleSave = async () => {
  await formRef.value.validate()
  saving.value = true
  try {
    if (form.id) {
      await updateTestConfig({ ...form })
      ElMessage.success('修改成功')
    } else {
      await addTestConfig({ ...form })
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

const handleDelete = async (row) => {
  await ElMessageBox.confirm(`确定删除配置「${row.configName}」吗？`, '提示', { type: 'warning' })
  try {
    await deleteTestConfig(row.id)
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

.search-form {
  margin-bottom: 12px;
}
</style>
