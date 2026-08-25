<template>
  <div class="dash-page">
    <div class="page-title">
      <span class="bar"></span>
      <h2>堆垛机实时监控</h2>
      <span class="sub">共 {{ stackers.length }} 台设备 · 点击卡片配置连接</span>
    </div>

    <div class="grid">
      <div v-for="s in stackers" :key="s.code" class="card" :class="{ down: isDown(s) || s.status === '未连接' }" @click="openDialog(s)">
        <div class="head">
          <div class="head-left">
            <div class="icon-box" :style="{ backgroundColor: tone(s).bg, color: tone(s).color }">
              <el-icon :size="20"><Cpu /></el-icon>
            </div>
            <div>
              <div class="name">{{ s.name }}</div>
              <div class="code">{{ s.code }}</div>
            </div>
          </div>
          <span class="status-pill" :style="{ color: tone(s).color, backgroundColor: tone(s).bg }">
            <i class="dot" :class="{ blink: s.status === '已连接' || s.status === '连接中' }" :style="{ backgroundColor: tone(s).color }"></i>
            {{ s.status }}
          </span>
        </div>

        <div class="scene" :class="{ offline: isDown(s) || s.status === '未连接' }">
          <div class="level-lines">
            <span v-for="lv in LEVELS" :key="lv">L{{ lv }}</span>
          </div>
          <div class="track"></div>
          <div class="mast" :style="{ left: colPercent(s.col) }">
            <div class="carriage" :style="{ bottom: levelPercent(s.level) }">
              <div v-if="s.status === '已连接'" class="pallet"></div>
            </div>
          </div>
          <div v-if="s.status === '未连接'" class="scene-tip">未连接 · 点击配置 IP</div>
        </div>

        <div class="pos-row">
          <div class="pos-item">
            <div class="pos-value">{{ pad(s.row) }}</div>
            <div class="pos-label">排</div>
          </div>
          <div class="pos-item">
            <div class="pos-value">{{ pad(s.col) }}</div>
            <div class="pos-label">列</div>
          </div>
          <div class="pos-item">
            <div class="pos-value">{{ pad(s.level) }}</div>
            <div class="pos-label">层</div>
          </div>
        </div>

        <div class="foot" @click.stop>
          <template v-if="s.status === '已连接'">
            <span class="chip">{{ s.ip }}:{{ s.port }}</span>
            <span class="chip time">{{ s.lastHeartbeat }}</span>
            <el-button link type="danger" size="small" @click="handleDisconnect(s)">断开连接</el-button>
          </template>
          <template v-else-if="s.ip">
            <span class="chip">{{ s.ip }}:{{ s.port }}</span>
            <span class="chip unlinked">未连接</span>
          </template>
          <span v-else class="chip unlinked">尚未配置连接</span>
        </div>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="current ? `${current.name} - 连接配置` : ''" width="440px" destroy-on-close>
      <el-form label-width="80px" @submit.prevent>
        <el-form-item label="设备编号">
          <el-input :model-value="current?.code" disabled />
        </el-form-item>
        <el-form-item label="IP 地址">
          <el-input v-model="form.ip" placeholder="例如 192.168.1.101" :disabled="isCurrentConnected" clearable />
        </el-form-item>
        <el-form-item label="端口">
          <el-input-number v-model="form.port" :min="1" :max="65535" :disabled="isCurrentConnected" controls-position="right" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <template v-if="isCurrentConnected">
          <el-button type="danger" plain @click="handleDisconnect(current)">断开连接</el-button>
          <el-button @click="dialogVisible = false">关闭</el-button>
        </template>
        <template v-else>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="connecting" @click="handleConnect">连 接</el-button>
        </template>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { stackers, connect, disconnect, isValidIp, restoreConnections } from '../store/stackers'

const TOTAL_COLS = 24
const LEVELS = 4

const dialogVisible = ref(false)
const connecting = ref(false)
const currentCode = ref('')
const form = reactive({ ip: '', port: 102 })

const current = computed(() => stackers.value.find((s) => s.code === currentCode.value))
const isCurrentConnected = computed(() => current.value?.status === '已连接')

const pad = (n) => String(n).padStart(2, '0')
const colPercent = (col) => ((col / (TOTAL_COLS + 1)) * 100).toFixed(2) + '%'
const levelPercent = (level) => (((level - 0.45) / LEVELS) * 100).toFixed(2) + '%'
const isDown = (s) => s.status === '故障'
const tone = (s) => ({
  已连接: { color: '#67c23a', bg: 'rgba(103, 194, 58, 0.12)' },
  连接中: { color: '#e6a23c', bg: 'rgba(230, 162, 60, 0.12)' },
  未连接: { color: '#909399', bg: 'rgba(144, 147, 153, 0.12)' },
  故障: { color: '#f56c6c', bg: 'rgba(245, 108, 108, 0.12)' }
}[s.status] || { color: '#909399', bg: 'rgba(144, 147, 153, 0.12)' })

const formatNow = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const openDialog = (s) => {
  if (s.status === '连接中') return
  currentCode.value = s.code
  form.ip = s.ip
  form.port = s.port
  dialogVisible.value = true
}

const handleConnect = async () => {
  if (!isValidIp(form.ip)) {
    ElMessage.warning('请输入正确的 IP 地址')
    return
  }
  connecting.value = true
  try {
    await connect(currentCode.value, form.ip.trim(), form.port)
    ElMessage.success('连接成功')
    dialogVisible.value = false
  } catch (e) {
    ElMessage.error(e.message || '连接失败')
  } finally {
    connecting.value = false
  }
}

const handleDisconnect = (s) => {
  disconnect(s.code)
  ElMessage.success(`${s.name} 已断开连接`)
  dialogVisible.value = false
}

let timer = null
onMounted(() => {
  restoreConnections()
  timer = setInterval(() => {
    stackers.value.forEach((s) => {
      if (s.status !== '已连接') return
      const cols = [-3, -2, -1, 1, 2, 3]
      const levels = [-1, 1]
      s.col = Math.min(TOTAL_COLS, Math.max(1, s.col + cols[Math.floor(Math.random() * cols.length)]))
      if (Math.random() < 0.4) s.level = Math.min(LEVELS, Math.max(1, s.level + levels[Math.floor(Math.random() * levels.length)]))
      if (Math.random() < 0.15) s.row = Math.random() < 0.5 ? 1 : 2
      if (Math.random() < 0.2) s.carrying = !s.carrying
      if (Math.random() < 0.1) s.taskNo = Math.random() < 0.5 ? 'T2026' + String(Math.floor(Math.random() * 900000) + 100000) : ''
      s.lastHeartbeat = formatNow()
    })
  }, 2000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
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
  background: #409eff;
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

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 1100px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: 0 2px 8px rgba(31, 45, 61, 0.04);
  transition: transform 0.25s, box-shadow 0.25s;
  cursor: pointer;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(31, 45, 61, 0.1);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 10px;
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

.scene {
  position: relative;
  height: 118px;
  margin-top: 14px;
  background: #f7f9fc;
  border: 1px solid #eef1f6;
  border-radius: 8px;
  overflow: hidden;
}

.level-lines {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

.level-lines span {
  flex: 1;
  border-bottom: 1px dashed #e8edf3;
  font-size: 9px;
  line-height: 1;
  padding: 2px 5px;
  color: #b9c2cf;
  text-align: right;
}

.level-lines span:last-child {
  border-bottom: none;
}

.track {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 6px;
  height: 4px;
  border-radius: 2px;
  background: repeating-linear-gradient(90deg, #d4dce6 0 8px, #e6ecf3 8px 16px);
}

.mast {
  position: absolute;
  top: 8px;
  bottom: 10px;
  width: 10px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, #55688c, #344563);
  border-radius: 3px;
  transition: left 1.6s ease-in-out;
}

.carriage {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 42px;
  height: 16px;
  border-radius: 3px;
  background: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.45);
  transition: bottom 1.6s ease-in-out;
}

.pallet {
  position: absolute;
  left: 50%;
  top: -12px;
  transform: translateX(-50%);
  width: 26px;
  height: 10px;
  border-radius: 2px;
  background: #ffb02e;
}

.scene.offline .mast,
.scene.offline .carriage {
  filter: grayscale(1);
  opacity: 0.35;
  box-shadow: none;
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

.pos-row {
  display: flex;
  justify-content: space-around;
  padding: 14px 0 12px;
}

.pos-item {
  text-align: center;
  min-width: 84px;
  padding: 8px 0;
  background: #f7f9fc;
  border-radius: 8px;
}

.pos-value {
  font-size: 26px;
  font-weight: 700;
  color: #303133;
  font-family: Consolas, monospace;
}

.pos-label {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}

.down .pos-value {
  color: #b9c2cf;
}

.foot {
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid #f0f2f5;
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

.chip.time {
  margin-left: auto;
}

.chip.unlinked {
  color: #b9c2cf;
}
</style>
