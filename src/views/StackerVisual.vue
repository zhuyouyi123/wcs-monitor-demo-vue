<template>
  <div class="dash-page">
    <div class="page-title">
      <span class="bar"></span>
      <h2>堆垛机实时监控</h2>
      <span class="sub">共 {{ stackers.length }} 台设备 · 每 {{ refreshSeconds }} 秒刷新</span>
      <div class="title-right">
        <el-select
          v-model="filterDeviceId"
          placeholder="全部堆垛机"
          clearable
          filterable
          class="filter-sel"
        >
          <el-option
            v-for="s in stackers"
            :key="s.id"
            :label="`${s.deviceName}（${s.deviceCode}）`"
            :value="s.id"
          />
        </el-select>
      </div>
    </div>

    <el-empty v-if="!loading && !stackers.length" description="暂无堆垛机，请先在「设备监控 → 堆垛机管理」中添加" />
    <el-empty v-else-if="!loading && stackers.length && !visibleStackers.length" description="当前筛选条件下暂无设备" />

    <div class="stack">
      <div v-for="s in visibleStackers" :key="s.id" class="card" :class="{ down: isDown(s) }">
        <!-- 头部：设备标识 + 关键运行信息 + 连接状态 -->
        <div class="head">
          <div class="head-left">
            <div class="icon-box" :style="{ backgroundColor: tone(s).bg, color: tone(s).color }">
              <el-icon :size="20"><Cpu /></el-icon>
            </div>
            <div>
              <div class="name">{{ s.deviceName }}</div>
              <div class="code">{{ s.deviceCode }}</div>
            </div>
          </div>

          <div class="head-mid" v-if="hasCoreInfo(s)">
            <div class="kv">
              <label>模式</label>
              <span
                class="badge"
                :class="semanticClass(textByKeyword(s, '模式'))"
                :style="dictStyle(itemByKeyword(s, '模式'), textByKeyword(s, '模式'))"
              >
                {{ textByKeyword(s, '模式') || '--' }}
              </span>
            </div>
            <div class="kv">
              <label>状态</label>
              <span
                class="badge"
                :class="[semanticClass(textByKeyword(s, '状态')), { pulse: isRunningText(textByKeyword(s, '状态')) }]"
                :style="dictStyle(itemByKeyword(s, '状态'), textByKeyword(s, '状态'))"
              >
                {{ textByKeyword(s, '状态') || '--' }}
              </span>
            </div>
            <div class="kv wide">
              <label>任务号</label>
              <span class="badge mono" :class="taskNoOf(s) ? 'b-warning' : 'b-info'">
                <i v-if="taskNoOf(s)" class="dot" style="background:#e6a23c"></i>
                {{ taskNoOf(s) || '无任务' }}
              </span>
            </div>
          </div>

          <div class="head-right">
            <span class="status-pill" :style="{ color: tone(s).color, backgroundColor: tone(s).bg }">
              <i class="dot" :class="{ blink: s.status === 'CONNECTED' || s.status === 'CONNECTING' }" :style="{ backgroundColor: tone(s).color }"></i>
              {{ statusLabel(s.status) }}
            </span>
          </div>
        </div>

        <!-- 主体：左侧位置信息 + 右侧货架平面图 -->
        <div class="body">
          <div class="side">
            <div class="pos-item p-r">
              <div class="pos-value">{{ fmtNum(numByKeyword(s, '排')) }}</div>
              <div class="pos-label">排 Row</div>
            </div>
            <div class="pos-item p-c">
              <div class="pos-value">{{ fmtNum(numByKeyword(s, '列')) }}</div>
              <div class="pos-label">列 Col</div>
            </div>
            <div class="pos-item p-l">
              <div class="pos-value">{{ fmtNum(numByKeyword(s, '层')) }}</div>
              <div class="pos-label">层 Level</div>
            </div>
          </div>

          <div class="rack2d" :class="{ offline: !isConnected(s), live: isConnected(s) }">
            <span class="live-tag" v-if="isConnected(s)">● LIVE</span>
            <div class="rk-row" v-for="lv in levelList(s)" :key="'L' + lv">
              <span class="rk-lv">{{ lv }}</span>
              <div
                v-for="cl in colList(s)"
                :key="lv + '-' + cl"
                class="rk-cell"
                :class="{ active: cl === curCol(s) && lv === curLevel(s), head: cl === curCol(s) && curLevel(s) == null }"
              ></div>
            </div>
            <div class="rk-cols">
              <span class="rk-lv"></span>
              <span v-for="cl in colList(s)" :key="'C' + cl" class="rk-col-no">{{ cl }}</span>
            </div>
            <div v-if="!dataOf(s.id).length" class="scene-tip">暂无采集数据 · 运行监控任务后自动更新</div>
          </div>
        </div>

        <!-- 其它未归类的采集项 -->
        <div v-if="extraItems(s).length" class="collect-row">
          <span
            v-for="d in extraItems(s)"
            :key="d.id"
            class="chip data"
            :title="`${d.configName} · ${fmtTime(d.collectTime)}${d.dictLabel ? '（原始值 ' + d.rawValue + '）' : ''}`"
          >
            {{ shortName(d.configName) }}：<b :style="dictStyle(d, d.dictLabel || d.rawValue)">{{ d.dictLabel || d.rawValue }}</b>
          </span>
        </div>

        <!-- 底部：连接与采集元信息 -->
        <div class="foot">
          <template v-if="s.ipAddress">
            <span class="chip">{{ s.ipAddress }}:{{ s.port || 102 }}</span>
            <span class="chip">货架 {{ dimsOf(s).lv }} 层 × {{ dimsOf(s).cl }} 列</span>
            <span v-if="latestTime(s.id)" class="chip time">采集于 {{ latestTime(s.id) }}</span>
          </template>
          <template v-else>
            <span class="chip unlinked">尚未配置连接（请在堆垛机管理中设置）</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { listDevices } from '../api/device'
import { pageMonitorDataLatest } from '../api/monitorTask'
import { listDictItems } from '../api/dict'
import { loadSysConfig, sysConfig } from '../utils/sysConfig'

const DEFAULT_LEVELS = 4
const DEFAULT_COLS = 24

const loading = ref(false)
const stackers = ref([])
const monitorData = ref([])
const filterDeviceId = ref(null)

let timer = null

const refreshSeconds = computed(() => sysConfig.refreshInterval || 5)

/** 顶部筛选：仅显示选中的堆垛机 */
const visibleStackers = computed(() =>
  filterDeviceId.value == null
    ? stackers.value
    : stackers.value.filter((s) => s.id === filterDeviceId.value)
)

const STATUS_MAP = {
  CONNECTED: { label: '已连接', color: '#67c23a', bg: 'rgba(103, 194, 58, 0.12)' },
  CONNECTING: { label: '连接中', color: '#e6a23c', bg: 'rgba(230, 162, 60, 0.12)' },
  DISCONNECTED: { label: '未连接', color: '#909399', bg: 'rgba(144, 147, 153, 0.12)' },
  CONNECT_FAILED: { label: '连接失败', color: '#f56c6c', bg: 'rgba(245, 108, 108, 0.12)' },
  CONNECT_TIMEOUT: { label: '连接超时', color: '#f56c6c', bg: 'rgba(245, 108, 108, 0.12)' }
}

const statusLabel = (status) => STATUS_MAP[status]?.label || status || '未连接'
const tone = (s) => STATUS_MAP[s.status] || STATUS_MAP.DISCONNECTED
const isConnected = (s) => s.status === 'CONNECTED'
const isDown = (s) => s.status === 'CONNECT_FAILED' || s.status === 'CONNECT_TIMEOUT'

// ---------- 监控任务采集数据（monitor_task_data） ----------
const dataOf = (deviceId) => monitorData.value.filter((d) => d.deviceId === deviceId)

/** 按配置名称关键字取采集项原始记录 */
const itemByKeyword = (s, keyword) =>
  dataOf(s.id).find((d) => d.configName?.includes(keyword)) || null

/** 按配置名称关键字取数值型采集项（排/列/层） */
const numByKeyword = (s, keyword) => {
  const item = itemByKeyword(s, keyword)
  if (!item) return null
  const n = parseInt(String(item.dictLabel ?? item.rawValue ?? '').split(',')[0], 10)
  return Number.isFinite(n) ? n : null
}

/** 按配置名称关键字取展示值（模式/状态/任务号等，优先字典含义） */
const textByKeyword = (s, keyword) => {
  const item = itemByKeyword(s, keyword)
  if (!item) return ''
  return String(item.dictLabel ?? item.rawValue ?? '').split(',')[0] || ''
}

/** 字典项配置了颜色时，用该颜色渲染徽章（覆盖语义色）；采集数据未带色时按含义实时匹配字典 */
const hexToRgba = (hex, alpha) => {
  const m = /^#?([0-9A-Fa-f]{6})$/.exec(hex || '')
  if (!m) return null
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const dictItems = ref([])

// 含义 -> 颜色（字典实时数据，改了字典无需等下一轮采集）
const dictColorByText = computed(() => {
  const m = new Map()
  for (const it of dictItems.value) {
    if (it.dictColor && !m.has(it.dictLabel)) m.set(it.dictLabel, it.dictColor)
  }
  return m
})

const loadDictItems = async () => {
  try {
    dictItems.value = (await listDictItems()) || []
  } catch {
    /* 字典加载失败时回退到语义配色 */
  }
}

const dictStyle = (item, text) => {
  const c = item?.dictColor || dictColorByText.value.get(text || '')
  if (!c) return null
  const bg = hexToRgba(c, 0.14)
  return bg ? { color: c, backgroundColor: bg } : { color: c }
}

// 已在头部与位置栏固定展示的项不再重复出现在补充标签中
const FIXED_KEYWORDS = ['排', '列', '层', '模式', '状态', '任务号']
const extraItems = (s) =>
  dataOf(s.id).filter((d) => !FIXED_KEYWORDS.some((k) => d.configName?.includes(k)))

const taskNoOf = (s) => {
  const t = textByKeyword(s, '任务号')
  return t && t !== '--' ? t : ''
}

const hasCoreInfo = (s) =>
  !!(textByKeyword(s, '模式') || textByKeyword(s, '状态') || taskNoOf(s))

const isRunningText = (t) => (t || '').includes('运行')

/** 按含义关键字给出语义配色：运行绿 / 故障红 / 手动橙 / 空闲蓝 / 其它灰 */
const semanticClass = (t) => {
  const x = t || ''
  if (x.includes('故障') || x.includes('错误') || x.includes('异常')) return 'b-danger'
  if (x.includes('手动') || x.includes('检修') || x.includes('维护')) return 'b-warning'
  if (x.includes('空闲') || x.includes('待机')) return 'b-primary'
  if (x.includes('运行') || x.includes('自动')) return 'b-success'
  return x ? 'b-info' : 'b-info empty'
}

// ---------- 货架尺寸（来自设备参数 rackLevels / rackCols） ----------
const clampInt = (v, min, max, dft) => {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dft
}

const dimsOf = (s) => ({
  lv: clampInt(s.rackLevels, 1, 30, DEFAULT_LEVELS),
  cl: clampInt(s.rackCols, 1, 64, DEFAULT_COLS)
})

/** 层序号自上而下：最高层在最上 */
const levelList = (s) => {
  const { lv } = dimsOf(s)
  return Array.from({ length: lv }, (_, i) => lv - i)
}

const colList = (s) => {
  const { cl } = dimsOf(s)
  return Array.from({ length: cl }, (_, i) => i + 1)
}

const curCol = (s) => numByKeyword(s, '列')
const curLevel = (s) => numByKeyword(s, '层')

const latestTime = (deviceId) => {
  const items = dataOf(deviceId)
  if (!items.length) return ''
  return fmtTime(items[items.length - 1].collectTime)
}

const shortName = (name) => (name || '').replace(/^堆垛机/, '')

const fmtTime = (time) => (time ? String(time).replace('T', ' ') : '-')

const fmtNum = (n) => (n == null ? '--' : String(n).padStart(2, '0'))

// ---------- 数据加载 ----------
const loadData = async () => {
  loading.value = true
  try {
    stackers.value = (await listDevices({ deviceType: 'STACKER' })) || []
  } catch (e) {
    ElMessage.error(e.message || '加载堆垛机列表失败')
  } finally {
    loading.value = false
  }
  try {
    monitorData.value = (await pageMonitorDataLatest()) || []
  } catch {
    monitorData.value = []
  }
  loadDictItems()
}

onMounted(() => {
  loadSysConfig()
  loadDictItems()
  loadData()
  timer = setInterval(loadData, refreshSeconds.value * 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
/* 布局容器 overflow:hidden，本页内容超高时在页面内部滚动 */
.dash-page {
  height: 100%;
  overflow-y: auto;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.page-title .bar {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: var(--el-color-primary);
}

.page-title h2 {
  font-size: 17px;
  font-weight: 600;
}

.page-title .sub {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}

.title-right {
  margin-left: auto;
}

.filter-sel {
  width: 240px;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 14px 18px;
  box-shadow: 0 2px 8px rgba(31, 45, 61, 0.04);
  transition: box-shadow 0.25s;
}

.card:hover {
  box-shadow: 0 8px 24px rgba(31, 45, 61, 0.1);
}

/* ---------- 头部 ---------- */
.head {
  display: flex;
  align-items: center;
  gap: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f2f5;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 200px;
}

.icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
}

.name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.code {
  margin-top: 2px;
  font-size: 11px;
  color: #909399;
  font-family: Consolas, monospace;
}

.head-mid {
  display: flex;
  align-items: center;
  gap: 22px;
  flex: 1;
  justify-content: center;
}

.kv label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: #909399;
}

.head-right {
  margin-left: auto;
  min-width: 96px;
  text-align: right;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 999px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.dot.blink {
  animation: breathe 2s ease-in-out infinite;
}

@keyframes breathe {
  50% {
    opacity: 0.3;
  }
}

/* ---------- 主体：左侧位置 + 右侧货架图 ---------- */
.body {
  display: flex;
  gap: 14px;
  padding-top: 12px;
}

.side {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 128px;
}

.pos-item {
  position: relative;
  overflow: hidden;
  text-align: center;
  flex: 1;
  padding: 8px 0 6px;
  background: #f7f9fc;
  border-radius: 8px;
}

.pos-item::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
}

.pos-item.p-r::before {
  background: #e6a23c;
}

.pos-item.p-c::before {
  background: var(--el-color-primary);
}

.pos-item.p-l::before {
  background: #67c23a;
}

.pos-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.15;
  color: #303133;
  font-family: Consolas, monospace;
}

.p-r .pos-value {
  color: #e6a23c;
}

.p-c .pos-value {
  color: var(--el-color-primary);
}

.p-l .pos-value {
  color: #67c23a;
}

.pos-label {
  margin-top: 1px;
  font-size: 11px;
  color: #909399;
}

.down .pos-value {
  color: #b9c2cf;
}

.down .pos-item::before {
  background: #dcdfe6;
}

.rack2d {
  position: relative;
  flex: 1;
  min-width: 0;
  padding: 12px 14px 8px;
  background: #f7f9fc;
  border: 1px solid #eef1f6;
  border-radius: 8px;
}

.rk-row {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-bottom: 3px;
}

.rk-lv {
  flex: none;
  width: 20px;
  padding-right: 6px;
  font-size: 10px;
  line-height: 1;
  text-align: right;
  color: #b9c2cf;
  font-family: Consolas, monospace;
}

.rk-cell {
  flex: 1;
  min-width: 0;
  height: 14px;
  border-radius: 2px;
  background: #e8edf4;
  box-shadow: inset 0 -1px 0 rgba(31, 45, 61, 0.06);
}

.rk-cell.head {
  background: #dce7f7;
}

.rk-cell.active {
  background: var(--el-color-primary);
  box-shadow: 0 0 8px rgba(64, 158, 255, 0.75);
  animation: cellPulse 1.6s ease-in-out infinite;
}

@keyframes cellPulse {
  50% {
    box-shadow: 0 0 3px rgba(64, 158, 255, 0.35);
  }
}

.rk-cols {
  display: flex;
  gap: 3px;
  margin-top: 2px;
}

.rk-cols .rk-lv {
  visibility: hidden;
}

.rk-col-no {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: 9px;
  line-height: 1.3;
  color: #b9c2cf;
  font-family: Consolas, monospace;
  overflow: hidden;
}

.rack2d.offline .rk-cell {
  filter: grayscale(1);
  opacity: 0.5;
}

.rack2d.live {
  border-color: rgba(103, 194, 58, 0.35);
  background: linear-gradient(180deg, #f6fbf6, #f7f9fc);
}

.live-tag {
  position: absolute;
  top: 6px;
  right: 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #67c23a;
  font-family: Consolas, monospace;
  animation: breathe 2s ease-in-out infinite;
}

.scene-tip {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #98a3b8;
  background: rgba(247, 249, 252, 0.72);
}

/* ---------- 徽章 ---------- */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.badge.mono {
  font-family: Consolas, monospace;
}

.b-success {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.14);
}

.b-danger {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.14);
}

.b-warning {
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.15);
}

.b-primary {
  color: var(--el-color-primary);
  background: rgba(64, 158, 255, 0.12);
}

.b-info {
  color: #909399;
  background: rgba(144, 147, 153, 0.12);
}

.b-info.empty {
  font-weight: 400;
  color: #b9c2cf;
}

.badge.pulse::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: breathe 1.2s ease-in-out infinite;
}

/* ---------- 补充采集项与底部 ---------- */
.collect-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 12px;
}

.chip {
  font-size: 11px;
  color: #606266;
  padding: 3px 10px;
  border-radius: 999px;
  background: #f4f6f9;
  white-space: nowrap;
  font-family: Consolas, monospace;
}

.chip.data b {
  color: var(--el-color-primary);
}

.chip.time {
  margin-left: auto;
}

.chip.unlinked {
  color: #b9c2cf;
}

.foot {
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid #f0f2f5;
  margin-top: 12px;
  padding-top: 10px;
}
</style>
