import { createBrowserRouter, Navigate } from 'react-router-dom'

import { appEnv } from '@/app/env'
import { ConsoleLayout } from '@/layouts/ConsoleLayout'
import { ErrorPage } from '@/pages/ErrorPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SystemHealthPage } from '@/pages/SystemHealthPage'
import { SystemSettingsPage } from '@/pages/SystemSettingsPage'
import { SystemVersionPage } from '@/pages/SystemVersionPage'
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
              element: <SystemHealthPage />,
            },
            {
              path: 'system/version',
              element: <SystemVersionPage />,
            },
            {
              path: 'system/settings',
              element: <SystemSettingsPage />,
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
