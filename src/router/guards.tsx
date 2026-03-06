import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/store/auth'

/**
 * RequireAuth 保护需要登录令牌的页面。
 */
export function RequireAuth() {
  const token = useAuthStore((state) => state.token)
  const location = useLocation()

  if (!token) {
    const redirect = `/login?redirect=${encodeURIComponent(location.pathname)}`
    return <Navigate replace to={redirect} />
  }

  return <Outlet />
}

/**
 * RouterErrorFallback 兜底展示路由级异常。
 */
export function RouterErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-[#f5f5f7]">
      <h1 className="text-2xl font-bold mb-4">页面渲染失败</h1>
      <p className="text-gray-400">前端路由在渲染当前页面时发生未处理异常。</p>
    </div>
  )
}
