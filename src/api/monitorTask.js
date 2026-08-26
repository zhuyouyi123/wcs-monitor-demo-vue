import { get, post, put, del } from '../utils/request'

export const listMonitorTasks = (params) => get('/monitor-tasks', params)

export const addMonitorTask = (data) => post('/monitor-tasks', data)

export const updateMonitorTask = (id, data) => put(`/monitor-tasks/${id}`, data)

export const deleteMonitorTask = (id) => del(`/monitor-tasks/${id}`)

export const startMonitorTask = (id) => post(`/monitor-tasks/${id}/start`)

export const stopMonitorTask = (id) => post(`/monitor-tasks/${id}/stop`)

export const pageMonitorData = (id, params) => get(`/monitor-tasks/${id}/data`, params)

export const pageMonitorDataLatest = () => get('/monitor-tasks/data/latest')
