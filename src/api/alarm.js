import { get } from '../utils/request'

export const listAlarms = () => get('/alarms')
