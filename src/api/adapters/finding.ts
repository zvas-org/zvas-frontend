import { useQuery } from '@tanstack/react-query'
import { httpClient } from '@/api/client'
import type { PaginationMeta, FindingSummaryView } from './asset'

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

export function useFindings(params: { page?: number; page_size?: number; keyword?: string; severity?: string; status?: string; asset_pool_id?: string; task_id?: string }) {
  return useQuery({
    queryKey: ['findings', params],
    queryFn: async () => {
      const res = await httpClient.get<{ data: FindingSummaryView[]; pagination?: PaginationMeta }>('/findings', { params })
      return res.data
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
