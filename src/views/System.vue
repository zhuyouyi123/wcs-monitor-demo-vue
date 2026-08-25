<template>
  <el-card shadow="never" class="config-card">
    <template #header>
      <div class="card-header">
        <div class="header-info">
          <h3>系统配置</h3>
          <p>修改后将自动保存，无需手动操作</p>
        </div>
        <div class="header-status">
          <template v-if="savingCount > 0">
            <el-icon class="rotating"><Loading /></el-icon>
            <span>保存中…</span>
          </template>
          <template v-else-if="lastSavedText">
            <el-icon class="saved"><CircleCheck /></el-icon>
            <span>已保存 {{ lastSavedText }}</span>
          </template>
        </div>
      </div>
    </template>

    <!-- 基础信息 -->
    <section class="cfg-section">
      <header class="cfg-section-head">
        <span class="cfg-icon blue"><el-icon><Setting /></el-icon></span>
        <div>
          <h4>基础信息</h4>
          <p>系统展示与列表相关的通用参数</p>
        </div>
      </header>
      <div class="cfg-grid">
        <div class="cfg-item">
          <label>系统名称</label>
          <el-input v-model="form.systemName" placeholder="请输入系统名称" maxlength="50" @input="scheduleSave('systemName')" />
        </div>
        <div class="cfg-item">
          <label>仓库编号</label>
          <el-input v-model="form.warehouseCode" placeholder="如 WH001" maxlength="30" @input="scheduleSave('warehouseCode')" />
        </div>
        <div class="cfg-item">
          <label>默认分页条数</label>
          <el-select v-model="form.pageSize" class="w220" @change="scheduleSave('pageSize')">
            <el-option v-for="n in [10, 20, 50, 100]" :key="n" :label="`${n} 条 / 页`" :value="n" />
          </el-select>
        </div>
      </div>
    </section>

    <!-- 设备通信 -->
    <section class="cfg-section">
      <header class="cfg-section-head">
        <span class="cfg-icon green"><el-icon><Connection /></el-icon></span>
        <div>
          <h4>设备通信</h4>
          <p>按需连接：通信时自动建连，空闲超时后自动断开</p>
        </div>
      </header>
      <div class="cfg-grid">
        <div class="cfg-item">
          <label>连接超时</label>
          <el-input-number v-model="form.connectTimeout" :min="1000" :max="60000" :step="500" controls-position="right" class="w180" @change="scheduleSave('connectTimeout')" />
          <p class="desc">单位毫秒，建立设备连接的最长等待时间</p>
        </div>
        <div class="cfg-item">
          <label>空闲自动断开</label>
          <el-input-number v-model="form.connIdleTimeout" :min="5" :max="3600" :step="5" controls-position="right" class="w180" @change="scheduleSave('connIdleTimeout')" />
          <p class="desc">单位秒，连接成功后超过该时长无通信将自动断开（最小 5 秒）</p>
        </div>
      </div>
    </section>

    <!-- 任务调度 -->
    <section class="cfg-section">
      <header class="cfg-section-head">
        <span class="cfg-icon orange"><el-icon><Timer /></el-icon></span>
        <div>
          <h4>任务调度</h4>
          <p>任务自动派发与执行控制</p>
        </div>
        <el-switch v-model="form.autoDispatch" active-text="自动派发" class="head-switch" @change="scheduleSave('autoDispatch')" />
      </header>
      <div class="cfg-grid" :class="{ dimmed: !form.autoDispatch }">
        <div class="cfg-item">
          <label>任务扫描间隔</label>
          <el-input-number v-model="form.dispatchInterval" :min="1" :max="60" :disabled="!form.autoDispatch" controls-position="right" class="w180" @change="scheduleSave('dispatchInterval')" />
          <p class="desc">单位秒，扫描待派发任务的频率</p>
        </div>
        <div class="cfg-item">
          <label>单设备并发任务数</label>
          <el-input-number v-model="form.maxTaskPerDevice" :min="1" :max="10" :disabled="!form.autoDispatch" controls-position="right" class="w180" @change="scheduleSave('maxTaskPerDevice')" />
          <p class="desc">同一设备同时执行的最大任务数量</p>
        </div>
      </div>
    </section>

    <!-- 主题外观 -->
    <section class="cfg-section">
      <header class="cfg-section-head">
        <span class="cfg-icon purple"><el-icon><Brush /></el-icon></span>
        <div>
          <h4>主题外观</h4>
          <p>界面主色调与侧边栏风格，保存在当前浏览器</p>
        </div>
      </header>
      <div class="cfg-grid">
        <div class="cfg-item">
          <label>主题颜色</label>
          <div class="swatch-row">
            <button
              v-for="c in THEME_COLORS"
              :key="c.value"
              type="button"
              class="swatch"
              :class="{ active: theme.primary === c.value }"
              :style="{ background: c.value }"
              :title="c.name"
              @click="theme.primary = c.value"
            >
              <el-icon v-if="theme.primary === c.value" color="#fff"><Check /></el-icon>
            </button>
          </div>
          <p class="desc">当前：{{ activeColorName }}，点击色块即时生效并自动保存</p>
        </div>
        <div class="cfg-item">
          <label>深色侧边栏</label>
          <div class="inline-control">
            <el-switch v-model="theme.darkMenu" />
            <span class="desc inline">{{ theme.darkMenu ? '深蓝背景，聚焦内容区' : '白色背景，整体明亮清爽' }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 监控与日志 -->
    <section class="cfg-section">
      <header class="cfg-section-head">
        <span class="cfg-icon red"><el-icon><Bell /></el-icon></span>
        <div>
          <h4>监控与日志</h4>
          <p>页面刷新、报警提醒与数据清理</p>
        </div>
      </header>
      <div class="cfg-grid">
        <div class="cfg-item">
          <label>页面刷新间隔</label>
          <el-select v-model="form.refreshInterval" class="w180" @change="scheduleSave('refreshInterval')">
            <el-option label="3 秒" :value="3" />
            <el-option label="5 秒" :value="5" />
            <el-option label="10 秒" :value="10" />
            <el-option label="30 秒" :value="30" />
            <el-option label="不自动刷新" :value="0" />
          </el-select>
          <p class="desc">监控类页面的数据自动刷新频率</p>
        </div>
        <div class="cfg-item">
          <label>报警声音提醒</label>
          <div class="inline-control">
            <el-switch v-model="form.alarmSound" @change="scheduleSave('alarmSound')" />
            <span class="desc inline">{{ form.alarmSound ? '产生新报警时播放提示音' : '仅页面提示，不播放声音' }}</span>
          </div>
        </div>
        <div class="cfg-item">
          <label>操作日志保留</label>
          <el-input-number v-model="form.opLogKeepDays" :min="7" :max="365" controls-position="right" class="w180" @change="scheduleSave('opLogKeepDays')" />
          <p class="desc">超期操作日志自动清理，单位天</p>
        </div>
        <div class="cfg-item">
          <label>报警日志保留</label>
          <el-input-number v-model="form.alarmLogKeepDays" :min="7" :max="365" controls-position="right" class="w180" @change="scheduleSave('alarmLogKeepDays')" />
          <p class="desc">超期报警记录自动清理，单位天</p>
        </div>
      </div>
    </section>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { saveConfig } from '../api/config'
import { loadSysConfig, sysConfig } from '../utils/sysConfig'
import { THEME_COLORS, theme } from '../utils/theme'

const DEBOUNCE_MS = 800

const savingCount = ref(0)
const lastSavedText = ref('')

const activeColorName = computed(
  () => THEME_COLORS.find((c) => c.value === theme.primary)?.name || '自定义色值'
)

const form = reactive({
  systemName: '',
  warehouseCode: '',
  pageSize: 20,
  connectTimeout: 5000,
  connIdleTimeout: 60,
  autoDispatch: true,
  dispatchInterval: 5,
  maxTaskPerDevice: 2,
  refreshInterval: 5,
  alarmSound: false,
  opLogKeepDays: 90,
  alarmLogKeepDays: 30
})

onMounted(async () => {
  await loadSysConfig()
  Object.assign(form, JSON.parse(JSON.stringify(sysConfig)))
})

const timers = new Map()

const scheduleSave = (key) => {
  clearTimeout(timers.get(key))
  timers.set(
    key,
    setTimeout(() => doSave(key), DEBOUNCE_MS)
  )
}

const doSave = async (key) => {
  timers.delete(key)
  const value = form[key]
  if (key === 'systemName' && (!value || !String(value).trim())) {
    return
  }
  savingCount.value++
  try {
    await saveConfig(key, value)
    lastSavedText.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  } catch (e) {
    ElMessage.error(e.message || `保存「${key}」失败`)
  } finally {
    savingCount.value--
  }
}
</script>

<style scoped>
.config-card {
  max-width: 1080px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-info h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.header-info p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #909399;
}

.header-status .rotating {
  color: var(--el-color-primary);
  animation: rotate 1s linear infinite;
}

.header-status .saved {
  color: var(--el-color-success);
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.cfg-section {
  padding: 20px 4px;
}

.cfg-section + .cfg-section {
  border-top: 1px solid #f0f2f5;
}

.cfg-section:first-of-type {
  padding-top: 4px;
}

.cfg-section:last-of-type {
  padding-bottom: 4px;
}

.cfg-section-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.cfg-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  font-size: 18px;
  flex-shrink: 0;
}

.cfg-icon.blue {
  color: #409eff;
  background: rgba(64, 158, 255, 0.12);
}

.cfg-icon.green {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.14);
}

.cfg-icon.orange {
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.15);
}

.cfg-icon.red {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.13);
}

.cfg-icon.purple {
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.13);
}

.swatch-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  padding: 0;
}

.swatch:hover {
  transform: scale(1.12);
}

.swatch.active {
  border-color: #fff;
  box-shadow: 0 0 0 2px var(--el-color-primary);
}

.cfg-section-head h4 {
  margin: 0;
  font-size: 14px;
  color: #303133;
}

.cfg-section-head p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #909399;
}

.head-switch {
  margin-left: auto;
}

.cfg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px 40px;
  transition: opacity 0.2s;
}

.cfg-grid.dimmed {
  opacity: 0.45;
}

.cfg-item.disabled {
  opacity: 0.55;
}

.cfg-item label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.desc {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #a8abb2;
}

.desc.inline {
  margin: 0;
}

.inline-control {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
}

.w180 {
  width: 180px;
}

.w220 {
  width: 220px;
}
</style>
