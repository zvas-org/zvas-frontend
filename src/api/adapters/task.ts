/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/api/client'
import type { PaginationMeta } from './asset'
import { parseHttpProbeSummary } from './asset'

export const TERMINAL_TASK_STATUSES = ['succeeded', 'failed', 'stopped', 'deleted']

export function isTerminalTaskStatus(status: string): boolean {
  return TERMINAL_TASK_STATUSES.includes(status)
}

export interface HttpProbeObservation {
  state: 'alive' | 'unreachable' | 'failed' | 'unknown'
  label: string
  error?: string
}

export function getHttpProbeObservation(record: TaskRecordVM): HttpProbeObservation {
  if (record.status === 'failed') {
    return { state: 'failed', label: '执行失败' }
  }
  if (record.status === 'succeeded') {
    let payload = null
    try {
      if (typeof record.result_summary === 'string' && record.result_summary.startsWith('{')) {
        payload = JSON.parse(record.result_summary)
      } else {
        payload = record.result_summary
      }
    } catch {
      // ignore
    }
    const sum = parseHttpProbeSummary(payload)
    if (sum) {
      if (sum.probe_status === 'alive') return { state: 'alive', label: '站点存活' }
      if (sum.probe_status === 'unreachable') return { state: 'unreachable', label: '站点不存活', error: sum.probe_error }
      if (sum.status_code && sum.status_code > 0) return { state: 'alive', label: '站点存活' }
    }
    return { state: 'unknown', label: '未知状态' }
  }
  return { state: 'unknown', label: record.status || '异常' }
}

export interface TaskListItemVM {
  id: string
  name: string
  template_code: string
  template_name: string
  asset_pool_id: string
  asset_pool_name: string
  target_set_id: string
  status: string
  stage_plan: string[]
  created_by: string
  created_at: string
  updated_at: string
  started_at: string
  finished_at: string
  stage_overrides: Record<string, boolean>
  desired_state: string
  // Task-025 新增：编排调度字段
  route_plan: string[]
  active_group: string
  blocked_reason: string
  active_attack_route: string
  group_progress: GroupProgressVM[]
}

/** 阶段组执行进度 */
export interface GroupProgressVM {
  group_code: string
  state: string   // pending | active | completed | blocked
  seeded_at: string
  completed_at: string
  blocked_reason: string
}

export interface TaskDetailVM extends TaskListItemVM {
  params: Record<string, string>
}

export interface TaskProgressStageVM {
  stage: string
  total_units: number
  queued: number
  dispatched: number
  running: number
  succeeded: number
  failed: number
  pending: boolean
}

export interface TaskProgressVM {
  task_id: string
  task_status: string
  total_units: number
  queued: number
  dispatched: number
  running: number
  succeeded: number
  failed: number
  updated_at: string
  stages: TaskProgressStageVM[]
  // Task-025 新增
  active_group: string
  blocked_reason: string
  active_attack_route: string
  group_progress: GroupProgressVM[]
}

export interface TaskSnapshotAssetVM {
  id: string
  task_id: string
  snapshot_id: string
  asset_kind: string
  display_name: string
  normalized_key: string
  origin_type: string
  source_type: string
  confidence_level: string
  promoted_to_pool: boolean
  system_facets: string[]
  extra_payload: Record<string, any>
  created_at: string
  updated_at: string
}

export interface TaskRecordVM {
  unit_id: string
  task_id: string
  stage: string
  topic: string
  task_type: string
  task_subtype: string
  target_key: string
  status: string
  worker_id: string
  attempt: number
  started_at?: string
  finished_at?: string
  duration_ms: number
  result_summary: string
  // Task-025 新增
  route_code: string
  desired_state: string
}

function mapGroupProgress(arr: any[]): GroupProgressVM[] {
  return (arr || []).map((g: any) => ({
    group_code: g.group_code || '',
    state: g.state || 'pending',
    seeded_at: g.seeded_at || '',
    completed_at: g.completed_at || '',
    blocked_reason: g.blocked_reason || '',
  }))
}

function mapToTaskListItemVM(dto: any): TaskListItemVM {
  return {
    id: dto.id || dto.task_id || '',
    name: dto.name || '',
    template_code: dto.template_code || '',
    template_name: dto.template_name || dto.template_code || '',
    asset_pool_id: dto.asset_pool_id || '',
    asset_pool_name: dto.asset_pool_name || '',
    target_set_id: dto.target_set_id || '',
    status: dto.status || 'draft',
    stage_plan: dto.stage_plan || [],
    created_by: dto.created_by || 'SYSTEM',
    created_at: dto.created_at || '',
    updated_at: dto.updated_at || dto.created_at || '',
    started_at: dto.started_at || '',
    finished_at: dto.finished_at || '',
    stage_overrides: dto.stage_overrides || {},
    desired_state: dto.desired_state || 'running',
    route_plan: dto.route_plan || [],
    active_group: dto.active_group || '',
    blocked_reason: dto.blocked_reason || '',
    active_attack_route: dto.active_attack_route || '',
    group_progress: mapGroupProgress(dto.group_progress),
  }
}

function mapToTaskDetailVM(dto: any): TaskDetailVM {
  return {
    ...mapToTaskListItemVM(dto),
    params: dto.params || {},
  }
}

function mapToTaskProgressVM(dto: any): TaskProgressVM {
  return {
    task_id: dto.task_id || '',
    task_status: dto.task_status || 'draft',
    total_units: dto.total_units ?? 0,
    queued: dto.queued ?? 0,
    dispatched: dto.dispatched ?? 0,
    running: dto.running ?? 0,
    succeeded: dto.succeeded ?? 0,
    failed: dto.failed ?? 0,
    updated_at: dto.updated_at || '',
    stages: (dto.stages || []).map((stage: any) => ({
      stage: stage.stage || '',
      total_units: stage.total_units ?? 0,
      queued: stage.queued ?? 0,
      dispatched: stage.dispatched ?? 0,
      running: stage.running ?? 0,
      succeeded: stage.succeeded ?? 0,
      failed: stage.failed ?? 0,
      pending: Boolean(stage.pending),
    })),
    active_group: dto.active_group || '',
    blocked_reason: dto.blocked_reason || '',
    active_attack_route: dto.active_attack_route || '',
    group_progress: mapGroupProgress(dto.group_progress),
  }
}

function mapToTaskSnapshotAssetVM(dto: any): TaskSnapshotAssetVM {
  return {
    id: dto.id || '',
    task_id: dto.task_id || '',
    snapshot_id: dto.snapshot_id || '',
    asset_kind: dto.asset_kind || 'unknown',
    display_name: dto.display_name || '',
    normalized_key: dto.normalized_key || '',
    origin_type: dto.origin_type || 'input',
    source_type: dto.source_type || 'unknown',
    confidence_level: dto.confidence_level || 'unknown',
    promoted_to_pool: Boolean(dto.promoted_to_pool),
    system_facets: dto.system_facets || [],
    extra_payload: dto.extra_payload || {},
    created_at: dto.created_at || '',
    updated_at: dto.updated_at || dto.created_at || '',
  }
}

function mapToTaskRecordVM(dto: any): TaskRecordVM {
  return {
    unit_id: dto.unit_id || '',
    task_id: dto.task_id || '',
    stage: dto.stage || '',
    topic: dto.topic || '',
    task_type: dto.task_type || '',
    task_subtype: dto.task_subtype || '',
    target_key: dto.target_key || '',
    status: dto.status || 'queued',
    worker_id: dto.worker_id || '',
    attempt: dto.attempt ?? 0,
    started_at: dto.started_at || '',
    finished_at: dto.finished_at || '',
    duration_ms: dto.duration_ms ?? dto.duration_ms ?? 0,
    result_summary: dto.result_summary || '',
    route_code: dto.route_code || '',
    desired_state: dto.desired_state || '',
  }
}

export interface TaskStatusInfo {
  label: string
  color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  isRunning: boolean
  canPause: boolean
  canResume: boolean
  canStop: boolean
}

export function getTaskStatusInfo(status: string, desiredState: string): TaskStatusInfo {
  // 意图优先原则
  if (desiredState === 'paused') {
    return { label: '已暂停', color: 'warning', isRunning: false, canPause: false, canResume: true, canStop: true }
  }
  if (desiredState === 'stopped' || status === 'stopped') {
    return { label: '已停止', color: 'default', isRunning: false, canPause: false, canResume: false, canStop: false }
  }

  // 状态机补充
  if (status === 'deleted') {
    return { label: '已废弃', color: 'danger', isRunning: false, canPause: false, canResume: false, canStop: false }
  }

  // 运行状态逻辑
  switch (status) {
    case 'queued':
      return { label: '队列中', color: 'primary', isRunning: true, canPause: true, canResume: false, canStop: true }
    case 'running':
      return { label: '运行中', color: 'primary', isRunning: true, canPause: true, canResume: false, canStop: true }
    case 'succeeded':
      return { label: '已完成', color: 'success', isRunning: false, canPause: false, canResume: false, canStop: false }
    case 'failed':
      return { label: '已失败', color: 'danger', isRunning: false, canPause: false, canResume: false, canStop: false }
    default:
      return { label: status || '未知', color: 'default', isRunning: false, canPause: false, canResume: false, canStop: false }
  }
}

// ── Task-025: 编排状态 Helper ──

const GROUP_LABELS: Record<string, string> = {
  discovery: '资产探测中',
  attack: '漏洞扫描中',
  report: '报告生成中',
}

const BLOCKED_LABELS: Record<string, string> = {
  task_paused: '已暂停',
  task_stopped: '已停止',
  budget_exhausted: '预算耗尽',
}

/** 获取当前活动阶段组的中文标签 */
export function getActiveGroupLabel(activeGroup: string): string {
  return GROUP_LABELS[activeGroup] || activeGroup || ''
}

/** 获取阻塞原因的中文标签 */
export function getBlockedReasonLabel(reason: string): string {
  return BLOCKED_LABELS[reason] || reason || ''
}

/** 获取阶段组状态的显示信息 */
export function getGroupStateInfo(state: string): { label: string; color: string } {
  switch (state) {
    case 'active': return { label: '执行中', color: 'primary' }
    case 'completed': return { label: '已完成', color: 'success' }
    case 'blocked': return { label: '已阻塞', color: 'warning' }
    case 'pending': return { label: '等待中', color: 'default' }
    default: return { label: state || '未知', color: 'default' }
  }
}

export function useTasks(params: { page?: number; page_size?: number; keyword?: string; status?: string; asset_pool_id?: string; template_code?: string; sort?: string; order?: string }) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const cleanParams = params 
        ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
        : undefined
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>('/tasks', { params: cleanParams })
      return {
        ...res.data,
        data: (res.data.data || []).map(mapToTaskListItemVM),
      }
    },
  })
}

export function useTaskDetail(id?: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any }>(`/tasks/${id}`)
      return mapToTaskDetailVM(res.data.data)
    },
    enabled: Boolean(id),
  })
}

export function useTaskProgress(id?: string) {
  return useQuery({
    queryKey: ['tasks', id, 'progress'],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any }>(`/tasks/${id}/progress`)
      return mapToTaskProgressVM(res.data.data)
    },
    enabled: Boolean(id),
    refetchInterval: 5000,
  })
}

export function useTaskSnapshotAssets(
  id?: string,
  params?: {
    page?: number
    page_size?: number
    origin_type?: 'input' | 'expanded'
    asset_kind?: 'ip' | 'domain' | 'site'
    keyword?: string
    sort?: string
    order?: string
  },
) {
  return useQuery({
    queryKey: ['tasks', id, 'snapshot-assets', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>(`/tasks/${id}/snapshot-assets`, { params })
      return {
        ...res.data,
        data: (res.data.data || []).map(mapToTaskSnapshotAssetVM),
      }
    },
    enabled: Boolean(id),
  })
}

export function useTaskRecords(
  id?: string,
  params?: {
    page?: number
    page_size?: number
    stage?: string
    status?: string
    keyword?: string
    sort?: string
    order?: string
  },
) {
  return useQuery({
    queryKey: ['tasks', id, 'records', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>(`/tasks/${id}/records`, { params })
      return {
        ...res.data,
        data: (res.data.data || []).map(mapToTaskRecordVM),
      }
    },
    enabled: Boolean(id),
    refetchInterval: 5000,
  })
}

export interface CreateTaskAssetPoolConfig {
  mode: 'create' | 'existing'
  asset_pool_id?: string
  name?: string
  description?: string
  scope_rule?: string
  tags?: string[]
}

export interface CreateTaskInputConfig {
  source: 'manual'
  items: string[]
}

export interface CreateTaskTargetSetRequest {
  generation_source: 'pool_filter_plus_manual' | 'pool_filter' | 'manual_only'
  filters?: {
    view?: string
    keyword?: string
    asset_type?: string
  }
}

export interface CreateTaskRequest {
  mode: 'from_pool' | 'ad_hoc'
  name: string
  template_code: string
  asset_pool_id?: string
  target_set_request?: CreateTaskTargetSetRequest
  manual_append?: string[]
  stage_overrides?: Record<string, boolean>
  template_overrides?: Record<string, any>
  params?: Record<string, string>
  asset_pool?: CreateTaskAssetPoolConfig
  input?: CreateTaskInputConfig
}

export interface CreateTaskResponseVM {
  task_id: string
  asset_pool_id: string
  target_set_id?: string
  // Task-025: 编排字段透传
  route_plan: string[]
  active_group: string
  group_progress: GroupProgressVM[]
}

export function useCreateTask() {
  return useMutation({
    mutationFn: async (req: CreateTaskRequest): Promise<CreateTaskResponseVM> => {
      const res = await httpClient.post<{ data: any }>('/tasks', req)
      const d = res.data.data || res.data // 根据通用约定展开
      const task = d.task || d
      return {
        task_id: task.id || d.id || '',
        asset_pool_id: d.asset_pool?.id || d.asset_pool_id || req.asset_pool_id || '',
        target_set_id: d.target_set?.id || d.target_set_id,
        route_plan: task.route_plan || [],
        active_group: task.active_group || '',
        group_progress: mapGroupProgress(task.group_progress),
      }
    },
  })
}

export function useRunTask() {
  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      await httpClient.post(`/tasks/${taskId}/run`, {})
    },
  })
}

export function usePauseTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      await httpClient.post(`/tasks/${taskId}/pause`, {})
    },
    onSuccess: (_, taskId) => {
      qc.invalidateQueries({ queryKey: ['tasks', taskId] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useResumeTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      await httpClient.post(`/tasks/${taskId}/resume`, {})
    },
    onSuccess: (_, taskId) => {
      qc.invalidateQueries({ queryKey: ['tasks', taskId] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useStopTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      await httpClient.post(`/tasks/${taskId}/stop`, {})
    },
    onSuccess: (_, taskId) => {
      qc.invalidateQueries({ queryKey: ['tasks', taskId] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// ─── 单条快照资产详情（懒加载，仅展开时触发）────────────────────────────────
export function useTaskSnapshotAssetDetail(taskId?: string, assetId?: string) {
  return useQuery({
    queryKey: ['tasks', taskId, 'snapshot-assets', assetId],
    queryFn: async (): Promise<TaskSnapshotAssetVM> => {
      const res = await httpClient.get<{ data: any }>(`/tasks/${taskId}/snapshot-assets/${assetId}`)
      const dto = res.data.data || res.data
      return {
        id: dto.id || '',
        task_id: dto.task_id || '',
        snapshot_id: dto.snapshot_id || '',
        asset_kind: dto.asset_kind || 'unknown',
        display_name: dto.display_name || '',
        normalized_key: dto.normalized_key || '',
        origin_type: dto.origin_type || 'input',
        source_type: dto.source_type || 'unknown',
        confidence_level: dto.confidence_level || 'unknown',
        promoted_to_pool: Boolean(dto.promoted_to_pool),
        system_facets: dto.system_facets || [],
        extra_payload: dto.extra_payload || {},
        created_at: dto.created_at || '',
        updated_at: dto.updated_at || dto.created_at || '',
      }
    },
    enabled: Boolean(taskId && assetId),
    staleTime: 30_000,
  })
}
