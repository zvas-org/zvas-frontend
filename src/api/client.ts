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

const httpClient = axios.create({
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

    if (status === 401) {
      useAuthStore.getState().clearSession()
    }

    throw new ApiError(payload?.message || error.message || '请求失败', status, payload?.code, payload?.trace_id)
  },
)

/**
 * ErrorType 为 Orval 生成代码提供统一错误类型。
 */
export type ErrorType<T> = ApiError & { details?: T }

/**
 * isApiError 判断错误是否来自统一请求层。
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * apiClient 为 Orval 生成代码提供统一请求函数。
 */
export async function apiClient<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await httpClient({
    url,
    method: options.method,
    data: options.body,
    signal: options.signal ?? undefined,
    headers: toAxiosHeaders(options.headers),
  })

  return {
    data: response.data,
    status: response.status,
    headers: toHeaders(response.headers as Record<string, unknown>),
  } as T
}

function toAxiosHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {}
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries())
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }

  return Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = String(value)
    return acc
  }, {})
}

function toHeaders(headers: Record<string, unknown>) {
  const normalized = new Headers()
  Object.entries(headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      normalized.set(key, value.join(', '))
      return
    }
    if (value !== undefined) {
      normalized.set(key, String(value))
    }
  })
  return normalized
}
