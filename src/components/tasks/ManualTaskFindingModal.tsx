import { useMemo, useState } from 'react'

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react'

import {
  type CreateManualTaskFindingPayload,
  useCreateManualTaskFinding,
} from '@/api/adapters/task'
import { VULNERABILITY_SEVERITY_OPTIONS } from '@/utils/vulnerability'

interface ManualTaskFindingModalProps {
  taskId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type ManualTaskFindingFormState = CreateManualTaskFindingPayload

const EMPTY_FORM: ManualTaskFindingFormState = {
  rule_name: '',
  severity: 'high',
  target_url: '',
  template_id: '',
  description: '',
  remediation: '',
  request: '',
  response: '',
  matched_at: '',
}

function resolveSubmitError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
    if (typeof message === 'string' && message.trim()) {
      return message.trim()
    }
  }
  return fallback
}

function FieldLabel({ children }: { children: string }) {
  return <span className="mb-1 block text-xs font-semibold tracking-wide text-apple-text-secondary">{children}</span>
}

export function ManualTaskFindingModal({ taskId, isOpen, onClose, onSuccess }: ManualTaskFindingModalProps) {
  const createFindingMutation = useCreateManualTaskFinding()
  const [formState, setFormState] = useState<ManualTaskFindingFormState>(EMPTY_FORM)
  const [submitError, setSubmitError] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const canSubmit = useMemo(() => (
    formState.rule_name.trim() &&
    formState.severity.trim() &&
    formState.target_url.trim() &&
    formState.description.trim() &&
    formState.remediation.trim()
  ), [formState])

  function updateField<Key extends keyof ManualTaskFindingFormState>(key: Key, value: ManualTaskFindingFormState[Key]) {
    setFormState((prev) => ({ ...prev, [key]: value }))
    setValidationErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
    setSubmitError('')
  }

  function resetState() {
    setFormState(EMPTY_FORM)
    setSubmitError('')
    setValidationErrors({})
  }

  function handleClose() {
    resetState()
    onClose()
  }

  async function handleSubmit() {
    const nextErrors: Record<string, string> = {}
    if (!formState.rule_name.trim()) nextErrors.rule_name = '请输入漏洞名称'
    if (!formState.severity.trim()) nextErrors.severity = '请选择漏洞级别'
    if (!formState.target_url.trim()) nextErrors.target_url = '请输入目标 URL'
    if (!formState.description.trim()) nextErrors.description = '请输入漏洞描述'
    if (!formState.remediation.trim()) nextErrors.remediation = '请输入修复建议'
    if (Object.keys(nextErrors).length > 0) {
      setValidationErrors(nextErrors)
      return
    }

    const payload: CreateManualTaskFindingPayload = {
      rule_name: formState.rule_name.trim(),
      severity: formState.severity.trim(),
      target_url: formState.target_url.trim(),
      template_id: formState.template_id?.trim() || undefined,
      description: formState.description.trim(),
      remediation: formState.remediation.trim(),
      request: formState.request?.trim() || undefined,
      response: formState.response?.trim() || undefined,
      matched_at: formState.matched_at?.trim()
        ? new Date(formState.matched_at).toISOString()
        : undefined,
    }

    try {
      await createFindingMutation.mutateAsync({ taskId, payload })
      resetState()
      onSuccess?.()
    } catch (error) {
      setSubmitError(resolveSubmitError(error, '手动导入漏洞失败'))
    }
  }

  const inputWrapperClass = 'h-11 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md'
  const textareaWrapperClass = 'rounded-[20px] border border-white/10 bg-white/5 backdrop-blur-md'

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      placement="center"
      backdrop="blur"
      size="3xl"
      scrollBehavior="inside"
      classNames={{
        base: 'bg-apple-bg/85 text-white backdrop-blur-3xl',
        header: 'border-b border-white/8 px-6 py-5',
        body: 'px-6 py-5',
        footer: 'border-t border-white/8 px-6 py-4',
      }}
    >
      <ModalContent>
        <>
          <ModalHeader className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-apple-blue-light">Task Finding / Manual Import</span>
            <span className="text-xl font-semibold tracking-tight">手动导入漏洞</span>
          </ModalHeader>

          <ModalBody>
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>漏洞名称</FieldLabel>
                  <Input
                    aria-label="漏洞名称"
                    value={formState.rule_name}
                    onValueChange={(value) => updateField('rule_name', value)}
                    isInvalid={Boolean(validationErrors.rule_name)}
                    errorMessage={validationErrors.rule_name}
                    classNames={{
                      inputWrapper: inputWrapperClass,
                      input: 'text-sm text-white',
                    }}
                  />
                </div>

                <div>
                  <FieldLabel>漏洞级别</FieldLabel>
                  <Select
                    aria-label="漏洞级别"
                    selectedKeys={new Set([formState.severity])}
                    onSelectionChange={(keys) => {
                      const value = Array.from(keys)[0]
                      updateField('severity', String(value || ''))
                    }}
                    isInvalid={Boolean(validationErrors.severity)}
                    errorMessage={validationErrors.severity}
                    classNames={{
                      trigger: inputWrapperClass,
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
                </div>

                <div>
                  <FieldLabel>目标 URL</FieldLabel>
                  <Input
                    aria-label="目标 URL"
                    value={formState.target_url}
                    onValueChange={(value) => updateField('target_url', value)}
                    isInvalid={Boolean(validationErrors.target_url)}
                    errorMessage={validationErrors.target_url}
                    classNames={{
                      inputWrapper: inputWrapperClass,
                      input: 'text-sm text-white',
                    }}
                  />
                </div>

                <div>
                  <FieldLabel>POC ID / 模板 ID</FieldLabel>
                  <Input
                    aria-label="POC ID / 模板 ID"
                    value={formState.template_id || ''}
                    onValueChange={(value) => updateField('template_id', value)}
                    classNames={{
                      inputWrapper: inputWrapperClass,
                      input: 'text-sm text-white',
                    }}
                  />
                </div>

                <div>
                  <FieldLabel>发现时间</FieldLabel>
                  <Input
                    aria-label="发现时间"
                    type="datetime-local"
                    value={formState.matched_at || ''}
                    onValueChange={(value) => updateField('matched_at', value)}
                    classNames={{
                      inputWrapper: inputWrapperClass,
                      input: 'text-sm text-white',
                    }}
                  />
                </div>
              </div>

              <div>
                <FieldLabel>漏洞描述</FieldLabel>
                <Textarea
                  aria-label="漏洞描述"
                  minRows={4}
                  maxRows={8}
                  value={formState.description}
                  onValueChange={(value) => updateField('description', value)}
                  isInvalid={Boolean(validationErrors.description)}
                  errorMessage={validationErrors.description}
                  classNames={{
                    inputWrapper: textareaWrapperClass,
                    input: 'text-sm leading-6 text-white',
                  }}
                />
              </div>

              <div>
                <FieldLabel>修复建议</FieldLabel>
                <Textarea
                  aria-label="修复建议"
                  minRows={4}
                  maxRows={8}
                  value={formState.remediation}
                  onValueChange={(value) => updateField('remediation', value)}
                  isInvalid={Boolean(validationErrors.remediation)}
                  errorMessage={validationErrors.remediation}
                  classNames={{
                    inputWrapper: textareaWrapperClass,
                    input: 'text-sm leading-6 text-white',
                  }}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <FieldLabel>请求报文</FieldLabel>
                  <Textarea
                    aria-label="请求报文"
                    minRows={4}
                    maxRows={10}
                    value={formState.request || ''}
                    onValueChange={(value) => updateField('request', value)}
                    classNames={{
                      inputWrapper: textareaWrapperClass,
                      input: 'font-mono text-xs leading-6 text-white',
                    }}
                  />
                </div>

                <div>
                  <FieldLabel>响应报文</FieldLabel>
                  <Textarea
                    aria-label="响应报文"
                    minRows={4}
                    maxRows={10}
                    value={formState.response || ''}
                    onValueChange={(value) => updateField('response', value)}
                    classNames={{
                      inputWrapper: textareaWrapperClass,
                      input: 'font-mono text-xs leading-6 text-white',
                    }}
                  />
                </div>
              </div>

              {submitError ? (
                <div className="rounded-2xl border border-apple-red/25 bg-apple-red/10 px-4 py-3 text-sm text-apple-red-light">
                  {submitError}
                </div>
              ) : null}
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="flat" className="rounded-xl px-5 text-apple-text-secondary" onPress={handleClose}>
              取消
            </Button>
            <Button
              color="primary"
              className="rounded-xl px-6 font-semibold"
              isLoading={createFindingMutation.isPending}
              isDisabled={!canSubmit}
              onPress={handleSubmit}
            >
              导入漏洞
            </Button>
          </ModalFooter>
        </>
      </ModalContent>
    </Modal>
  )
}
