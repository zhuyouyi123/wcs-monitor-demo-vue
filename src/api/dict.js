import { get, post, put, del } from '../utils/request'

export const listDictItems = (params) => get('/dict-items', params)

export const pageDictItems = (params) => get('/dict-items/page', params)

export const listDictGroups = () => get('/dict-items/groups')

export const addDictItem = (data) => post('/dict-items', data)

export const updateDictItem = (id, data) => put(`/dict-items/${id}`, data)

export const deleteDictItem = (id) => del(`/dict-items/${id}`)
