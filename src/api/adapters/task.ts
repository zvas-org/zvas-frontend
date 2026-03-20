/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation } from '@tanstack/react-query'
import { httpClient } from '@/api/client'
import type { PaginationMeta } from './asset'

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
  target_key: string
  status: string
  worker_id: string
  attempt: number
  started_at?: string
  finished_at?: string
  duration_ms: number
  result_summary: string
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
    target_key: dto.target_key || '',
    status: dto.status || 'queued',
    worker_id: dto.worker_id || '',
    attempt: dto.attempt ?? 0,
    started_at: dto.started_at || '',
    finished_at: dto.finished_at || '',
    duration_ms: dto.duration_ms ?? dto.duration_ms ?? 0,
    result_summary: dto.result_summary || '',
  }
}

export function useTasks(params: { page?: number; page_size?: number; keyword?: string; status?: string; asset_pool_id?: string; template_code?: string; sort?: string; order?: string }) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>('/tasks', { params })
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
  params?: Record<string, string>
  asset_pool?: CreateTaskAssetPoolConfig
  input?: CreateTaskInputConfig
}

export interface CreateTaskResponseVM {
  task_id: string
  asset_pool_id: string
  target_set_id?: string
}

export function useCreateTask() {
  return useMutation({
    mutationFn: async (req: CreateTaskRequest): Promise<CreateTaskResponseVM> => {
      const res = await httpClient.post<{ data: any }>('/tasks', req)
      const d = res.data.data || res.data
      return {
        task_id: d.task_id || d.id || '',
        asset_pool_id: d.asset_pool_id || req.asset_pool_id || '',
        target_set_id: d.target_set_id,
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
