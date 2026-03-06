import { Button, Card, CardBody, Skeleton } from '@heroui/react'

import { useSystemHealthView } from '@/api/adapters/system'

/**
 * SystemHealthPage 展示系统健康接口的实时联调结果。
 */
export function SystemHealthPage() {
  const healthQuery = useSystemHealthView()

  if (healthQuery.isPending) {
    return (
      <Card className="w-full bg-apple-bg border border-apple-border p-6">
        <CardBody className="p-0">
          <Skeleton className="rounded-2xl w-full h-24 bg-apple-tertiary-bg" />
        </CardBody>
      </Card>
    )
  }

  if (healthQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-apple-text-primary p-8">
        <h1 className="text-2xl font-bold mb-4 tracking-tight">系统健康接口请求失败</h1>
        <p className="text-apple-text-secondary text-base mb-8">{healthQuery.error.message}</p>
        <Button color="primary" variant="flat" onPress={() => healthQuery.refetch()} className="rounded-full px-8">
          重新请求
        </Button>
      </div>
    )
  }

  if (!healthQuery.data) {
    return (
      <Card className="w-full bg-apple-bg border border-apple-border p-12 flex items-center justify-center">
        <CardBody className="flex items-center justify-center">
          <p className="text-apple-text-secondary font-medium">系统健康接口未返回可展示数据。</p>
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
              /api/v1/system/health
            </span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight">系统健康视图</h3>
          <p className="text-apple-text-secondary leading-relaxed max-w-2xl">
            该页面直接联调后端统一响应结构，实时展示核心资产的健康负载、全链路追踪标识 (trace_id) 及标准 HTTP 状态码。
          </p>
        </CardBody>
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-apple-bg border border-apple-border">
          <CardBody className="p-6 flex flex-col">
            <span className="text-sm text-apple-text-secondary mb-2 uppercase tracking-wider font-semibold">Service</span>
            <strong className="text-xl font-bold tracking-tight">{healthQuery.data.service}</strong>
          </CardBody>
        </Card>

        <Card className="bg-apple-bg border border-apple-blue-light/30 shadow-[0_0_20px_rgba(41,151,255,0.05)]">
          <CardBody className="p-6 flex flex-col">
            <span className="text-sm text-apple-text-secondary mb-2 uppercase tracking-wider font-semibold">Status</span>
            <strong className="text-xl font-bold text-apple-blue-light tracking-tight">{healthQuery.data.status}</strong>
          </CardBody>
        </Card>

        <Card className="bg-apple-bg border border-apple-border">
          <CardBody className="p-6 flex flex-col">
            <span className="text-sm text-apple-text-secondary mb-2 uppercase tracking-wider font-semibold">HTTP Status</span>
            <strong className="text-xl font-bold tracking-tight">{healthQuery.data.httpStatus}</strong>
          </CardBody>
        </Card>
      </section>

      <Card className="bg-apple-black border border-apple-border">
        <CardBody className="p-6">
          <div className="grid grid-cols-[140px_1fr] gap-y-4 text-sm font-medium">
            <div className="text-apple-text-secondary uppercase text-[11px] tracking-widest">TRACE_ID</div>
            <div className="font-mono text-apple-text-primary select-all">{healthQuery.data.traceId}</div>
            <div className="text-apple-text-secondary uppercase text-[11px] tracking-widest">QUERY_KEY</div>
            <div className="font-mono text-apple-text-tertiary">/system/health</div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

