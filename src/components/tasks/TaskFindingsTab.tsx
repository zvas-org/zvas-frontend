import { useMemo, useState, type KeyboardEvent } from 'react'

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
  Tooltip,
} from '@heroui/react'
import {
  ArrowPathIcon,
  BugAntIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

import {
  type TaskRecordVulnerabilityVM,
  useDeleteTaskFinding,
  useTaskFindings,
} from '@/api/adapters/task'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { FindingReportEditModal } from '@/components/tasks/FindingReportEditModal'
import {
  PayloadViewerDrawer,
} from '@/components/tasks/PayloadViewerDrawer'
import { useAuthStore } from '@/store/auth'
import { PERMISSIONS, hasPermission } from '@/utils/permissions'
import { APPLE_TABLE_CLASSES } from '@/utils/theme'
import {
  getSeverityColor,
  normalizeSeverityDisplay,
  VULNERABILITY_SEVERITY_OPTIONS,
} from '@/utils/vulnerability'

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

function getRawInfoMap(item: TaskRecordVulnerabilityVM): Record<string, unknown> {
  const info = item.raw?.info
  return info && typeof info === 'object' && !Array.isArray(info) ? (info as Record<string, unknown>) : {}
}

function getBaseURL(item: TaskRecordVulnerabilityVM): string {
  return firstNonEmptyText(item.base_url, item.host)
}

function getMatchedLink(item: TaskRecordVulnerabilityVM): string {
  return firstNonEmptyText(item.link, item.raw?.['matched-at'], item.target_url, item.host)
}

function getDescription(item: TaskRecordVulnerabilityVM): string {
  const info = getRawInfoMap(item)
  return firstNonEmptyText(
    item.classification?.description,
    info.description,
    item.raw?.description,
    item.rule_name,
  )
}

function getRemediation(item: TaskRecordVulnerabilityVM): string {
  const info = getRawInfoMap(item)
  const reference = info.reference
  return firstNonEmptyText(
    item.classification?.remediation,
    item.classification?.solution,
    info.remediation,
    Array.isArray(reference) ? reference.filter(Boolean).join('\n') : reference,
  )
}

function truncateText(value: string, limit = 64): string {
  const text = value.trim()
  if (!text) return '-'
  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

function RenderTextCell({ value, limit = 64, mono = false }: { value: string; limit?: number; mono?: boolean }) {
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

export function TaskFindingsTab({ taskId }: { taskId: string }) {
  const currentUser = useAuthStore((state) => state.currentUser)
  const canDeleteFinding = hasPermission(currentUser?.permissions, PERMISSIONS.taskUpdate)
  const [page, setPage] = useState(1)
  const [draftFilters, setDraftFilters] = useState<FindingFilterState>(EMPTY_FILTERS)
  const [filters, setFilters] = useState<FindingFilterState>(EMPTY_FILTERS)
  const [editingItem, setEditingItem] = useState<TaskRecordVulnerabilityVM | null>(null)
  const [payloadViewerItem, setPayloadViewerItem] = useState<TaskRecordVulnerabilityVM | null>(null)
  const [pendingDeleteItem, setPendingDeleteItem] = useState<TaskRecordVulnerabilityVM | null>(null)

  const queryParams = useMemo(() => ({
    page,
    page_size: PAGE_SIZE,
    url: filters.url || undefined,
    poc_id: filters.pocID || undefined,
    severity: filters.severity === 'all' ? undefined : filters.severity,
  }), [filters, page])

  const { data, isPending, isError, refetch } = useTaskFindings(taskId, queryParams)
  const deleteFindingMutation = useDeleteTaskFinding()

  const items = data?.data || []
  const total = data?.pagination?.total || 0
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])
  const hasActiveFilters = Boolean(filters.url || filters.pocID || filters.severity !== 'all')
  const severityFilterOptions = useMemo(
    () => [{ value: 'all', label: '所有级别' }, ...VULNERABILITY_SEVERITY_OPTIONS],
    [],
  )

  function handleApplyFilters() {
    setPage(1)
    setFilters({ ...draftFilters })
  }

  function handleResetFilters() {
    setPage(1)
    setDraftFilters({ ...EMPTY_FILTERS })
    setFilters({ ...EMPTY_FILTERS })
  }

  function handleFilterEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      handleApplyFilters()
    }
  }

  function handleOpenPayloadViewer(item: TaskRecordVulnerabilityVM) {
    if (editingItem) {
      handleCloseEditModal()
    }
    setPayloadViewerItem(item)
  }

  function handleClosePayloadViewer() {
    setPayloadViewerItem(null)
  }

  function handleOpenEditModal(item: TaskRecordVulnerabilityVM) {
    if (payloadViewerItem) {
      handleClosePayloadViewer()
    }
    setEditingItem(item)
  }

  function handleCloseEditModal() {
    setEditingItem(null)
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteItem) {
      return
    }
    await deleteFindingMutation.mutateAsync({ taskId, findingId: pendingDeleteItem.id })
    if (editingItem?.id === pendingDeleteItem.id) {
      handleCloseEditModal()
    }
    if (payloadViewerItem?.id === pendingDeleteItem.id) {
      handleClosePayloadViewer()
    }
    setPendingDeleteItem(null)
    void refetch()
  }

  return (
    <div className="mb-8 flex w-full animate-in fade-in flex-col gap-6 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <h3 className="mb-1 flex items-center gap-2 text-xl font-black tracking-tight text-white">
            <BugAntIcon className="h-6 w-6 text-apple-red-light drop-shadow-[0_0_8px_rgba(255,59,48,0.5)]" />
            <span>当前任务漏洞扫描结果</span>
          </h3>
          <p className="text-[13px] font-medium text-apple-text-tertiary">
            展示当前任务工作流中实际命中的漏洞记录，可筛选、查看请求与响应详情、编辑误报覆盖并删除单条结果。
          </p>
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
            {severityFilterOptions.map((option) => (
              <SelectItem key={option.value} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
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
        {hasActiveFilters ? (
          <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-apple-text-tertiary">
            已启用筛选 {filters.url ? `| URL: ${filters.url}` : ''} {filters.pocID ? `| POC: ${filters.pocID}` : ''} {filters.severity !== 'all' ? `| 等级: ${normalizeSeverityDisplay(filters.severity)}` : ''}
          </div>
        ) : null}
      </section>

      {isError ? (
        <div className="rounded-[24px] border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-200">
          漏洞扫描结果加载失败，请稍后重试。
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl custom-scrollbar">
        <Table
          removeWrapper
          aria-label="Task Findings Table"
          layout="fixed"
          classNames={{
            ...APPLE_TABLE_CLASSES,
            base: 'min-w-[1760px] p-4',
            tr: `${APPLE_TABLE_CLASSES.tr} cursor-default`,
            td: `${APPLE_TABLE_CLASSES.td} align-top`,
          }}
        >
          <TableHeader>
            <TableColumn width={220}>基础 URL</TableColumn>
            <TableColumn width={220}>命中链接</TableColumn>
            <TableColumn width={160}>模板 ID</TableColumn>
            <TableColumn width={180}>漏洞名称</TableColumn>
            <TableColumn width={110}>级别</TableColumn>
            <TableColumn width={240}>漏洞描述</TableColumn>
            <TableColumn width={240}>修复建议</TableColumn>
            <TableColumn width={110}>详情</TableColumn>
            <TableColumn width={180}>发现时间</TableColumn>
            <TableColumn width={190}>操作</TableColumn>
          </TableHeader>
          <TableBody
            isLoading={isPending}
            loadingContent={<Skeleton className="h-40 w-full rounded-[24px] bg-white/5" />}
            emptyContent={(
              <div className="flex flex-col items-center gap-3 py-20 text-sm font-bold text-apple-text-tertiary">
                <ShieldExclamationIcon className="h-12 w-12 text-apple-green-light opacity-60 drop-shadow-[0_0_12px_rgba(52,199,89,0.4)]" />
                <span className="text-[13px] font-black uppercase tracking-[0.1em] text-white">NO_VULNERABILITIES</span>
                <span className="text-[12px] font-medium text-apple-text-tertiary">{hasActiveFilters ? '当前筛选条件下没有匹配的漏洞记录。' : '当前任务还没有产出漏洞记录。'}</span>
              </div>
            )}
          >
            {items.map((item) => {
              const matchedLink = getMatchedLink(item)
              const description = getDescription(item)
              const remediation = getRemediation(item)
              return (
                <TableRow key={item.id || item.vulnerability_key}>
                  <TableCell><RenderTextCell value={getBaseURL(item) || '-'} limit={40} mono /></TableCell>
                  <TableCell>
                    {matchedLink && matchedLink !== '-' ? (
                      <Tooltip content={<div className="max-w-[420px] break-all text-xs">{matchedLink}</div>} classNames={{ content: 'border border-white/10 bg-apple-bg/95 px-3 py-2 text-white' }}>
                        <a href={matchedLink} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 text-[12px] font-semibold text-apple-blue-light hover:text-white">
                          <LinkIcon className="h-4 w-4 flex-none" />
                          <span className="truncate">{truncateText(matchedLink, 34)}</span>
                        </a>
                      </Tooltip>
                    ) : (
                      <span className="text-apple-text-tertiary">-</span>
                    )}
                  </TableCell>
                  <TableCell><RenderTextCell value={item.rule_id || '-'} limit={26} mono /></TableCell>
                  <TableCell><RenderTextCell value={item.rule_name || '-'} limit={28} /></TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" color={getSeverityColor(item.severity)} classNames={{ base: 'border-0 px-1 font-black uppercase tracking-[0.12em]' }}>
                      {normalizeSeverityDisplay(item.severity) || '-'}
                    </Chip>
                  </TableCell>
                  <TableCell><RenderTextCell value={description || '-'} limit={72} /></TableCell>
                  <TableCell><RenderTextCell value={remediation || '-'} limit={72} /></TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="flat"
                      className="min-w-[72px] rounded-xl bg-white/6 font-bold text-white hover:bg-white/10"
                      onPress={() => handleOpenPayloadViewer(item)}
                    >
                      详情
                    </Button>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[12px] text-apple-text-secondary">{formatDateTime(item.matched_at)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        className="rounded-xl font-bold"
                        onPress={() => handleOpenEditModal(item)}
                      >
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        className="rounded-xl font-bold"
                        onPress={() => setPendingDeleteItem(item)}
                        isDisabled={!canDeleteFinding}
                        startContent={<TrashIcon className="h-4 w-4" />}
                      >
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {!isError && total > 0 ? (
          <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.01] px-6 py-5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-apple-text-tertiary">漏洞记录 <span className="mx-1 text-white">{total}</span> 项</span>
            {totalPages > 1 ? (
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
            ) : null}
          </div>
        ) : null}
      </div>

      <PayloadViewerDrawer
        isOpen={Boolean(payloadViewerItem)}
        request={payloadViewerItem?.evidence?.request}
        response={payloadViewerItem?.evidence?.response}
        onClose={handleClosePayloadViewer}
      />

      <FindingReportEditModal
        isOpen={Boolean(editingItem)}
        taskId={taskId}
        item={editingItem}
        onClose={handleCloseEditModal}
        onSaved={(item) => {
          setEditingItem(item)
          void refetch()
        }}
      />

      <ConfirmModal
        isOpen={Boolean(pendingDeleteItem)}
        onClose={() => (!deleteFindingMutation.isPending ? setPendingDeleteItem(null) : undefined)}
        onConfirm={handleConfirmDelete}
        title="删除漏洞记录"
        message={`确定删除漏洞“${pendingDeleteItem?.rule_name || pendingDeleteItem?.rule_id || pendingDeleteItem?.id || ''}”吗？删除后会立即从当前任务漏洞列表中移除，并同步修正关联摘要计数。`}
        confirmText="确认删除"
        confirmColor="danger"
        isLoading={deleteFindingMutation.isPending}
      />
    </div>
  )
}
