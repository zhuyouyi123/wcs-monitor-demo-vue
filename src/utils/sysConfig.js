import { reactive } from 'vue'
import { getConfigs } from '../api/config'

export const DEFAULT_SYS_CONFIG = {
  systemName: 'WCS 仓库控制系统',
  warehouseCode: 'WH001',
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
}

export const sysConfig = reactive({ ...DEFAULT_SYS_CONFIG })

let loadPromise = null

const coerce = (key, raw) => {
  const type = typeof DEFAULT_SYS_CONFIG[key]
  if (type === 'number') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : DEFAULT_SYS_CONFIG[key]
  }
  if (type === 'boolean') {
    return raw === 'true' || raw === true
  }
  return raw
}

export function loadSysConfig() {
  if (!loadPromise) {
    loadPromise = getConfigs()
      .then((data) => {
        Object.keys(data || {}).forEach((k) => {
          if (k in DEFAULT_SYS_CONFIG && data[k] !== null && data[k] !== undefined && data[k] !== '') {
            sysConfig[k] = coerce(k, data[k])
          }
        })
        if (sysConfig.systemName && document.title.includes('-')) {
          updateDocumentTitle('')
        }
      })
      .catch(() => {
        /* 后端不可用时使用默认配置 */
      })
  }
  return loadPromise
}

export function updateDocumentTitle(pageTitle) {
  const base = sysConfig.systemName || DEFAULT_SYS_CONFIG.systemName
  document.title = pageTitle ? `${pageTitle} - ${base}` : base
}
