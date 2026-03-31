import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem, Textarea, Switch, Chip, Spinner } from '@heroui/react'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { RocketLaunchIcon, BeakerIcon } from '@heroicons/react/24/outline'

import { useCreateTask } from '@/api/adapters/task'
import { useTaskTemplates, useTaskTemplateDetail, getPortModeLabel, isHighCostPortTemplate, FULL_PORT_WARNING } from '@/api/adapters/template'

interface Props {
  poolId: string
  poolName?: string
  isOpen: boolean
  onClose: () => void
}

export function CreateTaskFromPoolModal({ poolId, poolName, isOpen, onClose }: Props) {
  const navigate = useNavigate()
  const createTask = useCreateTask()

  const { data: templatesData, isPending: isLoadingTemplates } = useTaskTemplates({ page_size: 100 })
  const templates = useMemo(() => templatesData?.data || [], [templatesData?.data])

  const [taskName, setTaskName] = useState('')
  const [templateCode, setTemplateCode] = useState('')
  const [manualTargets, setManualTargets] = useState('')

  useEffect(() => {
    if (!templateCode && templates.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTemplateCode(templates[0].code)
    }
  }, [templateCode, templates])

  const { data: tplDetail, isPending: isLoadingTpl } = useTaskTemplateDetail(templateCode)

  const [portMode, setPortMode] = useState('')
  const [httpProbe, setHttpProbe] = useState(false)
  const [concurrency, setConcurrency] = useState<number | ''>('')
  const [rate, setRate] = useState<number | ''>('')
  const [timeoutMs, setTimeoutMs] = useState<number | ''>('')

  useEffect(() => {
    if (tplDetail) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPortMode(tplDetail.default_port_scan_mode)
      setHttpProbe(tplDetail.default_http_probe_enabled)
      setConcurrency(tplDetail.default_concurrency)
      setRate(tplDetail.default_rate)
      setTimeoutMs(tplDetail.default_timeout_ms)
    }
  }, [tplDetail])

  const handleSubmit = () => {
    const name = taskName.trim() || `基于「${poolName || poolId}」的扫描任务`
    const items = manualTargets.trim()
      ? manualTargets.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
      : []

    const templateOverrides: Record<string, unknown> = {}
    if (tplDetail?.allow_port_mode_override && portMode !== tplDetail.default_port_scan_mode) {
      templateOverrides.port_scan_mode = portMode
    }
    if (tplDetail?.allow_http_probe_override && httpProbe !== tplDetail.default_http_probe_enabled) {
      templateOverrides.http_probe_enabled = httpProbe
    }
    if (tplDetail?.allow_advanced_override && concurrency !== '' && concurrency !== tplDetail.default_concurrency) {
      templateOverrides.concurrency = Number(concurrency)
    }
    if (tplDetail?.allow_advanced_override && rate !== '' && rate !== tplDetail.default_rate) {
      templateOverrides.rate = Number(rate)
    }
    if (tplDetail?.allow_advanced_override && timeoutMs !== '' && timeoutMs !== tplDetail.default_timeout_ms) {
      templateOverrides.timeout_ms = Number(timeoutMs)
    }

    createTask.mutate(
      {
        mode: 'from_pool',
        name,
        template_code: templateCode,
        asset_pool_id: poolId,
        target_set_request: {
          generation_source: items.length > 0 ? 'pool_filter_plus_manual' : 'pool_filter',
        },
        ...(items.length > 0 ? { manual_append: items } : {}),
        template_overrides: Object.keys(templateOverrides).length > 0 ? templateOverrides : undefined,
      },
      {
        onSuccess: (res) => {
          onClose()
          setTaskName('')
          setManualTargets('')
          navigate(`/tasks/${res.task_id}`)
        },
      },
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      placement="center"
      backdrop="blur"
      classNames={{
        base: 'bg-apple-bg/80 backdrop-blur-3xl text-apple-text-primary border border-white/10 rounded-[32px] max-w-lg shadow-2xl',
        header: 'border-b border-white/5 p-8',
        body: 'p-8',
        footer: 'border-t border-white/5 p-6 bg-white/[0.02] flex justify-end gap-3',
      }}
    >
      <ModalContent>
        <>
          <ModalHeader className="flex flex-col gap-1">
            <span className="text-[10px] text-apple-blue-light uppercase tracking-[0.3em] font-black">
              基于当前资产池创建任务
            </span>
            <h3 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
              <RocketLaunchIcon className="w-6 h-6" />
              发起扫描任务
            </h3>
            {poolName && (
              <p className="text-[12px] text-apple-text-tertiary font-medium mt-1">
                资产池：{poolName}
              </p>
            )}
          </ModalHeader>

          <ModalBody>
            <div className="flex flex-col gap-6">
              {/* 任务名称 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">
                  任务名称 <span className="text-apple-text-tertiary font-medium">(可选，留空自动生成)</span>
                </label>
                <Input
                  variant="flat"
                  placeholder={`基于「${poolName || poolId}」的扫描任务`}
                  value={taskName}
                  onValueChange={setTaskName}
                  classNames={{ inputWrapper: 'bg-white/5 border border-white/10 h-12 rounded-[16px]' }}
                />
              </div>

              {/* 扫描模板 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">
                  扫描模板
                </label>
                <div className="flex items-center gap-4">
                  <Select
                    variant="flat"
                    aria-label="扫描模板"
                    isLoading={isLoadingTemplates}
                    selectedKeys={templateCode ? [templateCode] : []}
                    onChange={(e) => setTemplateCode(e.target.value)}
                    className="flex-1"
                    classNames={{ trigger: 'bg-white/5 border border-white/10 h-12 pr-10 rounded-[16px]', value: 'truncate' }}
                  >
                    {templates.map((t: unknown) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const tpl = t as any
                      return (
                        <SelectItem key={tpl.code} textValue={tpl.name}>
                          {tpl.name} {tpl.is_builtin ? '(内置)' : ''}
                        </SelectItem>
                      )
                    })}
                  </Select>
                  {isLoadingTpl && <Spinner size="sm" color="white" />}
                </div>
              </div>

              {/* 覆盖参数区 */}
              {(tplDetail?.allow_port_mode_override || tplDetail?.allow_http_probe_override || tplDetail?.allow_advanced_override) && (
                <div className="flex flex-col gap-5 mt-2 pt-4 border-t border-white/5">
                   {tplDetail.allow_port_mode_override && (
                     <div className="flex flex-col gap-1.5">
                       <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">端口扫描模式 (覆盖)</label>
                       <Select
                          variant="flat"
                          selectedKeys={portMode ? [portMode] : []}
                          onChange={(e) => setPortMode(e.target.value)}
                          classNames={{ trigger: 'bg-white/5 border border-white/10 h-12 pr-10 rounded-[16px]' }}
                        >
                          <SelectItem key="web_common" textValue={getPortModeLabel('web_common')}>{getPortModeLabel('web_common')}</SelectItem>
                          <SelectItem key="top_100" textValue={getPortModeLabel('top_100')}>{getPortModeLabel('top_100')}</SelectItem>
                          <SelectItem key="common" textValue={getPortModeLabel('common')}>{getPortModeLabel('common')}</SelectItem>
                          <SelectItem key="full" textValue={getPortModeLabel('full')}>{getPortModeLabel('full')}</SelectItem>
                          <SelectItem key="custom" textValue={getPortModeLabel('custom')}>{getPortModeLabel('custom')}</SelectItem>
                        </Select>
                        {isHighCostPortTemplate(templateCode) && (
                          <p className="text-[11px] text-apple-amber font-bold mt-1">⚠ {FULL_PORT_WARNING}</p>
                        )}
                     </div>
                   )}
                   {tplDetail.allow_http_probe_override && (
                     <div className="flex flex-col gap-1.5 mt-2">
                       <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">首页识别 (覆盖)</label>
                       <Switch size="sm" isSelected={httpProbe} onValueChange={setHttpProbe} classNames={{ wrapper: 'group-data-[selected=true]:bg-apple-blue' }}>
                         <span className="text-[13px] text-white">开启首页识别与协议指纹嗅探</span>
                       </Switch>
                     </div>
                   )}
                   {tplDetail.allow_advanced_override && (
                     <div className="grid grid-cols-1 gap-4 mt-2">
                       <div className="flex flex-col gap-1.5">
                         <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">并发数 (覆盖)</label>
                         <Input type="number" variant="flat" value={concurrency.toString()} onValueChange={(val) => setConcurrency(val ? Number(val) : '')} classNames={{ inputWrapper: 'bg-white/5 border border-white/10 h-12 rounded-[16px]' }} />
                       </div>
                       <div className="flex flex-col gap-1.5">
                         <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">发包速率 (覆盖)</label>
                         <Input type="number" variant="flat" value={rate.toString()} onValueChange={(val) => setRate(val ? Number(val) : '')} classNames={{ inputWrapper: 'bg-white/5 border border-white/10 h-12 rounded-[16px]' }} />
                       </div>
                       <div className="flex flex-col gap-1.5">
                         <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">超时(ms) (覆盖)</label>
                         <Input type="number" variant="flat" value={timeoutMs.toString()} onValueChange={(val) => setTimeoutMs(val ? Number(val) : '')} classNames={{ inputWrapper: 'bg-white/5 border border-white/10 h-12 rounded-[16px]' }} />
                       </div>
                     </div>
                   )}
                </div>
              )}

              {/* 额外目标（可选） */}
              <div className="flex flex-col gap-1.5">
                <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">
                  额外追加目标 <span className="text-apple-text-tertiary font-medium">(可选)</span>
                </label>
                <Textarea
                  variant="flat"
                  placeholder={'example.com\n192.168.1.0/24'}
                  minRows={3}
                  value={manualTargets}
                  onValueChange={setManualTargets}
                  classNames={{ inputWrapper: 'bg-white/5 border border-white/10 rounded-[16px]' }}
                />
              </div>

              {/* 执行预览 */}
              <div className="bg-apple-blue/5 border border-apple-blue/10 rounded-[20px] p-5 flex flex-col gap-3">
                 <h2 className="text-[10px] uppercase font-black tracking-[0.2em] text-apple-blue-light flex items-center gap-2">
                   <BeakerIcon className="w-4 h-4" /> 执行预览
                 </h2>
                 {!tplDetail ? (
                   <p className="text-[12px] text-apple-text-tertiary">正在拉取模板评述...</p>
                 ) : (
                   <div className="flex flex-col gap-3">
                     <p className="text-[12px] text-apple-text-secondary leading-relaxed">{tplDetail.preview_summary || '未定义模板细节行为。'}</p>
                     <div className="flex gap-2 flex-wrap">
                        <Chip size="sm" variant="flat" className="bg-white/5 border-white/10 text-white font-mono h-6">{getPortModeLabel(portMode)}</Chip>
                        {httpProbe && <Chip size="sm" variant="flat" className="bg-white/5 border-white/10 text-white font-mono h-6">http probe enabled</Chip>}
                     </div>
                   </div>
                 )}
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="flat" onPress={onClose} className="rounded-xl px-6 font-bold text-apple-text-secondary">
              取消
            </Button>
            <Button
              color="primary"
              className="rounded-xl px-10 font-black shadow-lg shadow-apple-blue/20"
              isLoading={createTask.isPending}
              onPress={handleSubmit}
            >
              发起任务
            </Button>
          </ModalFooter>
        </>
      </ModalContent>
    </Modal>
  )
}
