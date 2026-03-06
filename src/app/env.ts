const rawBasePath = import.meta.env.VITE_BASE_PATH || '/ui/'

/**
 * appEnv 定义前端运行时需要的基础环境变量。
 */
export const appEnv = {
  title: import.meta.env.VITE_APP_TITLE || 'ZVAS',
  basePath: normalizeBasePath(rawBasePath),
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  apiOrigin: import.meta.env.VITE_API_ORIGIN || '',
  enableMock: import.meta.env.VITE_ENABLE_MOCK === 'true',
}

function normalizeBasePath(basePath: string) {
  if (!basePath || basePath === '/') {
    return '/'
  }

  const normalized = basePath.startsWith('/') ? basePath : `/${basePath}`
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}
