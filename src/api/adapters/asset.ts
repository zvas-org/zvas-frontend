/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/api/client'

export interface PaginationMeta {
  page: number
  page_size: number
  total: number
}

export interface AssetPoolScopeRule {
  root_domains?: string[]
  wildcard_domains?: string[]
  exact_ips?: string[]
  cidrs?: string[]
  allowlist?: string[]
  denylist?: string[]
  notes?: string
}

export interface AssetPoolListItemVM {
  id: string
  name: string
  description: string
  tags: string[]
  asset_count: number
  task_count: number
  finding_count: number
  created_at: string
  updated_at: string
  status: string
}

export interface AssetPoolDetailVM extends AssetPoolListItemVM {
  scope_rule: AssetPoolScopeRule
  summary?: {
    asset_count: number
    task_count: number
    finding_count: number
  }
  recent_tasks: any[]
  recent_findings: any[]
}

export interface PoolInputRecordVM {
  id: string
  raw_value: string
  normalized_value: string
  parsed_type: string
  ingest_type: string
  source_type: string
  source_ref: string
  status: string
  created_at: string
}

export interface PoolAssetVM {
  id: string
  asset_kind: string
  display_name: string
  normalized_key: string
  status: string
  confidence_level: string
  system_facets: string[]
  custom_tags: string[]
  source_summary: Record<string, any>
  detail: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreateAssetPoolPayload {
  name: string
  description?: string
  scope_rule?: AssetPoolScopeRule
  tags?: string[]
}

export interface ImportInputsPayload {
  mode: string
  source: string
  source_ref?: string
  items: string[]
}

export interface InputImportResult {
  total: number
  accepted_count: number
  duplicate_count: number
  invalid_count: number
}

function mapToAssetPoolListItemVM(dto: any): AssetPoolListItemVM {
  return {
    id: dto.id || '',
    name: dto.name || 'Untitled Pool',
    description: dto.description || '',
    tags: dto.tags || [],
    asset_count: dto.summary?.asset_count ?? dto.asset_count ?? 0,
    task_count: dto.summary?.task_count ?? dto.task_count ?? 0,
    finding_count: dto.summary?.finding_count ?? dto.finding_count ?? 0,
    created_at: dto.created_at || '',
    updated_at: dto.updated_at || dto.created_at || '',
    status: dto.status || 'active',
  }
}

function mapToAssetPoolDetailVM(dto: any): AssetPoolDetailVM {
  const base = mapToAssetPoolListItemVM(dto)
  return {
    ...base,
    scope_rule: dto.scope_rule || {},
    summary: dto.summary || undefined,
    recent_tasks: dto.recent_tasks || [],
    recent_findings: dto.recent_findings || [],
  }
}

function mapToPoolInputRecordVM(dto: any): PoolInputRecordVM {
  return {
    id: dto.id || '',
    raw_value: dto.raw_value || '',
    normalized_value: dto.normalized_value || '',
    parsed_type: dto.parsed_type || 'unknown',
    ingest_type: dto.ingest_type || 'unknown',
    source_type: dto.source_type || 'unknown',
    source_ref: dto.source_ref || '',
    status: dto.status || 'unknown',
    created_at: dto.created_at || '',
  }
}

function mapToPoolAssetVM(dto: any): PoolAssetVM {
  return {
    id: dto.id || '',
    asset_kind: dto.asset_kind || 'unknown',
    display_name: dto.display_name || '',
    normalized_key: dto.normalized_key || '',
    status: dto.status || 'unknown',
    confidence_level: dto.confidence_level || 'unknown',
    system_facets: dto.system_facets || [],
    custom_tags: dto.custom_tags || [],
    source_summary: dto.source_summary || {},
    detail: dto.detail || {},
    created_at: dto.created_at || '',
    updated_at: dto.updated_at || dto.created_at || '',
  }
}

export interface AssetPoolStatusInfo {
  label: string
  color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  isDeleting: boolean
}

export function getAssetPoolStatusInfo(status: string): AssetPoolStatusInfo {
  switch (status) {
    case 'deleting':
      return { label: '删除中', color: 'danger', isDeleting: true }
    case 'active':
      return { label: '活跃', color: 'success', isDeleting: false }
    default:
      return { label: status || '正常', color: 'default', isDeleting: false }
  }
}

export function useAssetPools(params: { page?: number; page_size?: number; keyword?: string; tag?: string; sort?: string; order?: string }) {
  return useQuery({
    queryKey: ['asset-pools', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>('/asset-pools', { params })
      return {
        ...res.data,
        data: (res.data.data || []).map(mapToAssetPoolListItemVM),
      }
    },
  })
}

export function useAssetPoolDetail(id?: string) {
  return useQuery({
    queryKey: ['asset-pools', id],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any }>(`/asset-pools/${id}`)
      return mapToAssetPoolDetailVM(res.data.data)
    },
    enabled: Boolean(id),
  })
}

export function useCreateAssetPool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateAssetPoolPayload) => {
      const res = await httpClient.post<{ data: any }>('/asset-pools', payload)
      return mapToAssetPoolListItemVM(res.data.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-pools'] })
    },
  })
}

export function useUpdateAssetPool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CreateAssetPoolPayload> }) => {
      const res = await httpClient.patch<{ data: any }>(`/asset-pools/${id}`, payload)
      return mapToAssetPoolListItemVM(res.data.data)
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['asset-pools', variables.id] })
      qc.invalidateQueries({ queryKey: ['asset-pools'] })
    },
  })
}

export function useDeleteAssetPool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await httpClient.delete(`/asset-pools/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-pools'] })
    },
  })
}

export function useImportInputs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ImportInputsPayload }) => {
      const res = await httpClient.post<{ data: InputImportResult }>(`/asset-pools/${id}/inputs/import`, payload)
      return res.data.data
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['asset-pools', variables.id] })
      qc.invalidateQueries({ queryKey: ['asset-pools', variables.id, 'inputs'] })
      qc.invalidateQueries({ queryKey: ['asset-pools', variables.id, 'assets'] })
    },
  })
}

export const useImportSeeds = useImportInputs

export function useAssetPoolInputs(
  id?: string,
  params?: {
    page?: number
    page_size?: number
    ingest_type?: string
    source_type?: string
    parsed_type?: string
    status?: string
    keyword?: string
    sort?: string
    order?: string
  },
) {
  return useQuery({
    queryKey: ['asset-pools', id, 'inputs', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>(`/asset-pools/${id}/inputs`, { params })
      return {
        ...res.data,
        data: (res.data.data || []).map(mapToPoolInputRecordVM),
      }
    },
    enabled: Boolean(id),
  })
}

export function useCreateTaskFromPool() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await httpClient.post<{ data: any }>(`/asset-pools/${id}/tasks`, payload)
      return res.data.data
    },
  })
}

export function useAssetPoolAssets(
  id?: string,
  params?: {
    page?: number
    page_size?: number
    view?: 'ip' | 'domain' | 'site'
    keyword?: string
    confidence?: string
    tag?: string
    sort?: string
    order?: string
  },
) {
  return useQuery({
    queryKey: ['asset-pools', id, 'assets', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>(`/asset-pools/${id}/assets`, { params })
      return {
        ...res.data,
        data: (res.data.data || []).map(mapToPoolAssetVM),
      }
    },
    enabled: Boolean(id),
  })
}

export interface TaskSummaryView {
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
  started_at?: string
  finished_at?: string
  desired_state: string
}

export interface FindingSummaryView {
  finding_id: string
  finding_type: string
  title: string
  severity: string
  status: string
  asset_ref: string
  created_at: string
}

function mapToTaskSummaryView(dto: any): TaskSummaryView {
  return {
    id: dto.id || '',
    name: dto.name || '',
    template_code: dto.template_code || '',
    template_name: dto.template_name || dto.template_code || '',
    asset_pool_id: dto.asset_pool_id || '',
    asset_pool_name: dto.asset_pool_name || '',
    target_set_id: dto.target_set_id || '',
    status: dto.status || 'draft',
    stage_plan: dto.stage_plan || [],
    created_by: dto.created_by || '',
    created_at: dto.created_at || '',
    updated_at: dto.updated_at || dto.created_at || '',
    started_at: dto.started_at || '',
    finished_at: dto.finished_at || '',
    desired_state: dto.desired_state || 'running',
  }
}

export function useAssetPoolTasks(id?: string, params?: { page?: number; page_size?: number; template_code?: string; status?: string; keyword?: string; sort?: string; order?: string }) {
  return useQuery({
    queryKey: ['asset-pools', id, 'tasks', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>(`/asset-pools/${id}/tasks`, { params })
      return {
        ...res.data,
        data: (res.data.data || []).map(mapToTaskSummaryView),
      }
    },
    enabled: Boolean(id),
  })
}

export function useAssetPoolFindings(id?: string, params?: { page?: number; page_size?: number; severity?: string; status?: string }) {
  return useQuery({
    queryKey: ['asset-pools', id, 'findings', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: FindingSummaryView[]; pagination?: PaginationMeta }>(`/asset-pools/${id}/findings`, { params })
      return res.data
    },
    enabled: Boolean(id),
  })
}

// Since ReportView is not defined in asset.ts, we need to redefine it or just import it. Let's just define a minimal type here to avoid circular dependencies.
export interface ReportSummaryView {
  id: string
  name: string
  scope_type: string
  scope_id: string
  scope_name: string
  status: string
  created_by: string
  created_at: string
  updated_at: string
}

export function useAssetPoolReports(id?: string, params?: { page?: number; page_size?: number; status?: string }) {
  return useQuery({
    queryKey: ['asset-pools', id, 'reports', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: ReportSummaryView[]; pagination?: PaginationMeta }>(`/asset-pools/${id}/reports`, { params })
      return res.data
    },
    enabled: Boolean(id),
  })
}

// ─── 单条资产池资产详情（懒加载，仅展开时触发）──────────────────────────────
export function useAssetPoolAssetDetail(poolId?: string, assetId?: string) {
  return useQuery({
    queryKey: ['asset-pools', poolId, 'assets', assetId],
    queryFn: async (): Promise<PoolAssetVM> => {
      const res = await httpClient.get<{ data: any }>(`/asset-pools/${poolId}/assets/${assetId}`)
      const dto = res.data.data || res.data
      return {
        id: dto.id || '',
        asset_kind: dto.asset_kind || 'unknown',
        display_name: dto.display_name || '',
        normalized_key: dto.normalized_key || '',
        status: dto.status || 'active',
        confidence_level: dto.confidence_level || 'unknown',
        system_facets: dto.system_facets || [],
        custom_tags: dto.custom_tags || [],
        source_summary: dto.source_summary || {},
        detail: dto.detail || {},
        created_at: dto.created_at || '',
        updated_at: dto.updated_at || dto.created_at || '',
      }
    },
    enabled: Boolean(poolId && assetId),
    staleTime: 30_000,
  })
}
