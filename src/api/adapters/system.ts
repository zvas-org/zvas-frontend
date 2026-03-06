import type {
  InternalHandlerSystemHealthResponse,
  InternalHandlerSystemSettingsResponse,
  InternalHandlerSystemVersionResponse,
} from '@/api/generated/model'
import { useGetSystemHealth, useGetSystemSettings, useGetSystemVersion } from '@/api/generated/sdk'

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
 * SystemVersionView 定义系统版本页的视图模型。
 */
export interface SystemVersionView {
  service: string
  version: string
  commit: string
  buildTime: string
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
 * useSystemVersionView 将系统版本接口响应转换为页面视图结构。
 */
export function useSystemVersionView() {
  return useGetSystemVersion({
    query: {
      select: (response): SystemVersionView => {
        const payload = response.data as InternalHandlerSystemVersionResponse
        return {
          service: payload.data?.service || 'unknown',
          version: payload.data?.version || 'unknown',
          commit: payload.data?.commit || 'unknown',
          buildTime: payload.data?.build_time || 'unknown',
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
