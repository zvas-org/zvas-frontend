import type { InternalHandlerSystemHealthResponse, InternalHandlerSystemSettingsResponse } from '@/api/generated/model'
import { useGetSystemHealth, useGetSystemSettings } from '@/api/generated/sdk'
import { ApiError } from '@/api/client'

/**
 * SystemHealthView 定义系统健康页的视图模型。
 */
export interface SystemHealthView {
  service: string
  status: string
  traceId: string
  httpStatus: number
}

/**
 * SystemSettingsView 定义系统设置页的视图模型。
 */
export interface SystemSettingsView {
  service: string
  traceId: string
  user: {
    id: string
    name: string
    role: string
    permissions: string[]
  }
}

/**
 * isApiError 判断错误是否来自统一请求层。
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * useSystemHealthView 将生成代码结果转换为页面更稳定的视图结构。
 */
export function useSystemHealthView() {
  return useGetSystemHealth({
    query: {
      select: (response): SystemHealthView => {
        const payload = response.data as InternalHandlerSystemHealthResponse
        return {
          service: payload.data?.service || 'unknown',
          status: payload.data?.status || 'unknown',
          traceId: payload.trace_id || 'n/a',
          httpStatus: response.status,
        }
      },
    },
  })
}

/**
 * useSystemSettingsView 将受保护接口响应转换为页面视图结构。
 */
export function useSystemSettingsView() {
  return useGetSystemSettings({
    query: {
      retry: false,
      select: (response): SystemSettingsView => {
        const payload = response.data as InternalHandlerSystemSettingsResponse
        return {
          service: payload.data?.service || 'unknown',
          traceId: payload.trace_id || 'n/a',
          user: {
            id: payload.data?.user?.id || 'unknown',
            name: payload.data?.user?.name || 'unknown',
            role: payload.data?.user?.role || 'unknown',
            permissions: payload.data?.user?.permissions || [],
          },
        }
      },
    },
  })
}
