import { useEffect, useMemo, useState, type Key, type ReactNode } from 'react'

import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Textarea,
} from '@heroui/react'
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'

import {
  type TaskFindingRuleMapVM,
  type TaskRecordVulnerabilityVM,
  type UpdateTaskFindingPayload,
  useTaskFindingDetail,
  useTaskFindingRuleMap,
  useUpdateTaskFinding,
} from '@/api/adapters/task'
import {
  getSeverityColor,
  normalizeSeverityDisplay,
  normalizeSeverityValue,
  VULNERABILITY_SEVERITY_OPTIONS,
} from '@/utils/vulnerability'

const NO_MAPPING_VALUE = '__none__'

type FindingEditorState = {
  ruleName: string
  severity: string
  description: string
  remediation: string
}

const EMPTY_EDITOR_STATE: FindingEditorState = {
  ruleName: '',
  severity: 'info',
  description: '',
  remediation: '',
}

const inputClassNames = {
  base: 'min-w-0 w-full',
  inputWrapper: 'h-14 w-full rounded-[18px] border border-white/8 bg-white/5 transition-colors hover:bg-white/[0.07]',
  input: 'text-sm text-white placeholder:text-apple-text-tertiary',
}

const textareaClassNames = {
  base: 'min-w-0 w-full',
  inputWrapper: 'rounded-[18px] border border-white/8 bg-white/5 transition-colors hover:bg-white/[0.07] items-start !h-auto min-h-[148px] px-0',
  input: 'min-w-0 w-full max-h-[240px] overflow-y-auto text-sm leading-7 text-white placeholder:text-apple-text-tertiary whitespace-pre-wrap break-words',
  innerWrapper: 'items-start w-full',
}

function FieldLabel({ children }: { children: string }) {
  return <div className="text-[11px] font-black uppercase tracking-[0.18em] text-apple-text-tertiary">{children}</div>
}

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  )
}

function CompactInfoField({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="min-w-0 space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <div className={`flex h-14 min-w-0 items-center rounded-[18px] border border-white/8 bg-white/5 px-4 text-sm ${mono ? 'font-mono text-[12px]' : ''} break-words text-white`}>
        {value || '-'}
      </div>
    </div>
  )
}

function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.length ? value.map((item) => formatPayloadValue(item)).join(', ') : ''

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function firstNonEmptyPayloadText(...values: unknown[]): string {
  for (const value of values) {
    const text = formatPayloadValue(value).trim()
    if (text) {
      return text
    }
  }
  return ''
}

function getRawInfoMap(item: TaskRecordVulnerabilityVM | null): Record<string, unknown> {
  const info = item?.raw?.info
  return info && typeof info === 'object' && !Array.isArray(info) ? info as Record<string, unknown> : {}
}

function getOriginalFindingDescription(item: TaskRecordVulnerabilityVM | null): string {
  const info = getRawInfoMap(item)
  return firstNonEmptyPayloadText(info.description, item?.raw?.description)
}

function getOriginalFindingRemediation(item: TaskRecordVulnerabilityVM | null): string {
  const info = getRawInfoMap(item)
  const reference = Array.isArray(info.reference) ? info.reference.filter(Boolean).join('\n') : info.reference
  return firstNonEmptyPayloadText(info.remediation, info.solution, item?.raw?.remediation, reference)
}

function getOriginalFindingRuleName(item: TaskRecordVulnerabilityVM | null): string {
  const info = getRawInfoMap(item)
  return firstNonEmptyPayloadText(info.name, item?.raw?.rule_name, item?.rule_name)
}

function getOriginalFindingSeverity(item: TaskRecordVulnerabilityVM | null): string {
  const info = getRawInfoMap(item)
  return normalizeSeverityValue(firstNonEmptyPayloadText(info.severity, item?.raw?.severity, item?.severity, 'info')) || 'info'
}

function buildEditorState(item: TaskRecordVulnerabilityVM | null): FindingEditorState {
  if (!item) {
    return { ...EMPTY_EDITOR_STATE }
  }

  const classification = { ...(item.classification || {}) }
  return {
    ruleName: item.rule_name || '',
    severity: normalizeSeverityValue(item.severity || 'info') || 'info',
    description: formatPayloadValue(classification.description),
    remediation: formatPayloadValue(classification.remediation ?? classification.solution),
  }
}

export function buildMappingPatch(
  selection: string,
  ruleMap?: TaskFindingRuleMapVM,
): UpdateTaskFindingPayload['mapping_patch'] | undefined {
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

export function buildFindingPatchPayload(
  item: TaskRecordVulnerabilityVM,
  formState: FindingEditorState,
  mappingPatch?: UpdateTaskFindingPayload['mapping_patch'],
): NonNullable<UpdateTaskFindingPayload['finding_patch']> {
  const displayedState = buildEditorState(item)
  const shouldRestoreOriginalFields = Boolean(mappingPatch)

  const nextRuleName = shouldRestoreOriginalFields && formState.ruleName.trim() === displayedState.ruleName.trim()
    ? getOriginalFindingRuleName(item)
    : formState.ruleName.trim()
  const nextSeverity = shouldRestoreOriginalFields && normalizeSeverityValue(formState.severity) === displayedState.severity
    ? getOriginalFindingSeverity(item)
    : normalizeSeverityValue(formState.severity)
  const nextDescription = shouldRestoreOriginalFields && formState.description.trim() === displayedState.description.trim()
    ? getOriginalFindingDescription(item)
    : formState.description.trim()
  const nextRemediation = shouldRestoreOriginalFields && formState.remediation.trim() === displayedState.remediation.trim()
    ? getOriginalFindingRemediation(item)
    : formState.remediation.trim()

  const classification = { ...(item.classification || {}) }

  if (nextDescription) {
    classification.description = nextDescription
  } else {
    delete classification.description
  }

  if (nextRemediation) {
    classification.remediation = nextRemediation
  } else {
    delete classification.remediation
  }

  return {
    rule_name: nextRuleName,
    severity: nextSeverity,
    matched_at: item.matched_at || undefined,
    target_url: item.target_url || undefined,
    host: item.host || undefined,
    ip: item.ip || undefined,
    port: typeof item.port === 'number' ? item.port : undefined,
    scheme: item.scheme || undefined,
    matcher_name: item.matcher_name || undefined,
    classification,
    evidence: item.evidence || undefined,
  }
}

function readSingleSelectionValue(keys: 'all' | Set<Key>): string | undefined {
  if (keys === 'all') {
    return undefined
  }
  const [value] = Array.from(keys)
  return value === undefined || value === null ? undefined : String(value)
}

export function FindingReportEditModal({
  isOpen,
  taskId,
  item,
  onClose,
  onSaved,
}: {
  isOpen: boolean
  taskId: string
  item: TaskRecordVulnerabilityVM | null
  onClose: () => void
  onSaved: (item: TaskRecordVulnerabilityVM) => void
}) {
  const findingId = item?.id || ''
  const { data: detailItem, isPending, isError, error, refetch } = useTaskFindingDetail(taskId, findingId, isOpen)
  const activeItem = detailItem || item
  const ruleID = activeItem?.rule_id || ''
  const displayTemplateID = activeItem?.template_id || ''
  const {
    data: ruleMap,
    isPending: isRuleMapPending,
    refetch: refetchRuleMap,
  } = useTaskFindingRuleMap(ruleID, Boolean(isOpen && ruleID))
  const updateFindingMutation = useUpdateTaskFinding()

  const [formState, setFormState] = useState<FindingEditorState>(EMPTY_EDITOR_STATE)
  const [mappingExpanded, setMappingExpanded] = useState(false)
  const [mappingSelection, setMappingSelection] = useState(NO_MAPPING_VALUE)
  const [mappingQuery, setMappingQuery] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setFormState({ ...EMPTY_EDITOR_STATE })
      setMappingExpanded(false)
      setMappingSelection(NO_MAPPING_VALUE)
      setMappingQuery('')
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
    const nextSelection = ruleMap?.current?.vul_type_id ? String(ruleMap.current.vul_type_id) : NO_MAPPING_VALUE
    setMappingSelection(nextSelection)
    const nextLabel = nextSelection === NO_MAPPING_VALUE
      ? '无映射'
      : ruleMap?.candidates.find((candidate) => String(candidate.vul_type_id) === nextSelection)?.vul_type || ''
    setMappingQuery(nextLabel)
  }, [isOpen, ruleMap])

  const mappingOptions = useMemo(
    () => [{ key: NO_MAPPING_VALUE, label: '无映射' }, ...((ruleMap?.candidates || []).map((candidate) => ({ key: String(candidate.vul_type_id), label: candidate.vul_type })))],
    [ruleMap],
  )
  const filteredMappingOptions = useMemo(() => {
    const keyword = mappingQuery.trim().toLowerCase()
    if (!keyword) {
      return mappingOptions
    }
    return mappingOptions.filter((candidate) => candidate.label.toLowerCase().includes(keyword))
  }, [mappingOptions, mappingQuery])
  const selectedCandidate = useMemo(
    () => ruleMap?.candidates.find((candidate) => String(candidate.vul_type_id) === mappingSelection),
    [mappingSelection, ruleMap],
  )

  async function handleSave() {
    if (!findingId || !activeItem) {
      return
    }

    setSaveError('')
    setSaveSuccess('')

    try {
      const mappingPatch = buildMappingPatch(mappingSelection, ruleMap)

      const payload: UpdateTaskFindingPayload = {
        finding_patch: buildFindingPatchPayload(activeItem, formState, mappingPatch),
        mapping_patch: mappingPatch,
      }

      const saved = await updateFindingMutation.mutateAsync({ taskId, findingId, payload })
      onSaved(saved)
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存失败，请稍后重试')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="4xl"
      backdrop="blur"
      scrollBehavior="inside"
      classNames={{
        backdrop: 'bg-apple-bg/80 backdrop-blur-md',
        base: 'max-w-[960px] bg-apple-bg/92 text-apple-text-primary border border-white/10 rounded-[28px] shadow-2xl',
        header: 'border-b border-white/6 px-5 py-4 sm:px-6 sm:py-5',
        body: 'px-5 py-5 sm:px-6 sm:py-5',
        footer: 'border-t border-white/6 px-5 py-4 sm:px-6 sm:py-5',
      }}
    >
      <ModalContent>
        <>
          <ModalHeader className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.28em] text-apple-text-tertiary">编辑漏洞报告</span>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-black tracking-tight text-white">{activeItem?.rule_name || item?.rule_name || '漏洞报告'}</h3>
                <Chip size="sm" variant="flat" color={getSeverityColor(activeItem?.severity || item?.severity || '')} classNames={{ base: 'border-0 px-2 font-black uppercase tracking-[0.18em]' }}>
                  {normalizeSeverityDisplay(activeItem?.severity || item?.severity || '') || '-'}
                </Chip>
              </div>
              <p className="text-sm text-apple-text-secondary">仅编辑报告展示相关字段，短信息紧凑排布，长文本单独编辑。</p>
            </div>
            <Button
              variant="flat"
              className="rounded-xl bg-white/5 font-bold text-white hover:bg-white/10"
              onPress={() => refetch()}
              isDisabled={isPending}
            >
              刷新
            </Button>
          </ModalHeader>

          <ModalBody className="space-y-5">
            {isPending && !activeItem ? (
              <div className="flex min-h-[240px] items-center justify-center">
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
                <section className="space-y-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <FieldGroup label="漏洞名称">
                      <Input
                        aria-label="漏洞名称"
                        value={formState.ruleName}
                        onValueChange={(value) => setFormState((prev) => ({ ...prev, ruleName: value }))}
                        classNames={inputClassNames}
                      />
                    </FieldGroup>
                    <FieldGroup label="漏洞级别">
                      <Select
                        aria-label="漏洞级别"
                        selectedKeys={new Set([formState.severity || 'info'])}
                        onChange={(event) => setFormState((prev) => ({ ...prev, severity: event.target.value || 'info' }))}
                        onSelectionChange={(keys) => {
                          setFormState((prev) => ({ ...prev, severity: readSingleSelectionValue(keys) || 'info' }))
                        }}
                        classNames={{
                          base: 'min-w-0 w-full',
                          trigger: inputClassNames.inputWrapper,
                          value: 'truncate pl-1 text-sm text-white',
                        }}
                        popoverProps={{ classNames: { content: 'min-w-[220px] border border-white/10 bg-apple-bg/95 p-1 backdrop-blur-3xl shadow-2xl' } }}
                      >
                        {VULNERABILITY_SEVERITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} textValue={option.label}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </Select>
                    </FieldGroup>
                    <CompactInfoField label="模板 ID" value={displayTemplateID || '-'} mono />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <CompactInfoField label="当前映射" value={ruleMap?.current?.vul_type || '无映射'} />
                    <FieldGroup label="覆盖到漏洞类型">
                      <Autocomplete
                        aria-label="覆盖到漏洞类型"
                        items={filteredMappingOptions}
                        selectedKey={mappingSelection}
                        inputValue={mappingQuery}
                        onInputChange={(value) => {
                          setMappingQuery(value)
                        }}
                        onSelectionChange={(key) => {
                          const nextValue = key === null ? NO_MAPPING_VALUE : String(key)
                          const nextLabel = mappingOptions.find((candidate) => candidate.key === nextValue)?.label || ''
                          setMappingSelection(nextValue || NO_MAPPING_VALUE)
                          setMappingQuery(nextLabel)
                        }}
                        classNames={{
                          base: 'min-w-0 w-full',
                          popoverContent: 'min-w-[260px] border border-white/10 bg-apple-bg/95 p-1 backdrop-blur-3xl shadow-2xl',
                          selectorButton: 'text-white',
                          listboxWrapper: 'max-h-72',
                        }}
                        inputProps={{
                          classNames: {
                            base: 'min-w-0 w-full',
                            inputWrapper: inputClassNames.inputWrapper,
                            input: 'text-sm text-white placeholder:text-apple-text-tertiary',
                          },
                        }}
                        placeholder="搜索漏洞类型或选择无映射"
                        allowsCustomValue={false}
                      >
                        {(item) => (
                          <AutocompleteItem key={item.key} textValue={item.label}>
                            {item.label}
                          </AutocompleteItem>
                        )}
                      </Autocomplete>
                    </FieldGroup>
                  </div>

                  <div className="space-y-4">
                    <FieldGroup label="漏洞描述">
                      <Textarea
                        aria-label="漏洞描述"
                        minRows={4}
                        maxRows={10}
                        value={formState.description}
                        onValueChange={(value) => setFormState((prev) => ({ ...prev, description: value }))}
                        classNames={textareaClassNames}
                      />
                    </FieldGroup>

                    <FieldGroup label="修复建议">
                      <Textarea
                        aria-label="修复建议"
                        minRows={4}
                        maxRows={10}
                        value={formState.remediation}
                        onValueChange={(value) => setFormState((prev) => ({ ...prev, remediation: value }))}
                        classNames={textareaClassNames}
                      />
                    </FieldGroup>
                  </div>
                </section>

                <section className="rounded-[24px] border border-white/8 bg-white/[0.02]">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                    onClick={() => setMappingExpanded((prev) => !prev)}
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
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <CompactInfoField label="模板 ID" value={displayTemplateID || '-'} mono />
                            <CompactInfoField label="当前映射" value={ruleMap?.current?.vul_type || '无映射'} />
                            <CompactInfoField
                              label="展示级别"
                              value={normalizeSeverityDisplay(selectedCandidate?.default_severity || ruleMap?.current?.default_severity || activeItem.severity || '') || '-'}
                            />
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
          </ModalBody>

          <ModalFooter className="flex flex-col items-stretch gap-3">
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
                isDisabled={!activeItem}
                isLoading={updateFindingMutation.isPending}
              >
                保存修改
              </Button>
            </div>
          </ModalFooter>
        </>
      </ModalContent>
    </Modal>
  )
}
