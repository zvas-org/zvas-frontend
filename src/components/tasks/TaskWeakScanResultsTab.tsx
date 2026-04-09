import { useMemo, useState } from 'react'
import {
  Button,
  Chip,
  Input,
  Pagination,
  Select,
  SelectItem,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react'
import {
  ArrowPathIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'

import type { TaskRecordVM } from '@/api/adapters/task'
import { useTaskRecords } from '@/api/adapters/task'
import { TaskRecordDetailDrawer } from '@/components/tasks/TaskRecordDetailDrawer'

const PAGE_SIZE = 20
const EMPTY_ITEMS: TaskRecordVM[] = []

function formatDateTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function formatDuration(durationMs: number) {
  if (!durationMs) return '-'
  if (durationMs < 1000) return `${durationMs} ms`
  return `${(durationMs / 1000).toFixed(1)} s`
}

function renderStatus(item: TaskRecordVM) {
  const statusColorMap: Record<string, string> = {
    succeeded: 'bg-apple-green/20 text-apple-green-light',
    failed: 'bg-apple-red/20 text-apple-red',
    running: 'bg-apple-blue/20 text-apple-blue-light',
    dispatched: 'bg-apple-amber/20 text-apple-amber',
    queued: 'bg-white/10 text-apple-text-secondary',
    canceled: 'bg-white/10 text-apple-text-secondary',
  }
  const colorClass = statusColorMap[item.status] || 'bg-white/10 text-white/70'
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${colorClass}`}>{item.status || '-'}</span>
}

function statusCardTone(status: string) {
  switch (status) {
    case 'succeeded':
      return 'border-apple-green/20 bg-apple-green/[0.06] text-apple-green-light'
    case 'running':
      return 'border-apple-blue/20 bg-apple-blue/[0.06] text-apple-blue-light'
    case 'failed':
      return 'border-apple-red/20 bg-apple-red/[0.06] text-apple-red-light'
    default:
      return 'border-white/8 bg-white/[0.03] text-apple-text-secondary'
  }
}

export function TaskWeakScanResultsTab({ taskId }: { taskId: string }) {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [keyword, setKeyword] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<TaskRecordVM | null>(null)

  const query = useTaskRecords(taskId, {
    page,
    page_size: PAGE_SIZE,
    stage: 'weak_scan',
    status: status || undefined,
    keyword: keyword || undefined,
    sort: 'updated_at',
    order: 'desc',
  })

  const items = query.data?.data ?? EMPTY_ITEMS
  const total = query.data?.pagination?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const statusSummary = useMemo(() => {
    const summary = new Map<string, number>()
    for (const item of items) {
      summary.set(item.status || 'unknown', (summary.get(item.status || 'unknown') || 0) + 1)
    }
    return [
      { key: 'total', label: '当前筛选结果', value: total, tone: 'border-white/8 bg-white/[0.03] text-white' },
      { key: 'running', label: '执行中', value: summary.get('running') || 0, tone: statusCardTone('running') },
      { key: 'succeeded', label: '已完成', value: summary.get('succeeded') || 0, tone: statusCardTone('succeeded') },
      { key: 'failed', label: '失败', value: summary.get('failed') || 0, tone: statusCardTone('failed') },
    ]
  }, [items, total])

  const statusOptions = useMemo(
    () => [
      { key: '', label: '全部状态' },
      { key: 'queued', label: '待执行' },
      { key: 'dispatched', label: '已分发' },
      { key: 'running', label: '执行中' },
      { key: 'succeeded', label: '已完成' },
      { key: 'failed', label: '失败' },
      { key: 'canceled', label: '已取消' },
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full mb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <h3 className="mb-1 flex items-center gap-2 text-xl font-black tracking-tight text-white">
            <ShieldExclamationIcon className="h-6 w-6 text-apple-blue-light drop-shadow-[0_0_8px_rgba(10,132,255,0.45)]" />
            <span>弱点扫描结果</span>
          </h3>
          <p className="text-[13px] font-medium text-apple-text-tertiary">
            独立查看 `weakScan` 任务结果。列表按任务单元展示目标、执行状态和摘要，点击详情可查看扫描策略、等级分布和报告引用。
          </p>
        </div>
        <Button
          variant="flat"
          isIconOnly
          className="h-12 w-12 rounded-[16px] border border-white/5 bg-apple-tertiary-bg/10 backdrop-blur-md hover:bg-white/10 transition-colors"
          onPress={() => query.refetch()}
        >
          <ArrowPathIcon className="h-5 w-5 text-apple-text-secondary" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {statusSummary.map((card) => (
          <div key={card.key} className={`rounded-[22px] border px-4 py-4 ${card.tone}`}>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-apple-text-tertiary">{card.label}</div>
            <div className="mt-3 text-2xl font-black">{card.value}</div>
          </div>
        ))}
      </div>

      <section className="rounded-[28px] border border-white/8 bg-white/[0.02] p-4 backdrop-blur-3xl">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            isClearable
            value={keyword}
            placeholder="搜索目标 URL、摘要或执行节点"
            onValueChange={(value) => {
              setKeyword(value)
              setPage(1)
            }}
            variant="flat"
            startContent={<MagnifyingGlassIcon className="h-5 w-5 text-apple-text-tertiary" />}
            classNames={{
              inputWrapper: 'h-12 rounded-[18px] border border-white/8 bg-white/5 backdrop-blur-md transition-colors hover:bg-white/[0.07]',
              input: 'text-sm text-white placeholder:text-apple-text-tertiary',
            }}
          />

          <Select
            aria-label="弱点扫描状态筛选"
            selectedKeys={status ? new Set([status]) : new Set([])}
            placeholder="状态"
            onSelectionChange={(keys) => {
              setStatus((Array.from(keys)[0] as string) || '')
              setPage(1)
            }}
            variant="flat"
            classNames={{
              trigger: 'h-12 rounded-[18px] border border-white/8 bg-white/5 pr-10 text-white backdrop-blur-md transition-colors hover:bg-white/[0.07]',
              value: 'truncate pl-1 text-white',
            }}
            popoverProps={{ classNames: { content: 'min-w-[220px] border border-white/10 bg-apple-bg/95 p-1 backdrop-blur-3xl shadow-2xl' } }}
          >
            {statusOptions.map((item) => (
              <SelectItem key={item.key}>{item.label}</SelectItem>
            ))}
          </Select>
        </div>
      </section>

      <div className="overflow-x-auto rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl custom-scrollbar">
        <Table
          removeWrapper
          aria-label="Task Weak Scan Results Table"
          layout="fixed"
          classNames={{
            base: 'min-w-[1320px] p-4',
            table: 'table-fixed',
            th: 'h-14 border-b border-white/5 bg-transparent pb-2 text-left text-[10px] font-black uppercase tracking-[0.2em] text-apple-text-tertiary',
            td: 'border-b border-white/5 py-4 align-top last:border-0',
            tr: 'cursor-default transition-colors hover:bg-white/[0.03]',
          }}
        >
          <TableHeader>
            <TableColumn width={280}>目标 URL</TableColumn>
            <TableColumn width={120}>状态</TableColumn>
            <TableColumn width={360}>结果摘要</TableColumn>
            <TableColumn width={180}>执行节点</TableColumn>
            <TableColumn width={100}>尝试</TableColumn>
            <TableColumn width={120}>耗时</TableColumn>
            <TableColumn width={180}>最近更新时间</TableColumn>
            <TableColumn width={110}>详情</TableColumn>
          </TableHeader>
          <TableBody
            isLoading={query.isPending}
            loadingContent={<Skeleton className="h-40 w-full rounded-[24px] bg-white/5" />}
            emptyContent={(
              <div className="flex flex-col items-center gap-3 py-20 text-sm font-bold text-apple-text-tertiary">
                <ShieldExclamationIcon className="h-12 w-12 text-apple-blue-light opacity-60 drop-shadow-[0_0_12px_rgba(10,132,255,0.35)]" />
                <span className="text-[13px] font-black tracking-[0.08em] text-white">暂无弱点扫描结果</span>
                <span className="text-[12px] font-medium text-apple-text-tertiary">
                  {keyword || status ? '当前筛选条件下没有匹配的弱点扫描结果。' : '当前任务还没有产出弱点扫描结果。'}
                </span>
              </div>
            )}
          >
            {items.map((item) => (
              <TableRow key={item.unit_id}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="break-all font-mono text-[12px] text-white">{item.target_key || '-'}</span>
                    <Chip size="sm" variant="flat" classNames={{ base: 'w-fit border border-white/8 bg-white/[0.04]', content: 'text-[10px] font-bold tracking-[0.14em] uppercase text-apple-text-secondary' }}>
                      弱点扫描
                    </Chip>
                  </div>
                </TableCell>
                <TableCell>{renderStatus(item)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${item.status === 'succeeded' ? 'bg-apple-green' : item.status === 'failed' ? 'bg-apple-red' : 'bg-apple-blue'}`} />
                    <span className="text-[12px] font-medium text-white">{item.result_summary || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>{item.worker_id || '-'}</TableCell>
                <TableCell>{item.attempt}</TableCell>
                <TableCell>{formatDuration(item.duration_ms)}</TableCell>
                <TableCell>{formatDateTime(item.finished_at || item.started_at)}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="flat"
                    className="min-w-0 rounded-xl bg-white/5 text-apple-blue-light hover:bg-white/10 font-bold"
                    onPress={() => setSelectedRecord(item)}
                    startContent={<EyeIcon className="w-4 h-4" />}
                  >
                    详情
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {total > 0 && (
          <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.01] px-6 py-5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-apple-text-tertiary">
              弱点扫描结果 <span className="mx-1 text-white">{total}</span> 项
            </span>
            {totalPages > 1 && (
              <Pagination
                size="sm"
                page={page}
                total={totalPages}
                onChange={setPage}
                classNames={{
                  wrapper: 'gap-2',
                  item: 'h-8 min-w-[32px] rounded-xl border border-white/5 bg-white/5 text-[12px] font-bold text-apple-text-secondary transition-all hover:bg-white/10',
                  cursor: 'rounded-xl bg-apple-blue font-black text-white shadow-lg shadow-apple-blue/30',
                  prev: 'rounded-xl bg-white/5 text-white/50 hover:bg-white/10',
                  next: 'rounded-xl bg-white/5 text-white/50 hover:bg-white/10',
                }}
              />
            )}
          </div>
        )}
      </div>

      <TaskRecordDetailDrawer
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        taskId={taskId}
        record={selectedRecord}
      />
    </div>
  )
}
