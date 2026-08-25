import { ref } from 'vue'

const STORAGE_KEY = 'wcs-stacker-connections'

const IP_RE = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/

const base = [
  { code: 'DEV-001', name: '1号堆垛机', row: 1, col: 5, level: 2, carrying: true, mode: '联机', taskNo: '' },
  { code: 'DEV-002', name: '2号堆垛机', row: 1, col: 12, level: 1, carrying: false, mode: '联机', taskNo: '' },
  { code: 'DEV-005', name: '3号堆垛机', row: 2, col: 18, level: 3, carrying: true, mode: '联机', taskNo: '' },
  { code: 'DEV-006', name: '4号堆垛机', row: 2, col: 8, level: 2, carrying: false, mode: '单机', taskNo: '' }
]

const loadSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

const saved = loadSaved()

export const stackers = ref(
  base.map((s) => ({
    ...s,
    ip: saved[s.code]?.ip || '',
    port: saved[s.code]?.port || 502,
    status: '未连接',
    lastHeartbeat: '--'
  }))
)

const findStacker = (code) => stackers.value.find((s) => s.code === code)

const persist = () => {
  const data = {}
  stackers.value.forEach((s) => {
    if (s.ip) data[s.code] = { ip: s.ip, port: s.port }
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const isValidIp = (ip) => IP_RE.test(ip)

export const connect = (code, ip, port) => {
  const s = findStacker(code)
  if (!s) return Promise.reject(new Error('设备不存在'))
  if (!isValidIp(ip)) return Promise.reject(new Error('IP 地址格式不正确'))
  if (s.status === '已连接') return Promise.resolve()
  return new Promise((resolve, reject) => {
    s.status = '连接中'
    setTimeout(() => {
      s.ip = ip
      s.port = port
      s.status = '已连接'
      persist()
      resolve()
    }, 900)
  })
}

export const disconnect = (code) => {
  const s = findStacker(code)
  if (!s) return
  s.status = '未连接'
  s.taskNo = ''
  s.lastHeartbeat = '--'
  persist()
}

export const restoreConnections = () => {
  stackers.value.forEach((s) => {
    if (s.ip && s.status === '未连接') {
      s.status = '连接中'
      setTimeout(() => {
        s.status = '已连接'
      }, 700)
    }
  })
}
