import { get, post, put, del } from '../utils/request'

export const NODE_TYPES = ['入库口', '出库口', '直通段', '转弯段', '合流点', '分流点', '检测点']

export const listNodes = (params) => get('/conveyor-nodes', params)

export const addNode = (data) => post('/conveyor-nodes', data)

export const updateNode = (data) => put('/conveyor-nodes', data)

export const deleteNode = (id) => del(`/conveyor-nodes/${id}`)
