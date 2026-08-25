import { get, put } from '../utils/request'

export const getConfigs = () => get('/configs')

export const saveConfig = (key, value) => put(`/configs/${key}`, { value: String(value) })
