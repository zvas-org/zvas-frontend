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

export interface HTTPProbeSummaryVM {
  site_url: string
  status_code: number | null
  title: string
  content_length: number | null
  server: string
  html_hash: string
  favicon_hash: string
  icp: string
  probe_status?: 'alive' | 'unreachable' | string
  probe_error?: string
}

export function parseHttpProbeSummary(extraPayload: unknown): HTTPProbeSummaryVM | null {
  if (!extraPayload) return null
  const root = extraPayload as any
  const payload = root.http_probe || root
  if (!payload.site_url && !payload.status_code && !payload.title && !payload.probe_status) {
    if (Object.keys(payload).length === 0) return null
  }
  return {
    site_url: payload.site_url || '',
    status_code: payload.status_code ? Number(payload.status_code) : null,
    title: payload.title || '',
    content_length: payload.content_length ? Number(payload.content_length) : null,
    server: payload.server || '',
    html_hash: payload.html_hash || '',
    favicon_hash: payload.favicon_hash || '',
    icp: payload.icp || '',
    probe_status: payload.probe_status || undefined,
    probe_error: payload.probe_error || undefined,
  }
}

export function getProbeStatusLabel(status: string | undefined): string {
  if (status === 'alive') return '站点存活'
  if (status === 'unreachable') return '站点不存活'
  return status ? `未知 (${status})` : '未知状态'
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
  source?: string
  source_ref?: string
  items?: string[]
  content?: string
  file?: File | null
}

export interface AssetPoolListParams {
  page?: number
  page_size?: number
  keyword?: string
  tag?: string
  sort?: string
  order?: string
}

export interface AssetPoolAssetListParams {
  page?: number
  page_size?: number
  view?: string
  asset_kind?: string
  keyword?: string
  status?: string
  confidence?: string
  tag?: string
  sort?: string
  order?: string
}

export interface AssetPoolInputListResponse {
  data: PoolInputRecordVM[]
  pagination?: PaginationMeta
}

export interface AssetPoolDetailResponse {
  data: AssetPoolDetailVM
}

export interface PoolAssetListResponse {
  data: PoolAssetVM[]
  pagination?: PaginationMeta
}

export interface AssetPoolSummaryVM {
  asset_count: number
  task_count: number
  finding_count: number
}

export interface RecentTaskVM {
  id: string
  name: string
  status: string
  created_at: string
}

export interface RecentFindingVM {
  id: string
  title: string
  severity: string
  created_at: string
}

export interface AssetRelationVM {
  relation_type: string
  target_asset_id: string
  target_asset_kind: string
  target_display_name: string
  properties: Record<string, any>
  created_at: string
}

export interface AssetObservationVM {
  observation_type: string
  source_task_id: string
  summary: Record<string, any>
  created_at: string
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
  route_plan: string[]
  created_by: string
  created_at: string
  updated_at: string
  started_at?: string
  finished_at?: string
  desired_state: string
  active_route_code: string
  active_group: string
  blocked_reason: string
  active_attack_route: string
  route_progress: { route_code: string; group_code: string; state: string; seeded_at: string; completed_at: string; blocked_reason: string }[]
}

export interface FindingSummaryView {
  finding_id: string
  finding_type: string
  title: string
  severity: string
  status: string
  asset_pool_id: string
  asset_pool_name: string
  asset_ref: string
  task_id: string
  task_name: string
  snapshot_id: string
  asset_id: string
  rule_id: string
  base_url: string
  link: string
  target_url: string
  host: string
  ip: string
  port: number
  scheme: string
  matcher_name: string
  created_at: string
  updated_at: string
  detail?: Record<string, any>
  classification?: Record<string, any>
  evidence?: Record<string, any>
  raw?: Record<string, any>
}

export interface AssetPoolWeakScanFindingVM {
  id: string
  task_unit_id: string
  task_id: string
  task_name: string
  asset_pool_id: string
  asset_pool_name: string
  target_url: string
  site_asset_id: string
  finding_key: string
  remote_scan_id: string
  remote_result_id: string
  remote_vulnerability_id: string
  rule_id: string
  rule_name: string
  severity: string
  status: string
  tags: string[]
  affects_url: string
  affects_detail: string
  cvss2: string
  cvss3: string
  cvss_score: string
  description: string
  impact: string
  recommendation: string
  details: string
  request: string
  response: string
  source: string
  matched_at?: string
  classification: Record<string, any>
  evidence: Record<string, any>
  raw: Record<string, any>
  updated_at: string
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
    route_plan: dto.route_plan || [],
    created_by: dto.created_by || '',
    created_at: dto.created_at || '',
    updated_at: dto.updated_at || dto.created_at || '',
    started_at: dto.started_at || '',
    finished_at: dto.finished_at || '',
    desired_state: dto.desired_state || 'running',
    active_route_code: dto.active_route_code || '',
    active_group: dto.active_group || '',
    blocked_reason: dto.blocked_reason || '',
    active_attack_route: dto.active_attack_route || '',
    route_progress: (dto.route_progress || []).map((item: any) => ({
      route_code: item.route_code || '',
      group_code: item.group_code || '',
      state: item.state || 'pending',
      seeded_at: item.seeded_at || '',
      completed_at: item.completed_at || '',
      blocked_reason: item.blocked_reason || '',
    })),
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

function mapToFindingSummaryView(dto: any): FindingSummaryView {
  const detail = dto.detail || {}
  const classification = detail.classification && typeof detail.classification === 'object' && !Array.isArray(detail.classification) ? detail.classification : {}
  const evidence = detail.evidence && typeof detail.evidence === 'object' && !Array.isArray(detail.evidence) ? detail.evidence : {}
  const raw = detail.raw && typeof detail.raw === 'object' && !Array.isArray(detail.raw) ? detail.raw : {}
  const baseURL = detail.base_url || detail.site_url || detail.url || ''
  const link = detail.link || raw['matched-at'] || detail.target_url || baseURL || detail.host || ''
  const assetRef = baseURL || detail.host || detail.url || detail.target_url || dto.asset_id || '-'
  return {
    finding_id: dto.id || '',
    finding_type: dto.finding_type || '',
    title: dto.title || '',
    severity: dto.severity || '',
    status: dto.status || '',
    asset_pool_id: dto.asset_pool_id || '',
    asset_pool_name: dto.asset_pool_name || '',
    asset_ref: assetRef,
    task_id: dto.task_id || '',
    task_name: dto.task_name || '',
    snapshot_id: dto.snapshot_id || '',
    asset_id: dto.asset_id || '',
    rule_id: detail.rule_id || '',
    base_url: baseURL,
    link,
    target_url: detail.target_url || '',
    host: detail.host || '',
    ip: detail.ip || '',
    port: detail.port ?? 0,
    scheme: detail.scheme || '',
    matcher_name: detail.matcher_name || '',
    created_at: dto.created_at || '',
    updated_at: dto.updated_at || dto.created_at || '',
    detail,
    classification,
    evidence,
    raw,
  }
}

export async function deleteAssetPoolFinding(poolId: string, findingId: string): Promise<void> {
  await httpClient.delete(`/asset-pools/${poolId}/findings/${findingId}`)
}

export function useAssetPoolFindings(
  id?: string,
  params?: { page?: number; page_size?: number; url?: string; poc_id?: string; severity?: string; status?: string },
) {
  return useQuery({
    queryKey: ['asset-pools', id, 'findings', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>(`/asset-pools/${id}/findings`, { params })
      return {
        ...res.data,
        data: (res.data.data || []).map(mapToFindingSummaryView),
      }
    },
    enabled: Boolean(id),
  })
}

export function useAssetPoolWeakScanFindings(
  id?: string,
  params?: {
    page?: number
    page_size?: number
    url?: string
    keyword?: string
    task_id?: string
    rule_id?: string
    severity?: string
    status?: string
    sort?: string
    order?: string
  },
) {
  return useQuery({
    queryKey: ['asset-pools', id, 'weak-scan-findings', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>(`/asset-pools/${id}/weak-scan-findings`, { params })
      return {
        ...res.data,
        data: (res.data.data || []).map((item: any): AssetPoolWeakScanFindingVM => ({
          id: item.id || '',
          task_unit_id: item.task_unit_id || '',
          task_id: item.task_id || '',
          task_name: item.task_name || '',
          asset_pool_id: item.asset_pool_id || '',
          asset_pool_name: item.asset_pool_name || '',
          target_url: item.target_url || '',
          site_asset_id: item.site_asset_id || '',
          finding_key: item.finding_key || '',
          remote_scan_id: item.remote_scan_id || '',
          remote_result_id: item.remote_result_id || '',
          remote_vulnerability_id: item.remote_vulnerability_id || '',
          rule_id: item.rule_id || '',
          rule_name: item.rule_name || '',
          severity: item.severity || '',
          status: item.status || '',
          tags: item.tags || [],
          affects_url: item.affects_url || '',
          affects_detail: item.affects_detail || '',
          cvss2: item.cvss2 || '',
          cvss3: item.cvss3 || '',
          cvss_score: item.cvss_score || '',
          description: item.description || '',
          impact: item.impact || '',
          recommendation: item.recommendation || '',
          details: item.details || '',
          request: item.request || '',
          response: item.response || '',
          source: item.source || '',
          matched_at: item.matched_at || '',
          classification: item.classification || {},
          evidence: item.evidence || {},
          raw: item.raw || {},
          updated_at: item.updated_at || '',
        })),
      }
    },
    enabled: Boolean(id),
  })
}

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

export function useAssetPoolDetail(id?: string) {
  return useQuery({
    queryKey: ['asset-pools', id],
    queryFn: async (): Promise<AssetPoolDetailVM> => {
      const res = await httpClient.get<{ data: any }>(`/asset-pools/${id}`)
      const dto = res.data.data || res.data
      return {
        id: dto.id || '',
        name: dto.name || '',
        description: dto.description || '',
        tags: dto.tags || [],
        asset_count: dto.asset_count ?? dto.summary?.asset_count ?? 0,
        task_count: dto.task_count ?? dto.summary?.task_count ?? 0,
        finding_count: dto.finding_count ?? dto.summary?.finding_count ?? 0,
        created_at: dto.created_at || '',
        updated_at: dto.updated_at || dto.created_at || '',
        status: dto.status || 'active',
        scope_rule: dto.scope_rule || {},
        summary: dto.summary ? {
          asset_count: dto.summary.asset_count ?? 0,
          task_count: dto.summary.task_count ?? 0,
          finding_count: dto.summary.finding_count ?? 0,
        } : undefined,
        recent_tasks: dto.recent_tasks || [],
        recent_findings: dto.recent_findings || [],
      }
    },
    enabled: Boolean(id),
  })
}

export function useAssetPoolList(params: AssetPoolListParams) {
  return useQuery({
    queryKey: ['asset-pools', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>('/asset-pools', { params })
      return {
        ...res.data,
        data: (res.data.data || []).map((dto: any) => ({
          id: dto.id || '',
          name: dto.name || '',
          description: dto.description || '',
          tags: dto.tags || [],
          asset_count: dto.asset_count ?? 0,
          task_count: dto.task_count ?? 0,
          finding_count: dto.finding_count ?? 0,
          created_at: dto.created_at || '',
          updated_at: dto.updated_at || dto.created_at || '',
          status: dto.status || 'active',
        })),
      }
    },
  })
}

export function useAssetPools(params: AssetPoolListParams) {
  return useAssetPoolList(params)
}

export function useCreateAssetPool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateAssetPoolPayload) => {
      const res = await httpClient.post('/asset-pools', payload)
      return res.data
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
      const res = await httpClient.patch(`/asset-pools/${id}`, payload)
      return res.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['asset-pools'] })
      qc.invalidateQueries({ queryKey: ['asset-pools', vars.id] })
    },
  })
}

export function useDeleteAssetPool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await httpClient.delete(`/asset-pools/${id}`)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-pools'] })
    },
  })
}

export function useImportAssetPoolInputs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ImportInputsPayload }) => {
      const res = await httpClient.post(`/asset-pools/${id}/inputs/import`, payload)
      return res.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['asset-pools', vars.id] })
      qc.invalidateQueries({ queryKey: ['asset-pools', vars.id, 'inputs'] })
      qc.invalidateQueries({ queryKey: ['asset-pools'] })
    },
  })
}

export function useImportInputs() {
  return useImportAssetPoolInputs()
}

export function useAssetPoolInputs(id?: string, params?: { page?: number; page_size?: number; status?: string; source_type?: string; keyword?: string; sort?: string; order?: string }) {
  return useQuery({
    queryKey: ['asset-pools', id, 'inputs', params],
    queryFn: async (): Promise<AssetPoolInputListResponse> => {
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>(`/asset-pools/${id}/inputs`, { params })
      return {
        ...res.data,
        data: (res.data.data || []).map((dto: any) => ({
          id: dto.id || '',
          raw_value: dto.raw_value || '',
          normalized_value: dto.normalized_value || '',
          parsed_type: dto.parsed_type || '',
          ingest_type: dto.ingest_type || '',
          source_type: dto.source_type || '',
          source_ref: dto.source_ref || '',
          status: dto.status || '',
          created_at: dto.created_at || '',
        })),
      }
    },
    enabled: Boolean(id),
  })
}

export function useAssetPoolAssets(id?: string, params?: AssetPoolAssetListParams) {
  return useQuery({
    queryKey: ['asset-pools', id, 'assets', params],
    queryFn: async (): Promise<PoolAssetListResponse> => {
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>(`/asset-pools/${id}/assets`, { params })
      return {
        ...res.data,
        data: (res.data.data || []).map((dto: any) => ({
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
        })),
      }
    },
    enabled: Boolean(id),
  })
}

export function useAssetPoolRelations(poolId?: string, assetId?: string) {
  return useQuery({
    queryKey: ['asset-pools', poolId, 'assets', assetId, 'relations'],
    queryFn: async (): Promise<AssetRelationVM[]> => {
      const res = await httpClient.get<{ data: any[] }>(`/asset-pools/${poolId}/assets/${assetId}/relations`)
      return (res.data.data || []).map((dto: any) => ({
        relation_type: dto.relation_type || '',
        target_asset_id: dto.target_asset_id || '',
        target_asset_kind: dto.target_asset_kind || '',
        target_display_name: dto.target_display_name || '',
        properties: dto.properties || {},
        created_at: dto.created_at || '',
      }))
    },
    enabled: Boolean(poolId && assetId),
  })
}

export function useAssetPoolObservations(poolId?: string, assetId?: string) {
  return useQuery({
    queryKey: ['asset-pools', poolId, 'assets', assetId, 'observations'],
    queryFn: async (): Promise<AssetObservationVM[]> => {
      const res = await httpClient.get<{ data: any[] }>(`/asset-pools/${poolId}/assets/${assetId}/observations`)
      return (res.data.data || []).map((dto: any) => ({
        observation_type: dto.observation_type || '',
        source_task_id: dto.source_task_id || '',
        summary: dto.summary || {},
        created_at: dto.created_at || '',
      }))
    },
    enabled: Boolean(poolId && assetId),
  })
}

export async function downloadAssetPoolVulnerabilityReport(
  poolId: string,
  format: 'word' | 'excel',
  params?: { url?: string; poc_id?: string; severity?: string; status?: string; keyword?: string },
): Promise<void> {
  const endpoint = format === 'word' ? `/asset-pools/${poolId}/reports/vulnerability-word` : `/asset-pools/${poolId}/reports/vulnerability-excel`
  const response = await httpClient.get<Blob>(endpoint, {
    params,
    responseType: 'blob',
  })
  const disposition = String(response.headers['content-disposition'] || '')
  const matched = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  const fallback = format === 'word' ? 'asset-pool-vulnerability-report.docx' : 'asset-pool-vulnerability-checklist.xlsx'
  const fileName = matched ? decodeURIComponent(matched[1]) : fallback
  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || 'application/octet-stream',
  })
  const href = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(href)
}
