<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>输送线节点列表</span>
        <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增节点</el-button>
      </div>
    </template>

    <el-form :inline="true" class="search-form">
      <el-form-item label="关键字">
        <el-input v-model="keyword" placeholder="节点编码 / 节点名称" clearable @keyup.enter="loadData" />
      </el-form-item>
      <el-form-item label="所属输送线">
        <el-select v-model="queryDeviceId" placeholder="全部" clearable filterable style="width: 200px" @change="loadData">
          <el-option
            v-for="d in conveyors"
            :key="d.id"
            :label="`${d.deviceCode} - ${d.deviceName}`"
            :value="d.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadData"><el-icon><Search /></el-icon>查询</el-button>
        <el-button @click="resetQuery"><el-icon><Refresh /></el-icon>重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="filteredList" border stripe v-loading="loading">
      <el-table-column prop="nodeCode" label="节点编码" width="140" />
      <el-table-column prop="nodeName" label="节点名称" width="160" />
      <el-table-column label="所属输送线" width="200">
        <template #default="{ row }">{{ deviceNameOf(row.deviceId) }}</template>
      </el-table-column>
      <el-table-column prop="nodeType" label="节点类型" width="100" align="center">
        <template #default="{ row }">{{ row.nodeType || '-' }}</template>
      </el-table-column>
      <el-table-column prop="address" label="位置地址" width="150" show-overflow-tooltip />
      <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" align="center" fixed="right">
        <template #default="{ row }">
          <div class="op-grid">
            <el-button link type="primary" @click="openDialog(row)"><el-icon><Edit /></el-icon>修改</el-button>
            <el-button link type="danger" @click="handleDelete(row)"><el-icon><Delete /></el-icon>删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="form.id ? '修改节点' : '新增节点'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="节点编码" prop="nodeCode">
          <el-input v-model="form.nodeCode" placeholder="请输入节点编码，如 CV01-N1" />
        </el-form-item>
        <el-form-item label="节点名称" prop="nodeName">
          <el-input v-model="form.nodeName" placeholder="请输入节点名称" />
        </el-form-item>
        <el-form-item label="所属输送线" prop="deviceId">
          <el-select v-model="form.deviceId" placeholder="请选择所属输送线" filterable style="width: 100%">
            <el-option
              v-for="d in conveyors"
              :key="d.id"
              :label="`${d.deviceCode} - ${d.deviceName}`"
              :value="d.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="节点类型" prop="nodeType">
          <el-select
            v-model="form.nodeType"
            placeholder="选择或输入节点类型"
            filterable
            allow-create
            default-first-option
            clearable
            style="width: 100%"
          >
            <el-option v-for="t in NODE_TYPES" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="位置地址" prop="address">
          <el-input v-model="form.address" placeholder="如 A 区 3 号道口" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false"><el-icon><Close /></el-icon>取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave"><el-icon><Check /></el-icon>确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listDevices } from '../api/device'
import { NODE_TYPES, listNodes, addNode, updateNode, deleteNode } from '../api/node'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const keyword = ref('')
const queryDeviceId = ref(null)
const nodeList = ref([])
const conveyors = ref([])
const formRef = ref()

const defaultForm = () => ({
  id: null,
  nodeCode: '',
  nodeName: '',
  deviceId: null,
  nodeType: '',
  address: '',
  remark: ''
})

const form = reactive(defaultForm())

const rules = {
  nodeCode: [{ required: true, message: '请输入节点编码', trigger: 'blur' }],
  nodeName: [{ required: true, message: '请输入节点名称', trigger: 'blur' }],
  deviceId: [{ required: true, message: '请选择所属输送线', trigger: 'change' }]
}

const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return nodeList.value
  return nodeList.value.filter(
    (n) => n.nodeCode?.toLowerCase().includes(kw) || n.nodeName?.toLowerCase().includes(kw)
  )
})

const deviceNameOf = (deviceId) => {
  const d = conveyors.value.find((c) => c.id === deviceId)
  return d ? `${d.deviceCode} - ${d.deviceName}` : '-'
}

const formatTime = (time) => (time ? String(time).replace('T', ' ') : '-')

const loadData = async () => {
  loading.value = true
  try {
    const params = {}
    if (queryDeviceId.value) params.deviceId = queryDeviceId.value
    nodeList.value = (await listNodes(params)) || []
  } catch (e) {
    ElMessage.error(e.message || '加载节点列表失败')
  } finally {
    loading.value = false
  }
}

const loadConveyors = async () => {
  try {
    conveyors.value = (await listDevices({ deviceType: 'CONVEYOR' })) || []
  } catch (e) {
    ElMessage.error(e.message || '加载输送线失败')
  }
}

const resetQuery = () => {
  keyword.value = ''
  queryDeviceId.value = null
  loadData()
}

const openDialog = (row) => {
  Object.assign(form, defaultForm(), row ? { ...row } : {})
  dialogVisible.value = true
}

const handleSave = async () => {
  await formRef.value.validate()
  saving.value = true
  try {
    if (form.id) {
      await updateNode({ ...form })
      ElMessage.success('修改成功')
    } else {
      await addNode({ ...form })
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm(`确定删除节点「${row.nodeName}」吗？`, '提示', { type: 'warning' })
  try {
    await deleteNode(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

onMounted(() => {
  loadConveyors()
  loadData()
})
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.op-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  justify-items: center;
  gap: 6px 10px;
}

.op-grid :deep(.el-button) {
  margin-left: 0;
  height: auto;
  padding: 2px 0;
}
</style>
