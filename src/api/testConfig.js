import { get, post, put, del } from '../utils/request'

export const listTestConfigs = (params) => get('/test-configs', params)

export const addTestConfig = (data) => post('/test-configs', data)

export const updateTestConfig = (data) => put('/test-configs', data)

export const deleteTestConfig = (id) => del(`/test-configs/${id}`)
