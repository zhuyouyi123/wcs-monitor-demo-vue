import { get, post, put, del } from '../utils/request'

export const DEVICE_TYPES = [
  { code: 'STACKER', label: '堆垛机' },
  { code: 'CONVEYOR', label: '输送线' }
]

export const deviceTypeLabel = (code) =>
  DEVICE_TYPES.find((t) => t.code === code)?.label || code || '-'

export const listDevices = (params) => get('/devices', params)

export const pageDevices = (params) => get('/devices/page', params)

export const getDevice = (id) => get(`/devices/${id}`)

export const addDevice = (data) => post('/devices', data)

export const updateDevice = (data) => put('/devices', data)

export const deleteDevice = (id) => del(`/devices/${id}`)

export const connectDevice = (id) => post(`/devices/${id}/connect`)

export const disconnectDevice = (id) => post(`/devices/${id}/disconnect`)

export const S7_DATA_TYPES = [
  { code: 'BYTE', label: '字节 BYTE' },
  { code: 'INT', label: '整数 INT' },
  { code: 'DINT', label: '双整数 DINT' },
  { code: 'REAL', label: '实数 REAL' }
]

export const s7Read = (id, params) => get(`/devices/${id}/s7/read`, params)

export const getDeviceBindings = (id) => get(`/devices/${id}/bindings`)

export const updateDeviceBindings = (id, configIds) => put(`/devices/${id}/bindings`, configIds)
