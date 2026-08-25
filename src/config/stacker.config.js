/**
 * 堆垛机可视化配置文件
 * 集中调整货架规模与堆垛机信息，可视化页面将按此配置自动渲染
 */
export const STACKER_CONFIG = {
  /** 列数：货位沿巷道方向的编号范围 1 ~ totalCols */
  totalCols: 42,

  /** 行数（层）：货架垂直方向的货位行数 1 ~ totalLevels */
  totalLevels: 8,

  /** 排数：每侧货架的排数，1 = 单排货架，2 = 双排（双深）货架 */
  ranksPerSide: 1,

  /** 模拟数据刷新间隔（毫秒），接入真实接口后可忽略 */
  simInterval: 2000
}

/**
 * 堆垛机列表
 * - col / level 为初始位置
 * - 可选字段 totalCols / totalLevels / ranksPerSide 可单独覆盖全局配置（不同巷道规模不一致时使用）
 */
export const STACKER_LIST = [
  { code: 'DEV-001', name: '1号堆垛机', col: 5, level: 2, carrying: true, mode: '联机', status: '作业中', taskNo: 'T202608240001' },
  { code: 'DEV-002', name: '2号堆垛机', col: 12, level: 1, carrying: false, mode: '联机', status: '空闲', taskNo: '' },
  { code: 'DEV-005', name: '3号堆垛机', col: 18, level: 3, carrying: true, mode: '联机', status: '作业中', taskNo: 'T202608240003' },
  { code: 'DEV-006', name: '4号堆垛机', col: 8, level: 2, carrying: false, mode: '单机', status: '离线', taskNo: '' }
]
