/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { httpClient } from '@/api/client'

// ── 任务路由 DTO / Meta / Catalog 类型定义 ──

/** 后端原始结构 */
export type TaskRouteDTO = {
  key: string
  label: string
  description?: string
  task_type: string
  stage: string
  default_topic: string
  site_like: boolean
}

/** 前端统一 Meta（camelCase 语义化） */
export interface TaskRouteMeta {
  key: string
  label: string
  description: string
  taskType: string
  stage: string
  defaultTopic: string
  siteLike: boolean
  // Task-025 新增：编排调度字段
  routeCode: string
  taskSubtype: string
  groupCode: string
  groupOrder: number
  dispatchOrder: number
  seedSource: string
  budgetBucket: string
}

/** 索引化目录：O(1) 按维度取值 */
export interface TaskRouteCatalog {
  list: TaskRouteMeta[]
  byKey: Record<string, TaskRouteMeta>
  byStage: Record<string, TaskRouteMeta>
  byTaskType: Record<string, TaskRouteMeta>
  byRouteCode: Record<string, TaskRouteMeta>
}

// ── DTO → Meta 映射 ──
function mapToMeta(dto: any): TaskRouteMeta {
  return {
    key: dto.key || '',
    label: dto.label || dto.key || '',
    description: dto.description || '',
    taskType: dto.task_type || '',
    stage: dto.stage || '',
    defaultTopic: dto.default_topic || '',
    siteLike: Boolean(dto.site_like),
    routeCode: dto.route_code || dto.key || '',
    taskSubtype: dto.task_subtype || '',
    groupCode: dto.group_code || '',
    groupOrder: dto.group_order ?? 0,
    dispatchOrder: dto.dispatch_order ?? 0,
    seedSource: dto.seed_source || '',
    budgetBucket: dto.budget_bucket || '',
  }
}

// ── 构建索引化 Catalog ──
function buildCatalog(list: TaskRouteMeta[]): TaskRouteCatalog {
  const byKey: Record<string, TaskRouteMeta> = {}
  const byStage: Record<string, TaskRouteMeta> = {}
  const byTaskType: Record<string, TaskRouteMeta> = {}
  const byRouteCode: Record<string, TaskRouteMeta> = {}
  for (const item of list) {
    if (item.key) byKey[item.key] = item
    if (item.stage && !byStage[item.stage]) byStage[item.stage] = item
    if (item.taskType && !byTaskType[item.taskType]) byTaskType[item.taskType] = item
    if (item.routeCode) byRouteCode[item.routeCode] = item
  }
  return { list, byKey, byStage, byTaskType, byRouteCode }
}

// ── 全局 query hook：长缓存避免多页面重复请求 ──

/** 原始列表 hook（内部使用） */
export function useTaskRoutes() {
  return useQuery({
    queryKey: ['task-routes'],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any[] }>('/task-routes')
      return (res.data.data || []).map(mapToMeta)
    },
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000, // 30 分钟垃圾回收
  })
}

/** 索引化 Catalog hook（页面推荐使用） */
export function useTaskRouteCatalog(): { catalog: TaskRouteCatalog | undefined; isLoading: boolean } {
  const { data, isPending } = useTaskRoutes()
  const catalog = useMemo(() => (data ? buildCatalog(data) : undefined), [data])
  return { catalog, isLoading: isPending }
}

// ── 统一 Resolver ──

/**
 * 统一路由元数据查询器。
 * 命中优先级：taskType → stage → key → undefined
 */
export function resolveTaskRouteMeta(
  catalog: TaskRouteCatalog | undefined,
  input: { taskType?: string; stage?: string; key?: string },
): TaskRouteMeta | undefined {
  if (!catalog) return undefined
  if (input.taskType && catalog.byTaskType[input.taskType]) return catalog.byTaskType[input.taskType]
  if (input.stage && catalog.byStage[input.stage]) return catalog.byStage[input.stage]
  if (input.key && catalog.byKey[input.key]) return catalog.byKey[input.key]
  return undefined
}

// ── 便捷 Helper（页面层直接调用） ──

/** 获取阶段/类型的中文 label，兜底返回原始字符串 */
export function getRouteLabel(routes: TaskRouteMeta[] | undefined, stageOrType: string): string {
  if (!stageOrType) return '未知'

  const fallbackLabels: Record<string, string> = {
    port_scan: '端口扫描',
    'http_probe.homepage': '首页识别',
    web_fingerprint: '站点指纹',
    'vul_scan.site': '漏洞扫描',
    'vuln_scan.nuclei': '漏洞扫描',
    vuln_scan: '漏洞扫描',
    vul_scan: '漏洞扫描',
    'weak_scan.site': '弱点扫描',
    weak_scan: '弱点扫描',
  }
  if (fallbackLabels[stageOrType]) return fallbackLabels[stageOrType]
  if (!routes) return stageOrType

  const hit =
    routes.find(r => r.routeCode === stageOrType) ||
    routes.find(r => r.taskType === stageOrType) ||
    routes.find(r => r.stage === stageOrType) ||
    routes.find(r => r.key === stageOrType)
  return hit?.label || stageOrType
}

export function getRouteActiveLabel(routes: TaskRouteMeta[] | undefined, routeCode: string): string {
  const label = getRouteLabel(routes, routeCode)
  if (!label || label === '未知') return ''
  return label.endsWith('中') ? label : `${label}中`
}

/** 获取阶段描述 */
export function getStageDescription(catalog: TaskRouteCatalog | undefined, stage: string): string {
  const meta = resolveTaskRouteMeta(catalog, { stage })
  return meta?.description || ''
}

/** 判断是否为站点类路由 */
export function isSiteLikeRoute(catalog: TaskRouteCatalog | undefined, stage: string): boolean {
  const meta = resolveTaskRouteMeta(catalog, { stage })
  return meta?.siteLike ?? false
}

/** 获取默认 topic */
export function getDefaultTopic(catalog: TaskRouteCatalog | undefined, stage: string): string {
  const meta = resolveTaskRouteMeta(catalog, { stage })
  return meta?.defaultTopic || ''
}

/** 将多个 stage 数组翻译为 label 数组 */
export function mapStageLabels(routes: TaskRouteMeta[] | undefined, stages: string[]): string[] {
  return stages.map(s => getRouteLabel(routes, s))
}

/** 根据 task_type + task_subtype 组合键获取 label */
export function getRecordTypeLabel(routes: TaskRouteMeta[] | undefined, taskType: string, taskSubtype: string): string {
  if (!routes) return taskType || '-'
  if (taskSubtype) {
    const compositeKey = `${taskType}/${taskSubtype}`
    const hit = routes.find(r => r.key === compositeKey)
    if (hit) return hit.label
  }
  return getRouteLabel(routes, taskType)
}
