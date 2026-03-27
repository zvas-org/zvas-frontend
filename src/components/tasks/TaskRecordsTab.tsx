import { useMemo, useState } from 'react'
import { Input, Pagination, Select, SelectItem, Skeleton, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

import { useTaskRecords } from '@/api/adapters/task'
import type { TaskRecordVM } from '@/api/adapters/task'
import { parseHttpProbeSummary } from '@/api/adapters/asset'
import { useTaskRoutes, getRecordTypeLabel } from '@/api/adapters/route'

function formatDateTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function formatDuration(durationMs: number) {
  if (!durationMs) return '-'
  if (durationMs < 1000) return `${durationMs} ms`
  return `${(durationMs / 1000).toFixed(1)} s`
}

function renderResultSummary(item: TaskRecordVM) {
  if (item.task_type === 'http_probe' && item.task_subtype === 'homepage_identify') {
    let payload = null
    try {
      if (typeof item.result_summary === 'string' && item.result_summary.startsWith('{')) {
        payload = JSON.parse(item.result_summary)
      } else {
        payload = item.result_summary
      }
    } catch {
      // ignore
    }
    const sum = parseHttpProbeSummary(payload)
    if (sum) {
      return (
        <div className="flex flex-col gap-1 w-full overflow-hidden">
          <div className="flex items-center gap-2 w-full">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${sum.status_code && sum.status_code >= 200 && sum.status_code < 400 ? 'bg-apple-green/20 text-apple-green-light' : 'bg-white/10 text-white/70'}`}>
              {sum.status_code || '-'}
            </span>
            <span className="text-[12px] truncate text-white font-medium" title={sum.title}>{sum.title || '无标题'}</span>
          </div>
          <span className="text-[10px] text-apple-text-tertiary truncate font-mono" title={sum.site_url}>{sum.site_url}</span>
        </div>
      )
    }
  }
  return <span className="truncate block w-full">{item.result_summary || '-'}</span>
}

export function TaskRecordsTab({ taskId }: { taskId?: string }) {
  const [page, setPage] = useState(1)
  const [stage, setStage] = useState('')
  const [status, setStatus] = useState('')
  const [keyword, setKeyword] = useState('')
  const pageSize = 20

  // 统一路由配置
  const { data: routes } = useTaskRoutes()

  const query = useTaskRecords(taskId, { page, page_size: pageSize, stage: stage || undefined, status: status || undefined, keyword: keyword || undefined, sort: 'updated_at', order: 'desc' })

  const items = query.data?.data || []
  const total = query.data?.pagination?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // 从路由配置动态生成阶段筛选项
  const stageOptions = useMemo(() => {
    const opts = [{ key: '', label: '全部阶段' }]
    if (routes) {
      routes.forEach(r => {
        // 避免重复：按 stage 去重
        if (r.stage && !opts.some(o => o.key === r.stage)) {
          opts.push({ key: r.stage, label: r.label })
        }
      })
    }
    return opts
  }, [routes])

  const statusOptions = useMemo(() => [
    { key: '', label: '全部状态' },
    { key: 'queued', label: '待执行' },
    { key: 'dispatched', label: '已分发' },
    { key: 'running', label: '执行中' },
    { key: 'succeeded', label: '已完成' },
    { key: 'failed', label: '失败' },
  ], [])

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full mb-8">
      <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl backdrop-blur-3xl">
        <h3 className="text-xl font-black text-white tracking-tight mb-1">扫描记录</h3>
        <p className="text-[13px] text-apple-text-tertiary font-medium">按单元查看任务的扫描过程、当前状态与结果摘要，便于定位执行链是否正常。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input
          isClearable
          value={keyword}
          placeholder="搜索目标或结果摘要"
          onValueChange={(value) => { setKeyword(value); setPage(1) }}
          classNames={{ inputWrapper: 'bg-white/5 border border-white/5 rounded-2xl h-12', input: 'text-sm' }}
          startContent={<MagnifyingGlassIcon className="w-4 h-4 text-apple-text-tertiary" />}
        />
        <Select selectedKeys={stage ? [stage] : []} placeholder="阶段" onSelectionChange={(keys) => { setStage(Array.from(keys)[0] as string || ''); setPage(1) }} classNames={{ trigger: 'bg-white/5 border border-white/5 rounded-2xl h-12' }}>
          {stageOptions.map((item) => <SelectItem key={item.key}>{item.label}</SelectItem>)}
        </Select>
        <Select selectedKeys={status ? [status] : []} placeholder="状态" onSelectionChange={(keys) => { setStatus(Array.from(keys)[0] as string || ''); setPage(1) }} classNames={{ trigger: 'bg-white/5 border border-white/5 rounded-2xl h-12' }}>
          {statusOptions.map((item) => <SelectItem key={item.key}>{item.label}</SelectItem>)}
        </Select>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-x-auto">
        <Table removeWrapper aria-label="Task Records" layout="fixed" classNames={{ base: 'p-4 min-w-[1200px]', table: 'table-fixed', th: 'bg-transparent text-apple-text-tertiary uppercase text-[10px] tracking-[0.2em] font-black h-14 border-b border-white/5 pb-2 text-left', td: 'border-b border-white/5 py-4 text-left last:border-0', tr: 'hover:bg-white/[0.03] transition-colors' }}>
          <TableHeader>
            <TableColumn width={140}>阶段</TableColumn>
            <TableColumn width={180}>目标</TableColumn>
            <TableColumn width={120}>状态</TableColumn>
            <TableColumn width={180}>执行节点</TableColumn>
            <TableColumn width={100}>尝试次数</TableColumn>
            <TableColumn width={120}>耗时</TableColumn>
            <TableColumn width={200}>开始时间</TableColumn>
            <TableColumn width={320}>结果摘要</TableColumn>
          </TableHeader>
          <TableBody emptyContent={<div className="py-20 text-apple-text-tertiary text-[13px] font-bold tracking-widest uppercase">当前筛选条件下暂无扫描记录。</div>} isLoading={query.isPending} loadingContent={<Skeleton className="h-40 w-full rounded-[24px] bg-white/5" />}>
            {items.map((item) => (
              <TableRow key={item.unit_id}>
                <TableCell>{getRecordTypeLabel(routes, item.task_type, item.task_subtype)}</TableCell>
                <TableCell><span className="font-mono text-[12px] break-all">{item.target_key}</span></TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell>{item.worker_id || '-'}</TableCell>
                <TableCell>{item.attempt}</TableCell>
                <TableCell>{formatDuration(item.duration_ms)}</TableCell>
                <TableCell>{formatDateTime(item.started_at)}</TableCell>
                <TableCell>{renderResultSummary(item)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {total > 0 && (
          <div className="flex justify-between items-center px-6 py-5 border-t border-white/5 bg-white/[0.01]">
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-apple-text-tertiary">当前记录 <span className="text-white mx-1">{total}</span> 条</span>
            {totalPages > 1 && <Pagination size="sm" page={page} total={totalPages} onChange={setPage} classNames={{ wrapper: 'gap-2', item: 'bg-white/5 text-apple-text-secondary font-bold rounded-xl border border-white/5 hover:bg-white/10 transition-all min-w-[32px] h-8 text-[12px]', cursor: 'bg-apple-blue font-black rounded-xl shadow-lg shadow-apple-blue/30 text-white' }} />}
          </div>
        )}
      </div>
    </div>
  )
}
