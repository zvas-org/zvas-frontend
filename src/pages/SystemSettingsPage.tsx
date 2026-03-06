import { Button, Card, CardBody, Skeleton } from '@heroui/react'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useSystemSettingsView } from '@/api/adapters/system'
import { isApiError } from '@/api/client'

/**
 * SystemSettingsPage 展示受保护系统接口的联调结果。
 */
export function SystemSettingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const settingsQuery = useSystemSettingsView()

  useEffect(() => {
    if (!settingsQuery.error || !isApiError(settingsQuery.error)) {
      return
    }

    if (settingsQuery.error.status === 401) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true })
      return
    }

    if (settingsQuery.error.status === 403) {
      navigate('/403', { replace: true })
    }
  }, [location.pathname, navigate, settingsQuery.error])

  if (settingsQuery.isPending) {
    return (
      <div className="flex flex-col gap-6 w-full text-apple-text-primary">
        <Card className="w-full bg-apple-bg border border-apple-border p-6">
          <CardBody className="p-0">
            <Skeleton className="rounded-2xl w-full h-32 bg-apple-tertiary-bg" />
          </CardBody>
        </Card>
      </div>
    )
  }

  if (settingsQuery.isError) {
    if (isApiError(settingsQuery.error) && (settingsQuery.error.status === 401 || settingsQuery.error.status === 403)) {
      return null
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-apple-text-primary p-8">
        <h1 className="text-2xl font-bold mb-4 tracking-tight">系统设置接口请求失败</h1>
        <p className="text-apple-text-secondary text-base mb-8">{settingsQuery.error.message}</p>
        <Button color="primary" variant="flat" onPress={() => settingsQuery.refetch()} className="rounded-full px-8">
          重新请求
        </Button>
      </div>
    )
  }

  if (!settingsQuery.data) {
    return null
  }

  return (
    <div className="flex flex-col gap-6 w-full text-apple-text-primary animate-in fade-in duration-700">
      <Card className="bg-apple-black border border-apple-border">
        <CardBody className="p-6 flex flex-col gap-4">
          <div>
            <span className="inline-block border border-apple-green/50 text-apple-green-light bg-apple-green/10 text-[11px] font-bold tracking-wider px-2 py-1 rounded-md uppercase">
              /api/v1/system/settings
            </span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight">系统设置视图</h3>
          <p className="text-apple-text-secondary leading-relaxed max-w-3xl">
            该页面用于验证受保护接口的身份验证与授权逻辑，反映当前登录实体的权限映射关系，是调试 RBAC 链路的关键入口。
          </p>
        </CardBody>
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-apple-bg border border-apple-border">
          <CardBody className="p-6">
            <h5 className="text-[11px] font-bold text-apple-text-tertiary uppercase tracking-widest mb-4">Context Info</h5>
            <div className="grid grid-cols-[120px_1fr] gap-y-4 text-sm font-medium">
              <div className="text-apple-text-secondary">SERVICE</div>
              <div className="font-mono text-apple-text-primary">{settingsQuery.data.service}</div>
              <div className="text-apple-text-secondary">TRACE_ID</div>
              <div className="font-mono text-apple-text-tertiary select-all">{settingsQuery.data.traceId}</div>
              <div className="text-apple-text-secondary">USER_ID</div>
              <div className="font-mono text-apple-text-primary">{settingsQuery.data.user.id}</div>
              <div className="text-apple-text-secondary">USERNAME</div>
              <div className="font-mono text-apple-text-primary underline decoration-apple-border">{settingsQuery.data.user.name}</div>
              <div className="text-apple-text-secondary">ROLE</div>
              <div className="font-mono text-apple-blue-light uppercase tracking-tighter">{settingsQuery.data.user.role}</div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-apple-bg border border-apple-border">
          <CardBody className="p-6 flex flex-col gap-4">
            <h5 className="text-[11px] font-bold text-apple-text-tertiary uppercase tracking-widest">Active Permissions</h5>
            <div className="flex flex-wrap gap-2">
              {settingsQuery.data.user.permissions.map((permission) => (
                <span key={permission} className="inline-block border border-apple-blue-light/50 text-apple-blue-light bg-apple-blue-light/10 text-[10px] px-2 py-1 rounded font-bold uppercase">
                  {permission}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      </section>
    </div>
  )
}

