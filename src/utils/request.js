import router from '../router'

const BASE_URL = '/api'

export const getToken = () => localStorage.getItem('wcs_token') || ''
export const getLoginUser = () => {
  try {
    return JSON.parse(localStorage.getItem('wcs_user')) || {}
  } catch {
    return {}
  }
}

function handleUnauthorized() {
  localStorage.removeItem('wcs_token')
  localStorage.removeItem('wcs_user')
  if (router.currentRoute.value.path !== '/login') {
    router.push('/login')
  }
}

async function http(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(BASE_URL + url, { ...options, headers })
  let body = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  if (res.status === 401) {
    handleUnauthorized()
    throw new Error(body?.msg || '登录已过期，请重新登录')
  }
  if (!res.ok) {
    throw new Error(body?.msg || `HTTP ${res.status}`)
  }
  if (!body || body.code !== 200) {
    throw new Error(body?.msg || '请求失败')
  }
  return body.data
}

export const get = (url, params) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return http(url + qs)
}

export const post = (url, data) => http(url, { method: 'POST', body: JSON.stringify(data) })

export const put = (url, data) => http(url, { method: 'PUT', body: JSON.stringify(data) })

export const del = (url) => http(url, { method: 'DELETE' })
