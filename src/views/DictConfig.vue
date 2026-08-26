<template>
  <el-row :gutter="14" class="dict-page">
    <!-- 左侧：字典分组 -->
    <el-col :span="6">
      <el-card shadow="never" class="group-card">
        <template #header>
          <div class="card-header">
            <span>字典列表</span>
          </div>
        </template>
        <div
          v-for="g in groupList"
          :key="g.dictKey"
          class="group-item"
          :class="{ active: !queryKey || queryKey === g.dictKey }"
          @click="selectGroup(g)"
        >
          <span class="group-dot"></span>
          <div class="group-info">
            <p class="group-name">{{ g.dictName }}</p>
            <p class="group-key">{{ g.dictKey }}</p>
          </div>
          <el-tag size="small" type="info" effect="plain">{{ g.count }}</el-tag>
        </div>
        <el-empty v-if="!groupList.length" description="暂无字典，点击右侧新增配置项创建" :image-size="70" />
      </el-card>
    </el-col>

    <!-- 右侧：字典项 -->
    <el-col :span="18">
      <el-card shadow="never" class="item-card">
        <template #header>
          <div class="card-header">
            <div class="head-title">
              <span>{{ currentGroup ? currentGroup.dictName : '全部字典项' }}</span>
              <el-tag v-if="currentGroup" size="small" type="info">{{ currentGroup.dictKey }}</el-tag>
            </div>
            <div class="head-actions">
              <el-input
                v-model="keyword"
                placeholder="搜索值或含义"
                clearable
                style="width: 180px"
                prefix-icon="Search"
                @keyup.enter="handleSearch"
                @clear="handleSearch"
              />
              <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增配置项</el-button>
            </div>
          </div>
        </template>

        <el-table :data="itemList" border stripe v-loading="loading" class="tbl" height="100%">
          <el-table-column prop="dictName" label="字典名称" width="150" show-overflow-tooltip />
          <el-table-column prop="dictKey" label="字典键" width="200" show-overflow-tooltip>
            <template #default="{ row }"><span class="mono">{{ row.dictKey }}</span></template>
          </el-table-column>
          <el-table-column label="值" width="90" align="center">
            <template #default="{ row }"><el-tag size="small">{{ row.dictValue }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="dictLabel" label="含义" min-width="140">
            <template #default="{ row }">
              <span class="lbl-cell">
                <i v-if="row.dictColor" class="c-dot" :style="{ background: row.dictColor }"></i>{{ row.dictLabel }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="sortOrder" label="排序" width="70" align="center" />
          <el-table-column label="创建时间" width="165">
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
            :total="total"
            layout="total, sizes, prev, pager, next"
            background
            @size-change="handleSizeChange"
            @current-change="loadData"
          />
        </div>
      </el-card>
    </el-col>

    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '修改配置项' : '新增配置项'"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="字典名称" prop="dictName">
          <el-input v-model="form.dictName" placeholder="例如：堆垛机采集状态" maxlength="50" :disabled="lockGroup" />
        </el-form-item>
        <el-form-item label="字典键" prop="dictKey">
          <el-input v-model="form.dictKey" placeholder="例如 STACKER_COLLECT_STATUS" maxlength="50" :disabled="lockGroup" />
        </el-form-item>
        <el-form-item label="值" prop="dictValue">
          <el-input v-model="form.dictValue" placeholder="例如 0、1、2" maxlength="20" style="width: 180px" />
        </el-form-item>
        <el-form-item label="含义" prop="dictLabel">
          <el-input v-model="form.dictLabel" placeholder="该值代表的业务含义" maxlength="50" />
        </el-form-item>
        <el-form-item label="颜色">
          <div class="color-row">
            <el-color-picker v-model="form.dictColor" :predefine="COLOR_PRESETS" />
            <span class="color-tip">用于监控可视化界面按含义着色，可留空</span>
          </div>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" controls-position="right" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false"><el-icon><Close /></el-icon>取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave"><el-icon><Check /></el-icon>确定</el-button>
      </template>
    </el-dialog>
  </el-row>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  pageDictItems,
  listDictGroups,
  addDictItem,
  updateDictItem,
  deleteDictItem
} from '../api/dict'
import { loadSysConfig, sysConfig } from '../utils/sysConfig'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const keyword = ref('')
const itemList = ref([])
const groupList = ref([])
const queryKey = ref(null)
const formRef = ref()

const currentPage = ref(1)
const total = ref(0)
const PAGE_SIZES = [10, 20, 50, 100]
// 默认每页条数跟随系统设置，用户可临时切换
const userPageSize = ref(null)
const pageSize = computed(() => userPageSize.value || sysConfig.pageSize || 20)

const COLOR_PRESETS = [
  '#67C23A', '#409EFF', '#E6A23C', '#F56C6C',
  '#909399', '#9C27B0', '#00BCD4', '#FF5722'
]

const defaultForm = () => ({
  id: null,
  dictName: '',
  dictKey: '',
  dictValue: '',
  dictLabel: '',
  dictColor: null,
  sortOrder: 0
})

const form = reactive(defaultForm())

const rules = {
  dictName: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
  dictKey: [
    { required: true, message: '请输入字典键', trigger: 'blur' },
    { pattern: /^[A-Za-z][A-Za-z0-9_]*$/, message: '仅支持字母、数字和下划线', trigger: 'blur' }
  ],
  dictValue: [{ required: true, message: '请输入字典值', trigger: 'blur' }],
  dictLabel: [{ required: true, message: '请输入含义', trigger: 'blur' }]
}

// 选中分组后新增时锁定名称与键
const lockGroup = computed(() => !form.id && !!queryKey.value)

const currentGroup = computed(() => groupList.value.find((g) => g.dictKey === queryKey.value) || null)

const formatTime = (time) => (time ? String(time).replace('T', ' ') : '-')

const loadData = async () => {
  loading.value = true
  try {
    const page = await pageDictItems({
      current: currentPage.value,
      size: pageSize.value,
      dictKey: queryKey.value || undefined,
      keyword: keyword.value.trim() || undefined
    })
    itemList.value = page.records || []
    total.value = Number(page.total) || 0
  } catch (e) {
    ElMessage.error(e.message || '加载字典数据失败')
  } finally {
    loading.value = false
  }
}

const loadGroups = async () => {
  try {
    groupList.value = (await listDictGroups()) || []
  } catch (e) {
    ElMessage.error(e.message || '加载字典分组失败')
  }
}

const selectGroup = (g) => {
  queryKey.value = queryKey.value === g.dictKey ? null : g.dictKey
  currentPage.value = 1
  loadData()
}

const handleSearch = () => {
  currentPage.value = 1
  loadData()
}

const handleSizeChange = () => {
  userPageSize.value = pageSize.value
  currentPage.value = 1
  loadData()
}

const openDialog = (row) => {
  Object.assign(form, defaultForm())
  if (row) {
    Object.assign(form, { ...row })
  } else if (currentGroup.value) {
    form.dictName = currentGroup.value.dictName
    form.dictKey = currentGroup.value.dictKey
    // 默认排到当前组末尾
    form.sortOrder = currentGroup.value.count || 0
  }
  dialogVisible.value = true
}

const handleCopy = (row) => {
  Object.assign(form, defaultForm(), {
    ...row,
    id: null,
    createTime: null,
    // 值在同组内必须唯一，复制后留空由用户填写新值
    dictValue: ''
  })
  dialogVisible.value = true
}

const handleSave = async () => {
  await formRef.value.validate()
  saving.value = true
  try {
    if (form.id) {
      await updateDictItem(form.id, { ...form })
      ElMessage.success('修改成功')
    } else {
      await addDictItem({ ...form })
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadData()
    loadGroups()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm(`确定删除字典项「${row.dictValue} - ${row.dictLabel}」吗？`, '提示', {
    type: 'warning'
  })
  try {
    await deleteDictItem(row.id)
    ElMessage.success('删除成功')
    loadData()
    loadGroups()
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

onMounted(() => {
  loadSysConfig()
  loadData()
  loadGroups()
})
</script>

<style scoped>
.dict-page {
  height: calc(100vh - 100px);
}

.dict-page > :deep(.el-col) {
  height: 100%;
}

.group-card,
.item-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.group-card :deep(.el-card__body) {
  flex: 1;
  overflow-y: auto;
}

.item-card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tbl {
  flex: 1;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.head-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  border: 1px solid transparent;
}

.group-item + .group-item {
  margin-top: 6px;
}

.group-item:hover {
  background: var(--el-fill-color-light);
}

.group-item.active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
}

.group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-primary);
  flex-shrink: 0;
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-key {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  font-family: Consolas, Monaco, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mono {
  font-family: Consolas, Monaco, monospace;
}

.lbl-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.c-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
