import { get, post, put, del } from '../utils/request'

export const listUsers = () => get('/users')

export const addUser = (data) => post('/users', data)

export const updateUser = (id, data) => put(`/users/${id}`, data)

export const updateUserStatus = (id, status) => put(`/users/${id}/status?status=${status}`)

export const deleteUser = (id) => del(`/users/${id}`)

export const ROLE_LABELS = { admin: '管理员', user: '普通用户' }
