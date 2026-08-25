<template>
  <div class="dashboard" v-loading="loading">
    <!-- 欢迎横幅 -->
    <div class="banner">
      <div class="banner-left">
        <h2>{{ greeting }}，{{ loginUser.realName || loginUser.username || '访客' }}</h2>
        <p>{{ todayText }}</p>
      </div>
      <div class="banner-right">
        <div class="banner-stat">
          <span class="num online">{{ stat.online }}</span>
          <span class="label">在线设备</span>
        </div>
        <div class="divider"></div>
        <div class="banner-stat">
          <span class="num warn">{{ stat.pendingAlarms }}</span>
          <span class="label">待处理告警</span>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="12" class="row-fixed">
      <el-col :span="6" v-for="item in statCards" :key="item.title">
        <el-card shadow="hover" class="stat-card-outer">
          <div class="stat-card">
            <div class="stat-icon" :style="{ backgroundColor: item.bg, color: item.color }">
              <el-icon :size="22"><component :is="item.icon" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ item.value }}</div>
              <div class="stat-title">{{ item.title }}</div>
            </div>
          </div>
          <div class="stat-sub">{{ item.sub }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="row-flex">
      <!-- 近7日任务趋势 -->
      <el-col :span="16" class="col-flex">
        <el-card shadow="never" class="full-height chart-card">
          <template #header>
            <div class="card-head">
              <span>近 7 日任务趋势</span>
              <span class="head-tip">共 {{ trendTotal }} 条任务</span>
            </div>
          </template>
          <div class="trend-chart">
            <div v-for="d in trendDays" :key="d.label" class="trend-col">
              <span class="trend-value">{{ d.count || '' }}</span>
              <div class="trend-bar-wrap">
                <div
                  class="trend-bar"
                  :style="{ height: barHeight(d.count) }"
                  :class="{ empty: !d.count, today: d.isToday }"
                ></div>
              </div>
              <span class="trend-label" :class="{ today: d.isToday }">{{ d.label }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 设备状态 -->
      <el-col :span="8" class="col-flex">
        <el-card shadow="never" class="full-height overview-card">
          <template #header><span>设备状态概览</span></template>
          <div class="device-overview">
            <el-progress
              type="dashboard"
              :percentage="onlineRate"
              :width="104"
              :stroke-width="9"
              :color="onlineRate >= 80 ? '#67c23a' : onlineRate >= 50 ? '#e6a23c' : '#f56c6c'"
            >
              <template #default>
                <div class="ring-text">
                  <div class="rate">{{ onlineRate }}%</div>
                  <div class="rate-label">在线率</div>
                </div>
              </template>
            </el-progress>
            <div class="status-list">
              <div v-for="s in deviceStatusList" :key="s.label" class="status-row">
                <span class="dot" :style="{ background: s.color }"></span>
                <span class="name">{{ s.label }}</span>
                <span class="count">{{ s.count }} 台</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="row-flex">
      <!-- 最新任务 -->
      <el-col :span="12" class="col-flex">
        <el-card shadow="never" class="full-height list-card">
          <template #header>
            <div class="card-head">
              <span>最新任务</span>
              <router-link to="/task"><el-link type="primary">查看全部</el-link></router-link>
            </div>
          </template>
          <div class="table-wrap">
            <el-table :data="latestTasks" size="small" empty-text="暂无任务数据">
              <el-table-column prop="taskNo" label="任务编号" width="150" />
              <el-table-column prop="taskType" label="类型" width="70" align="center" />
              <el-table-column prop="deviceCode" label="设备" width="90" />
              <el-table-column prop="status" label="状态" width="85" align="center">
                <template #default="{ row }">
                  <el-tag size="small" :type="taskStatusType(row.status)">{{ row.status || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="创建时间">
                <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-col>

      <!-- 最新告警 -->
      <el-col :span="12" class="col-flex">
        <el-card shadow="never" class="full-height list-card">
          <template #header>
            <div class="card-head">
              <span>最新告警</span>
              <span class="head-tip danger" v-if="stat.pendingAlarms">{{ stat.pendingAlarms }} 条待处理</span>
            </div>
          </template>
          <div v-if="latestAlarms.length" class="alarm-list">
            <div v-for="a in latestAlarms" :key="a.id" class="alarm-item">
              <el-tag size="small" :type="alarmLevelType(a.alarmLevel)" effect="dark">
                {{ a.alarmLevel || '提示' }}
              </el-tag>
              <div class="alarm-body">
                <div class="alarm-msg">{{ a.deviceCode }} · {{ a.alarmMsg || a.alarmType || '未知告警' }}</div>
                <div class="alarm-time">{{ formatTime(a.alarmTime) }}</div>
              </div>
              <el-tag v-if="a.handleStatus === 0" size="small" type="warning" effect="plain">待处理</el-tag>
              <el-tag v-else size="small" type="success" effect="plain">已处理</el-tag>
            </div>
          </div>
          <el-empty v-else description="暂无告警，设备运行正常" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getLoginUser } from '../utils/request'
import { loadSysConfig, sysConfig } from '../utils/sysConfig'
import { listDevices } from '../api/device'
import { listTasks } from '../api/task'
import { listAlarms } from '../api/alarm'

const loading = ref(false)
const devices = ref([])
const tasks = ref([])
const alarms = ref([])
let timer = null

const loginUser = getLoginUser()

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const todayText = computed(() =>
  new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
)

const isSameDay = (time, date) => {
  if (!time) return false
  const d = new Date(String(time).replace(' ', 'T'))
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  )
}

const today = new Date()
const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

const stat = computed(() => {
  const connected = devices.value.filter((d) => d.status === 'CONNECTED').length
  const pendingAlarms = alarms.value.filter((a) => a.handleStatus === 0).length
  const todayTasks = tasks.value.filter((t) => isSameDay(t.createTime, today))
  const doneToday = todayTasks.filter((t) => t.status === '已完成' || t.status === 'COMPLETED').length
  return {
    total: devices.value.length,
    online: connected,
    todayTasks: todayTasks.length,
    doneToday,
    pendingAlarms
  }
})

const statCards = computed(() => [
  {
    title: '设备总数',
    value: stat.value.total,
    icon: 'Cpu',
    color: '#409eff',
    bg: 'rgba(64,158,255,.12)',
    sub: `堆垛机 ${devices.value.filter((d) => d.deviceType === 'STACKER').length} 台 · 输送线 ${
      devices.value.filter((d) => d.deviceType === 'CONVEYOR').length
    } 条`
  },
  {
    title: '在线设备',
    value: stat.value.online,
    icon: 'Connection',
    color: '#67c23a',
    bg: 'rgba(103,194,58,.14)',
    sub: `离线 ${stat.value.total - stat.value.online} 台`
  },
  {
    title: '今日任务',
    value: stat.value.todayTasks,
    icon: 'Tickets',
    color: '#e6a23c',
    bg: 'rgba(230,162,60,.15)',
    sub: `已完成 ${stat.value.doneToday} 条`
  },
  {
    title: '未处理告警',
    value: stat.value.pendingAlarms,
    icon: 'WarningFilled',
    color: '#f56c6c',
    bg: 'rgba(245,108,108,.13)',
    sub: stat.value.pendingAlarms ? '请尽快处理' : '系统运行正常'
  }
])

const trendDays = computed(() => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart)
    d.setDate(d.getDate() - i)
    days.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      count: tasks.value.filter((t) => isSameDay(t.createTime, d)).length,
      isToday: i === 0
    })
  }
  return days
})

const trendTotal = computed(() => trendDays.value.reduce((s, d) => s + d.count, 0))

const barHeight = (count) => {
  const max = Math.max(...trendDays.value.map((d) => d.count), 1)
  return `${Math.max((count / max) * 100, 4)}%`
}

const onlineRate = computed(() =>
  stat.value.total ? Math.round((stat.value.online / stat.value.total) * 100) : 0
)

const STATUS_META = [
  { key: 'CONNECTED', label: '已连接', color: '#67c23a' },
  { key: 'DISCONNECTED', label: '未连接', color: '#909399' },
  { key: 'CONNECTING', label: '连接中', color: '#e6a23c' },
  { key: 'CONNECT_FAILED', label: '连接失败', color: '#f56c6c' },
  { key: 'CONNECT_TIMEOUT', label: '连接超时', color: '#f89898' }
]

const deviceStatusList = computed(() =>
  STATUS_META.map((m) => ({
    ...m,
    count: devices.value.filter((d) => d.status === m.key).length
  })).filter((s) => s.count > 0)
)

const latestTasks = computed(() =>
  [...tasks.value]
    .sort((a, b) => String(b.createTime || '').localeCompare(String(a.createTime || '')))
    .slice(0, 6)
)

const latestAlarms = computed(() =>
  [...alarms.value]
    .sort((a, b) => String(b.alarmTime || '').localeCompare(String(a.alarmTime || '')))
    .slice(0, 8)
)

const taskStatusType = (status) => {
  const map = { 执行中: 'primary', COMPLETED: 'success', 已完成: 'success', 等待中: 'warning', PENDING: 'warning', 失败: 'danger', FAILED: 'danger' }
  return map[status] || 'info'
}

const alarmLevelType = (level) => {
  const l = String(level || '')
  if (l.includes('严') || l.includes('重') || /critical|fatal/i.test(l)) return 'danger'
  if (l.includes('一') || /warn/i.test(l)) return 'warning'
  return 'info'
}

const formatTime = (time) => (time ? String(time).replace('T', ' ').slice(5, 16) : '-')

/* 演示数据：接口全部为空时使用，保证首页始终有内容展示 */
const daysAgo = (n, h = 9, m = 30) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, m, 0, 0)
  const pad = (v) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

const DEMO_DEVICES = [
  { id: 1, deviceCode: 'STK01', deviceName: '1号堆垛机', deviceType: 'STACKER', status: 'CONNECTED' },
  { id: 2, deviceCode: 'STK02', deviceName: '2号堆垛机', deviceType: 'STACKER', status: 'CONNECTED' },
  { id: 3, deviceCode: 'STK03', deviceName: '3号堆垛机', deviceType: 'STACKER', status: 'DISCONNECTED' },
  { id: 4, deviceCode: 'CV01', deviceName: '入库输送线', deviceType: 'CONVEYOR', status: 'CONNECTED' },
  { id: 5, deviceCode: 'CV02', deviceName: '出库输送线', deviceType: 'CONVEYOR', status: 'CONNECT_FAILED' }
]

const DEMO_TASKS = [
  { taskNo: 'T202608250001', taskType: '入库', deviceCode: 'STK01', status: '已完成', createTime: daysAgo(6, 8, 12) },
  { taskNo: 'T202608250002', taskType: '出库', deviceCode: 'STK02', status: '已完成', createTime: daysAgo(5, 10, 5) },
  { taskNo: 'T202608250003', taskType: '移库', deviceCode: 'STK01', status: '已完成', createTime: daysAgo(4, 14, 40) },
  { taskNo: 'T202608250004', taskType: '入库', deviceCode: 'STK03', status: '失败', createTime: daysAgo(3, 9, 18) },
  { taskNo: 'T202608250005', taskType: '出库', deviceCode: 'STK02', status: '已完成', createTime: daysAgo(2, 11, 22) },
  { taskNo: 'T202608250006', taskType: '移库', deviceCode: 'STK01', status: '执行中', createTime: daysAgo(1, 15, 8) },
  { taskNo: 'T202608250007', taskType: '入库', deviceCode: 'CV01', status: '执行中', createTime: daysAgo(0, 8, 45) },
  { taskNo: 'T202608250008', taskType: '出库', deviceCode: 'STK02', status: '等待中', createTime: daysAgo(0, 9, 2) },
  { taskNo: 'T202608250009', taskType: '出库', deviceCode: 'STK01', status: '等待中', createTime: daysAgo(0, 9, 26) }
]

const DEMO_ALARMS = [
  { id: 1, deviceCode: 'CV02', alarmLevel: '严重', alarmMsg: '电机过载停机', alarmTime: daysAgo(0, 9, 40), handleStatus: 0 },
  { id: 2, deviceCode: 'STK03', alarmLevel: '一般', alarmMsg: '通讯中断超时', alarmTime: daysAgo(0, 8, 55), handleStatus: 0 },
  { id: 3, deviceCode: 'STK01', alarmLevel: '提示', alarmMsg: '货位检测传感器信号抖动', alarmTime: daysAgo(1, 16, 20), handleStatus: 1 },
  { id: 4, deviceCode: 'CV01', alarmLevel: '一般', alarmMsg: '光电开关被遮挡超时', alarmTime: daysAgo(2, 13, 10), handleStatus: 1 }
]

let demoApplied = false

const applyDemoIfEmpty = () => {
  if (demoApplied) return
  if (!devices.value.length && !tasks.value.length && !alarms.value.length) {
    devices.value = DEMO_DEVICES
    tasks.value = DEMO_TASKS
    alarms.value = DEMO_ALARMS
    demoApplied = true
  }
}

const loadData = async () => {
  try {
    const [ds, ts, as] = await Promise.all([listDevices(), listTasks(), listAlarms()])
    devices.value = ds || []
    tasks.value = ts || []
    alarms.value = as || []
    applyDemoIfEmpty()
  } catch {
    /* 静默失败，保持已有数据 */
    applyDemoIfEmpty()
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([loadSysConfig(), loadData()])
  } finally {
    loading.value = false
  }
  const interval = Number(sysConfig.refreshInterval) || 0
  if (interval > 0) {
    timer = setInterval(loadData, interval * 1000)
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.dashboard {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

/* 横幅 */
.banner {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-radius: 8px;
  color: #fff;
  background: linear-gradient(120deg, #001529 0%, #003a6b 55%, #1668dc 100%);
}

.banner-left h2 {
  margin: 0;
  font-size: 18px;
}

.banner-left p {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.75;
}

.banner-right {
  display: flex;
  align-items: center;
  gap: 26px;
}

.banner-stat {
  text-align: center;
}

.banner-stat .num {
  display: block;
  font-size: 22px;
  font-weight: 700;
}

.banner-stat .num.online {
  color: #95d475;
}

.banner-stat .num.warn {
  color: #fab6b6;
}

.banner-stat .label {
  font-size: 12px;
  opacity: 0.75;
}

.divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.25);
}

/* 行布局：固定行 + 弹性行 */
.row-fixed {
  flex-shrink: 0;
}

.row-flex {
  flex: 1 1 0;
  min-height: 120px;
  overflow: hidden;
}

.col-flex {
  height: 100%;
}

.full-height {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.full-height :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.head-tip {
  font-size: 12px;
  color: #a8abb2;
}

.head-tip.danger {
  color: var(--el-color-danger);
}

/* 统计卡 */
.stat-card-outer :deep(.el-card__body) {
  padding-bottom: 10px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 10px;
  flex-shrink: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  line-height: 1.2;
}

.stat-title {
  font-size: 13px;
  color: #909399;
}

.stat-sub {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed #f0f2f5;
  font-size: 12px;
  color: #a8abb2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 趋势图 */
.trend-chart {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  padding-top: 6px;
}

.trend-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 44px;
}

.trend-value {
  font-size: 12px;
  color: #606266;
  min-height: 17px;
}

.trend-bar-wrap {
  display: flex;
  align-items: flex-end;
  width: 100%;
  flex: 1;
  min-height: 0;
  padding: 3px 0;
}

.trend-bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, #79bbff, #409eff);
  transition: height 0.5s ease;
  min-height: 4px;
}

.trend-bar.empty {
  background: #ebeef5;
}

.trend-bar.today {
  background: linear-gradient(180deg, #95d475, #67c23a);
}

.trend-label {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.trend-label.today {
  color: var(--el-color-primary);
  font-weight: 600;
}

/* 设备状态概览 */
.overview-card :deep(.el-card__body) {
  justify-content: space-evenly;
  gap: 8px;
}

.ring-text .rate {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.ring-text .rate-label {
  font-size: 12px;
  color: #909399;
}

.status-list {
  width: 100%;
  overflow-y: auto;
}

.status-row {
  display: flex;
  align-items: center;
  padding: 6px 4px;
  font-size: 13px;
}

.status-row + .status-row {
  border-top: 1px solid #f5f7fa;
}

.status-row .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 10px;
  flex-shrink: 0;
}

.status-row .name {
  color: #606266;
}

.status-row .count {
  margin-left: auto;
  color: #303133;
  font-weight: 600;
}

/* 表格与告警 */
.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.list-card :deep(.el-table) {
  --el-table-border-color: #f0f2f5;
}

.alarm-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.alarm-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 7px 4px;
}

.alarm-item + .alarm-item {
  border-top: 1px solid #f5f7fa;
}

.alarm-body {
  flex: 1;
  min-width: 0;
}

.alarm-msg {
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alarm-time {
  margin-top: 2px;
  font-size: 12px;
  color: #a8abb2;
}
</style>
