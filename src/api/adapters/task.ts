/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/api/client'
import type { PaginationMeta, ReportSummaryView } from './asset'
import { parseHttpProbeSummary } from './asset'

export const TERMINAL_TASK_STATUSES = ['succeeded', 'failed', 'stopped', 'deleted']
const WEAK_SCAN_TASK_PLANS = new Set(['weak_scan', 'weak_scan.site'])
const WEAK_SCAN_TASK_TEMPLATES = new Set(['site_weak_scan', 'weak_scan'])

export function isTerminalTaskStatus(status: string): boolean {
  return TERMINAL_TASK_STATUSES.includes(status)
}

export function taskHasWeakScanPlan(task: Pick<TaskListItemVM, 'template_code' | 'route_plan' | 'stage_plan'> | TaskDetailVM | null | undefined): boolean {
  if (!task) return false

  const plans = [...(task.route_plan || []), ...(task.stage_plan || [])]
  if (plans.some((item) => WEAK_SCAN_TASK_PLANS.has(item))) {
    return true
  }

  return WEAK_SCAN_TASK_TEMPLATES.has(task.template_code || '')
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
  active_route_code: string
  active_group: string
  blocked_reason: string
  active_attack_route: string
  route_progress: RouteProgressVM[]
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

/** 路由级执行进度 */
export interface RouteProgressVM {
  route_code: string
  group_code: string
  state: string
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
  active_route_code: string
  active_group: string
  blocked_reason: string
  active_attack_route: string
  route_progress: RouteProgressVM[]
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


export interface TaskRecordPortResultVM {
  target: string
  resolved_ip: string
  port: number
  protocol: string
  service: string
  version: string
  banner: string
  subject: string
  dns_names: string[]
  fingerprinted: boolean
  status: string
  homepage_url: string
}

export interface TaskRecordHTTPResultVM {
  target: string
  site_url: string
  probe_status: string
  probe_error: string
  status_code: number
  title: string
  content_length: number
  server: string
  html_hash: string
  favicon_hash: string
  icp: string
  expanded_asset_kind: string
  expanded_display_name: string
  expanded_normalized_key: string
  expanded_source_type: string
  expanded_confidence_level: string
  request_message: string
  response_header_text: string
  response_header_map: Record<string, any>
  response_body: string
}

export interface TaskRecordVulScanSummaryVM {
  target_url: string
  site_asset_id: string
  profile_code: string
  scan_mode: string
  vulnerability_count: number
  severity_summary: Record<string, any>
  skip_reason: string
  error: string
  stats: Record<string, any>
}

export interface TaskRecordWeakScanSummaryVM {
  engine: string
  target_url: string
  site_asset_id: string
  scan_profile: string
  vulnerability_count: number
  severity_summary: Record<string, any>
  report_ref: string
  remote_scan_id: string
  remote_target_id: string
  remote_profile_id: string
  error: string
}

export interface TaskWeakScanFindingVM {
  id: string
  task_unit_id: string
  task_id: string
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

export interface TaskRecordVulnerabilityVM {
  id: string
  vulnerability_key: string
  base_url: string
  link: string
  target_url: string
  template_id?: string
  rule_id: string
  rule_name: string
  severity: string
  tags: string[]
  matcher_name: string
  matched_at?: string
  host: string
  ip: string
  port: number
  scheme: string
  classification: Record<string, any>
  evidence: Record<string, any>
  raw: Record<string, any>
}

export interface VulnerabilityTypeDictItemVM {
  vul_type_id: number
  code: string
  vul_type: string
  default_severity: string
  impact_zh: string
  remediation_zh: string
}

export interface TaskFindingRuleMapVM {
  template_id: string
  current?: VulnerabilityTypeDictItemVM
  candidates: VulnerabilityTypeDictItemVM[]
}

export interface UpdateTaskFindingPayload {
  finding_patch?: {
    rule_name?: string
    severity?: string
    matched_at?: string
    target_url?: string
    host?: string
    ip?: string
    port?: number
    scheme?: string
    matcher_name?: string
    classification?: Record<string, any>
    evidence?: Record<string, any>
  }
  mapping_patch?: {
    vul_type_id?: number
    clear_mapping?: boolean
  }
}

export interface CreateManualTaskFindingPayload {
  rule_name: string
  severity: string
  target_url: string
  template_id?: string
  description: string
  remediation: string
  request?: string
  response?: string
  matched_at?: string
}

export interface TaskRecordDetailVM extends TaskRecordVM {
  payload: Record<string, any>
  result: Record<string, any>
  port_results: TaskRecordPortResultVM[]
  http_result?: TaskRecordHTTPResultVM
  vul_scan_summary?: TaskRecordVulScanSummaryVM
  weak_scan_summary?: TaskRecordWeakScanSummaryVM
  vulnerabilities: TaskRecordVulnerabilityVM[]
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

function mapRouteProgress(arr: any[]): RouteProgressVM[] {
  return (arr || []).map((item: any) => ({
    route_code: item.route_code || '',
    group_code: item.group_code || '',
    state: item.state || 'pending',
    seeded_at: item.seeded_at || '',
    completed_at: item.completed_at || '',
    blocked_reason: item.blocked_reason || '',
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
    active_route_code: dto.active_route_code || '',
    active_group: dto.active_group || '',
    blocked_reason: dto.blocked_reason || '',
    active_attack_route: dto.active_attack_route || '',
    route_progress: mapRouteProgress(dto.route_progress),
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
    active_route_code: dto.active_route_code || '',
    active_group: dto.active_group || '',
    blocked_reason: dto.blocked_reason || '',
    active_attack_route: dto.active_attack_route || '',
    route_progress: mapRouteProgress(dto.route_progress),
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


function mapToTaskRecordDetailVM(dto: any): TaskRecordDetailVM {
  const result = dto.result || {}
  return {
    ...mapToTaskRecordVM(dto),
    payload: dto.payload || {},
    result,
    port_results: (dto.port_results || []).map((item: any) => ({
      target: item.target || '',
      resolved_ip: item.resolved_ip || '',
      port: item.port ?? 0,
      protocol: item.protocol || '',
      service: item.service || '',
      version: item.version || '',
      banner: item.banner || '',
      subject: item.subject || '',
      dns_names: item.dns_names || [],
      fingerprinted: Boolean(item.fingerprinted),
      status: item.status || '',
      homepage_url: item.homepage_url || '',
    })),
    http_result: dto.http_result ? {
      target: dto.http_result.target || '',
      site_url: dto.http_result.site_url || '',
      probe_status: dto.http_result.probe_status || '',
      probe_error: dto.http_result.probe_error || '',
      status_code: dto.http_result.status_code ?? 0,
      title: dto.http_result.title || '',
      content_length: dto.http_result.content_length ?? 0,
      server: dto.http_result.server || '',
      html_hash: dto.http_result.html_hash || '',
      favicon_hash: dto.http_result.favicon_hash || '',
      icp: dto.http_result.icp || '',
      expanded_asset_kind: dto.http_result.expanded_asset_kind || '',
      expanded_display_name: dto.http_result.expanded_display_name || '',
      expanded_normalized_key: dto.http_result.expanded_normalized_key || '',
      expanded_source_type: dto.http_result.expanded_source_type || '',
      expanded_confidence_level: dto.http_result.expanded_confidence_level || '',
      request_message: dto.http_result.request_message || '',
      response_header_text: dto.http_result.response_header_text || '',
      response_header_map: dto.http_result.response_header_map || {},
      response_body: dto.http_result.response_body || '',
    } : undefined,
    vul_scan_summary: dto.vul_scan_summary ? {
      target_url: dto.vul_scan_summary.target_url || '',
      site_asset_id: dto.vul_scan_summary.site_asset_id || '',
      profile_code: dto.vul_scan_summary.profile_code || '',
      scan_mode: dto.vul_scan_summary.scan_mode || '',
      vulnerability_count: dto.vul_scan_summary.vulnerability_count ?? 0,
      severity_summary: dto.vul_scan_summary.severity_summary || {},
      skip_reason: dto.vul_scan_summary.skip_reason || '',
      error: dto.vul_scan_summary.error || '',
      stats: dto.vul_scan_summary.stats || {},
    } : undefined,
    weak_scan_summary: mapToTaskRecordWeakScanSummary(dto, result),
    vulnerabilities: (dto.vulnerabilities || []).map(mapToTaskRecordVulnerabilityVM),
  }
}

function mapToTaskRecordVulnerabilityVM(item: any): TaskRecordVulnerabilityVM {
  const baseURL = item.base_url || item.site_url || ''
  const isManualFinding = item.raw?.source === 'manual' || item.matcher_name === 'manual'
  const link = item.link || item.raw?.['matched-at'] || (isManualFinding ? '' : (item.target_url || baseURL || item.host || ''))
  return {
    id: item.id || '',
    vulnerability_key: item.vulnerability_key || '',
    base_url: baseURL,
    link,
    target_url: item.target_url || '',
    template_id: item.template_id || item.raw?.template_id || item.rule_id || '',
    rule_id: item.rule_id || '',
    rule_name: item.rule_name || '',
    severity: item.severity || '',
    tags: item.tags || [],
    matcher_name: item.matcher_name || '',
    matched_at: item.matched_at || '',
    host: item.host || '',
    ip: item.ip || '',
    port: item.port ?? 0,
    scheme: item.scheme || '',
    classification: item.classification || {},
    evidence: item.evidence || {},
    raw: item.raw || {},
  }
}

function mapToVulnerabilityTypeDictItemVM(dto: any): VulnerabilityTypeDictItemVM {
  return {
    vul_type_id: dto.vul_type_id ?? 0,
    code: dto.code || '',
    vul_type: dto.vul_type || '',
    default_severity: dto.default_severity || '',
    impact_zh: dto.impact_zh || '',
    remediation_zh: dto.remediation_zh || '',
  }
}

function mapToTaskFindingRuleMapVM(dto: any): TaskFindingRuleMapVM {
  return {
    template_id: dto.template_id || '',
    current: dto.current ? mapToVulnerabilityTypeDictItemVM(dto.current) : undefined,
    candidates: (dto.candidates || []).map(mapToVulnerabilityTypeDictItemVM),
  }
}

function mapToTaskRecordWeakScanSummary(dto: any, result: Record<string, any>): TaskRecordWeakScanSummaryVM | undefined {
  const summary = dto.weak_scan_summary || result || {}
  const taskType = dto.task_type || dto.taskType || ''
  const stage = dto.stage || ''
  const routeCode = dto.route_code || ''
  const engine = summary.engine || ''
  const isWeakScan = taskType === 'weak_scan' || stage === 'weak_scan' || routeCode === 'weak_scan.site' || engine === 'weak-scan-site'
  if (!isWeakScan) {
    return undefined
  }
  return {
    engine: summary.engine || 'weak-scan-site',
    target_url: summary.target_url || dto.target_key || '',
    site_asset_id: summary.site_asset_id || '',
    scan_profile: summary.scan_profile || summary.profile_code || '',
    vulnerability_count: summary.vulnerability_count ?? 0,
    severity_summary: summary.severity_summary || {},
    report_ref: summary.report_ref || summary.report_url || summary.report_id || '',
    remote_scan_id: summary.remote_scan_id || '',
    remote_target_id: summary.remote_target_id || '',
    remote_profile_id: summary.remote_profile_id || '',
    error: summary.error || '',
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

/** Task-030 专用：映射具体阶段内的特有插件实现路由，抹去第三方品牌和底层配置 */
export function getAttackRouteLabel(route: string): string {
  if (route === 'vuln_scan.nuclei' || route === 'vuln_scan' || route === 'vul_scan.site') return '漏洞扫描'
  if (route === 'weak_scan.site' || route === 'weak_scan') return '弱点扫描'
  return route || ''
}

export function getTemplateCodeLabel(code: string): string {
  if (code === 'vuln_scan') return '漏洞扫描'
  if (code === 'weak_scan' || code === 'site_weak_scan') return '弱点扫描'
  return code || '-'
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


export function useTaskRecordDetail(id?: string, unitId?: string, enabled = true) {
  return useQuery({
    queryKey: ['tasks', id, 'records', unitId, 'detail'],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any }>(`/tasks/${id}/records/${unitId}`)
      return mapToTaskRecordDetailVM(res.data.data)
    },
    enabled: Boolean(id && unitId && enabled),
  })
}

export function useTaskFindings(
  id?: string,
  params?: {
    page?: number
    page_size?: number
    url?: string
    poc_id?: string
    severity?: string
  },
  enabled = true,
) {
  return useQuery({
    queryKey: ['tasks', id, 'findings', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>(`/tasks/${id}/findings`, { params })
      return {
        ...res.data,
        data: (res.data.data || []).map(mapToTaskRecordVulnerabilityVM),
      }
    },
    enabled: Boolean(id && enabled),
    refetchInterval: enabled ? 5000 : false,
  })
}

export function useTaskFindingDetail(taskId?: string, findingId?: string, enabled = true) {
  return useQuery({
    queryKey: ['tasks', taskId, 'findings', findingId, 'detail'],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any }>(`/tasks/${taskId}/findings/${findingId}`)
      return mapToTaskRecordVulnerabilityVM(res.data.data)
    },
    enabled: Boolean(taskId && findingId && enabled),
  })
}

export function useTaskFindingRuleMap(templateId?: string, enabled = true) {
  return useQuery({
    queryKey: ['vulnerability-localization', 'rule-map', templateId],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any }>(`/vulnerability-localization/rule-map/${templateId}`)
      return mapToTaskFindingRuleMapVM(res.data.data)
    },
    enabled: Boolean(templateId && enabled),
  })
}

export function useUpdateTaskFinding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, findingId, payload }: { taskId: string; findingId: string; payload: UpdateTaskFindingPayload }) => {
      const res = await httpClient.put<{ data: any }>(`/tasks/${taskId}/findings/${findingId}`, payload)
      return mapToTaskRecordVulnerabilityVM(res.data.data)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks', vars.taskId, 'findings'] })
      qc.invalidateQueries({ queryKey: ['tasks', vars.taskId, 'records'] })
      qc.invalidateQueries({ queryKey: ['vulnerability-localization', 'rule-map'] })
    },
  })
}

export function useCreateManualTaskFinding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, payload }: { taskId: string; payload: CreateManualTaskFindingPayload }) => {
      const res = await httpClient.post<{ data: any }>(`/tasks/${taskId}/findings/manual`, payload)
      return mapToTaskRecordVulnerabilityVM(res.data.data)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks', vars.taskId, 'findings'] })
      qc.invalidateQueries({ queryKey: ['tasks', vars.taskId, 'records'] })
      qc.invalidateQueries({ queryKey: ['tasks', vars.taskId, 'reports'] })
    },
  })
}

export function useDeleteTaskFinding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, findingId }: { taskId: string; findingId: string }) => {
      await httpClient.delete(`/tasks/${taskId}/findings/${findingId}`)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks', vars.taskId, 'findings'] })
      qc.invalidateQueries({ queryKey: ['tasks', vars.taskId, 'records'] })
      qc.invalidateQueries({ queryKey: ['tasks', vars.taskId, 'reports'] })
    },
  })
}

export function useTaskWeakScanFindings(
  id?: string,
  params?: {
    page?: number
    page_size?: number
    unit_id?: string
    url?: string
    rule_id?: string
    severity?: string
    status?: string
  },
  enabled = true,
) {
  return useQuery({
    queryKey: ['tasks', id, 'weak-scan-findings', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>(`/tasks/${id}/weak-scan-findings`, { params })
      return {
        ...res.data,
        data: (res.data.data || []).map((item: any): TaskWeakScanFindingVM => ({
          id: item.id || '',
          task_unit_id: item.task_unit_id || '',
          task_id: item.task_id || '',
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
    enabled: Boolean(id && enabled),
    refetchInterval: enabled ? 5000 : false,
  })
}

export function useTaskReports(id?: string, params?: { page?: number; page_size?: number; status?: string }) {
  return useQuery({
    queryKey: ['tasks', id, 'reports', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: ReportSummaryView[]; pagination?: PaginationMeta }>(`/tasks/${id}/reports`, { params })
      return res.data
    },
    enabled: Boolean(id),
  })
}

export async function downloadTaskVulnerabilityReport(
  taskId: string,
  format: 'word' | 'excel' | 'html',
  params?: { url?: string; poc_id?: string; severity?: string; status?: string; keyword?: string },
): Promise<void> {
  const endpoint =
    format === 'word'
      ? `/tasks/${taskId}/reports/vulnerability-word`
      : format === 'excel'
        ? `/tasks/${taskId}/reports/vulnerability-excel`
        : `/tasks/${taskId}/reports/vulnerability-html`
  const response = await httpClient.get<Blob>(endpoint, {
    params,
    responseType: 'blob',
  })
  const disposition = String(response.headers['content-disposition'] || '')
  const matched = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  const fallback =
    format === 'word'
      ? 'task-vulnerability-report.docx'
      : format === 'excel'
        ? 'task-vulnerability-checklist.xlsx'
        : 'task-vulnerability-report.html'
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
  active_route_code: string
  active_group: string
  route_progress: RouteProgressVM[]
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
        active_route_code: task.active_route_code || '',
        active_group: task.active_group || '',
        route_progress: mapRouteProgress(task.route_progress),
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

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      await httpClient.delete(`/tasks/${taskId}`)
    },
    onSuccess: (_, taskId) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks', taskId] })
      qc.invalidateQueries({ queryKey: ['asset-pools'] })
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
