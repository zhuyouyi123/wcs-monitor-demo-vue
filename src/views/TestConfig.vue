<template>
  <el-card shadow="never" class="page-card">
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

    <el-table :data="pagedList" border stripe v-loading="loading" height="100%" class="tbl">
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
      <el-table-column label="对应字典" width="170" show-overflow-tooltip>
        <template #default="{ row }">
          <el-tag v-if="row.dictKey" size="small" type="success" effect="plain">{{ dictNameOf(row.dictKey) }}</el-tag>
          <span v-else class="none-text">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="190" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)"><el-icon><Edit /></el-icon>修改</el-button>
          <el-button link type="warning" @click="handleCopy(row)"><el-icon><CopyDocument /></el-icon>复制</el-button>
          <el-button link type="danger" @click="handleDelete(row)"><el-icon><Delete /></el-icon>删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="PAGE_SIZES"
        :total="filteredList.length"
        layout="total, sizes, prev, pager, next"
        background
        @size-change="handleSizeChange"
      />
    </div>

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
          <el-col :span="12">
            <el-form-item label="对应字典" prop="dictKey">
              <el-select v-model="form.dictKey" placeholder="不关联" clearable style="width: 100%">
                <el-option
                  v-for="g in dictGroups"
                  :key="g.dictKey"
                  :label="`${g.dictName} (${g.dictKey})`"
                  :value="g.dictKey"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
        <p class="dict-tip">关联字典后，监控任务读取的值将按 字典值 → 含义 自动转换；未关联则显示原始值。</p>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false"><el-icon><Close /></el-icon>取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave"><el-icon><Check /></el-icon>确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DEVICE_TYPES, S7_DATA_TYPES, deviceTypeLabel } from '../api/device'
import { listDictGroups } from '../api/dict'
import { loadSysConfig, sysConfig } from '../utils/sysConfig'
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
const dictGroups = ref([])
const formRef = ref()
const currentPage = ref(1)

const PAGE_SIZES = [10, 20, 50, 100]
// 默认每页条数跟随系统设置，用户可临时切换
const userPageSize = ref(null)
const pageSize = computed(() => userPageSize.value || sysConfig.pageSize || 20)

const handleSizeChange = (size) => {
  userPageSize.value = size
  currentPage.value = 1
}

const defaultForm = () => ({
  id: null,
  configName: '',
  deviceType: 'STACKER',
  dbNumber: 1,
  startOffset: 0,
  readLength: 4,
  dataType: 'REAL',
  dictKey: null,
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

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

// 删除/过滤后当前页可能超出总页数，自动回退
watch(
  () => filteredList.value.length,
  (n) => {
    const maxPage = Math.max(1, Math.ceil(n / pageSize.value))
    if (currentPage.value > maxPage) currentPage.value = maxPage
  }
)

const dataTypeLabelOf = (code) => S7_DATA_TYPES.find((t) => t.code === code)?.label || code || '-'

const dictNameOf = (key) => dictGroups.value.find((g) => g.dictKey === key)?.dictName || key

const loadDictGroups = async () => {
  try {
    dictGroups.value = (await listDictGroups()) || []
  } catch {
    /* 字典加载失败不影响配置管理 */
  }
}

const formatTime = (time) => (time ? String(time).replace('T', ' ') : '-')

const loadData = async () => {
  loading.value = true
  currentPage.value = 1
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

const handleCopy = (row) => {
  Object.assign(form, defaultForm(), {
    ...row,
    id: null,
    createTime: null,
    configName: `${row.configName || ''}-副本`
  })
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

onMounted(() => {
  loadSysConfig()
  loadData()
  loadDictGroups()
})
</script>

<style scoped>
/* 卡片占满内容区，表格超出时内部滚动 */
.page-card {
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
}

.page-card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tbl {
  flex: 1;
  min-height: 0;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.search-form {
  margin-bottom: 12px;
}

.none-text {
  color: var(--el-text-color-placeholder);
}

.dict-tip {
  margin: 0 0 4px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--el-color-primary-light-9);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}
</style>
