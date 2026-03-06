/**
 * ApiPagination 定义统一分页响应结构。
 */
export interface ApiPagination {
  page?: number
  page_size?: number
  total?: number
}

/**
 * ApiEnvelope 定义后端统一响应外层结构。
 */
export interface ApiEnvelope<T> {
  code: number
  message: string
  trace_id: string
  data: T
  pagination?: ApiPagination
}
