/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/api/client'
import type { PaginationMeta } from './asset'

export interface TaskTemplateListItemVM {
  code: string
  name: string
  description: string
  is_builtin: boolean
  is_enabled: boolean
  default_port_scan_mode: string
  default_http_probe_enabled: boolean
  default_concurrency: number
  default_rate: number
  default_timeout_ms: number
  preview_summary: string
  created_at: string
  updated_at: string
}

export interface TaskTemplateDetailVM extends TaskTemplateListItemVM {
  default_custom_ports: string
  allow_port_mode_override: boolean
  allow_http_probe_override: boolean
  allow_advanced_override: boolean
  default_stage_plan: string[]
  allowed_stages: string[]
  default_params: Record<string, string>
  supports_vul_scan: boolean
  supports_weak_scan: boolean
  default_vul_scan_severity: string[]
}

export const VUL_SCAN_SEVERITY_OPTIONS = [
  { value: 'low', label: '低危' },
  { value: 'medium', label: '中危' },
  { value: 'high', label: '高危' },
  { value: 'critical', label: '严重' },
] as const

const VUL_SCAN_SEVERITY_LABELS: Record<string, string> = {
  low: '低危',
  medium: '中危',
  high: '高危',
  critical: '严重',
}

const VUL_SCAN_SEVERITY_ORDER = VUL_SCAN_SEVERITY_OPTIONS.map((item) => item.value)
const VUL_SCAN_STAGE_KEYS = new Set(['vuln_scan', 'vul_scan'])
const WEAK_SCAN_STAGE_KEYS = new Set(['weak_scan'])
const SITE_BASED_TEMPLATE_CODES = new Set(['site_http_probe', 'site_vuln_scan', 'site_attack_scan', 'site_weak_scan'])
const TEMPLATE_PREVIEW_SUMMARY_MAP: Record<string, string> = {
  site_http_probe: '直接使用资产池已有站点执行首页识别，不补跑端口扫描。',
  site_vuln_scan: '直接使用资产池已有站点执行漏洞扫描，不补跑端口扫描与首页识别。',
  site_attack_scan: '直接使用资产池已有站点，依次执行漏洞扫描与弱点扫描，不补跑端口扫描与首页识别。',
  site_weak_scan: '直接使用资产池已有站点执行弱点扫描，不补跑端口扫描与首页识别。',
}

function mapToTaskTemplateListItemVM(dto: any): TaskTemplateListItemVM {
  return {
    code: dto.code || '',
    name: dto.name || '',
    description: dto.description || '',
    is_builtin: Boolean(dto.builtin),
    is_enabled: Boolean(dto.enabled),
    default_port_scan_mode: dto.default_port_scan_mode || 'top_100',
    default_http_probe_enabled: Boolean(dto.default_http_probe_enabled),
    default_concurrency: dto.default_concurrency ?? 0,
    default_rate: dto.default_rate ?? 0,
    default_timeout_ms: dto.default_timeout_ms ?? 0,
    preview_summary: Array.isArray(dto.preview_summary) ? dto.preview_summary.join('\n') : (dto.preview_summary || ''),
    created_at: dto.created_at || '',
    updated_at: dto.updated_at || dto.created_at || '',
  }
}

function mapToTaskTemplateDetailVM(dto: any): TaskTemplateDetailVM {
  const defaultStagePlan = Array.isArray(dto.default_stages) ? dto.default_stages : []
  const allowedStages = Array.isArray(dto.optional_stages) ? dto.optional_stages : []
  const defaultParams = dto.default_params && typeof dto.default_params === 'object' ? dto.default_params : {}
  const supportsVulScan = [...defaultStagePlan, ...allowedStages].some((stage) => VUL_SCAN_STAGE_KEYS.has(String(stage || '').trim()))
  const supportsWeakScan = [...defaultStagePlan, ...allowedStages].some((stage) => WEAK_SCAN_STAGE_KEYS.has(String(stage || '').trim()))
  const defaultVulScanSeverity = supportsVulScan
    ? normalizeVulScanSeverityValues(defaultParams.vul_scan_severity || VUL_SCAN_SEVERITY_ORDER)
    : []

  return {
    ...mapToTaskTemplateListItemVM(dto),
    default_custom_ports: dto.default_ports || '',
    allow_port_mode_override: Boolean(dto.allow_port_mode_override),
    allow_http_probe_override: Boolean(dto.allow_http_probe_override),
    allow_advanced_override: Boolean(dto.allow_advanced_override),
    default_stage_plan: defaultStagePlan,
    allowed_stages: allowedStages,
    default_params: defaultParams,
    supports_vul_scan: supportsVulScan,
    supports_weak_scan: supportsWeakScan,
    default_vul_scan_severity: defaultVulScanSeverity,
  }
}

export function normalizeVulScanSeverityValues(input?: string | string[]): string[] {
  const rawValues = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : []
  const selected = new Set<string>()

  rawValues.forEach((item) => {
    const value = String(item || '').trim().toLowerCase()
    if (VUL_SCAN_SEVERITY_LABELS[value]) {
      selected.add(value)
    }
  })

  return VUL_SCAN_SEVERITY_ORDER.filter((item) => selected.has(item))
}

export function buildVulScanSeverityParam(values: string[]): string {
  return normalizeVulScanSeverityValues(values).join(',')
}

export function getVulScanSeverityLabel(value: string): string {
  return VUL_SCAN_SEVERITY_LABELS[String(value || '').trim().toLowerCase()] || value || '-'
}

export function formatVulScanSeverityLabels(values: string[]): string {
  const normalized = normalizeVulScanSeverityValues(values)
  if (normalized.length === 0) {
    return '未设置'
  }
  return normalized.map(getVulScanSeverityLabel).join(' / ')
}

export function isSiteBasedTemplate(templateCode: string): boolean {
  return SITE_BASED_TEMPLATE_CODES.has(String(templateCode || '').trim())
}

export function getTaskTemplatePreviewSummary(template: Pick<TaskTemplateListItemVM, 'code' | 'preview_summary'> | Pick<TaskTemplateDetailVM, 'code' | 'preview_summary'> | null | undefined): string {
  if (!template) return ''
  const code = String(template.code || '').trim()
  return TEMPLATE_PREVIEW_SUMMARY_MAP[code] || template.preview_summary || ''
}

export function useTaskTemplates(params?: { keyword?: string; page?: number; page_size?: number }) {
  return useQuery({
    queryKey: ['task-templates', params],
    queryFn: async () => {
      const cleanParams = params
        ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
        : undefined
      const res = await httpClient.get<{ data: any[]; pagination?: PaginationMeta }>('/task-templates', { params: cleanParams })
      return {
        ...res.data,
        data: (res.data.data || []).map(mapToTaskTemplateListItemVM),
      }
    },
  })
}

export function useTaskTemplateDetail(code?: string) {
  return useQuery({
    queryKey: ['task-templates', code],
    queryFn: async (): Promise<TaskTemplateDetailVM> => {
      const res = await httpClient.get<{ data: any }>(`/task-templates/${code}`)
      return mapToTaskTemplateDetailVM(res.data.data)
    },
    enabled: Boolean(code),
  })
}

// ── Task-026: 端口模式 / 模板预设统一 Helper ──

/** 端口模式 → 中文文案统一映射 */
const PORT_MODE_LABELS: Record<string, string> = {
  web_common: 'Web 常用端口',
  top_100: 'Top 100',
  common: '常见端口',
  full: '全端口扫描',
  custom: '自定义',
}

/** 获取端口模式中文标签，兜底返回原始值 */
export function getPortModeLabel(mode: string): string {
  return PORT_MODE_LABELS[mode] || mode || '-'
}

/** 判断是否为高成本端口扫描模板 */
export function isHighCostPortTemplate(templateCode: string): boolean {
  return templateCode === 'full_port_scan'
}

/** 获取模板族标识（port_scan / full_port_scan 归为同一族） */
export function getTemplateFamily(templateCode: string): string {
  if (templateCode === 'port_scan' || templateCode === 'full_port_scan') return 'port_scan'
  return templateCode
}

/** 获取模板预设 badge 信息 */
export function getTemplatePresetBadge(templateCode: string): { label: string; color: string } | null {
  if (templateCode === 'port_scan') return { label: '标准预设', color: 'default' }
  if (templateCode === 'full_port_scan') return { label: '深度预设', color: 'warning' }
  return null
}

/** 全端口高风险提示文案 */
export const FULL_PORT_WARNING = '将扫描 1-65535 端口，执行耗时和资源消耗明显高于标准端口扫描'


export function useUpdateTaskTemplateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { code: string; enabled: boolean }): Promise<TaskTemplateDetailVM> => {
      const res = await httpClient.patch<{ data: any }>(`/task-templates/${input.code}/status`, { enabled: input.enabled })
      return mapToTaskTemplateDetailVM(res.data.data)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['task-templates'] })
      qc.invalidateQueries({ queryKey: ['task-templates', vars.code] })
    },
  })
}
