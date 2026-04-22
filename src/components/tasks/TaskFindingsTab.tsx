import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'

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
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
  Tooltip,
} from '@heroui/react'
import {
  ArrowPathIcon,
  BugAntIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  ShieldExclamationIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

import {
  type TaskFindingRuleMapVM,
  type TaskRecordVulnerabilityVM,
  type UpdateTaskFindingPayload,
  useDeleteTaskFinding,
  useTaskFindingDetail,
  useTaskFindingRuleMap,
  useTaskFindings,
  useUpdateTaskFinding,
} from '@/api/adapters/task'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { useAuthStore } from '@/store/auth'
import { PERMISSIONS, hasPermission } from '@/utils/permissions'
import { APPLE_TABLE_CLASSES } from '@/utils/theme'
import {
  getSeverityColor,
  normalizeSeverityDisplay,
  normalizeSeverityValue,
  VULNERABILITY_SEVERITY_OPTIONS,
} from '@/utils/vulnerability'

const PAGE_SIZE = 20
const NO_MAPPING_VALUE = '__none__'

type FindingFilterState = {
  url: string
  pocID: string
  severity: string
}

type FindingEditorState = {
  ruleName: string
  severity: string
  matchedAt: string
  targetURL: string
  host: string
  ip: string
  port: string
  scheme: string
  matcherName: string
  description: string
  remediation: string
  request: string
  response: string
  curlCommand: string
}

const EMPTY_FILTERS: FindingFilterState = {
  url: '',
  pocID: '',
  severity: 'all',
}

const EMPTY_EDITOR_STATE: FindingEditorState = {
  ruleName: '',
  severity: 'info',
  matchedAt: '',
  targetURL: '',
  host: '',
  ip: '',
  port: '',
  scheme: '',
  matcherName: '',
  description: '',
  remediation: '',
  request: '',
  response: '',
  curlCommand: '',
}

const inputClassNames = {
  inputWrapper: 'rounded-[18px] border border-white/8 bg-white/5 transition-colors hover:bg-white/[0.07]',
  input: 'text-sm text-white placeholder:text-apple-text-tertiary',
  label: 'text-[11px] font-black uppercase tracking-[0.18em] text-apple-text-tertiary',
}

const autoTextareaClassNames = {
  inputWrapper: 'rounded-[18px] border border-white/8 bg-white/5 transition-colors hover:bg-white/[0.07] items-start',
  input: 'text-sm leading-7 text-white placeholder:text-apple-text-tertiary whitespace-pre-wrap break-all',
  innerWrapper: 'items-start',
  label: 'text-[11px] font-black uppercase tracking-[0.18em] text-apple-text-tertiary',
}

const fixedLogTextareaClassNames = {
  inputWrapper: 'rounded-[18px] border border-white/8 bg-white/5 transition-colors hover:bg-white/[0.07] h-[232px] items-start',
  input: 'h-full overflow-auto text-sm leading-7 text-white placeholder:text-apple-text-tertiary whitespace-pre-wrap break-all',
  innerWrapper: 'h-full items-start',
  label: 'text-[11px] font-black uppercase tracking-[0.18em] text-apple-text-tertiary',
}

const fixedCommandTextareaClassNames = {
  inputWrapper: 'rounded-[18px] border border-white/8 bg-white/5 transition-colors hover:bg-white/[0.07] h-[152px] items-start',
  input: 'h-full overflow-auto text-sm leading-7 text-white placeholder:text-apple-text-tertiary whitespace-pre-wrap break-all',
  innerWrapper: 'items-start',
  label: 'text-[11px] font-black uppercase tracking-[0.18em] text-apple-text-tertiary',
}

function formatDateTime(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

function formatDateTimeInput(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
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
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.length ? value.map((item) => formatPlainValue(item)).join(', ') : ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }
  return String(value)
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

function buildMappingPatch(selection: string, ruleMap?: TaskFindingRuleMapVM): UpdateTaskFindingPayload['mapping_patch'] | undefined {
  const currentID = ruleMap?.current?.vul_type_id ? String(ruleMap.current.vul_type_id) : NO_MAPPING_VALUE
  if (selection === currentID) {
    return undefined
  }
  if (selection === NO_MAPPING_VALUE) {
    return currentID === NO_MAPPING_VALUE ? undefined : { clear_mapping: true }
  }
  const vulTypeID = Number(selection)
  if (!Number.isInteger(vulTypeID) || vulTypeID <= 0) {
    return undefined
  }
  return { vul_type_id: vulTypeID }
}

function buildEditorState(item: TaskRecordVulnerabilityVM | null): FindingEditorState {
  if (!item) {
    return { ...EMPTY_EDITOR_STATE }
  }
  const classification = { ...(item.classification || {}) }
  const evidence = { ...(item.evidence || {}) }
  return {
    ruleName: item.rule_name || '',
    severity: normalizeSeverityValue(item.severity || 'info') || 'info',
    matchedAt: formatDateTimeInput(item.matched_at),
    targetURL: item.target_url || '',
    host: item.host || '',
    ip: item.ip || '',
    port: item.port ? String(item.port) : '',
    scheme: item.scheme || '',
    matcherName: item.matcher_name || '',
    description: formatPlainValue(classification.description),
    remediation: formatPlainValue(classification.remediation ?? classification.solution),
    request: formatPlainValue(evidence.request),
    response: formatPlainValue(evidence.response),
    curlCommand: formatPlainValue(evidence.curl_command),
  }
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

function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
      <div className="space-y-1">
        <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-apple-text-tertiary">{title}</h3>
        {description ? <p className="text-sm text-apple-text-secondary">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

function FindingsDrawer({
  isOpen,
  taskId,
  summaryItem,
  findingId,
  isEditing,
  mappingExpanded,
  onToggleEditing,
  onToggleMapping,
  onClose,
  onSaved,
}: {
  isOpen: boolean
  taskId: string
  summaryItem: TaskRecordVulnerabilityVM | null
  findingId: string
  isEditing: boolean
  mappingExpanded: boolean
  onToggleEditing: (editing: boolean) => void
  onToggleMapping: () => void
  onClose: () => void
  onSaved: (item: TaskRecordVulnerabilityVM) => void
}) {
  const { data: detailItem, isPending, isError, error, refetch } = useTaskFindingDetail(taskId, findingId, isOpen)
  const activeItem = detailItem || summaryItem
  const ruleID = activeItem?.rule_id || ''
  const {
    data: ruleMap,
    isPending: isRuleMapPending,
    refetch: refetchRuleMap,
  } = useTaskFindingRuleMap(ruleID, Boolean(isOpen && ruleID))
  const updateFindingMutation = useUpdateTaskFinding()
  const [formState, setFormState] = useState<FindingEditorState>(EMPTY_EDITOR_STATE)
  const [mappingSelection, setMappingSelection] = useState(NO_MAPPING_VALUE)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setFormState({ ...EMPTY_EDITOR_STATE })
      setMappingSelection(NO_MAPPING_VALUE)
      setSaveError('')
      setSaveSuccess('')
      return
    }
    setFormState(buildEditorState(activeItem || null))
  }, [activeItem, isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setMappingSelection(ruleMap?.current?.vul_type_id ? String(ruleMap.current.vul_type_id) : NO_MAPPING_VALUE)
  }, [isOpen, ruleMap])

  const baseURL = activeItem ? getBaseURL(activeItem) : ''
  const matchedLink = activeItem ? getMatchedLink(activeItem) : ''
  const mappingOptions = useMemo(
    () => [{ key: NO_MAPPING_VALUE, label: '无映射' }, ...((ruleMap?.candidates || []).map((item) => ({ key: String(item.vul_type_id), label: item.vul_type })))],
    [ruleMap],
  )
  const selectedCandidate = useMemo(
    () => ruleMap?.candidates.find((item) => String(item.vul_type_id) === mappingSelection),
    [mappingSelection, ruleMap],
  )

  async function handleSave() {
    if (!findingId) {
      return
    }
    setSaveError('')
    setSaveSuccess('')
    try {
      const classification = { ...(activeItem?.classification || {}) }
      const evidence = { ...(activeItem?.evidence || {}) }
      const description = formState.description.trim()
      const remediation = formState.remediation.trim()
      const request = formState.request.trim()
      const response = formState.response.trim()
      const curlCommand = formState.curlCommand.trim()
      if (description) {
        classification.description = description
      } else {
        delete classification.description
      }
      if (remediation) {
        classification.remediation = remediation
      } else {
        delete classification.remediation
      }
      if (request) {
        evidence.request = request
      } else {
        delete evidence.request
      }
      if (response) {
        evidence.response = response
      } else {
        delete evidence.response
      }
      if (curlCommand) {
        evidence.curl_command = curlCommand
      } else {
        delete evidence.curl_command
      }
      const portValue = Number.parseInt(formState.port.trim(), 10)
      const matchedAt = formState.matchedAt ? new Date(formState.matchedAt) : null
      if (formState.matchedAt && (!matchedAt || Number.isNaN(matchedAt.getTime()))) {
        throw new Error('发现时间格式不正确')
      }
      const payload: UpdateTaskFindingPayload = {
        finding_patch: {
          rule_name: formState.ruleName.trim(),
          severity: normalizeSeverityValue(formState.severity),
          matched_at: matchedAt ? matchedAt.toISOString() : undefined,
          target_url: formState.targetURL.trim(),
          host: formState.host.trim(),
          ip: formState.ip.trim(),
          port: Number.isNaN(portValue) ? 0 : portValue,
          scheme: formState.scheme.trim(),
          matcher_name: formState.matcherName.trim(),
          classification,
          evidence,
        },
        mapping_patch: buildMappingPatch(mappingSelection, ruleMap),
      }
      const saved = await updateFindingMutation.mutateAsync({ taskId, findingId, payload })
      onSaved(saved)
      onToggleEditing(false)
      setSaveSuccess('漏洞结果与映射覆盖已保存')
      setFormState(buildEditorState(saved))
      void refetch()
      void refetchRuleMap()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存失败，请稍后重试')
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      placement="right"
      backdrop="blur"
      scrollBehavior="inside"
      classNames={{
        base: '!w-screen sm:!w-[min(90vw,1080px)] xl:!w-[min(82vw,1180px)] max-w-none h-dvh max-h-dvh border-l border-white/10 bg-apple-bg/92 text-apple-text-primary backdrop-blur-3xl',
        header: 'border-b border-white/6 px-5 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-6',
        body: 'px-5 py-5 sm:px-8 sm:py-6',
        footer: 'border-t border-white/6 px-5 py-4 sm:px-8 sm:py-5',
      }}
    >
      <DrawerContent>
        <>
          <DrawerHeader className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.28em] text-apple-text-tertiary">
                  {isEditing ? '编辑漏洞结果' : '漏洞详情'}
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-black tracking-tight text-white">{activeItem?.rule_name || '漏洞详情'}</h3>
                  <Chip size="sm" variant="flat" color={getSeverityColor(activeItem?.severity || '')} classNames={{ base: 'border-0 px-2 font-black uppercase tracking-[0.18em]' }}>
                    {normalizeSeverityDisplay(activeItem?.severity || '') || '-'}
                  </Chip>
                </div>
                <p className="break-all font-mono text-sm text-apple-text-secondary">{baseURL || '-'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="flat"
                  className="rounded-xl bg-white/5 font-bold text-white hover:bg-white/10"
                  onPress={() => refetch()}
                  isDisabled={isPending}
                >
                  刷新
                </Button>
                <Button
                  color={isEditing ? 'warning' : 'primary'}
                  variant="flat"
                  className="rounded-xl font-bold"
                  onPress={() => onToggleEditing(!isEditing)}
                  isDisabled={!activeItem}
                  startContent={<PencilSquareIcon className="h-4 w-4" />}
                >
                  {isEditing ? '取消编辑' : '编辑'}
                </Button>
              </div>
            </div>
          </DrawerHeader>
          <DrawerBody className="space-y-6 overflow-y-auto">
            {isPending && !activeItem ? (
              <div className="flex min-h-[360px] items-center justify-center">
                <Spinner color="primary" label="正在加载漏洞详情..." labelColor="primary" />
              </div>
            ) : null}

            {isError ? (
              <div className="rounded-[24px] border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-200">
                {error instanceof Error ? error.message : '漏洞详情加载失败，请稍后重试。'}
              </div>
            ) : null}

            {activeItem ? (
              <>
                <SectionCard title="基础信息" description="短字段保持紧凑排布，便于快速校对与误报修正。">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Input
                      label="漏洞名称"
                      labelPlacement="outside"
                      value={formState.ruleName}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, ruleName: value }))}
                      isDisabled={!isEditing}
                      classNames={inputClassNames}
                    />
                    <Select
                      label="漏洞级别"
                      labelPlacement="outside"
                      selectedKeys={new Set([formState.severity || 'info'])}
                      onChange={(event) => setFormState((prev) => ({ ...prev, severity: event.target.value || 'info' }))}
                      isDisabled={!isEditing}
                      classNames={{
                        trigger: inputClassNames.inputWrapper,
                        value: 'truncate pl-1 text-sm text-white',
                        label: inputClassNames.label,
                      }}
                      popoverProps={{ classNames: { content: 'min-w-[220px] border border-white/10 bg-apple-bg/95 p-1 backdrop-blur-3xl shadow-2xl' } }}
                    >
                      {VULNERABILITY_SEVERITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} textValue={option.label}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                    <Input
                      label="发现时间"
                      labelPlacement="outside"
                      type="datetime-local"
                      value={formState.matchedAt}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, matchedAt: value }))}
                      isDisabled={!isEditing}
                      classNames={inputClassNames}
                    />
                    <Input
                      label="模板 ID / POC ID"
                      labelPlacement="outside"
                      value={activeItem.rule_id || ''}
                      isDisabled
                      classNames={inputClassNames}
                    />
                    <Input
                      label="基础 URL"
                      labelPlacement="outside"
                      value={baseURL || '-'}
                      isDisabled
                      classNames={inputClassNames}
                    />
                    <Input
                      label="命中链接"
                      labelPlacement="outside"
                      value={matchedLink || '-'}
                      isDisabled
                      classNames={inputClassNames}
                    />
                    <Input
                      label="目标 URL"
                      labelPlacement="outside"
                      value={formState.targetURL}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, targetURL: value }))}
                      isDisabled={!isEditing}
                      classNames={inputClassNames}
                    />
                    <Input
                      label="主机"
                      labelPlacement="outside"
                      value={formState.host}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, host: value }))}
                      isDisabled={!isEditing}
                      classNames={inputClassNames}
                    />
                    <Input
                      label="IP"
                      labelPlacement="outside"
                      value={formState.ip}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, ip: value }))}
                      isDisabled={!isEditing}
                      classNames={inputClassNames}
                    />
                    <Input
                      label="端口"
                      labelPlacement="outside"
                      value={formState.port}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, port: value }))}
                      isDisabled={!isEditing}
                      classNames={inputClassNames}
                    />
                    <Input
                      label="协议"
                      labelPlacement="outside"
                      value={formState.scheme}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, scheme: value }))}
                      isDisabled={!isEditing}
                      classNames={inputClassNames}
                    />
                    <Input
                      label="匹配器"
                      labelPlacement="outside"
                      value={formState.matcherName}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, matcherName: value }))}
                      isDisabled={!isEditing}
                      classNames={inputClassNames}
                    />
                  </div>
                </SectionCard>

                <SectionCard title="说明与修复" description="漏洞描述与修复建议按内容自然展开，避免并排阅读拥挤。">
                  <div className="space-y-4">
                    <Textarea
                      label="漏洞描述"
                      labelPlacement="outside"
                      minRows={4}
                      value={formState.description}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, description: value }))}
                      isDisabled={!isEditing}
                      classNames={autoTextareaClassNames}
                    />
                    <Textarea
                      label="修复建议"
                      labelPlacement="outside"
                      minRows={4}
                      value={formState.remediation}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, remediation: value }))}
                      isDisabled={!isEditing}
                      classNames={autoTextareaClassNames}
                    />
                  </div>
                </SectionCard>

                <SectionCard title="请求与响应" description="报文与复现命令全部直接展示，长内容在各自输入框内部滚动。">
                  <div className="space-y-4">
                    <Textarea
                      label="请求报文"
                      labelPlacement="outside"
                      minRows={8}
                      maxRows={8}
                      value={formState.request}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, request: value }))}
                      isDisabled={!isEditing}
                      classNames={fixedLogTextareaClassNames}
                    />
                    <Textarea
                      label="响应报文"
                      labelPlacement="outside"
                      minRows={8}
                      maxRows={8}
                      value={formState.response}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, response: value }))}
                      isDisabled={!isEditing}
                      classNames={fixedLogTextareaClassNames}
                    />
                    <Textarea
                      label="复现命令"
                      labelPlacement="outside"
                      minRows={5}
                      maxRows={5}
                      value={formState.curlCommand}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, curlCommand: value }))}
                      isDisabled={!isEditing}
                      classNames={fixedCommandTextareaClassNames}
                    />
                  </div>
                </SectionCard>

                <section className="rounded-[24px] border border-white/8 bg-white/[0.02]">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                    onClick={onToggleMapping}
                  >
                    <div className="space-y-1">
                      <div className="text-[11px] font-black uppercase tracking-[0.24em] text-apple-text-tertiary">映射覆盖</div>
                      <div className="text-sm text-apple-text-secondary">
                        修改当前模板与漏洞类型字典的覆盖关系，不会改动漏洞原始数据库字段。
                      </div>
                    </div>
                    {mappingExpanded ? <ChevronUpIcon className="h-5 w-5 text-white" /> : <ChevronDownIcon className="h-5 w-5 text-white" />}
                  </button>

                  {mappingExpanded ? (
                    <div className="space-y-4 border-t border-white/6 px-5 py-5">
                      {isRuleMapPending ? (
                        <div className="flex items-center gap-3 text-sm text-apple-text-secondary">
                          <Spinner size="sm" color="primary" />
                          <span>正在加载映射配置...</span>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <Input label="模板 ID" labelPlacement="outside" value={ruleID || '-'} isDisabled classNames={inputClassNames} />
                            <Input
                              label="当前映射"
                              labelPlacement="outside"
                              value={ruleMap?.current?.vul_type || '无映射'}
                              isDisabled
                              classNames={inputClassNames}
                            />
                            <Select
                              label="覆盖到漏洞类型"
                              labelPlacement="outside"
                              selectedKeys={new Set([mappingSelection])}
                              onChange={(event) => setMappingSelection(event.target.value || NO_MAPPING_VALUE)}
                              isDisabled={!isEditing}
                              classNames={{
                                trigger: inputClassNames.inputWrapper,
                                value: 'truncate pl-1 text-sm text-white',
                                label: inputClassNames.label,
                              }}
                              popoverProps={{ classNames: { content: 'min-w-[260px] border border-white/10 bg-apple-bg/95 p-1 backdrop-blur-3xl shadow-2xl' } }}
                            >
                              {mappingOptions.map((item) => (
                                <SelectItem key={item.key} textValue={item.label}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </Select>
                          </div>

                          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                              <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-apple-text-tertiary">当前展示策略</div>
                              <div className="space-y-2 text-sm text-white">
                                <p>名称：{selectedCandidate?.vul_type || ruleMap?.current?.vul_type || activeItem.rule_name || '-'}</p>
                                <p>级别：{normalizeSeverityDisplay(selectedCandidate?.default_severity || ruleMap?.current?.default_severity || activeItem.severity || '') || '-'}</p>
                              </div>
                            </div>
                            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-sm text-apple-text-secondary">
                              <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-apple-text-tertiary">说明</div>
                              {mappingSelection === NO_MAPPING_VALUE
                                ? '选择“无映射”时，系统会回退到 finding 原始名称、级别、描述和修复建议。'
                                : '保存后，当前模板命中的所有展示信息都会按选中的漏洞类型做覆盖。'}
                            </div>
                          </div>

                          {selectedCandidate ? (
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                                <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-apple-text-tertiary">映射描述</div>
                                <div className="text-sm leading-7 text-white">{selectedCandidate.impact_zh || '暂无映射描述'}</div>
                              </div>
                              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                                <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-apple-text-tertiary">映射修复建议</div>
                                <div className="text-sm leading-7 text-white">{selectedCandidate.remediation_zh || '暂无映射修复建议'}</div>
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
                </section>
              </>
            ) : null}
          </DrawerBody>
          <DrawerFooter className="flex flex-col items-stretch gap-3">
            {saveError ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
                {saveError}
              </div>
            ) : null}
            {saveSuccess ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">
                {saveSuccess}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button variant="flat" className="rounded-xl bg-white/5 font-bold text-white hover:bg-white/10" onPress={onClose}>
                关闭
              </Button>
              <Button
                color="primary"
                className="rounded-xl font-black"
                onPress={handleSave}
                isDisabled={!isEditing || !activeItem}
                isLoading={updateFindingMutation.isPending}
              >
                保存修改
              </Button>
            </div>
          </DrawerFooter>
        </>
      </DrawerContent>
    </Drawer>
  )
}

export function TaskFindingsTab({ taskId }: { taskId: string }) {
  const currentUser = useAuthStore((state) => state.currentUser)
  const canDeleteFinding = hasPermission(currentUser?.permissions, PERMISSIONS.taskUpdate)
  const [page, setPage] = useState(1)
  const [draftFilters, setDraftFilters] = useState<FindingFilterState>(EMPTY_FILTERS)
  const [filters, setFilters] = useState<FindingFilterState>(EMPTY_FILTERS)
  const [selectedItem, setSelectedItem] = useState<TaskRecordVulnerabilityVM | null>(null)
  const [selectedFindingId, setSelectedFindingId] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [mappingExpanded, setMappingExpanded] = useState(false)
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

  function handleOpenDrawer(item: TaskRecordVulnerabilityVM, editing = false) {
    setSelectedItem(item)
    setSelectedFindingId(item.id)
    setIsEditing(editing)
    setMappingExpanded(false)
  }

  function handleCloseDrawer() {
    setSelectedItem(null)
    setSelectedFindingId('')
    setIsEditing(false)
    setMappingExpanded(false)
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteItem) {
      return
    }
    await deleteFindingMutation.mutateAsync({ taskId, findingId: pendingDeleteItem.id })
    if (selectedFindingId === pendingDeleteItem.id) {
      handleCloseDrawer()
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
            展示当前任务工作流中实际命中的漏洞记录，可筛选、查看详情、编辑误报覆盖并删除单条结果。
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
            base: 'min-w-[1580px] p-4',
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
            <TableColumn width={260}>漏洞描述</TableColumn>
            <TableColumn width={260}>修复建议</TableColumn>
            <TableColumn width={180}>发现时间</TableColumn>
            <TableColumn width={220}>操作</TableColumn>
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
                      <a href={matchedLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[12px] font-semibold text-apple-blue-light hover:text-white">
                        <LinkIcon className="h-4 w-4 flex-none" />
                        <span className="truncate">{truncateText(matchedLink, 34)}</span>
                      </a>
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
                    <span className="font-mono text-[12px] text-apple-text-secondary">{formatDateTime(item.matched_at)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="flat" className="rounded-xl bg-white/6 font-bold text-white hover:bg-white/10" onPress={() => handleOpenDrawer(item, false)}>
                        详情
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        className="rounded-xl font-bold"
                        onPress={() => handleOpenDrawer(item, true)}
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

      <FindingsDrawer
        isOpen={Boolean(selectedFindingId)}
        taskId={taskId}
        summaryItem={selectedItem}
        findingId={selectedFindingId}
        isEditing={isEditing}
        mappingExpanded={mappingExpanded}
        onToggleEditing={setIsEditing}
        onToggleMapping={() => setMappingExpanded((prev) => !prev)}
        onClose={handleCloseDrawer}
        onSaved={(item) => {
          setSelectedItem(item)
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
