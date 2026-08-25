import { get } from '../utils/request'

export const listTasks = () => get('/tasks')
