<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>任务列表</span>
        <el-button type="primary" @click="dialogVisible = true"><el-icon><Plus /></el-icon>新建任务</el-button>
      </div>
    </template>

    <el-form :inline="true" class="search-form">
      <el-form-item label="任务编号">
        <el-input v-model="keyword" placeholder="请输入任务编号" clearable />
      </el-form-item>
      <el-form-item>
        <el-button type="primary"><el-icon><Search /></el-icon>查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="pagedList" border stripe>
      <el-table-column prop="taskNo" label="任务编号" width="180" />
      <el-table-column prop="type" label="任务类型" width="120" align="center" />
      <el-table-column prop="from" label="起点" width="120" />
      <el-table-column prop="to" label="终点" width="120" />
      <el-table-column prop="priority" label="优先级" width="90" align="center" />
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" />
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredCount"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        background
      />
    </div>

    <el-dialog v-model="dialogVisible" title="新建任务" width="480px">
      <el-form label-width="80px">
        <el-form-item label="任务类型">
          <el-select placeholder="请选择任务类型" style="width: 100%">
            <el-option label="入库" value="IN" />
            <el-option label="出库" value="OUT" />
            <el-option label="移库" value="MOVE" />
          </el-select>
        </el-form-item>
        <el-form-item label="起点">
          <el-input placeholder="请输入起点位置" />
        </el-form-item>
        <el-form-item label="终点">
          <el-input placeholder="请输入终点位置" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false"><el-icon><Close /></el-icon>取消</el-button>
        <el-button type="primary" @click="dialogVisible = false"><el-icon><Check /></el-icon>确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { loadSysConfig, sysConfig } from '../utils/sysConfig'

const keyword = ref('')
const dialogVisible = ref(false)
const currentPage = ref(1)
const pageSize = ref(sysConfig.pageSize || 20)

const taskList = ref([
  { taskNo: 'T202608240001', type: '入库', from: 'P01', to: 'A-01-01', priority: 5, status: '执行中', createTime: '2026-08-24 09:00:00' },
  { taskNo: 'T202608240002', type: '出库', from: 'A-02-03', to: 'P02', priority: 8, status: '已完成', createTime: '2026-08-24 09:15:00' },
  { taskNo: 'T202608240003', type: '移库', from: 'A-03-02', to: 'B-01-04', priority: 3, status: '等待中', createTime: '2026-08-24 10:20:00' }
])

onMounted(() => {
  loadSysConfig().then(() => {
    pageSize.value = sysConfig.pageSize || 20
  })
})

const filteredCount = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return taskList.value.length
  return taskList.value.filter((t) => t.taskNo?.toLowerCase().includes(kw)).length
})

const pagedList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const list = kw
    ? taskList.value.filter((t) => t.taskNo?.toLowerCase().includes(kw))
    : taskList.value
  const start = (currentPage.value - 1) * pageSize.value
  return list.slice(start, start + pageSize.value)
})

const statusType = (status) => {
  const map = { 执行中: 'primary', 已完成: 'success', 等待中: 'warning', 失败: 'danger' }
  return map[status] || 'info'
}
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.search-form {
  margin-bottom: 12px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
