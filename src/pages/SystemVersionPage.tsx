import { Button, Card, CardBody, Skeleton } from '@heroui/react'

import { useSystemVersionView } from '@/api/adapters/system'

/**
 * SystemVersionPage 展示构建版本元数据与发布校验信息。
 */
export function SystemVersionPage() {
  const versionQuery = useSystemVersionView()

  if (versionQuery.isPending) {
    return (
      <div className="flex flex-col gap-6 w-full text-apple-text-primary">
        <Card className="w-full bg-apple-bg border border-apple-border p-6">
          <CardBody className="p-0">
            <Skeleton className="rounded-2xl w-full h-24 bg-apple-tertiary-bg" />
          </CardBody>
        </Card>
      </div>
    )
  }

  if (versionQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-apple-text-primary p-8">
        <h1 className="text-2xl font-bold mb-4 tracking-tight">系统版本接口请求失败</h1>
        <p className="text-apple-text-secondary text-base mb-8">{versionQuery.error.message}</p>
        <Button color="primary" variant="flat" onPress={() => versionQuery.refetch()} className="rounded-full px-8">
          重新请求
        </Button>
      </div>
    )
  }

  if (!versionQuery.data) {
    return (
      <Card className="w-full bg-apple-bg border border-apple-border p-12 flex items-center justify-center">
        <CardBody className="flex items-center justify-center">
          <p className="text-apple-text-secondary font-medium">系统版本接口未返回可展示数据。</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full text-apple-text-primary animate-in fade-in duration-700">
      <Card className="bg-apple-black border border-apple-border">
        <CardBody className="p-6 flex flex-col gap-4">
          <div>
            <span className="inline-block border border-apple-blue-light/50 text-apple-blue-light bg-apple-blue-light/10 text-[11px] font-bold tracking-wider px-2 py-1 rounded-md uppercase">
              /api/v1/system/version
            </span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight">系统版本视图</h3>
          <p className="text-apple-text-secondary leading-relaxed max-w-3xl">
            该页面直接联调后端构建元数据接口，用于确认当前环境的交付物完整性、Git 提交链及发布时间戳。
          </p>
        </CardBody>
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-apple-bg border border-apple-blue-light/30">
          <CardBody className="p-6 flex flex-col">
            <span className="text-sm text-apple-text-secondary mb-2 uppercase tracking-wider font-semibold">Version</span>
            <strong className="text-xl font-bold text-apple-blue-light tracking-tight">{versionQuery.data.version}</strong>
          </CardBody>
        </Card>
        <Card className="bg-apple-bg border border-apple-border">
          <CardBody className="p-6 flex flex-col">
            <span className="text-sm text-apple-text-secondary mb-2 uppercase tracking-wider font-semibold">Commit Hash</span>
            <strong className="text-sm font-mono truncate text-apple-text-primary">{versionQuery.data.commit}</strong>
          </CardBody>
        </Card>
        <Card className="bg-apple-bg border border-apple-border">
          <CardBody className="p-6 flex flex-col">
            <span className="text-sm text-apple-text-secondary mb-2 uppercase tracking-wider font-semibold">Build Time</span>
            <strong className="text-sm font-mono text-apple-text-primary">{formatBuildTime(versionQuery.data.buildTime)}</strong>
          </CardBody>
        </Card>
      </section>

      <Card className="bg-apple-black border border-apple-border">
        <CardBody className="p-6">
          <h5 className="text-[11px] font-bold text-apple-text-tertiary uppercase tracking-widest mb-6">Internal Metadata</h5>
          <div className="grid grid-cols-[140px_1fr] gap-y-4 text-sm font-medium">
            <div className="text-apple-text-secondary">SERVICE</div>
            <div className="font-mono text-apple-text-primary">{versionQuery.data.service}</div>
            <div className="text-apple-text-secondary">TRACE_ID</div>
            <div className="font-mono text-apple-text-tertiary select-all">{versionQuery.data.traceId}</div>
            <div className="text-apple-text-secondary">HTTP_STATUS</div>
            <div className="font-mono text-apple-text-primary">{String(versionQuery.data.httpStatus)}</div>
            <div className="text-apple-text-secondary">ENDPOINT</div>
            <div className="font-mono text-apple-text-primary underline decoration-apple-border">/system/version</div>
            <div className="text-apple-text-secondary">RAW_BUILD_TIME</div>
            <div className="font-mono text-apple-text-tertiary">{versionQuery.data.buildTime}</div>
          </div>
        </CardBody>
      </Card>

      <Card className="bg-apple-bg border border-apple-border">
        <CardBody className="p-6 flex flex-col gap-3">
          <h5 className="text-[11px] font-bold text-apple-text-tertiary uppercase tracking-widest">Build Summary</h5>
          <p className="text-apple-text-secondary text-sm leading-relaxed max-w-2xl">
            当前展示信息来自服务端二进制编译阶段的 ldflags 静态注入，确保在任何网络环境下均能提供确定性的发布元数据。
          </p>
        </CardBody>
      </Card>
    </div>
  )
}


function formatBuildTime(buildTime: string) {
  const timestamp = Date.parse(buildTime)
  if (Number.isNaN(timestamp)) {
    return buildTime
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: false,
  }).format(new Date(timestamp))
}
