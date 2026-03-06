import {
  Button,
  Card,
  CardBody,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Skeleton,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
} from '@heroui/react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { isApiError } from '@/api/client'
import { useAuditListView, type AuditEntryView } from '@/api/adapters/audit'

/**
 * AuditLogPage 展示系统操作审计和高风险动作记录。
 */
export function AuditLogPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [resultFilter, setResultFilter] = useState<'all' | 'success' | 'failure'>('all')
  const [detailTarget, setDetailTarget] = useState<AuditEntryView | null>(null)

  const auditsQuery = useAuditListView({ page, page_size: pageSize })

  useEffect(() => {
    if (!auditsQuery.error || !isApiError(auditsQuery.error)) {
      return
    }

    if (auditsQuery.error.status === 401) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true })
      return
    }

    if (auditsQuery.error.status === 403) {
      navigate('/403', { replace: true })
    }
  }, [auditsQuery.error, location.pathname, navigate])

  const filteredItems = useMemo(() => {
    const items = auditsQuery.data?.items || []
    const normalizedKeyword = keyword.trim().toLowerCase()

    return items.filter((item) => {
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        [
          item.actorUsername,
          item.actorRole,
          item.action,
          item.resourceType,
          item.resourceID,
          item.traceId,
          item.path,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword)

      const matchesRisk = riskFilter === 'all' || item.riskLevel === riskFilter
      const matchesResult = resultFilter === 'all' || item.result === resultFilter
      return matchesKeyword && matchesRisk && matchesResult
    })
  }, [auditsQuery.data?.items, keyword, resultFilter, riskFilter])

  const metrics = useMemo(() => {
    const items = auditsQuery.data?.items || []
    return {
      total: auditsQuery.data?.pagination.total || 0,
      highRisk: items.filter((item) => item.riskLevel === 'high').length,
      failures: items.filter((item) => item.result === 'failure').length,
      actors: new Set(items.map((item) => item.actorUsername).filter(Boolean)).size,
    }
  }, [auditsQuery.data])

  if (auditsQuery.isPending) {
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

  if (auditsQuery.isError) {
    if (isApiError(auditsQuery.error) && (auditsQuery.error.status === 401 || auditsQuery.error.status === 403)) {
      return null
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-apple-text-primary p-8">
        <h1 className="text-2xl font-bold mb-4 tracking-tight">审计日志接口请求失败</h1>
        <p className="text-apple-text-secondary text-base mb-8">{auditsQuery.error.message}</p>
        <Button color="primary" variant="flat" onPress={() => auditsQuery.refetch()} className="rounded-full px-8">
          重新请求
        </Button>
      </div>
    )
  }

  if (!auditsQuery.data) {
    return (
      <Card className="w-full bg-apple-bg border border-apple-border p-12 flex items-center justify-center">
        <CardBody className="flex items-center justify-center">
          <p className="text-apple-text-secondary font-medium">审计接口未返回可展示数据。</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full text-apple-text-primary animate-in fade-in duration-700">
      <Card className="bg-apple-black border border-apple-border">
        <CardBody className="p-6 flex flex-col gap-4">
          <div>
            <span className="inline-block border border-apple-red/50 text-apple-red-light bg-apple-red/10 text-[11px] font-bold tracking-wider px-2 py-1 rounded-md uppercase">
              /api/v1/audits
            </span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight">审计日志视图</h3>
          <p className="text-apple-text-secondary leading-relaxed max-w-3xl">
            该页面聚合登录、账号管理和其他高风险动作的审计记录，实时回溯操作链路，确保每一项资源变更均具有可追溯性。
          </p>
        </CardBody>
      </Card>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-apple-bg border border-apple-blue-light/30">
          <CardBody className="p-6 flex flex-col">
            <span className="text-sm text-apple-text-secondary mb-2 uppercase tracking-wider font-semibold">Total Logs</span>
            <strong className="text-xl font-bold text-apple-blue-light tracking-tight">{metrics.total}</strong>
          </CardBody>
        </Card>
        <Card className="bg-apple-bg border border-apple-border">
          <CardBody className="p-6 flex flex-col">
            <span className="text-sm text-apple-text-secondary mb-2 uppercase tracking-wider font-semibold">High Risk</span>
            <strong className="text-xl font-bold tracking-tight">{metrics.highRisk}</strong>
          </CardBody>
        </Card>
        <Card className="bg-apple-bg border border-apple-border">
          <CardBody className="p-6 flex flex-col">
            <span className="text-sm text-apple-text-secondary mb-2 uppercase tracking-wider font-semibold">Failures</span>
            <strong className="text-xl font-bold tracking-tight text-apple-red-light">{metrics.failures}</strong>
          </CardBody>
        </Card>
        <Card className="bg-apple-bg border border-apple-border">
          <CardBody className="p-6 flex flex-col">
            <span className="text-sm text-apple-text-secondary mb-2 uppercase tracking-wider font-semibold">Actors</span>
            <strong className="text-xl font-bold tracking-tight">{metrics.actors}</strong>
          </CardBody>
        </Card>
      </section>

      <Card className="bg-apple-bg border border-apple-border overflow-visible">
        <CardBody className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              isClearable
              value={keyword}
              placeholder="按操作者、动作、资源搜索..."
              onValueChange={setKeyword}
              variant="bordered"
              classNames={{
                inputWrapper: "border-apple-border bg-apple-black h-12 rounded-2xl",
              }}
            />
            <Select
              selectedKeys={[riskFilter]}
              onChange={(e) => setRiskFilter(e.target.value as any || 'all')}
              variant="bordered"
              classNames={{ trigger: "border-apple-border bg-apple-black h-12 rounded-2xl text-apple-text-primary" }}
            >
              <SelectItem key="all" textValue="全部风险级别">全部风险级别</SelectItem>
              <SelectItem key="low" textValue="低风险">低风险</SelectItem>
              <SelectItem key="medium" textValue="中风险">中风险</SelectItem>
              <SelectItem key="high" textValue="高风险">高风险</SelectItem>
            </Select>
            <Select
              selectedKeys={[resultFilter]}
              onChange={(e) => setResultFilter(e.target.value as any || 'all')}
              variant="bordered"
              classNames={{ trigger: "border-apple-border bg-apple-black h-12 rounded-2xl text-apple-text-primary" }}
            >
              <SelectItem key="all" textValue="全部执行结果">全部执行结果</SelectItem>
              <SelectItem key="success" textValue="成功">执行成功</SelectItem>
              <SelectItem key="failure" textValue="执行失败">执行失败</SelectItem>
            </Select>
            <Button variant="flat" className="h-12 rounded-2xl font-bold" onPress={() => auditsQuery.refetch()}>刷新记录</Button>
          </div>
          <p className="text-[12px] text-apple-text-tertiary">
            提示：当前筛选仅作用于内存数据。高级组合检索将在后续版本中支持全量服务端查询。
          </p>
        </CardBody>
      </Card>

      <Card className="bg-apple-black border border-apple-border overflow-hidden">
        <Table aria-label="审计日志表" classNames={{ wrapper: "bg-transparent p-0" }}>
          <TableHeader>
            <TableColumn className="bg-apple-tertiary-bg/50 text-apple-text-secondary uppercase text-[11px] tracking-widest font-bold h-12">时间</TableColumn>
            <TableColumn className="bg-apple-tertiary-bg/50 text-apple-text-secondary uppercase text-[11px] tracking-widest font-bold h-12">操作者</TableColumn>
            <TableColumn className="bg-apple-tertiary-bg/50 text-apple-text-secondary uppercase text-[11px] tracking-widest font-bold h-12">动作</TableColumn>
            <TableColumn className="bg-apple-tertiary-bg/50 text-apple-text-secondary uppercase text-[11px] tracking-widest font-bold h-12">资源</TableColumn>
            <TableColumn className="bg-apple-tertiary-bg/50 text-apple-text-secondary uppercase text-[11px] tracking-widest font-bold h-12">风险</TableColumn>
            <TableColumn className="bg-apple-tertiary-bg/50 text-apple-text-secondary uppercase text-[11px] tracking-widest font-bold h-12">结果</TableColumn>
            <TableColumn className="bg-apple-tertiary-bg/50 text-apple-text-secondary uppercase text-[11px] tracking-widest font-bold h-12">链路追踪</TableColumn>
            <TableColumn className="bg-apple-tertiary-bg/50 text-apple-text-secondary uppercase text-[11px] tracking-widest font-bold h-12">操作</TableColumn>
          </TableHeader>
          <TableBody emptyContent={"当前页没有匹配的审计日志记录。"}>
            {filteredItems.map((record) => (
              <TableRow key={record.id} className="border-b border-apple-border last:border-0 hover:bg-white/5 transition-colors">
                <TableCell>
                  <span className="text-[13px] font-medium">{formatDateTime(record.createdAt)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-apple-text-primary">{record.actorUsername || '匿名系统'}</span>
                    <span className="text-[11px] text-apple-text-secondary uppercase tracking-tight">{record.actorRole || 'SYSTEM'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    <span className="inline-block border border-apple-blue-light/50 text-apple-blue-light bg-apple-blue-light/10 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                      {record.action}
                    </span>
                    <span className="text-[11px] text-apple-text-tertiary font-mono">{record.method} {record.path}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{record.resourceType || '-'}</span>
                    <span className="text-[11px] text-apple-text-secondary font-mono">{record.resourceID || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-block border text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${record.riskLevel === 'high' ? 'border-apple-red/50 text-apple-red-light bg-apple-red/10' :
                    record.riskLevel === 'medium' ? 'border-orange-500/50 text-orange-400 bg-orange-500/10' :
                      'border-apple-border text-apple-text-tertiary bg-white/5'
                    }`}>
                    {riskLabelMap[record.riskLevel] || record.riskLevel}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-block border text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${record.result === 'success' ? 'border-apple-green/50 text-apple-green-light bg-apple-green/10' : 'border-apple-red/50 text-apple-red-light bg-apple-red/10'
                    }`}>
                    {record.result === 'success' ? 'SUCCESS' : 'FAILURE'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-xs font-mono text-apple-text-secondary">{record.traceId || '-'}</span>
                    <span className="text-[11px] text-apple-text-tertiary select-all">{record.remoteIP || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="bordered" className="rounded-full border-apple-border text-apple-text-secondary hover:text-apple-text-primary h-8" onPress={() => setDetailTarget(record)}>查看</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="p-4 flex justify-between items-center border-t border-apple-border bg-apple-bg/30">
          <span className="text-sm text-apple-text-secondary font-medium">共计 {auditsQuery.data.pagination.total} 条日志</span>
          <Pagination
            total={Math.ceil(auditsQuery.data.pagination.total / auditsQuery.data.pagination.pageSize)}
            page={page}
            onChange={(page) => setPage(page)}
            classNames={{
              cursor: "bg-apple-blue-light text-white font-bold",
              item: "text-apple-text-secondary hover:bg-white/10"
            }}
          />
        </div>
      </Card>

      <Card className="bg-apple-black border border-apple-border">
        <CardBody className="p-6">
          <div className="grid grid-cols-[140px_1fr] gap-y-4 text-sm font-medium">
            <div className="text-apple-text-secondary text-[11px] tracking-widest uppercase">TRACE_ID</div>
            <div className="font-mono text-apple-text-primary">{auditsQuery.data.traceId}</div>
            <div className="text-apple-text-secondary text-[11px] tracking-widest uppercase">PAGINATION</div>
            <div className="font-mono text-apple-text-tertiary">PAGE {auditsQuery.data.pagination.page} / SIZE {auditsQuery.data.pagination.pageSize}</div>
          </div>
        </CardBody>
      </Card>

      <Modal
        isOpen={Boolean(detailTarget)}
        onOpenChange={(open) => !open && setDetailTarget(null)}
        scrollBehavior="inside"
        placement="center"
        backdrop="blur"
        classNames={{
          base: "bg-apple-bg text-apple-text-primary border border-apple-border rounded-[22px] max-w-2xl",
          header: "border-b border-apple-border p-6",
          body: "p-6",
          footer: "border-t border-apple-border p-4",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-[11px] text-apple-text-secondary uppercase tracking-widest font-bold">审计记录详情</span>
                <h3 className="text-xl font-bold tracking-tight">{detailTarget?.action || 'Operation Detail'}</h3>
              </ModalHeader>
              <ModalBody>
                {detailTarget && (
                  <div className="flex flex-col gap-8 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="flex flex-col gap-4">
                        <section>
                          <h4 className="text-[11px] font-bold text-apple-text-tertiary uppercase tracking-tight mb-2">主体 (Actor)</h4>
                          <div className="p-3 bg-apple-black border border-apple-border rounded-xl">
                            <p className="text-sm font-bold">{detailTarget.actorUsername || '匿名'}</p>
                            <p className="text-[11px] text-apple-text-secondary uppercase font-medium">{detailTarget.actorRole || '-'}</p>
                          </div>
                        </section>
                        <section>
                          <h4 className="text-[11px] font-bold text-apple-text-tertiary uppercase tracking-tight mb-2">目标 (Resource)</h4>
                          <div className="p-3 bg-apple-black border border-apple-border rounded-xl">
                            <p className="text-sm font-bold">{detailTarget.resourceType || '-'}</p>
                            <p className="text-[11px] text-apple-text-secondary font-mono">{detailTarget.resourceID || '-'}</p>
                          </div>
                        </section>
                      </div>
                      <div className="flex flex-col gap-4">
                        <section>
                          <h4 className="text-[11px] font-bold text-apple-text-tertiary uppercase tracking-tight mb-2">指标 (Metrics)</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 bg-apple-black border border-apple-border rounded-xl flex flex-col items-center">
                              <span className="text-[10px] text-apple-text-secondary uppercase mb-1">Risk</span>
                              <span className="text-xs font-bold uppercase">{detailTarget.riskLevel}</span>
                            </div>
                            <div className="p-3 bg-apple-black border border-apple-border rounded-xl flex flex-col items-center">
                              <span className="text-[10px] text-apple-text-secondary uppercase mb-1">Result</span>
                              <span className={`text-xs font-bold uppercase ${detailTarget.result === 'success' ? 'text-apple-green-light' : 'text-apple-red-light'}`}>{detailTarget.result}</span>
                            </div>
                          </div>
                        </section>
                        <section>
                          <h4 className="text-[11px] font-bold text-apple-text-tertiary uppercase tracking-tight mb-2">网络 (Network)</h4>
                          <div className="p-3 bg-apple-black border border-apple-border rounded-xl">
                            <p className="text-xs font-mono text-apple-text-secondary truncate">{detailTarget.traceId || '-'}</p>
                            <p className="text-xs font-mono mt-1">{detailTarget.remoteIP || '-'}</p>
                          </div>
                        </section>
                      </div>
                    </div>

                    <section>
                      <h4 className="text-[11px] font-bold text-apple-text-tertiary uppercase tracking-tight mb-2">动作载荷 (Payload & Meta)</h4>
                      <pre className="bg-apple-black border border-apple-border p-4 rounded-xl text-xs font-mono text-apple-text-secondary overflow-auto max-h-[300px] leading-relaxed">
                        {formatDetail(detailTarget.detail)}
                      </pre>
                    </section>

                    {detailTarget.errorMessage && (
                      <section>
                        <h4 className="text-[11px] font-bold text-apple-red-light uppercase tracking-tight mb-2">错误详情 (Error)</h4>
                        <div className="p-4 bg-apple-red/5 border border-apple-red/20 rounded-xl text-sm text-apple-red-light leading-relaxed">
                          {detailTarget.errorMessage}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" variant="flat" onPress={onClose} className="rounded-full font-bold px-6">
                  完成审阅
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}


const riskLabelMap: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
}

function formatDetail(detail: Record<string, unknown>) {
  try {
    return JSON.stringify(detail, null, 2)
  } catch {
    return '{}'
  }
}

function formatDateTime(value: string) {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  }).format(new Date(timestamp))
}
