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
  BugAntIcon,
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import { type SetURLSearchParams, useNavigate, useSearchParams } from 'react-router-dom'

import { type FindingSummaryView, useAssetPoolFindings } from '@/api/adapters/asset'
import { APPLE_TABLE_CLASSES } from '@/utils/theme'

const PAGE_SIZE = 20

type FindingFilterState = {
  url: string
  pocID: string
  severity: string
}

const EMPTY_FILTERS: FindingFilterState = {
  url: '',
  pocID: '',
  severity: 'all',
}

const URL_FILTER_PARAM_URL = 'findings_url'
const URL_FILTER_PARAM_POC_ID = 'findings_poc_id'
const URL_FILTER_PARAM_SEVERITY = 'findings_severity'
const SEVERITY_VALUES = new Set(['all', 'critical', 'high', 'medium', 'low', 'info'])

function readFiltersFromSearchParams(searchParams: URLSearchParams): FindingFilterState {
  const severity = (searchParams.get(URL_FILTER_PARAM_SEVERITY) || '').trim().toLowerCase()
  return {
    url: (searchParams.get(URL_FILTER_PARAM_URL) || '').trim(),
    pocID: (searchParams.get(URL_FILTER_PARAM_POC_ID) || '').trim(),
    severity: SEVERITY_VALUES.has(severity) ? severity : 'all',
  }
}

function writeFiltersToSearchParams(searchParams: URLSearchParams, filters: FindingFilterState): URLSearchParams {
  const next = new URLSearchParams(searchParams)
  const url = filters.url.trim()
  const pocID = filters.pocID.trim()
  const severity = (filters.severity || 'all').trim().toLowerCase()

  if (url) {
    next.set(URL_FILTER_PARAM_URL, url)
  } else {
    next.delete(URL_FILTER_PARAM_URL)
  }

  if (pocID) {
    next.set(URL_FILTER_PARAM_POC_ID, pocID)
  } else {
    next.delete(URL_FILTER_PARAM_POC_ID)
  }

  if (severity && severity !== 'all') {
    next.set(URL_FILTER_PARAM_SEVERITY, severity)
  } else {
    next.delete(URL_FILTER_PARAM_SEVERITY)
  }

  return next
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

function formatPlainValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string') return value || '-'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.length ? value.map((item) => formatPlainValue(item)).join(', ') : '-'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function getRawInfoMap(item: FindingSummaryView): Record<string, unknown> {
  const info = item.raw?.info
  return info && typeof info === 'object' && !Array.isArray(info) ? (info as Record<string, unknown>) : {}
}

function getBaseURL(item: FindingSummaryView): string {
  return firstNonEmptyText(item.base_url, item.asset_ref, item.host)
}

function getMatchedLink(item: FindingSummaryView): string {
  return firstNonEmptyText(item.link, item.raw?.['matched-at'], item.target_url, item.asset_ref, item.host)
}

function getDescription(item: FindingSummaryView): string {
  const info = getRawInfoMap(item)
  return firstNonEmptyText(
    info.description,
    item.classification?.description,
    item.raw?.description,
    item.title,
  )
}

function getRemediation(item: FindingSummaryView): string {
  const info = getRawInfoMap(item)
  const reference = info.reference
  return firstNonEmptyText(
    info.remediation,
    Array.isArray(reference) ? reference.filter(Boolean).join('\n') : reference,
    item.classification?.remediation,
    item.classification?.solution,
  )
}

function getEvidenceText(item: FindingSummaryView, key: 'request' | 'response' | 'curl_command'): string {
  return formatPlainValue(item.evidence?.[key])
}

function truncateText(value: string, limit = 56): string {
  const text = value.trim()
  if (!text) return '-'
  return text.length > limit ? `${text.slice(0, limit)}...` : text
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

function FindingsDrawer({ item, onClose }: { item: FindingSummaryView | null; onClose: () => void }) {
  const baseURL = item ? getBaseURL(item) : ''
  const matchedLink = item ? getMatchedLink(item) : ''
  const description = item ? getDescription(item) : ''
  const remediation = item ? getRemediation(item) : ''
  const requestText = item ? getEvidenceText(item, 'request') : ''
  const responseText = item ? getEvidenceText(item, 'response') : ''
  const curlCommand = item ? getEvidenceText(item, 'curl_command') : ''

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
            <span className="text-[11px] font-black uppercase tracking-[0.28em] text-apple-text-tertiary">漏洞详情</span>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-black tracking-tight text-white">{item?.title || '-'}</h3>
              <Chip size="sm" variant="flat" color={severityColor(item?.severity || '')} classNames={{ base: 'border-0 px-2 font-black uppercase tracking-[0.18em]' }}>
                {item?.severity || '-'}
              </Chip>
            </div>
            <p className="break-all font-mono text-sm text-apple-text-secondary">{baseURL || item?.asset_ref || '-'}</p>
          </DrawerHeader>
          <DrawerBody className="space-y-8 overflow-y-auto">
            {item && (
              <>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <InfoCard label="POC ID" value={item.rule_id || '-'} />
                  <InfoCard label="发现时间" value={formatDateTime(item.created_at)} />
                  <InfoCard label="基础站点 URL" value={baseURL || item.asset_ref || '-'} />
                  <InfoCard label="IP" value={item.ip || '-'} />
                  <InfoCard label="命中链接" value={matchedLink || '-'} />
                  <InfoCard label="匹配器" value={firstNonEmptyText(item.matcher_name, `${item.scheme || '-'}:${item.port || '-'}`)} />
                  <InfoCard label="来源任务" value={item.task_id || '-'} />
                  <InfoCard label="来源快照" value={item.snapshot_id || '-'} />
                </div>

                <section className="space-y-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-apple-text-tertiary">漏洞说明</h3>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-white">
                    {description || '暂无描述'}
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-apple-text-tertiary">修复建议</h3>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-white whitespace-pre-wrap break-words">
                    {remediation || '暂无修复建议'}
                  </div>
                </section>

                <MessageBlock title="请求报文" content={requestText || '当前漏洞记录未保存请求报文。'} />
                <MessageBlock title="响应报文" content={responseText || '当前漏洞记录未保存响应报文。'} />
                {curlCommand && curlCommand !== '-' && <MessageBlock title="复现命令" content={curlCommand} />}
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

type AssetPoolFindingsTabContentProps = {
  poolId: string
  searchParams: URLSearchParams
  setSearchParams: SetURLSearchParams
  urlFilters: FindingFilterState
}

function AssetPoolFindingsTabContent({ poolId, searchParams, setSearchParams, urlFilters }: AssetPoolFindingsTabContentProps) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [draftFilters, setDraftFilters] = useState<FindingFilterState>(urlFilters)
  const [selectedItem, setSelectedItem] = useState<FindingSummaryView | null>(null)

  const queryParams = useMemo(() => ({
    page,
    page_size: PAGE_SIZE,
    url: urlFilters.url || undefined,
    poc_id: urlFilters.pocID || undefined,
    severity: urlFilters.severity === 'all' ? undefined : urlFilters.severity,
  }), [page, urlFilters])

  const { data, isPending, isError, refetch } = useAssetPoolFindings(poolId, queryParams)

  const items = data?.data || []
  const total = data?.pagination?.total || 0
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])
  const hasActiveFilters = Boolean(urlFilters.url || urlFilters.pocID || urlFilters.severity !== 'all')

  function handleApplyFilters() {
    const nextFilters = {
      url: draftFilters.url.trim(),
      pocID: draftFilters.pocID.trim(),
      severity: draftFilters.severity || 'all',
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
            <BugAntIcon className="h-6 w-6 text-apple-red-light drop-shadow-[0_0_8px_rgba(255,59,48,0.5)]" />
            <span>资产池累计漏洞扫描结果</span>
          </h3>
          <p className="text-[13px] font-medium text-apple-text-tertiary">累计展示该资产池在所有任务快照中实际发现过的漏洞记录，可按 URL、POC ID、级别筛选并查看请求与响应报文。</p>
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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_220px_auto]">
          <Input
            isClearable
            value={draftFilters.url}
            placeholder="按 URL / 命中链接筛选"
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
            value={draftFilters.pocID}
            placeholder="按 POC ID / 模板 ID 筛选"
            onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, pocID: value }))}
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
            已启用筛选 {urlFilters.url ? `| URL: ${urlFilters.url}` : ''} {urlFilters.pocID ? `| POC: ${urlFilters.pocID}` : ''} {urlFilters.severity !== 'all' ? `| 等级: ${urlFilters.severity}` : ''}
          </div>
        )}
      </section>

      {isError && (
        <div className="rounded-[24px] border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-200">
          资产池漏洞扫描结果加载失败，请稍后重试。
        </div>
      )}

      <div className="custom-scrollbar overflow-x-auto rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl">
        <Table
          removeWrapper
          aria-label="Asset Pool Findings Table"
          layout="fixed"
          classNames={{
            ...APPLE_TABLE_CLASSES,
            base: 'min-w-[1560px] p-4',
            tr: `${APPLE_TABLE_CLASSES.tr} cursor-default`,
            td: `${APPLE_TABLE_CLASSES.td} align-top`,
          }}
        >
          <TableHeader>
            <TableColumn width={260}>基础 URL</TableColumn>
            <TableColumn width={280}>命中链接</TableColumn>
            <TableColumn width={180}>POC ID</TableColumn>
            <TableColumn width={220}>漏洞名称</TableColumn>
            <TableColumn width={110}>级别</TableColumn>
            <TableColumn width={220}>来源任务</TableColumn>
            <TableColumn width={140}>详情</TableColumn>
            <TableColumn width={190}>发现时间</TableColumn>
          </TableHeader>
          <TableBody
            isLoading={isPending}
            loadingContent={<Skeleton className="h-40 w-full rounded-[24px] bg-white/5" />}
            emptyContent={(
              <div className="flex flex-col items-center gap-3 py-20 text-sm font-bold text-apple-text-tertiary">
                <ShieldExclamationIcon className="h-12 w-12 text-apple-green-light opacity-60 drop-shadow-[0_0_12px_rgba(52,199,89,0.4)]" />
                <span className="text-[13px] font-black uppercase tracking-[0.1em] text-white">NO_VULNERABILITIES</span>
                <span className="text-[12px] font-medium text-apple-text-tertiary">{hasActiveFilters ? '当前筛选条件下没有匹配的漏洞记录。' : '当前资产池还没有累计漏洞记录。'}</span>
              </div>
            )}
          >
            {items.map((item) => (
              <TableRow key={item.finding_id}>
                <TableCell><RenderTextCell value={getBaseURL(item) || item.asset_ref || '-'} limit={40} mono /></TableCell>
                <TableCell><RenderTextCell value={getMatchedLink(item) || '-'} limit={44} mono /></TableCell>
                <TableCell><RenderTextCell value={item.rule_id || '-'} limit={24} mono /></TableCell>
                <TableCell><RenderTextCell value={item.title || '-'} limit={34} /></TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color={severityColor(item.severity)} classNames={{ base: 'border-0 px-1 font-black uppercase tracking-[0.12em]' }}>
                    {item.severity || '-'}
                  </Chip>
                </TableCell>
                <TableCell>
                  {item.task_id ? (
                    <Button
                      size="sm"
                      variant="light"
                      className="h-8 min-w-0 rounded-lg px-3 text-[12px] font-bold text-apple-blue-light hover:bg-apple-blue/10 hover:text-white"
                      onPress={() => navigate(`/tasks/${item.task_id}`)}
                    >
                      查看任务
                    </Button>
                  ) : (
                    <span className="text-apple-text-tertiary">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="flat" className="rounded-xl bg-white/6 font-bold text-white hover:bg-white/10" onPress={() => setSelectedItem(item)}>
                    查看详情
                  </Button>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-[12px] text-apple-text-secondary">{formatDateTime(item.created_at)}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!isError && total > 0 && (
          <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.01] px-6 py-5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-apple-text-tertiary">累计漏洞 <span className="mx-1 text-white">{total}</span> 条</span>
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

      <FindingsDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  )
}

export function AssetPoolFindingsTab({ poolId }: { poolId: string }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlFilters = useMemo(() => readFiltersFromSearchParams(searchParams), [searchParams])

  return (
    <AssetPoolFindingsTabContent
      key={`${poolId}:${searchParams.toString()}`}
      poolId={poolId}
      searchParams={searchParams}
      setSearchParams={setSearchParams}
      urlFilters={urlFilters}
    />
  )
}
