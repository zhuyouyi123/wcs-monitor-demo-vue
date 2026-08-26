<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>监控任务</span>
        <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新建任务</el-button>
      </div>
    </template>

    <el-form :inline="true" class="search-form">
      <el-form-item label="任务名称">
        <el-input v-model="keyword" placeholder="请输入任务名称" clearable @keyup.enter="loadData" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryStatus" placeholder="全部" clearable style="width: 130px" @change="loadData">
          <el-option label="运行中" value="RUNNING" />
          <el-option label="已停止" value="STOPPED" />
          <el-option label="已完成" value="FINISHED" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadData"><el-icon><Search /></el-icon>查询</el-button>
        <el-button @click="resetQuery"><el-icon><Refresh /></el-icon>重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="pagedList" border stripe v-loading="loading">
      <el-table-column prop="taskNo" label="任务编号" width="160" />
      <el-table-column prop="taskName" label="任务名称" min-width="140" show-overflow-tooltip />
      <el-table-column label="任务类型" width="130" align="center">
        <template #default><el-tag size="small">堆垛机状态监控</el-tag></template>
      </el-table-column>
      <el-table-column label="绑定堆垛机" width="170">
        <template #default="{ row }">{{ deviceLabel(row.deviceId) }}</template>
      </el-table-column>
      <el-table-column label="执行次数" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="isContinuous(row)" type="warning" size="small">持续执行</el-tag>
          <span v-else>{{ row.execCount }} 次</span>
        </template>
      </el-table-column>
      <el-table-column label="已执行" width="100" align="center">
        <template #default="{ row }">{{ row.executedCount ?? 0 }}{{ isContinuous(row) ? '' : ` / ${row.execCount}` }}</template>
      </el-table-column>
      <el-table-column label="执行间隔" width="90" align="center">
        <template #default="{ row }">{{ row.intervalSeconds }} 秒</template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="statusMeta(row.status).type" size="small">
            <span :class="{ 'running-dot': row.status === 'RUNNING' }"></span>{{ statusMeta(row.status).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最后执行时间" width="165">
        <template #default="{ row }">{{ formatTime(row.lastRunTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="230" align="center" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status !== 'RUNNING'" link type="success" @click="handleStart(row)"><el-icon><VideoPlay /></el-icon>启动</el-button>
          <el-button v-else link type="danger" @click="handleStop(row)"><el-icon><VideoPause /></el-icon>停止</el-button>
          <el-button link type="primary" @click="openData(row)"><el-icon><DataAnalysis /></el-icon>数据</el-button>
          <el-button link type="primary" @click="openDialog(row)"><el-icon><Edit /></el-icon>修改</el-button>
          <el-button link type="danger" @click="handleDelete(row)"><el-icon><Delete /></el-icon>删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredList.length"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        background
      />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑监控任务' : '新建监控任务'"
      width="620px"
      :close-on-click-modal="false"
      class="task-dialog"
    >
      <div class="dlg-banner">
        <span class="banner-icon"><el-icon><Monitor /></el-icon></span>
        <div class="banner-text">
          <p class="banner-title">堆垛机状态监控</p>
          <p class="banner-sub">按设定间隔读取堆垛机绑定配置，采集结果自动入库</p>
        </div>
        <el-tag v-if="form.id" size="small" type="info" effect="plain">{{ currentEditNo }}</el-tag>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="dlg-section">
          <p class="sec-title"><span class="bar"></span>基本信息</p>
          <el-form-item label="任务名称" prop="taskName">
            <el-input v-model="form.taskName" placeholder="例如：1号堆垛机状态巡检" maxlength="50" show-word-limit clearable />
          </el-form-item>
        </div>

        <div class="dlg-section">
          <p class="sec-title"><span class="bar"></span>监控对象</p>
          <el-form-item prop="deviceId">
            <el-select
              v-model="form.deviceId"
              placeholder="请选择要监控的堆垛机"
              style="width: 100%"
              size="large"
              :disabled="form.id && editingRunning"
            >
              <template #label="{ value }">{{ deviceLabel(value) }}</template>
              <el-option v-for="d in stackers" :key="d.id" :label="`${d.deviceCode} - ${d.deviceName}`" :value="d.id">
                <span class="opt-dot" :style="{ background: statusColor(d.status) }"></span>
                <span class="opt-code">{{ d.deviceCode }}</span>
                <span class="opt-name">{{ d.deviceName }}</span>
                <span class="opt-status" :style="{ color: statusColor(d.status) }">{{ connLabel(d.status) }}</span>
              </el-option>
            </el-select>
          </el-form-item>
        </div>

        <div class="dlg-section">
          <p class="sec-title"><span class="bar"></span>执行策略</p>
          <div class="mode-cards" :class="{ disabled: form.id && editingRunning }">
            <div class="mode-card" :class="{ active: !form.continuous }" @click="setContinuous(false)">
              <el-icon class="mode-icon"><Odometer /></el-icon>
              <p class="mode-name">有限次数</p>
              <p class="mode-desc">执行指定次数后自动完成</p>
              <el-icon v-if="!form.continuous" class="mode-check"><CircleCheckFilled /></el-icon>
            </div>
            <div class="mode-card" :class="{ active: form.continuous }" @click="setContinuous(true)">
              <el-icon class="mode-icon"><RefreshRight /></el-icon>
              <p class="mode-name">持续执行</p>
              <p class="mode-desc">循环采集，直至手动停止</p>
              <el-icon v-if="form.continuous" class="mode-check"><CircleCheckFilled /></el-icon>
            </div>
          </div>

          <div class="exec-grid">
            <div class="exec-field" v-show="!form.continuous">
              <label>执行次数</label>
              <el-input-number
                v-model="form.execCount"
                :min="1"
                :max="999999"
                :disabled="form.continuous || (form.id && editingRunning)"
                controls-position="right"
                style="width: 100%"
              />
              <span class="unit">次</span>
            </div>
            <div class="exec-field">
              <label>执行间隔</label>
              <el-input-number
                v-model="form.intervalSeconds"
                :min="1"
                :max="3600"
                :disabled="form.id && editingRunning"
                controls-position="right"
                style="width: 100%"
              />
              <span class="unit">秒</span>
            </div>
          </div>
          <p class="exec-tip"><el-icon><InfoFilled /></el-icon>运行中若堆垛机未连接，将自动尝试建立连接后继续采集。</p>
        </div>

        <div class="dlg-section last">
          <p class="sec-title"><span class="bar"></span>备注<span class="optional">（选填）</span></p>
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" placeholder="填写任务用途、负责人等信息" />
        </div>
      </el-form>

      <template #footer>
        <div class="dlg-footer">
          <el-button @click="dialogVisible = false"><el-icon><Close /></el-icon>取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave"><el-icon><Check /></el-icon>{{ form.id ? '保存修改' : '创建任务' }}</el-button>
        </div>
      </template>
    </el-dialog>

    <el-drawer v-model="drawerVisible" :title="`采集数据 - ${currentTask?.taskName || ''}`" size="760px">
      <div class="drawer-toolbar">
        <el-select
          v-model="recordDbFilter"
          placeholder="全部 DB 块"
          clearable
          style="width: 130px"
          @change="handleDbFilterChange"
        >
          <el-option v-for="d in dbOptions" :key="d" :label="`DB ${d}`" :value="d" />
        </el-select>
        <el-button type="primary" size="small" @click="loadDataRecords"><el-icon><Refresh /></el-icon>刷新</el-button>
        <span class="desc">每 {{ refreshSeconds }} 秒自动刷新 · 共 {{ recordTotal }} 条</span>
      </div>
      <el-table :data="records" border stripe v-loading="recordLoading" size="small">
        <el-table-column prop="configName" label="配置名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="dbNumber" label="DB 块号" width="80" align="center" />
        <el-table-column prop="startOffset" label="起始偏移" width="85" align="center" />
        <el-table-column prop="dataType" label="数据类型" width="90" align="center" />
        <el-table-column label="采集值" min-width="110">
          <template #default="{ row }">
            <el-tooltip v-if="row.dictLabel" :content="`原始值: ${row.rawValue}`" placement="top">
              <span class="value-text dict" :style="row.dictColor ? { color: row.dictColor } : null">
                <i v-if="row.dictColor" class="v-dot" :style="{ background: row.dictColor }"></i>{{ row.dictLabel }}
              </span>
            </el-tooltip>
            <span v-else class="value-text">{{ row.rawValue }}</span>
          </template>
        </el-table-column>
        <el-table-column label="采集时间" width="160">
          <template #default="{ row }">{{ formatTime(row.collectTime) }}</template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="recordPage"
          :page-size="recordPageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="recordTotal"
          layout="total, sizes, prev, pager, next"
          background
          small
          @current-change="loadDataRecords"
          @size-change="handleRecordSizeChange"
        />
      </div>
    </el-drawer>
  </el-card>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listDevices } from '../api/device'
import {
  listMonitorTasks,
  addMonitorTask,
  updateMonitorTask,
  deleteMonitorTask,
  startMonitorTask,
  stopMonitorTask,
  pageMonitorData,
  pageMonitorDataLatest
} from '../api/monitorTask'
import { loadSysConfig, sysConfig } from '../utils/sysConfig'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const drawerVisible = ref(false)
const keyword = ref('')
const queryStatus = ref(null)
const taskList = ref([])
const stackers = ref([])
const formRef = ref()

const currentPage = ref(1)
const pageSize = ref(20)

const currentTask = ref(null)
const records = ref([])
const recordLoading = ref(false)
const recordPage = ref(1)
const userRecordSize = ref(null)
// 默认每页条数跟随系统设置
const recordPageSize = computed(() => userRecordSize.value || sysConfig.pageSize || 20)
const recordTotal = ref(0)
const recordDbFilter = ref(null)
const dbOptions = ref([])
let recordTimer = null
let listTimer = null

const refreshSeconds = computed(() => sysConfig.refreshInterval || 5)

const defaultForm = () => ({
  id: null,
  taskName: '',
  deviceId: null,
  continuous: true,
  execCount: 10,
  intervalSeconds: 5,
  remark: ''
})

const form = reactive(defaultForm())

const rules = {
  taskName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  deviceId: [{ required: true, message: '请选择堆垛机', trigger: 'change' }],
  execCount: [
    {
      validator: (rule, value, callback) => {
        if (!form.continuous && (!value || value < 1)) {
          callback(new Error('请输入大于 0 的执行次数'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

const setContinuous = (value) => {
  if (form.id && editingRunning.value) return
  form.continuous = value
}

const currentEditNo = computed(() => taskList.value.find((t) => t.id === form.id)?.taskNo || '')

const CONN_COLOR = {
  CONNECTED: '#67C23A',
  CONNECTING: '#409EFF',
  CONNECT_FAILED: '#F56C6C',
  CONNECT_TIMEOUT: '#E6A23C',
  DISCONNECTED: '#909399'
}
const CONN_LABEL = {
  CONNECTED: '已连接',
  CONNECTING: '连接中',
  CONNECT_FAILED: '连接失败',
  CONNECT_TIMEOUT: '连接超时',
  DISCONNECTED: '未连接'
}
const statusColor = (status) => CONN_COLOR[status] || '#909399'
const connLabel = (status) => CONN_LABEL[status] || status || '-'

const STATUS_MAP = {
  RUNNING: { label: '运行中', type: 'success' },
  STOPPED: { label: '已停止', type: 'info' },
  FINISHED: { label: '已完成', type: 'warning' }
}

const statusMeta = (status) => STATUS_MAP[status] || { label: status || '-', type: 'info' }

const isContinuous = (row) => !row.execCount || row.execCount <= 0

const deviceLabel = (deviceId) => {
  const d = stackers.value.find((item) => item.id === deviceId)
  return d ? `${d.deviceCode} - ${d.deviceName}` : '-'
}

const editingRunning = computed(() => {
  if (!form.id) return false
  const row = taskList.value.find((t) => t.id === form.id)
  return row?.status === 'RUNNING'
})

const filteredList = computed(() => {
  let list = taskList.value
  const kw = keyword.value.trim().toLowerCase()
  if (kw) list = list.filter((t) => t.taskName?.toLowerCase().includes(kw) || t.taskNo?.toLowerCase().includes(kw))
  if (queryStatus.value) list = list.filter((t) => t.status === queryStatus.value)
  return list
})

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

const formatTime = (time) => (time ? String(time).replace('T', ' ') : '-')

const loadData = async () => {
  loading.value = true
  try {
    const params = {}
    if (queryStatus.value) params.status = queryStatus.value
    taskList.value = (await listMonitorTasks(params)) || []
  } catch (e) {
    ElMessage.error(e.message || '加载任务列表失败')
  } finally {
    loading.value = false
  }
}

const loadStackers = async () => {
  try {
    stackers.value = (await listDevices({ deviceType: 'STACKER' })) || []
  } catch (e) {
    ElMessage.error(e.message || '加载堆垛机列表失败')
  }
}

const resetQuery = () => {
  keyword.value = ''
  queryStatus.value = null
  currentPage.value = 1
  loadData()
}

const openDialog = (row) => {
  Object.assign(form, defaultForm())
  if (row) {
    Object.assign(form, {
      id: row.id,
      taskName: row.taskName,
      deviceId: row.deviceId,
      continuous: isContinuous(row),
      execCount: isContinuous(row) ? 10 : row.execCount,
      intervalSeconds: row.intervalSeconds,
      remark: row.remark
    })
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = {
      taskName: form.taskName.trim(),
      deviceId: form.deviceId,
      execCount: form.continuous ? 0 : form.execCount,
      intervalSeconds: form.intervalSeconds,
      remark: form.remark
    }
    if (form.id) {
      await updateMonitorTask(form.id, payload)
      ElMessage.success('修改成功')
    } else {
      await addMonitorTask(payload)
      ElMessage.success('新建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleStart = async (row) => {
  try {
    await startMonitorTask(row.id)
    ElMessage.success(`任务「${row.taskName}」已启动`)
    loadData()
  } catch (e) {
    ElMessage.error(e.message || '启动失败')
  }
}

const handleStop = async (row) => {
  try {
    await stopMonitorTask(row.id)
    ElMessage.success(`任务「${row.taskName}」已停止`)
    loadData()
  } catch (e) {
    ElMessage.error(e.message || '停止失败')
  }
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm(
    `确定删除任务「${row.taskName}」吗？其采集数据将一并删除。`,
    '提示',
    { type: 'warning' }
  )
  try {
    await deleteMonitorTask(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

const loadDataRecords = async () => {
  if (!currentTask.value) return
  recordLoading.value = true
  try {
    const page = await pageMonitorData(currentTask.value.id, {
      current: recordPage.value,
      size: recordPageSize.value,
      dbNumber: recordDbFilter.value ?? undefined
    })
    records.value = page.records || []
    recordTotal.value = Number(page.total) || 0
  } catch (e) {
    ElMessage.error(e.message || '加载采集数据失败')
  } finally {
    recordLoading.value = false
  }
}

/** DB 块号下拉选项：取该设备最新一轮采集涉及的 DB 块 */
const buildDbOptions = async () => {
  if (!currentTask.value) return
  try {
    const all = (await pageMonitorDataLatest()) || []
    const set = new Set(
      all
        .filter((d) => d.deviceId === currentTask.value.deviceId && d.dbNumber != null)
        .map((d) => d.dbNumber)
    )
    dbOptions.value = [...set].sort((a, b) => a - b)
  } catch {
    dbOptions.value = []
  }
}

const handleDbFilterChange = () => {
  recordPage.value = 1
  loadDataRecords()
}

const handleRecordSizeChange = (size) => {
  userRecordSize.value = size
  recordPage.value = 1
  loadDataRecords()
}

const openData = (row) => {
  currentTask.value = row
  recordPage.value = 1
  recordDbFilter.value = null
  drawerVisible.value = true
  loadDataRecords()
  buildDbOptions()
  stopRecordTimer()
  recordTimer = setInterval(() => {
    if (!recordLoading.value) loadDataRecords()
  }, refreshSeconds.value * 1000)
}

const stopRecordTimer = () => {
  if (recordTimer) {
    clearInterval(recordTimer)
    recordTimer = null
  }
}

onMounted(() => {
  pageSize.value = sysConfig.pageSize || 20
  loadSysConfig().then(() => {
    pageSize.value = sysConfig.pageSize || 20
  })
  loadStackers()
  loadData()
  // 有运行中的任务时定时刷新列表以更新已执行次数与状态
  listTimer = setInterval(() => {
    if (taskList.value.some((t) => t.status === 'RUNNING') && !loading.value) {
      loadData()
    }
  }, refreshSeconds.value * 1000)
})

onUnmounted(() => {
  stopRecordTimer()
  if (listTimer) clearInterval(listTimer)
})
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

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.running-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-success);
  margin-right: 4px;
  animation: blink 1.2s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}

.drawer-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.desc {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.value-text {
  font-family: Consolas, Monaco, monospace;
  font-weight: 600;
  color: var(--el-color-primary);
}

.value-text.dict {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.v-dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

/* ---------- 新建/编辑任务弹窗 ---------- */
.dlg-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--el-color-primary-light-9), var(--el-color-primary-light-8));
  border: 1px solid var(--el-color-primary-light-7);
}

.banner-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-dark-2));
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
  min-width: 0;
}

.banner-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.3;
}

.banner-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.dlg-section {
  padding: 14px 14px 4px;
  margin-bottom: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.dlg-section.last {
  margin-bottom: 0;
}

.sec-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.sec-title .bar {
  width: 3px;
  height: 12px;
  border-radius: 2px;
  background: var(--el-color-primary);
}

.sec-title .optional {
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.dlg-section :deep(.el-form-item) {
  margin-bottom: 14px;
}

.opt-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
}

.opt-code {
  font-weight: 600;
  margin-right: 8px;
}

.opt-name {
  color: var(--el-text-color-secondary);
  margin-right: auto;
}

.opt-status {
  float: right;
  font-size: 12px;
}

.mode-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.mode-cards.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.mode-card {
  position: relative;
  padding: 12px;
  border: 1.5px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.mode-card:hover {
  border-color: var(--el-color-primary-light-5);
}

.mode-card.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.mode-icon {
  font-size: 18px;
  color: var(--el-text-color-secondary);
}

.mode-card.active .mode-icon {
  color: var(--el-color-primary);
}

.mode-name {
  margin: 6px 0 2px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.mode-desc {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.mode-check {
  position: absolute;
  top: 10px;
  right: 10px;
  color: var(--el-color-primary);
  font-size: 18px;
}

.exec-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 4px;
}

.exec-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.exec-field label {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
  width: 56px;
}

.exec-field .unit {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.exec-tip {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 8px 0 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.exec-tip .el-icon {
  color: var(--el-color-warning);
}

.dlg-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
