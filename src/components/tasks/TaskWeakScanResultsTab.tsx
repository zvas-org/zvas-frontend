import { useMemo, useState, type KeyboardEvent } from 'react'
import {
  Button,
  Chip,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
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
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'

import { type TaskWeakScanFindingVM, useTaskWeakScanFindings } from '@/api/adapters/task'
import { APPLE_TABLE_CLASSES } from '@/utils/theme'

const PAGE_SIZE = 20

type WeakScanFilterState = {
  url: string
  ruleID: string
  severity: string
  status: string
}

const EMPTY_FILTERS: WeakScanFilterState = {
  url: '',
  ruleID: '',
  severity: 'all',
  status: 'all',
}

function severityColor(severity: string): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' {
  switch ((severity || '').toLowerCase()) {
    case 'critical':
    case 'high':
      return 'danger'
    case 'medium':
      return 'warning'
    case 'low':
      return 'primary'
    case 'info':
      return 'success'
    default:
      return 'default'
  }
}

function formatDateTime(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

function firstNonEmptyText(...values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined) continue
    const text = typeof value === 'string' ? value.trim() : String(value).trim()
    if (text) return text
  }
  return ''
}

function truncateText(value: string, limit = 56): string {
  const text = value.trim()
  if (!text) return '-'
  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

function RenderTextCell({ value, limit = 56, mono = false }: { value: string; limit?: number; mono?: boolean }) {
  const text = value.trim()
  if (!text) return <span className="text-apple-text-tertiary">-</span>
  const display = truncateText(text, limit)
  const className = mono ? 'font-mono text-[12px] text-white' : 'text-[13px] text-white'
  if (display === text) {
    return <span className={className}>{display}</span>
  }
  return (
    <Tooltip content={<div className="max-w-[420px] break-all text-xs">{text}</div>} classNames={{ content: 'border border-white/10 bg-apple-bg/95 px-3 py-2 text-white' }}>
      <span className={className}>{display}</span>
    </Tooltip>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-apple-text-tertiary">{label}</div>
      <div className="break-all text-sm text-white">{value || '-'}</div>
    </div>
  )
}

function MessageBlock({ title, content }: { title: string; content: string }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const text = content || '-'
  const canCollapse = text.length > 1200

  async function handleCopy() {
    if (!text || text === '-') return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-apple-text-tertiary">{title}</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="flat" className="min-w-0 rounded-lg bg-white/6 px-3 text-[11px] font-bold text-white hover:bg-white/10" onPress={handleCopy}>
            {copied ? '已复制' : '复制'}
          </Button>
          {canCollapse && (
            <Button size="sm" variant="flat" className="min-w-0 rounded-lg bg-white/6 px-3 text-[11px] font-bold text-white hover:bg-white/10" onPress={() => setExpanded((prev) => !prev)}>
              {expanded ? '收起' : '展开'}
            </Button>
          )}
        </div>
      </div>
      <pre className={`${expanded ? 'max-h-[min(70vh,900px)]' : 'max-h-[min(42vh,520px)]'} overflow-auto rounded-[24px] border border-white/8 bg-black/30 p-5 font-mono text-xs leading-relaxed text-apple-text-secondary whitespace-pre-wrap break-all`}>
        {text}
      </pre>
    </section>
  )
}

function WeakScanDrawer({ item, onClose }: { item: TaskWeakScanFindingVM | null; onClose: () => void }) {
  return (
    <Drawer
      isOpen={Boolean(item)}
      onOpenChange={(open) => !open && onClose()}
      placement="right"
      backdrop="blur"
      scrollBehavior="inside"
      classNames={{
        base: '!w-screen sm:!w-[min(94vw,1120px)] xl:!w-[min(88vw,1320px)] max-w-none h-dvh max-h-dvh border-l border-white/10 bg-apple-bg/92 text-apple-text-primary backdrop-blur-3xl',
        header: 'border-b border-white/6 px-5 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-6',
        body: 'px-5 py-5 sm:px-8 sm:py-6',
        footer: 'border-t border-white/6 px-5 py-4 sm:px-8 sm:py-5',
      }}
    >
      <DrawerContent>
        <>
          <DrawerHeader className="flex flex-col gap-3">
            <span className="text-[11px] font-black uppercase tracking-[0.28em] text-apple-text-tertiary">弱点扫描详情</span>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-black tracking-tight text-white">{item?.rule_name || item?.rule_id || '未命名弱点'}</h3>
              <Chip size="sm" variant="flat" color={severityColor(item?.severity || '')} classNames={{ base: 'border-0 px-2 font-black uppercase tracking-[0.18em]' }}>
                {item?.severity || '-'}
              </Chip>
              <Chip size="sm" variant="flat" classNames={{ base: 'border border-white/8 bg-white/[0.04]', content: 'text-[11px] text-white' }}>
                {item?.status || '-'}
              </Chip>
            </div>
            <p className="break-all font-mono text-sm text-apple-text-secondary">{item?.affects_url || item?.target_url || '-'}</p>
          </DrawerHeader>
          <DrawerBody className="space-y-8 overflow-y-auto">
            {item && (
              <>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <InfoCard label="规则 ID" value={item.rule_id || item.finding_key || '-'} />
                  <InfoCard label="发现时间" value={formatDateTime(item.matched_at || item.updated_at)} />
                  <InfoCard label="目标站点" value={item.target_url || '-'} />
                  <InfoCard label="影响地址" value={item.affects_url || item.target_url || '-'} />
                  <InfoCard label="CVSS 评分" value={firstNonEmptyText(item.cvss_score, item.cvss3, item.cvss2)} />
                  <InfoCard label="标签" value={item.tags.length ? item.tags.join(', ') : '-'} />
                </div>

                <section className="space-y-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-apple-text-tertiary">风险说明</h3>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-white">
                    {item.description || '暂无描述'}
                  </div>
                </section>

                {item.impact && (
                  <section className="space-y-3">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-apple-text-tertiary">影响说明</h3>
                    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-white whitespace-pre-wrap break-words">
                      {item.impact}
                    </div>
                  </section>
                )}

                <section className="space-y-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-apple-text-tertiary">修复建议</h3>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-white whitespace-pre-wrap break-words">
                    {item.recommendation || '暂无修复建议'}
                  </div>
                </section>

                {item.details && (
                  <section className="space-y-3">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-apple-text-tertiary">补充细节</h3>
                    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-white whitespace-pre-wrap break-words">
                      {item.details}
                    </div>
                  </section>
                )}

                {item.affects_detail && (
                  <section className="space-y-3">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-apple-text-tertiary">命中片段</h3>
                    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 font-mono text-xs leading-relaxed text-white whitespace-pre-wrap break-all">
                      {item.affects_detail}
                    </div>
                  </section>
                )}

                {item.request && <MessageBlock title="弱点请求" content={item.request} />}
                {item.response && <MessageBlock title="弱点响应" content={item.response} />}
              </>
            )}
          </DrawerBody>
          <DrawerFooter>
            <Button fullWidth variant="flat" className="rounded-xl bg-white/5 font-bold text-white hover:bg-white/10" onPress={onClose}>
              关闭
            </Button>
          </DrawerFooter>
        </>
      </DrawerContent>
    </Drawer>
  )
}

export function TaskWeakScanResultsTab({ taskId }: { taskId: string }) {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<WeakScanFilterState>(EMPTY_FILTERS)
  const [draftFilters, setDraftFilters] = useState<WeakScanFilterState>(EMPTY_FILTERS)
  const [selectedItem, setSelectedItem] = useState<TaskWeakScanFindingVM | null>(null)

  const queryParams = useMemo(() => ({
    page,
    page_size: PAGE_SIZE,
    url: filters.url || undefined,
    rule_id: filters.ruleID || undefined,
    severity: filters.severity === 'all' ? undefined : filters.severity,
    status: filters.status === 'all' ? undefined : filters.status,
  }), [filters, page])

  const { data, isPending, isError, refetch } = useTaskWeakScanFindings(taskId, queryParams)

  const items = useMemo(() => data?.data ?? [], [data?.data])
  const total = data?.pagination?.total || 0
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])
  const severitySummary = useMemo(() => {
    const summary = new Map<string, number>()
    for (const item of items) {
      const key = (item.severity || 'unknown').toLowerCase()
      summary.set(key, (summary.get(key) || 0) + 1)
    }
    return [
      { key: 'total', label: '当前筛选结果', value: total, tone: 'border-white/8 bg-white/[0.03] text-white' },
      { key: 'high', label: '高危/严重', value: (summary.get('critical') || 0) + (summary.get('high') || 0), tone: 'border-apple-red/20 bg-apple-red/[0.06] text-apple-red-light' },
      { key: 'medium', label: '中危', value: summary.get('medium') || 0, tone: 'border-apple-amber/20 bg-apple-amber/[0.06] text-apple-amber' },
      { key: 'low', label: '低危/信息', value: (summary.get('low') || 0) + (summary.get('info') || 0), tone: 'border-apple-blue/20 bg-apple-blue/[0.06] text-apple-blue-light' },
    ]
  }, [items, total])
  const hasActiveFilters = Boolean(filters.url || filters.ruleID || filters.severity !== 'all' || filters.status !== 'all')

  function handleApplyFilters() {
    setPage(1)
    setFilters({
      url: draftFilters.url.trim(),
      ruleID: draftFilters.ruleID.trim(),
      severity: draftFilters.severity || 'all',
      status: draftFilters.status || 'all',
    })
  }

  function handleResetFilters() {
    setPage(1)
    setDraftFilters(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
  }

  function handleFilterEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      handleApplyFilters()
    }
  }

  return (
    <div className="mb-8 flex w-full animate-in fade-in flex-col gap-6 duration-500">
      <div className="flex w-full flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col">
          <h3 className="mb-1 flex items-center gap-2 text-xl font-black tracking-tight text-white">
            <ShieldExclamationIcon className="h-6 w-6 text-apple-blue-light drop-shadow-[0_0_8px_rgba(10,132,255,0.45)]" />
            <span>任务弱点扫描结果</span>
          </h3>
          <p className="text-[13px] font-medium text-apple-text-tertiary">这里直接展示当前任务产出的弱点扫描结果明细，一条弱点一条记录，不再按扫描记录或目标站点聚合查看。</p>
        </div>
        <Button
          variant="flat"
          isIconOnly
          className="h-12 w-12 rounded-[16px] border border-white/5 bg-apple-tertiary-bg/10 backdrop-blur-md transition-colors hover:bg-white/10"
          onPress={() => refetch()}
        >
          <ArrowPathIcon className="h-5 w-5 text-apple-text-secondary" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {severitySummary.map((card) => (
          <div key={card.key} className={`rounded-[22px] border px-4 py-4 ${card.tone}`}>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-apple-text-tertiary">{card.label}</div>
            <div className="mt-3 text-2xl font-black">{card.value}</div>
          </div>
        ))}
      </div>

      <section className="rounded-[28px] border border-white/8 bg-white/[0.02] p-4 backdrop-blur-3xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Input
            isClearable
            value={draftFilters.url}
            placeholder="按目标 URL / 影响地址筛选"
            onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, url: value }))}
            onKeyDown={handleFilterEnter}
            variant="flat"
            startContent={<MagnifyingGlassIcon className="h-5 w-5 text-apple-text-tertiary" />}
            classNames={{
              inputWrapper: 'h-12 rounded-[18px] border border-white/8 bg-white/5 backdrop-blur-md transition-colors hover:bg-white/[0.07]',
              input: 'text-sm text-white placeholder:text-apple-text-tertiary',
            }}
          />

          <Input
            isClearable
            value={draftFilters.ruleID}
            placeholder="按规则 ID / finding key 筛选"
            onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, ruleID: value }))}
            onKeyDown={handleFilterEnter}
            variant="flat"
            classNames={{
              inputWrapper: 'h-12 rounded-[18px] border border-white/8 bg-white/5 backdrop-blur-md transition-colors hover:bg-white/[0.07]',
              input: 'text-sm text-white placeholder:text-apple-text-tertiary',
            }}
          />

          <Select
            aria-label="级别筛选"
            selectedKeys={new Set([draftFilters.severity])}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, severity: event.target.value || 'all' }))}
            variant="flat"
            classNames={{
              trigger: 'h-12 rounded-[18px] border border-white/8 bg-white/5 pr-10 text-white backdrop-blur-md transition-colors hover:bg-white/[0.07]',
              value: 'truncate pl-1 text-white',
            }}
            popoverProps={{ classNames: { content: 'min-w-[220px] border border-white/10 bg-apple-bg/95 p-1 backdrop-blur-3xl shadow-2xl' } }}
          >
            <SelectItem key="all" textValue="所有级别">所有级别</SelectItem>
            <SelectItem key="critical" textValue="严重">严重</SelectItem>
            <SelectItem key="high" textValue="高危">高危</SelectItem>
            <SelectItem key="medium" textValue="中危">中危</SelectItem>
            <SelectItem key="low" textValue="低危">低危</SelectItem>
            <SelectItem key="info" textValue="信息">信息</SelectItem>
          </Select>

          <Select
            aria-label="状态筛选"
            selectedKeys={new Set([draftFilters.status])}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, status: event.target.value || 'all' }))}
            variant="flat"
            classNames={{
              trigger: 'h-12 rounded-[18px] border border-white/8 bg-white/5 pr-10 text-white backdrop-blur-md transition-colors hover:bg-white/[0.07]',
              value: 'truncate pl-1 text-white',
            }}
            popoverProps={{ classNames: { content: 'min-w-[220px] border border-white/10 bg-apple-bg/95 p-1 backdrop-blur-3xl shadow-2xl' } }}
          >
            <SelectItem key="all" textValue="全部状态">全部状态</SelectItem>
            <SelectItem key="open" textValue="Open">Open</SelectItem>
            <SelectItem key="confirmed" textValue="Confirmed">Confirmed</SelectItem>
            <SelectItem key="fixed" textValue="Fixed">Fixed</SelectItem>
            <SelectItem key="ignored" textValue="Ignored">Ignored</SelectItem>
            <SelectItem key="false_positive" textValue="False Positive">False Positive</SelectItem>
            <SelectItem key="retest" textValue="Retest">Retest</SelectItem>
          </Select>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <Button color="primary" className="h-12 rounded-[18px] px-6 font-black" onPress={handleApplyFilters}>
              查询
            </Button>
            <Button variant="flat" className="h-12 rounded-[18px] border border-white/8 bg-white/5 px-5 font-bold text-white hover:bg-white/[0.08]" onPress={handleResetFilters}>
              重置
            </Button>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-apple-text-tertiary">
            当前条件
            {filters.url ? ` | URL: ${filters.url}` : ''}
            {filters.ruleID ? ` | 规则: ${filters.ruleID}` : ''}
            {filters.severity !== 'all' ? ` | 等级: ${filters.severity}` : ''}
            {filters.status !== 'all' ? ` | 状态: ${filters.status}` : ''}
          </div>
        )}
      </section>

      {isError && (
        <div className="rounded-[24px] border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-200">
          任务弱点扫描结果加载失败，请稍后重试。
        </div>
      )}

      <div className="custom-scrollbar overflow-x-auto rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl">
        <Table
          removeWrapper
          aria-label="Task Weak Scan Findings Table"
          layout="fixed"
          classNames={{
            ...APPLE_TABLE_CLASSES,
            base: 'min-w-[1400px] p-4',
            tr: `${APPLE_TABLE_CLASSES.tr} cursor-default`,
            td: `${APPLE_TABLE_CLASSES.td} align-top`,
          }}
        >
          <TableHeader>
            <TableColumn width={280}>影响地址</TableColumn>
            <TableColumn width={200}>规则 ID</TableColumn>
            <TableColumn width={240}>弱点名称</TableColumn>
            <TableColumn width={110}>级别</TableColumn>
            <TableColumn width={120}>状态</TableColumn>
            <TableColumn width={140}>详情</TableColumn>
            <TableColumn width={200}>最近更新时间</TableColumn>
          </TableHeader>
          <TableBody
            isLoading={isPending}
            loadingContent={<Skeleton className="h-40 w-full rounded-[24px] bg-white/5" />}
            emptyContent={(
              <div className="flex flex-col items-center gap-3 py-20 text-sm font-bold text-apple-text-tertiary">
                <ShieldExclamationIcon className="h-12 w-12 text-apple-blue-light opacity-60 drop-shadow-[0_0_12px_rgba(10,132,255,0.35)]" />
                <span className="text-[13px] font-black tracking-[0.08em] text-white">暂无弱点扫描结果</span>
                <span className="text-[12px] font-medium text-apple-text-tertiary">
                  {hasActiveFilters ? '当前筛选条件下没有匹配的弱点扫描结果。' : '当前任务还没有产出弱点扫描结果。'}
                </span>
              </div>
            )}
          >
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell><RenderTextCell value={item.affects_url || item.target_url || '-'} limit={44} mono /></TableCell>
                <TableCell><RenderTextCell value={item.rule_id || item.finding_key || '-'} limit={24} mono /></TableCell>
                <TableCell><RenderTextCell value={item.rule_name || item.rule_id || '-'} limit={34} /></TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color={severityColor(item.severity)} classNames={{ base: 'border-0 px-1 font-black uppercase tracking-[0.12em]' }}>
                    {item.severity || '-'}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" classNames={{ base: 'border border-white/8 bg-white/[0.04]', content: 'text-[11px] text-white' }}>
                    {item.status || '-'}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="flat" className="rounded-xl bg-white/6 font-bold text-white hover:bg-white/10" onPress={() => setSelectedItem(item)}>
                    查看详情
                  </Button>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-[12px] text-apple-text-secondary">{formatDateTime(item.matched_at || item.updated_at)}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!isError && total > 0 && (
          <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.01] px-6 py-5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-apple-text-tertiary">任务弱点扫描结果 <span className="mx-1 text-white">{total}</span> 条</span>
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

      <WeakScanDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  )
}
