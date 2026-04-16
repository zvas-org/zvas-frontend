import {
  Button,
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
  Tooltip,
} from '@heroui/react'
import { ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAssetPools } from '@/api/adapters/asset'
import { useWeakScanFindings } from '@/api/adapters/finding'
import { APPLE_TABLE_CLASSES } from '@/utils/theme'

const PAGE_SIZE = 20

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

function severityClass(severity: string) {
  switch ((severity || '').toLowerCase()) {
    case 'critical':
    case 'high':
      return 'border-apple-red/40 text-apple-red-light bg-apple-red/10'
    case 'medium':
      return 'border-apple-orange/40 text-apple-orange-light bg-apple-orange/10'
    case 'low':
      return 'border-apple-blue/40 text-apple-blue-light bg-apple-blue/10'
    case 'info':
      return 'border-apple-green/40 text-apple-green-light bg-apple-green/10'
    default:
      return 'border-white/15 text-apple-text-secondary bg-white/5'
  }
}

function truncateText(value: string, limit = 54) {
  const text = value.trim()
  if (!text) return '-'
  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

export function WeakScanFindingsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [url, setURL] = useState('')
  const [assetPoolID, setAssetPoolID] = useState('all')
  const [taskName, setTaskName] = useState('')

  const poolsQuery = useAssetPools({ page: 1, page_size: 100, sort: 'updated_at', order: 'desc' })

  const queryParams = useMemo(() => ({
    page,
    page_size: PAGE_SIZE,
    url: url.trim() || undefined,
    asset_pool_id: assetPoolID === 'all' ? undefined : assetPoolID,
    task_name: taskName.trim() || undefined,
    sort: 'matched_at',
    order: 'desc',
  }), [assetPoolID, page, taskName, url])

  const findingsQuery = useWeakScanFindings(queryParams)
  const items = findingsQuery.data?.data || []
  const total = findingsQuery.data?.pagination?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-8 w-full text-apple-text-primary animate-in fade-in duration-700 max-w-[1600px] mx-auto pb-20 p-4">
      <section className="flex flex-col gap-4 mt-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-white">全局弱点扫描结果</h1>
          <p className="mt-2 text-[13px] text-apple-text-tertiary">
            汇总展示所有弱点扫描任务产生的结果，适合从全局视角查看站点弱点、规则命中和来源任务。
          </p>
        </div>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px_260px_auto]">
          <Input
            isClearable
            value={url}
            placeholder="按 Base URL / 影响地址搜索"
            onValueChange={(value) => { setURL(value); setPage(1) }}
            variant="flat"
            startContent={<MagnifyingGlassIcon className="w-5 h-5 text-apple-text-tertiary" />}
            classNames={{
              inputWrapper: 'bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-14 rounded-[20px] border border-white/5 backdrop-blur-md',
              input: 'text-base font-medium placeholder:text-apple-text-tertiary',
            }}
          />
          <Select
            aria-label="资产池筛选"
            selectedKeys={[assetPoolID]}
            onChange={(event) => { setAssetPoolID(event.target.value || 'all'); setPage(1) }}
            variant="flat"
            classNames={{
              trigger: 'bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-14 rounded-[20px] border border-white/5 backdrop-blur-md',
              value: 'text-apple-text-primary',
            }}
          >
            <SelectItem key="all">全部资产池</SelectItem>
            {(poolsQuery.data?.data || []).map((pool) => (
              <SelectItem key={pool.id}>{pool.name || pool.id}</SelectItem>
            ))}
          </Select>
          <Input
            isClearable
            value={taskName}
            placeholder="按任务名称搜索"
            onValueChange={(value) => { setTaskName(value); setPage(1) }}
            variant="flat"
            classNames={{
              inputWrapper: 'bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-14 rounded-[20px] border border-white/5 backdrop-blur-md',
              input: 'text-base font-medium placeholder:text-apple-text-tertiary',
            }}
          />
          <Button
            variant="flat"
            isIconOnly
            className="h-14 w-14 rounded-[20px] bg-apple-tertiary-bg/10 border border-white/5 backdrop-blur-md"
            onPress={() => findingsQuery.refetch()}
          >
            <ArrowPathIcon className="w-6 h-6 text-apple-text-secondary" />
          </Button>
        </div>
      </section>

      <div className="rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-x-auto">
        <Table
          aria-label="Global weak scan findings table"
          layout="fixed"
          removeWrapper
          classNames={{
            ...APPLE_TABLE_CLASSES,
            base: 'p-4 min-w-[1200px]',
            tr: `${APPLE_TABLE_CLASSES.tr} cursor-default`,
          }}
        >
          <TableHeader>
            <TableColumn width={240}>规则名称</TableColumn>
            <TableColumn width={120}>等级</TableColumn>
            <TableColumn width={130}>状态</TableColumn>
            <TableColumn width={240}>目标</TableColumn>
            <TableColumn width={220}>影响地址</TableColumn>
            <TableColumn width={180}>来源任务</TableColumn>
            <TableColumn width={180}>最近命中时间</TableColumn>
            <TableColumn width={120} align="end">操作</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={<div className="h-40 flex items-center justify-center text-apple-text-tertiary font-bold">当前暂无弱点扫描结果。</div>}
            isLoading={findingsQuery.isPending}
            loadingContent={<Skeleton className="rounded-xl w-full h-40 bg-white/5" />}
          >
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-white">{item.rule_name || item.rule_id || '-'}</span>
                    <span className="text-[11px] font-mono text-apple-text-tertiary">{truncateText(item.rule_id || item.remote_vulnerability_id || item.finding_key, 32)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-[0.18em] uppercase border ${severityClass(item.severity)}`}>
                    {item.severity || 'unknown'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-[12px] font-mono text-apple-text-secondary">{item.status || '-'}</span>
                </TableCell>
                <TableCell>
                  <Tooltip content={<div className="max-w-[420px] break-all text-xs">{item.target_url || '-'}</div>} classNames={{ content: 'border border-white/10 bg-apple-bg/95 px-3 py-2 text-white' }}>
                    <span className="block truncate font-mono text-[12px] text-white">{item.target_url || '-'}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip content={<div className="max-w-[420px] break-all text-xs">{item.affects_url || '-'}</div>} classNames={{ content: 'border border-white/10 bg-apple-bg/95 px-3 py-2 text-white' }}>
                    <span className="block truncate font-mono text-[12px] text-apple-text-secondary">{item.affects_url || '-'}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="block truncate text-[12px] font-semibold text-white">{item.task_name || item.task_id || '-'}</span>
                    <span className="block truncate text-[11px] text-apple-text-tertiary">{item.asset_pool_name || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-[12px] font-mono text-apple-text-secondary">{formatDateTime(item.matched_at || item.updated_at)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="bordered"
                      className="rounded-full border-white/10 text-apple-text-secondary hover:text-white hover:border-white/30 font-bold"
                      onPress={() => navigate(`/tasks/${item.task_id}?tab=weak_scan`)}
                    >
                      查看任务
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {total > 0 && (
          <div className="px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center border-t border-white/5 bg-white/[0.01]">
            <p className="text-[11px] text-apple-text-tertiary font-bold uppercase tracking-[0.2em]">
              全局弱点扫描结果 <span className="text-white">{total}</span>
            </p>
            {totalPages > 1 && (
              <Pagination
                total={totalPages}
                page={page}
                onChange={setPage}
                classNames={{
                  wrapper: 'gap-2',
                  item: 'bg-white/5 text-apple-text-secondary font-bold rounded-xl border border-white/5 h-10 min-w-[40px]',
                  cursor: 'bg-apple-blue font-black rounded-xl shadow-lg',
                  prev: 'bg-white/5',
                  next: 'bg-white/5',
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
