import { createBrowserRouter, Navigate } from 'react-router-dom'

import { appEnv } from '@/app/env'
import { ConsoleLayout } from '@/layouts/ConsoleLayout'
import { ErrorPage } from '@/pages/ErrorPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { RequireAuth, RouterErrorFallback } from '@/router/guards'

/**
 * router 定义控制台初始化阶段的全部页面路由。
 */
export const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: <LoginPage />,
      errorElement: <RouterErrorFallback />,
    },
    {
      path: '/',
      element: <RequireAuth />,
      errorElement: <RouterErrorFallback />,
      children: [
        {
          element: <ConsoleLayout />,
          children: [
            {
              index: true,
              element: <Navigate replace to="/system/health" />,
            },
            {
              path: 'system/health',
              element: (
                <PlaceholderPage
                  badge="System Health"
                  title="系统健康视图"
                  subtitle="下一步会接入后端 /api/v1/system/health，展示服务状态、trace_id 与基础联调信息。"
                />
              ),
            },
            {
              path: 'system/settings',
              element: (
                <PlaceholderPage
                  badge="System Settings"
                  title="系统设置视图"
                  subtitle="下一步会联调受保护接口 /api/v1/system/settings，并处理 401/403 语义。"
                />
              ),
            },
          ],
        },
      ],
    },
    {
      path: '/403',
      element: <ForbiddenPage />,
    },
    {
      path: '/error',
      element: <ErrorPage />,
    },
    {
      path: '*',
      element: <NotFoundPage />,
    },
  ],
  {
    basename: appEnv.basePath,
  },
)
