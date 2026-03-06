import type { ApiEnvelope } from '@/types/http'

/**
 * unwrapEnvelope 提取统一响应中的 data 字段。
 */
export function unwrapEnvelope<T>(payload: ApiEnvelope<T>) {
  return payload.data
}
