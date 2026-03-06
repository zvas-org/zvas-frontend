const TRACE_STORAGE_KEY = 'zvas.console.trace-id'

/**
 * getOrCreateTraceId 生成或复用单浏览器会话的 trace id。
 */
export function getOrCreateTraceId() {
  const existing = window.sessionStorage.getItem(TRACE_STORAGE_KEY)
  if (existing) {
    return existing
  }

  const traceId = crypto.randomUUID()
  window.sessionStorage.setItem(TRACE_STORAGE_KEY, traceId)
  return traceId
}
