import type { GetAuditsParams, InternalHandlerAuditListItem, InternalHandlerAuditListResponse } from '@/api/generated/model'
import { useGetAudits } from '@/api/generated/sdk'

export interface AuditEntryView {
  id: string
  actorUserID: string
  actorUsername: string
  actorRole: string
  action: string
  resourceType: string
  resourceID: string
  riskLevel: string
  result: string
  traceId: string
  path: string
  method: string
  remoteIP: string
  errorMessage: string
  detail: Record<string, unknown>
  createdAt: string
}

export interface AuditListView {
  items: AuditEntryView[]
  traceId: string
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}

/**
 * useAuditListView 读取审计日志并转换为页面视图结构。
 */
export function useAuditListView(params: GetAuditsParams) {
  return useGetAudits(params, {
    query: {
      select: (response): AuditListView => {
        const payload = response.data as InternalHandlerAuditListResponse
        return {
          items: (payload.data || []).map(toAuditEntryView),
          traceId: payload.trace_id || 'n/a',
          pagination: {
            page: payload.pagination?.page || params.page || 1,
            pageSize: payload.pagination?.page_size || params.page_size || 20,
            total: payload.pagination?.total || 0,
          },
        }
      },
    },
  })
}

function toAuditEntryView(item?: InternalHandlerAuditListItem | null): AuditEntryView {
  return {
    id: item?.id || '',
    actorUserID: item?.actor_user_id || '',
    actorUsername: item?.actor_username || '',
    actorRole: item?.actor_role || '',
    action: item?.action || '',
    resourceType: item?.resource_type || '',
    resourceID: item?.resource_id || '',
    riskLevel: item?.risk_level || 'unknown',
    result: item?.result || 'unknown',
    traceId: item?.trace_id || '',
    path: item?.path || '',
    method: item?.method || '',
    remoteIP: item?.remote_ip || '',
    errorMessage: item?.error_message || '',
    detail: (item?.detail || {}) as Record<string, unknown>,
    createdAt: item?.created_at || '',
  }
}
