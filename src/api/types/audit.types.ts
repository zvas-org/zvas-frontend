/**
 * 审计日志风险等级
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * 审计记录执行结果
 */
export type ActionResult = 'success' | 'failure';

/**
 * 审计日志记录接口定义
 */
export interface AuditLog {
    id: string;
    actor_user_id: string;
    actor_username: string;
    actor_role: string;
    action: string;
    resource_type: string;
    resource_id: string;
    risk_level: RiskLevel;
    result: ActionResult;
    trace_id: string;
    path: string;
    method: string;
    remote_ip: string;
    error_message?: string;
    detail: Record<string, unknown>;
    created_at: string;
}

/**
 * 分页请求参数
 */
export interface AuditListParams {
    page?: number;
    page_size?: number;
    // 以下为预留的服务端筛选参数
    actor_username?: string;
    action?: string;
    resource_id?: string;
    trace_id?: string;
    risk_level?: RiskLevel;
    result?: ActionResult;
}

/**
 * 分页响应包装
 */
export interface AuditListResponse {
    items: AuditLog[];
    total: number;
    page: number;
    page_size: number;
    trace_id?: string;
}
