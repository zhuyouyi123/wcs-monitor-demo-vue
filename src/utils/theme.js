import { reactive, watch } from 'vue'

const STORAGE_KEY = 'wcs_theme'

export const DEFAULT_THEME = {
  primary: '#409EFF',
  darkMenu: true
}

export const THEME_COLORS = [
  { name: '科技蓝', value: '#409EFF' },
  { name: '翡翠绿', value: '#10B981' },
  { name: '典雅紫', value: '#8B5CF6' },
  { name: '活力橙', value: '#F59E0B' },
  { name: '玫瑰红', value: '#F43F5E' },
  { name: '青碧色', value: '#14B8A6' }
]

function loadTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved && typeof saved === 'object') {
      return { ...DEFAULT_THEME, ...saved }
    }
  } catch {
    /* 使用默认主题 */
  }
  return { ...DEFAULT_THEME }
}

export const theme = reactive(loadTheme())

const hexToRgb = (hex) => {
  const v = hex.replace('#', '')
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}

const rgbToHex = (r, g, b) =>
  `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`

const mix = (base, target, ratio) => {
  const a = hexToRgb(base)
  const b = hexToRgb(target)
  return rgbToHex(
    a[0] * (1 - ratio) + b[0] * ratio,
    a[1] * (1 - ratio) + b[1] * ratio,
    a[2] * (1 - ratio) + b[2] * ratio
  )
}

export function applyTheme() {
  const root = document.documentElement
  const p = theme.primary
  root.style.setProperty('--el-color-primary', p)
  ;[3, 5, 7, 8, 9].forEach((level) => {
    root.style.setProperty(`--el-color-primary-light-${level}`, mix(p, '#ffffff', level / 10))
  })
  root.style.setProperty('--el-color-primary-dark-2', mix(p, '#000000', 0.2))
}

watch(
  theme,
  () => {
    applyTheme()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ primary: theme.primary, darkMenu: theme.darkMenu }))
  },
  { deep: true }
)

applyTheme()
