<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>堆垛机列表</span>
        <el-button type="primary" @click="openDialog()"
          ><el-icon><Plus /></el-icon>新增堆垛机</el-button
        >
      </div>
    </template>

    <el-form :inline="true" class="search-form">
      <el-form-item>
        <el-input
          v-model="keyword"
          placeholder="设备编码 / 设备名称"
          clearable
          @keyup.enter="loadData"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadData"
          ><el-icon><Search /></el-icon>查询</el-button
        >
        <el-button @click="resetQuery"
          ><el-icon><Refresh /></el-icon>重置</el-button
        >
      </el-form-item>
    </el-form>

    <el-table :data="filteredList" border stripe v-loading="loading">
      <el-table-column prop="deviceCode" label="设备编码" width="140" />
      <el-table-column prop="deviceName" label="设备名称" width="160" />
      <el-table-column label="设备类型" width="100" align="center">
        <template #default="{ row }">{{
          deviceTypeLabel(row.deviceType)
        }}</template>
      </el-table-column>
      <el-table-column prop="ipAddress" label="IP 地址" width="150" />
      <el-table-column prop="port" label="端口" width="80" align="center" />
      <el-table-column
        prop="status"
        label="连接状态"
        width="110"
        align="center"
      >
        <template #default="{ row }">
          <el-tag :type="statusMeta(row.status).type">{{
            statusMeta(row.status).label
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" align="center" fixed="right">
        <template #default="{ row }">
          <div class="op-grid">
            <el-button link type="primary" @click="openDialog(row)"
              ><el-icon><Edit /></el-icon>修改</el-button
            >
            <el-button
              v-if="row.status === 'CONNECTED'"
              link
              type="warning"
              @click="handleDisconnect(row)"
              ><el-icon><SwitchButton /></el-icon>断开</el-button
            >
            <el-button v-else link type="success" @click="handleConnect(row)"
              ><el-icon><Link /></el-icon>连接</el-button
            >
            <el-dropdown
              trigger="click"
              class="more-dropdown"
              @command="(cmd) => handleMoreCommand(cmd, row)"
            >
              <span class="more-trigger">
                更多<el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    command="test"
                    :disabled="row.status !== 'CONNECTED'"
                  >
                    <el-icon><VideoPlay /></el-icon>通信测试
                  </el-dropdown-item>
                  <el-dropdown-item command="bind"
                    ><el-icon><Connection /></el-icon>绑定配置</el-dropdown-item
                  >
                  <el-dropdown-item
                    command="delete"
                    style="color: var(--el-color-danger)"
                  >
                    <el-icon><Delete /></el-icon>删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '修改堆垛机' : '新增堆垛机'"
      width="480px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="设备编码" prop="deviceCode">
          <el-input v-model="form.deviceCode" placeholder="请输入设备编码" />
        </el-form-item>
        <el-form-item label="设备名称" prop="deviceName">
          <el-input v-model="form.deviceName" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="设备类型" prop="deviceType">
          <el-input value="堆垛机" disabled />
        </el-form-item>
        <el-form-item label="IP 地址" prop="ipAddress">
          <el-input v-model="form.ipAddress" placeholder="请输入 IP 地址" />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number
            v-model="form.port"
            :min="1"
            :max="65535"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="货架层数" prop="rackLevels">
          <el-input-number
            v-model="form.rackLevels"
            :min="1"
            :max="30"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="货架列数" prop="rackCols">
          <el-input-number
            v-model="form.rackCols"
            :min="1"
            :max="64"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false"
          ><el-icon><Close /></el-icon>取消</el-button
        >
        <el-button type="primary" :loading="saving" @click="handleSave"
          ><el-icon><Check /></el-icon>确定</el-button
        >
      </template>
    </el-dialog>

    <el-dialog
      v-model="testDialogVisible"
      :title="`通信测试 - ${testDevice?.deviceName || ''}`"
      width="560px"
    >
      <el-form :model="testForm" label-width="90px">
        <el-form-item label="快捷配置">
          <el-select
            v-model="selectedConfigId"
            placeholder="选择已保存的测试配置"
            clearable
            style="width: 100%"
            @change="applyTestConfig"
          >
            <el-option
              v-for="c in savedConfigs"
              :key="c.id"
              :label="`${c.configName}（DB${c.dbNumber} / 偏移${c.startOffset} / ${c.readLength}字节 / ${dataTypeLabelOf(c.dataType)}）`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="DB 块号">
              <el-input-number
                v-model="testForm.dbNumber"
                :min="1"
                :max="65535"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="起始偏移">
              <el-input-number
                v-model="testForm.start"
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="读取长度">
              <el-input-number
                v-model="testForm.size"
                :min="1"
                :max="512"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据类型">
              <el-select v-model="testForm.dataType" style="width: 100%">
                <el-option
                  v-for="t in S7_DATA_TYPES"
                  :key="t.code"
                  :label="t.label"
                  :value="t.code"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div v-if="testResult" class="read-result">
        <p>
          原始字节（HEX）：<b>{{ testResult.hex }}</b>
        </p>
        <p>
          解析值（{{ dataTypeLabel }}）：<b>{{
            testResult.values.join(" , ")
          }}</b>
        </p>
      </div>
      <div v-else class="read-result empty">
        点击「读取」从 DB{{ testForm.dbNumber }} 中读取数据
      </div>

      <template #footer>
        <el-button @click="testDialogVisible = false"
          ><el-icon><Close /></el-icon>关闭</el-button
        >
        <el-button type="primary" :loading="reading" @click="handleS7Read"
          ><el-icon><View /></el-icon>读取</el-button
        >
      </template>
    </el-dialog>

    <el-dialog
      v-model="bindingDialogVisible"
      :title="`绑定通信配置 - ${bindingDevice?.deviceName || ''}`"
      width="560px"
    >
      <template v-if="bindableConfigs.length">
        <div class="binding-summary">
          已选 {{ boundIds.length }} /
          {{ bindableConfigs.length }} 项（仅堆垛机类型）
        </div>
        <div class="binding-list">
          <el-checkbox-group v-model="boundIds">
            <div v-for="c in bindableConfigs" :key="c.id" class="binding-item">
              <el-checkbox :value="c.id">
                <div class="config-info">
                  <span class="config-name">{{ c.configName }}</span>
                  <span class="config-desc">
                    DB{{ c.dbNumber }} / 起始偏移 {{ c.startOffset }} /
                    {{ c.readLength }} 字节 /
                    {{ dataTypeLabelOf(c.dataType) }}
                  </span>
                </div>
              </el-checkbox>
            </div>
          </el-checkbox-group>
        </div>
      </template>
      <el-empty
        v-else
        description="暂无可绑定的通信配置，请先在「通信测试配置」菜单中新增"
        :image-size="80"
      />
      <template #footer>
        <el-button @click="bindingDialogVisible = false"
          ><el-icon><Close /></el-icon>取消</el-button
        >
        <el-button
          type="primary"
          :loading="savingBindings"
          @click="handleSaveBindings"
          ><el-icon><Check /></el-icon>保存</el-button
        >
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  deviceTypeLabel,
  listDevices,
  addDevice,
  updateDevice,
  deleteDevice,
  connectDevice,
  disconnectDevice,
  s7Read,
  getDeviceBindings,
  updateDeviceBindings,
  S7_DATA_TYPES,
} from "../api/device";
import { listTestConfigs } from "../api/testConfig";
import { loadSysConfig, sysConfig } from "../utils/sysConfig";

const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const keyword = ref("");
const deviceList = ref([]);
const formRef = ref();

const defaultForm = () => ({
  id: null,
  deviceCode: "",
  deviceName: "",
  deviceType: "STACKER",
  ipAddress: "",
  port: 102,
  rackLevels: 4,
  rackCols: 24,
  remark: "",
});

const testDialogVisible = ref(false);
const reading = ref(false);
const testDevice = ref(null);
const testResult = ref(null);
const testForm = reactive({ dbNumber: 1, start: 0, size: 4, dataType: "REAL" });
const savedConfigs = ref([]);
const selectedConfigId = ref(null);

const dataTypeLabel = computed(
  () =>
    S7_DATA_TYPES.find((t) => t.code === testForm.dataType)?.label ||
    testForm.dataType,
);

const dataTypeLabelOf = (code) =>
  S7_DATA_TYPES.find((t) => t.code === code)?.label || code || "-";

const handleMoreCommand = (command, row) => {
  if (command === "test") openTestDialog(row);
  else if (command === "bind") openBindingDialog(row);
  else if (command === "delete") handleDelete(row);
};

const openTestDialog = async (row) => {
  testDevice.value = row;
  testResult.value = null;
  selectedConfigId.value = null;
  savedConfigs.value = (await listTestConfigs({ deviceType: "STACKER" })) || [];
  testDialogVisible.value = true;
};

const applyTestConfig = (id) => {
  const config = savedConfigs.value.find((c) => c.id === id);
  if (!config) return;
  Object.assign(testForm, {
    dbNumber: config.dbNumber,
    start: config.startOffset,
    size: config.readLength,
    dataType: config.dataType,
  });
};

const bindingDialogVisible = ref(false);
const savingBindings = ref(false);
const bindingDevice = ref(null);
const bindableConfigs = ref([]);
const boundIds = ref([]);

const openBindingDialog = async (row) => {
  bindingDevice.value = row;
  try {
    bindableConfigs.value =
      (await listTestConfigs({ deviceType: "STACKER" })) || [];
    boundIds.value = ((await getDeviceBindings(row.id)) || []).map((c) => c.id);
  } catch (e) {
    ElMessage.error(e.message || "加载绑定配置失败");
  }
  bindingDialogVisible.value = true;
};

const handleSaveBindings = async () => {
  savingBindings.value = true;
  try {
    await updateDeviceBindings(bindingDevice.value.id, boundIds.value);
    ElMessage.success("绑定已保存");
    bindingDialogVisible.value = false;
  } catch (e) {
    ElMessage.error(e.message || "保存失败");
  } finally {
    savingBindings.value = false;
  }
};

const handleS7Read = async () => {
  reading.value = true;
  try {
    testResult.value = await s7Read(testDevice.value.id, { ...testForm });
  } catch (e) {
    ElMessage.error(e.message || "读取失败");
  } finally {
    reading.value = false;
  }
};

const form = reactive(defaultForm());

const rules = {
  deviceCode: [{ required: true, message: "请输入设备编码", trigger: "blur" }],
  deviceName: [{ required: true, message: "请输入设备名称", trigger: "blur" }],
};

const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return deviceList.value;
  return deviceList.value.filter(
    (d) =>
      d.deviceCode?.toLowerCase().includes(kw) ||
      d.deviceName?.toLowerCase().includes(kw),
  );
});

const STATUS_MAP = {
  CONNECTED: { label: "已连接", type: "success" },
  CONNECTING: { label: "连接中", type: "warning" },
  DISCONNECTED: { label: "未连接", type: "info" },
  CONNECT_FAILED: { label: "连接失败", type: "danger" },
  CONNECT_TIMEOUT: { label: "连接超时", type: "danger" },
};

const statusMeta = (status) =>
  STATUS_MAP[status] || { label: status || "-", type: "info" };

const formatTime = (time) => (time ? String(time).replace("T", " ") : "-");

const loadData = async () => {
  loading.value = true;
  try {
    const data = await listDevices({ deviceType: "STACKER" });
    deviceList.value = data || [];
  } catch (e) {
    ElMessage.error(e.message || "加载堆垛机列表失败");
  } finally {
    loading.value = false;
  }
};

const resetQuery = () => {
  keyword.value = "";
  loadData();
};

const openDialog = (row) => {
  Object.assign(form, defaultForm(), row ? { ...row } : {});
  form.deviceType = "STACKER";
  dialogVisible.value = true;
};

const handleSave = async () => {
  await formRef.value.validate();
  saving.value = true;
  try {
    if (form.id) {
      await updateDevice({ ...form });
      ElMessage.success("修改成功");
    } else {
      await addDevice({ ...form });
      ElMessage.success("新增成功");
    }
    dialogVisible.value = false;
    loadData();
  } catch (e) {
    ElMessage.error(e.message || "保存失败");
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (row) => {
  await ElMessageBox.confirm(
    `确定删除堆垛机「${row.deviceName}」吗？`,
    "提示",
    { type: "warning" },
  );
  try {
    await deleteDevice(row.id);
    ElMessage.success("删除成功");
    loadData();
  } catch (e) {
    ElMessage.error(e.message || "删除失败");
  }
};

const handleConnect = async (row) => {
  try {
    await connectDevice(row.id);
    ElMessage.success("连接请求已提交");
    startPolling();
  } catch (e) {
    ElMessage.error(e.message || "连接失败");
  }
};

const handleDisconnect = async (row) => {
  try {
    const reason = await disconnectDevice(row.id);
    ElMessage.success(`已断开连接（${reason || "用户手动断开"}）`);
    loadData();
  } catch (e) {
    ElMessage.error(e.message || "断开失败");
  }
};

let pollTimer = null;
let refreshTimer = null;
const startPolling = () => {
  stopPolling();
  let count = 0;
  pollTimer = setInterval(() => {
    loadData();
    if (++count >= 10) stopPolling();
  }, 1500);
};
const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};
// 按系统配置的刷新间隔定时拉取，及时反映后端异步变化的状态（如网络断开）
const startAutoRefresh = () => {
  const interval = Number(sysConfig.refreshInterval) || 0;
  if (interval > 0) {
    refreshTimer = setInterval(loadData, interval * 1000);
  }
};

onMounted(async () => {
  await loadSysConfig();
  loadData();
  startAutoRefresh();
});
onUnmounted(() => {
  stopPolling();
  if (refreshTimer) clearInterval(refreshTimer);
});
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

.read-result {
  padding: 10px 12px;
  border-radius: 4px;
  background: #f4f4f5;
  font-size: 13px;
  color: #606266;
}

.read-result b {
  color: #303133;
  word-break: break-all;
}

.read-result.empty {
  color: #909399;
}

.binding-summary {
  margin-bottom: 8px;
  font-size: 13px;
  color: #909399;
}

.binding-list {
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.binding-item {
  padding: 8px 12px;
}

.binding-item + .binding-item {
  border-top: 1px solid #ebeef5;
}

.binding-item :deep(.el-checkbox) {
  width: 100%;
  height: auto;
  align-items: flex-start;
}

.config-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.4;
}

.config-name {
  font-weight: 600;
  color: #303133;
}

.config-desc {
  font-size: 12px;
  color: #909399;
}

.more-dropdown {
  margin-left: 0;
  vertical-align: middle;
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

.more-trigger {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 14px;
  color: var(--el-color-primary);
  cursor: pointer;
}
</style>
