import type { InternalHandlerAuditListResponse } from '../generated/model/internalHandlerAuditListResponse';
import { httpClient } from '../client';
import type { AuditListParams, AuditListResponse, AuditLog, RiskLevel, ActionResult } from '../types/audit.types';

/**
 * 获取审计日志列表
 * @param params 分页与筛选参数
 */
export const getAuditLogs = async (params: AuditListParams): Promise<AuditListResponse> => {
  const response = await httpClient.get<InternalHandlerAuditListResponse>('/audits', {
    params,
  });

  const body = response.data;

  // 映射后端模型到前端视图模型
  const items: AuditLog[] = (body.data || []).map((item) => ({
    id: item.id || '',
    actor_user_id: item.actor_user_id || '',
    actor_username: item.actor_username || '',
    actor_role: item.actor_role || '',
    action: item.action || '',
    resource_type: item.resource_type || '',
    resource_id: item.resource_id || '',
    risk_level: (item.risk_level || 'low') as RiskLevel,
    result: (item.result || 'success') as ActionResult,
    trace_id: item.trace_id || '',
    path: item.path || '',
    method: item.method || '',
    remote_ip: item.remote_ip || '',
    error_message: item.error_message,
    detail: (item.detail || {}) as Record<string, unknown>,
    created_at: item.created_at || new Date().toISOString(),
  }));

  return {
    items,
    total: body.pagination?.total || 0,
    page: body.pagination?.page || params.page || 1,
    page_size: body.pagination?.page_size || params.page_size || 20,
    trace_id: body.trace_id,
  };
};
