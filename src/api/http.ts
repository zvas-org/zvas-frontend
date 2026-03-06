import axios from 'axios'

import { appEnv } from '@/app/env'
import { useAuthStore } from '@/store/auth'
import type { ApiEnvelope } from '@/types/http'
import { getOrCreateTraceId } from '@/utils/trace'

/**
 * ApiError 统一描述前端请求层感知到的接口错误。
 */
export class ApiError extends Error {
  status: number
  code?: number
  traceId?: string

  constructor(message: string, status: number, code?: number, traceId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.traceId = traceId
  }
}

const baseURL = `${appEnv.apiOrigin}${appEnv.apiBaseUrl}`

/**
 * httpClient 提供前端统一 Axios 实例。
 */
export const httpClient = axios.create({
  baseURL,
  timeout: 10000,
})

httpClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  const headers = config.headers

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  headers.set('X-Trace-ID', getOrCreateTraceId())
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 500
    const payload = error.response?.data as Partial<ApiEnvelope<unknown>> | undefined
    throw new ApiError(payload?.message || error.message || '请求失败', status, payload?.code, payload?.trace_id)
  },
)

/**
 * unwrapEnvelope 提取后端统一响应中的 data 字段。
 */
export function unwrapEnvelope<T>(payload: ApiEnvelope<T>) {
  return payload.data
}
