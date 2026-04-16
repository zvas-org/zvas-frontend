import { useQuery } from '@tanstack/react-query'
import { httpClient } from '@/api/client'
import type { PaginationMeta, FindingSummaryView, AssetPoolWeakScanFindingVM } from './asset'

export interface EvidenceView {
  id: string
  finding_id: string
  finding_title: string
  evidence_type: string
  summary: string
  asset_pool_id: string
  task_id: string
  created_at: string
}

export interface ReportView {
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

function mapToFindingSummaryView(dto: Record<string, unknown>): FindingSummaryView {
  const detail = dto.detail && typeof dto.detail === 'object' && !Array.isArray(dto.detail) ? (dto.detail as Record<string, unknown>) : {}
  const classification = detail.classification && typeof detail.classification === 'object' && !Array.isArray(detail.classification) ? (detail.classification as Record<string, unknown>) : {}
  const evidence = detail.evidence && typeof detail.evidence === 'object' && !Array.isArray(detail.evidence) ? (detail.evidence as Record<string, unknown>) : {}
  const raw = detail.raw && typeof detail.raw === 'object' && !Array.isArray(detail.raw) ? (detail.raw as Record<string, unknown>) : {}
  const baseURL = String(detail.base_url || detail.target_url || detail.site_url || detail.url || '')
  const link = String(detail.link || raw['matched-at'] || baseURL || detail.host || '')
  const assetRef = String(baseURL || detail.host || detail.url || dto.asset_id || '-')
  return {
    finding_id: String(dto.id || ''),
    finding_type: String(dto.finding_type || ''),
    title: String(dto.title || ''),
    severity: String(dto.severity || ''),
    status: String(dto.status || ''),
    asset_pool_id: String(dto.asset_pool_id || ''),
    asset_pool_name: String(dto.asset_pool_name || ''),
    asset_ref: assetRef,
    task_id: String(dto.task_id || ''),
    task_name: String(dto.task_name || ''),
    snapshot_id: String(dto.snapshot_id || ''),
    asset_id: String(dto.asset_id || ''),
    rule_id: String(detail.rule_id || ''),
    base_url: baseURL,
    link,
    target_url: String(detail.target_url || ''),
    host: String(detail.host || ''),
    ip: String(detail.ip || ''),
    port: Number(detail.port || 0),
    scheme: String(detail.scheme || ''),
    matcher_name: String(detail.matcher_name || ''),
    created_at: String(dto.created_at || ''),
    updated_at: String(dto.updated_at || dto.created_at || ''),
    detail,
    classification,
    evidence,
    raw,
  }
}

export function useFindings(params: { page?: number; page_size?: number; url?: string; poc_id?: string; severity?: string; status?: string; keyword?: string; asset_pool_id?: string; task_id?: string; task_name?: string }) {
  return useQuery({
    queryKey: ['findings', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: Record<string, unknown>[]; pagination?: PaginationMeta }>('/findings', { params })
      return {
        ...res.data,
        data: (res.data.data || []).map(mapToFindingSummaryView),
      }
    }
  })
}

export function useWeakScanFindings(params: {
  page?: number
  page_size?: number
  asset_pool_id?: string
  task_id?: string
  task_name?: string
  url?: string
  keyword?: string
  rule_id?: string
  severity?: string
  status?: string
  sort?: string
  order?: string
}) {
  return useQuery({
    queryKey: ['findings', 'weak-scan', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: Record<string, unknown>[]; pagination?: PaginationMeta }>('/findings/weak-scan', { params })
      return {
        ...res.data,
        data: (res.data.data || []).map((item): AssetPoolWeakScanFindingVM => ({
          id: String(item.id || ''),
          task_unit_id: String(item.task_unit_id || ''),
          task_id: String(item.task_id || ''),
          task_name: String(item.task_name || ''),
          asset_pool_id: String(item.asset_pool_id || ''),
          asset_pool_name: String(item.asset_pool_name || ''),
          target_url: String(item.target_url || ''),
          site_asset_id: String(item.site_asset_id || ''),
          finding_key: String(item.finding_key || ''),
          remote_scan_id: String(item.remote_scan_id || ''),
          remote_result_id: String(item.remote_result_id || ''),
          remote_vulnerability_id: String(item.remote_vulnerability_id || ''),
          rule_id: String(item.rule_id || ''),
          rule_name: String(item.rule_name || ''),
          severity: String(item.severity || ''),
          status: String(item.status || ''),
          tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
          affects_url: String(item.affects_url || ''),
          affects_detail: String(item.affects_detail || ''),
          cvss2: String(item.cvss2 || ''),
          cvss3: String(item.cvss3 || ''),
          cvss_score: String(item.cvss_score || ''),
          description: String(item.description || ''),
          impact: String(item.impact || ''),
          recommendation: String(item.recommendation || ''),
          details: String(item.details || ''),
          request: String(item.request || ''),
          response: String(item.response || ''),
          source: String(item.source || ''),
          matched_at: String(item.matched_at || ''),
          classification: item.classification && typeof item.classification === 'object' && !Array.isArray(item.classification) ? (item.classification as Record<string, unknown>) : {},
          evidence: item.evidence && typeof item.evidence === 'object' && !Array.isArray(item.evidence) ? (item.evidence as Record<string, unknown>) : {},
          raw: item.raw && typeof item.raw === 'object' && !Array.isArray(item.raw) ? (item.raw as Record<string, unknown>) : {},
          updated_at: String(item.updated_at || ''),
        })),
      }
    }
  })
}

export function useEvidences(params: { page?: number; page_size?: number; keyword?: string }) {
  return useQuery({
    queryKey: ['evidences', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: EvidenceView[]; pagination?: PaginationMeta }>('/evidences', { params })
      return res.data
    }
  })
}

export function useReports(params: { page?: number; page_size?: number; keyword?: string }) {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: ReportView[]; pagination?: PaginationMeta }>('/reports', { params })
      return res.data
    }
  })
}
