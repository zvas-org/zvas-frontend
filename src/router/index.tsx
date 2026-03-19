import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

import { appEnv } from '@/app/env'
import { ConsoleLayout } from '@/layouts/ConsoleLayout'
import { ErrorPage } from '@/pages/ErrorPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RequireAuth, RouterErrorFallback } from '@/router/guards'

// 路由懒加载，优化打包体积
const OverviewPage = lazy(() => import('@/pages/OverviewPage').then(m => ({ default: m.OverviewPage })))
const SystemHealthPage = lazy(() => import('@/pages/SystemHealthPage').then(m => ({ default: m.SystemHealthPage })))
const SystemVersionPage = lazy(() => import('@/pages/SystemVersionPage').then(m => ({ default: m.SystemVersionPage })))
const SystemSettingsPage = lazy(() => import('@/pages/SystemSettingsPage').then(m => ({ default: m.SystemSettingsPage })))
const UserManagementPage = lazy(() => import('@/pages/UserManagementPage').then(m => ({ default: m.UserManagementPage })))
const RolesPage = lazy(() => import('@/pages/iam/RolesPage').then(m => ({ default: m.RolesPage })))
const AuditLogPage = lazy(() => import('@/pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })))

const AssetPoolsPage = lazy(() => import('@/pages/assets/AssetPoolsPage').then(m => ({ default: m.AssetPoolsPage })))
const AssetInventoryPage = lazy(() => import('@/pages/assets/AssetInventoryPage').then(m => ({ default: m.AssetInventoryPage })))
const AssetPoolDetailPage = lazy(() => import('@/pages/assets/AssetPoolDetailPage').then(m => ({ default: m.AssetPoolDetailPage })))

const TasksPage = lazy(() => import('@/pages/tasks/TasksPage').then(m => ({ default: m.TasksPage })))
const TaskTemplatesPage = lazy(() => import('@/pages/tasks/TaskTemplatesPage').then(m => ({ default: m.TaskTemplatesPage })))
const WorkersPage = lazy(() => import('@/pages/tasks/WorkersPage').then(m => ({ default: m.WorkersPage })))
const TaskDetailPage = lazy(() => import('@/pages/tasks/TaskDetailPage').then(m => ({ default: m.TaskDetailPage })))

const FindingsPage = lazy(() => import('@/pages/findings/FindingsPage').then(m => ({ default: m.FindingsPage })))
const EvidencesPage = lazy(() => import('@/pages/findings/EvidencesPage').then(m => ({ default: m.EvidencesPage })))
const ReportsPage = lazy(() => import('@/pages/findings/ReportsPage').then(m => ({ default: m.ReportsPage })))

/**
 * 局部骨架屏占位
 */
const renderPageLoader = () => (
  <div className="w-full h-full flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-apple-blue/20 border-t-apple-blue rounded-full animate-spin" />
      <p className="text-apple-text-tertiary text-[10px] tracking-[0.3em] font-black uppercase animate-pulse">
        Initializing_Module...
      </p>
    </div>
  </div>
)

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
              element: <Navigate replace to="/assets" />,
            },
            {
              path: 'overview',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <OverviewPage />
                </Suspense>
              ),
            },
            {
              path: 'system/health',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <SystemHealthPage />
                </Suspense>
              ),
            },
            {
              path: 'system/version',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <SystemVersionPage />
                </Suspense>
              ),
            },
            {
              path: 'system/settings',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <SystemSettingsPage />
                </Suspense>
              ),
            },
            {
              path: 'iam/users',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <UserManagementPage />
                </Suspense>
              ),
            },
            {
              path: 'iam/roles',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <RolesPage />
                </Suspense>
              ),
            },
            {
              path: 'iam/audits',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <AuditLogPage />
                </Suspense>
              ),
            },
            {
              path: 'assets',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <AssetPoolsPage />
                </Suspense>
              ),
            },
            {
              path: 'assets/inventory',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <AssetInventoryPage />
                </Suspense>
              ),
            },
            {
              path: 'assets/:id',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <AssetPoolDetailPage />
                </Suspense>
              ),
            },
            {
              path: 'tasks',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <TasksPage />
                </Suspense>
              ),
            },
            {
              path: 'tasks/templates',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <TaskTemplatesPage />
                </Suspense>
              ),
            },
            {
              path: 'tasks/workers',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <WorkersPage />
                </Suspense>
              ),
            },
            {
              path: 'tasks/:id',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <TaskDetailPage />
                </Suspense>
              ),
            },
            {
              path: 'findings',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <FindingsPage />
                </Suspense>
              ),
            },
            {
              path: 'findings/evidences',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <EvidencesPage />
                </Suspense>
              ),
            },
            {
              path: 'findings/reports',
              element: (
                <Suspense fallback={renderPageLoader()}>
                  <ReportsPage />
                </Suspense>
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
