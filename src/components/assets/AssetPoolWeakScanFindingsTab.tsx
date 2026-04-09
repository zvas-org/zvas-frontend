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
import { type SetURLSearchParams, useSearchParams } from 'react-router-dom'

import { type AssetPoolWeakScanFindingVM, useAssetPoolWeakScanFindings } from '@/api/adapters/asset'

const PAGE_SIZE = 20

type WeakScanFilterState = {
  url: string
  keyword: string
  taskID: string
  ruleID: string
  severity: string
  status: string
  sort: string
  order: string
}

const EMPTY_FILTERS: WeakScanFilterState = {
  url: '',
  keyword: '',
  taskID: '',
  ruleID: '',
  severity: 'all',
  status: 'all',
  sort: 'matched_at',
  order: 'desc',
}

const URL_FILTER_PARAM_URL = 'weak_scan_url'
const URL_FILTER_PARAM_KEYWORD = 'weak_scan_keyword'
const URL_FILTER_PARAM_TASK_ID = 'weak_scan_task_id'
const URL_FILTER_PARAM_RULE_ID = 'weak_scan_rule_id'
const URL_FILTER_PARAM_SEVERITY = 'weak_scan_severity'
const URL_FILTER_PARAM_STATUS = 'weak_scan_status'
const URL_FILTER_PARAM_SORT = 'weak_scan_sort'
const URL_FILTER_PARAM_ORDER = 'weak_scan_order'
const SEVERITY_VALUES = new Set(['all', 'critical', 'high', 'medium', 'low', 'info'])
const STATUS_VALUES = new Set(['all', 'open', 'confirmed', 'fixed', 'ignored', 'false_positive', 'retest'])
const SORT_VALUES = new Set(['matched_at', 'updated_at', 'severity', 'task_id'])
const ORDER_VALUES = new Set(['asc', 'desc'])

function readFiltersFromSearchParams(searchParams: URLSearchParams): WeakScanFilterState {
  const severity = (searchParams.get(URL_FILTER_PARAM_SEVERITY) || '').trim().toLowerCase()
  const status = (searchParams.get(URL_FILTER_PARAM_STATUS) || '').trim().toLowerCase()
  const sort = (searchParams.get(URL_FILTER_PARAM_SORT) || '').trim().toLowerCase()
  const order = (searchParams.get(URL_FILTER_PARAM_ORDER) || '').trim().toLowerCase()
  return {
    url: (searchParams.get(URL_FILTER_PARAM_URL) || '').trim(),
    keyword: (searchParams.get(URL_FILTER_PARAM_KEYWORD) || '').trim(),
    taskID: (searchParams.get(URL_FILTER_PARAM_TASK_ID) || '').trim(),
    ruleID: (searchParams.get(URL_FILTER_PARAM_RULE_ID) || '').trim(),
    severity: SEVERITY_VALUES.has(severity) ? severity : 'all',
    status: STATUS_VALUES.has(status) ? status : 'all',
    sort: SORT_VALUES.has(sort) ? sort : 'matched_at',
    order: ORDER_VALUES.has(order) ? order : 'desc',
  }
}

function writeFiltersToSearchParams(searchParams: URLSearchParams, filters: WeakScanFilterState): URLSearchParams {
  const next = new URLSearchParams(searchParams)
  const url = filters.url.trim()
  const keyword = filters.keyword.trim()
  const taskID = filters.taskID.trim()
  const ruleID = filters.ruleID.trim()
  const severity = (filters.severity || 'all').trim().toLowerCase()
  const status = (filters.status || 'all').trim().toLowerCase()
  const sort = (filters.sort || 'matched_at').trim().toLowerCase()
  const order = (filters.order || 'desc').trim().toLowerCase()

  if (url) next.set(URL_FILTER_PARAM_URL, url)
  else next.delete(URL_FILTER_PARAM_URL)

  if (keyword) next.set(URL_FILTER_PARAM_KEYWORD, keyword)
  else next.delete(URL_FILTER_PARAM_KEYWORD)

  if (taskID) next.set(URL_FILTER_PARAM_TASK_ID, taskID)
  else next.delete(URL_FILTER_PARAM_TASK_ID)

  if (ruleID) next.set(URL_FILTER_PARAM_RULE_ID, ruleID)
  else next.delete(URL_FILTER_PARAM_RULE_ID)

  if (severity !== 'all') next.set(URL_FILTER_PARAM_SEVERITY, severity)
  else next.delete(URL_FILTER_PARAM_SEVERITY)

  if (status !== 'all') next.set(URL_FILTER_PARAM_STATUS, status)
  else next.delete(URL_FILTER_PARAM_STATUS)

  if (sort !== 'matched_at') next.set(URL_FILTER_PARAM_SORT, sort)
  else next.delete(URL_FILTER_PARAM_SORT)

  if (order !== 'desc') next.set(URL_FILTER_PARAM_ORDER, order)
  else next.delete(URL_FILTER_PARAM_ORDER)

  return next
}

function sortLabel(sort: string): string {
  switch (sort) {
    case 'updated_at':
      return '最近更新时间'
    case 'severity':
      return '风险等级'
    case 'task_id':
      return '来源任务'
    default:
      return '最近命中时间'
  }
}

function orderLabel(order: string): string {
  return order === 'asc' ? '升序' : '降序'
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

function WeakScanDrawer({ item, onClose }: { item: AssetPoolWeakScanFindingVM | null; onClose: () => void }) {
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
                  <InfoCard label="目标 URL" value={item.target_url || '-'} />
                  <InfoCard label="影响地址" value={item.affects_url || item.target_url || '-'} />
                  <InfoCard label="来源任务" value={item.task_id || '-'} />
                  <InfoCard label="站点资产" value={item.site_asset_id || '-'} />
                  <InfoCard label="远端扫描 ID" value={item.remote_scan_id || '-'} />
                  <InfoCard label="远端结果 ID" value={item.remote_result_id || '-'} />
                  <InfoCard label="远端漏洞 ID" value={item.remote_vulnerability_id || '-'} />
                  <InfoCard label="CVSS 评分" value={firstNonEmptyText(item.cvss_score, item.cvss3, item.cvss2)} />
                  <InfoCard label="来源引擎" value={item.source || '-'} />
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

type AssetPoolWeakScanFindingsTabContentProps = {
  poolId: string
  searchParams: URLSearchParams
  setSearchParams: SetURLSearchParams
  urlFilters: WeakScanFilterState
}

function AssetPoolWeakScanFindingsTabContent({ poolId, searchParams, setSearchParams, urlFilters }: AssetPoolWeakScanFindingsTabContentProps) {
  const [page, setPage] = useState(1)
  const [draftFilters, setDraftFilters] = useState<WeakScanFilterState>(urlFilters)
  const [selectedItem, setSelectedItem] = useState<AssetPoolWeakScanFindingVM | null>(null)

  const queryParams = useMemo(() => ({
    page,
    page_size: PAGE_SIZE,
    url: urlFilters.url || undefined,
    keyword: urlFilters.keyword || undefined,
    task_id: urlFilters.taskID || undefined,
    rule_id: urlFilters.ruleID || undefined,
    severity: urlFilters.severity === 'all' ? undefined : urlFilters.severity,
    status: urlFilters.status === 'all' ? undefined : urlFilters.status,
    sort: urlFilters.sort === 'matched_at' ? undefined : urlFilters.sort,
    order: urlFilters.order === 'desc' ? undefined : urlFilters.order,
  }), [page, urlFilters])

  const { data, isPending, isError, refetch } = useAssetPoolWeakScanFindings(poolId, queryParams)

  const items = data?.data || []
  const total = data?.pagination?.total || 0
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])
  const hasActiveFilters = Boolean(urlFilters.url || urlFilters.keyword || urlFilters.taskID || urlFilters.ruleID || urlFilters.severity !== 'all' || urlFilters.status !== 'all')
  const showConditionSummary = hasActiveFilters || urlFilters.sort !== 'matched_at' || urlFilters.order !== 'desc'

  function handleApplyFilters() {
    const nextFilters = {
      url: draftFilters.url.trim(),
      keyword: draftFilters.keyword.trim(),
      taskID: draftFilters.taskID.trim(),
      ruleID: draftFilters.ruleID.trim(),
      severity: draftFilters.severity || 'all',
      status: draftFilters.status || 'all',
      sort: draftFilters.sort || 'matched_at',
      order: draftFilters.order || 'desc',
    }
    setPage(1)
    setDraftFilters(nextFilters)
    setSearchParams(writeFiltersToSearchParams(searchParams, nextFilters), { replace: true })
  }

  function handleResetFilters() {
    setPage(1)
    setDraftFilters({ ...EMPTY_FILTERS })
    setSearchParams(writeFiltersToSearchParams(searchParams, EMPTY_FILTERS), { replace: true })
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
            <span>资产池累计弱点扫描结果</span>
          </h3>
          <p className="text-[13px] font-medium text-apple-text-tertiary">独立展示该资产池在全部任务中沉淀的弱点扫描结果，可按 URL、关键字、任务、弱点规则、级别、状态与排序方式筛选查看。</p>
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

      <section className="rounded-[28px] border border-white/8 bg-white/[0.02] p-4 backdrop-blur-3xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
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
            value={draftFilters.keyword}
            placeholder="按规则名 / 描述 / 建议关键字筛选"
            onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, keyword: value }))}
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
            value={draftFilters.taskID}
            placeholder="按来源任务 ID 筛选"
            onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, taskID: value }))}
            onKeyDown={handleFilterEnter}
            variant="flat"
            classNames={{
              inputWrapper: 'h-12 rounded-[18px] border border-white/8 bg-white/5 backdrop-blur-md transition-colors hover:bg-white/[0.07]',
              input: 'text-sm text-white placeholder:text-apple-text-tertiary',
            }}
          />

          <Input
            isClearable
            value={draftFilters.ruleID}
            placeholder="按弱点规则 ID / finding key 筛选"
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

          <Select
            aria-label="排序字段"
            selectedKeys={new Set([draftFilters.sort])}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, sort: event.target.value || 'matched_at' }))}
            variant="flat"
            classNames={{
              trigger: 'h-12 rounded-[18px] border border-white/8 bg-white/5 pr-10 text-white backdrop-blur-md transition-colors hover:bg-white/[0.07]',
              value: 'truncate pl-1 text-white',
            }}
            popoverProps={{ classNames: { content: 'min-w-[220px] border border-white/10 bg-apple-bg/95 p-1 backdrop-blur-3xl shadow-2xl' } }}
          >
            <SelectItem key="matched_at" textValue="最近命中时间">最近命中时间</SelectItem>
            <SelectItem key="updated_at" textValue="最近更新时间">最近更新时间</SelectItem>
            <SelectItem key="severity" textValue="风险等级">风险等级</SelectItem>
            <SelectItem key="task_id" textValue="来源任务">来源任务</SelectItem>
          </Select>

          <Select
            aria-label="排序方向"
            selectedKeys={new Set([draftFilters.order])}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, order: event.target.value || 'desc' }))}
            variant="flat"
            classNames={{
              trigger: 'h-12 rounded-[18px] border border-white/8 bg-white/5 pr-10 text-white backdrop-blur-md transition-colors hover:bg-white/[0.07]',
              value: 'truncate pl-1 text-white',
            }}
            popoverProps={{ classNames: { content: 'min-w-[180px] border border-white/10 bg-apple-bg/95 p-1 backdrop-blur-3xl shadow-2xl' } }}
          >
            <SelectItem key="desc" textValue="降序">降序</SelectItem>
            <SelectItem key="asc" textValue="升序">升序</SelectItem>
          </Select>

          <div className="flex flex-wrap items-center gap-3 xl:col-span-4 2xl:col-span-6 xl:justify-end">
            <Button color="primary" className="h-12 rounded-[18px] px-6 font-black" onPress={handleApplyFilters}>
              查询
            </Button>
            <Button variant="flat" className="h-12 rounded-[18px] border border-white/8 bg-white/5 px-5 font-bold text-white hover:bg-white/[0.08]" onPress={handleResetFilters}>
              重置
            </Button>
          </div>
        </div>
        {showConditionSummary && (
          <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-apple-text-tertiary">
            当前条件
            {urlFilters.url ? ` | URL: ${urlFilters.url}` : ''}
            {urlFilters.keyword ? ` | 关键字: ${urlFilters.keyword}` : ''}
            {urlFilters.taskID ? ` | 任务: ${urlFilters.taskID}` : ''}
            {urlFilters.ruleID ? ` | 规则: ${urlFilters.ruleID}` : ''}
            {urlFilters.severity !== 'all' ? ` | 等级: ${urlFilters.severity}` : ''}
            {urlFilters.status !== 'all' ? ` | 状态: ${urlFilters.status}` : ''}
            {` | 排序: ${sortLabel(urlFilters.sort)} ${orderLabel(urlFilters.order)}`}
          </div>
        )}
      </section>

      {isError && (
        <div className="rounded-[24px] border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-200">
          资产池弱点扫描结果加载失败，请稍后重试。
        </div>
      )}

      <div className="custom-scrollbar overflow-x-auto rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl">
        <Table
          removeWrapper
          aria-label="Asset Pool Weak Scan Findings Table"
          layout="fixed"
          classNames={{
            base: 'min-w-[1560px] p-4',
            table: 'table-fixed',
            th: 'h-14 border-b border-white/5 bg-transparent pb-2 text-left text-[10px] font-black uppercase tracking-[0.2em] text-apple-text-tertiary',
            td: 'border-b border-white/5 py-4 align-top last:border-0',
            tr: 'cursor-default transition-colors hover:bg-white/[0.03]',
          }}
        >
          <TableHeader>
            <TableColumn width={280}>目标 URL</TableColumn>
            <TableColumn width={200}>规则 ID</TableColumn>
            <TableColumn width={220}>弱点名称</TableColumn>
            <TableColumn width={110}>级别</TableColumn>
            <TableColumn width={120}>状态</TableColumn>
            <TableColumn width={220}>来源任务</TableColumn>
            <TableColumn width={140}>详情</TableColumn>
            <TableColumn width={190}>最近更新时间</TableColumn>
          </TableHeader>
          <TableBody
            isLoading={isPending}
            loadingContent={<Skeleton className="h-40 w-full rounded-[24px] bg-white/5" />}
            emptyContent={(
              <div className="flex flex-col items-center gap-3 py-20 text-sm font-bold text-apple-text-tertiary">
                <ShieldExclamationIcon className="h-12 w-12 text-apple-blue-light opacity-60 drop-shadow-[0_0_12px_rgba(10,132,255,0.35)]" />
                <span className="text-[13px] font-black uppercase tracking-[0.1em] text-white">NO_WEAK_SCAN_RESULTS</span>
                <span className="text-[12px] font-medium text-apple-text-tertiary">{hasActiveFilters ? '当前筛选条件下没有匹配的弱点扫描结果。' : '当前资产池还没有累计弱点扫描结果。'}</span>
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
                  <div className="space-y-1">
                    <div><RenderTextCell value={item.task_id || '-'} limit={28} mono /></div>
                    <div className="font-mono text-[10px] text-apple-text-tertiary">{truncateText(item.remote_scan_id || '-', 26)}</div>
                  </div>
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-apple-text-tertiary">累计弱点扫描结果 <span className="mx-1 text-white">{total}</span> 条</span>
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

export function AssetPoolWeakScanFindingsTab({ poolId }: { poolId: string }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlFilters = useMemo(() => readFiltersFromSearchParams(searchParams), [searchParams])

  return (
    <AssetPoolWeakScanFindingsTabContent
      key={`${poolId}:${searchParams.toString()}`}
      poolId={poolId}
      searchParams={searchParams}
      setSearchParams={setSearchParams}
      urlFilters={urlFilters}
    />
  )
}
