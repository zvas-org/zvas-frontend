import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem, Switch, Chip, Spinner } from '@heroui/react'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { RocketLaunchIcon, BeakerIcon } from '@heroicons/react/24/outline'

import { useCreateTask } from '@/api/adapters/task'
import { useTaskTemplates, useTaskTemplateDetail, getPortModeLabel, getTaskTemplatePreviewSummary, isHighCostPortTemplate, isSiteBasedTemplate, FULL_PORT_WARNING, VUL_SCAN_SEVERITY_OPTIONS, buildVulScanSeverityParam, formatVulScanSeverityLabels } from '@/api/adapters/template'

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
  const templates = useMemo(() => (templatesData?.data || []).filter((item) => item.is_enabled), [templatesData?.data])
  const hasAvailableTemplates = templates.length > 0

  const [taskName, setTaskName] = useState('')
  const [templateCode, setTemplateCode] = useState('')
  const selectedTemplateCode = useMemo(() => {
    if (templates.length === 0) return ''
    if (templateCode && templates.some((item) => item.code === templateCode)) {
      return templateCode
    }
    return templates[0].code
  }, [templateCode, templates])

  const { data: tplDetail, isPending: isLoadingTpl } = useTaskTemplateDetail(selectedTemplateCode)

  const [portMode, setPortMode] = useState('')
  const [httpProbe, setHttpProbe] = useState(false)
  const [concurrency, setConcurrency] = useState<number | ''>('')
  const [rate, setRate] = useState<number | ''>('')
  const [timeoutMs, setTimeoutMs] = useState<number | ''>('')
  const [vulScanSeverity, setVulScanSeverity] = useState<string[]>([])
  const [enableVulScan, setEnableVulScan] = useState(false)
  const [enableWeakScan, setEnableWeakScan] = useState(false)

  useEffect(() => {
    if (tplDetail) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPortMode(tplDetail.default_port_scan_mode)
      setHttpProbe(tplDetail.default_http_probe_enabled)
      setConcurrency(tplDetail.default_concurrency)
      setRate(tplDetail.default_rate)
      setTimeoutMs(tplDetail.default_timeout_ms)
      setVulScanSeverity(tplDetail.supports_vul_scan ? tplDetail.default_vul_scan_severity : [])
      setEnableVulScan(tplDetail.default_stage_plan.includes('vuln_scan'))
      setEnableWeakScan(tplDetail.default_stage_plan.includes('weak_scan'))
    }
  }, [tplDetail])

  const vulScanSeveritySummary = useMemo(() => formatVulScanSeverityLabels(vulScanSeverity), [vulScanSeverity])
  const isSiteBasedSelectedTemplate = isSiteBasedTemplate(selectedTemplateCode)
  const previewSummary = getTaskTemplatePreviewSummary(tplDetail) || '无特殊预览说明。'
  const allowAttackSurfaceOverrides = selectedTemplateCode === 'full_scan'
  const shouldRequireVulSeverity = Boolean(tplDetail?.supports_vul_scan && (!allowAttackSurfaceOverrides || enableVulScan))

  const handleSubmit = () => {
    if (!hasAvailableTemplates || !selectedTemplateCode) return
    const name = taskName.trim() || `基于「${poolName || poolId}」的扫描任务`


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

    const params: Record<string, string> = {}
    const stageOverrides: Record<string, boolean> = {}
    if (allowAttackSurfaceOverrides) {
      const defaultVulScanEnabled = tplDetail?.default_stage_plan.includes('vuln_scan') ?? false
      const defaultWeakScanEnabled = tplDetail?.default_stage_plan.includes('weak_scan') ?? false
      if (enableVulScan !== defaultVulScanEnabled) {
        stageOverrides.vuln_scan = enableVulScan
      }
      if (enableWeakScan !== defaultWeakScanEnabled) {
        stageOverrides.weak_scan = enableWeakScan
      }
    }
    if (tplDetail?.supports_vul_scan && (!allowAttackSurfaceOverrides || enableVulScan)) {
      const selectedSeverity = buildVulScanSeverityParam(vulScanSeverity)
      const defaultSeverity = buildVulScanSeverityParam(tplDetail.default_vul_scan_severity)
      if (!selectedSeverity) {
        return
      }
      if (selectedSeverity !== defaultSeverity) {
        params.vul_scan_severity = selectedSeverity
      }
    }

    createTask.mutate(
      {
        mode: 'from_pool',
        name,
        template_code: selectedTemplateCode,
        asset_pool_id: poolId,
        target_set_request: {
          generation_source: 'pool_filter',
        },
        template_overrides: Object.keys(templateOverrides).length > 0 ? templateOverrides : undefined,
        stage_overrides: Object.keys(stageOverrides).length > 0 ? stageOverrides : undefined,
        params: Object.keys(params).length > 0 ? params : undefined,
      },
      {
        onSuccess: (res) => {
          onClose()
          setTaskName('')
          navigate(`/tasks/${res.task_id}`)
        },
      },
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      placement="top-center"
      backdrop="blur"
      scrollBehavior="inside"
      classNames={{
        wrapper: '!items-start z-[140] overflow-y-auto px-3 pb-4 pt-[calc(env(safe-area-inset-top)+5rem)] sm:px-6 sm:pt-[calc(env(safe-area-inset-top)+5.5rem)]',
        backdrop: 'z-[130] bg-apple-black/72 backdrop-blur-md',
        base: 'mt-0 flex max-h-[calc(100dvh-env(safe-area-inset-top)-1rem)] w-full max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-apple-bg/90 text-apple-text-primary shadow-2xl sm:max-w-[calc(100vw-3rem)] md:max-w-2xl',
        header: 'shrink-0 border-b border-white/5 p-5 sm:p-6',
        body: 'min-h-0 flex-1 overflow-y-auto p-4 sm:p-6',
        footer: 'shrink-0 flex flex-col-reverse justify-end gap-3 border-t border-white/5 p-4 sm:flex-row',
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
            <div className="flex min-h-0 flex-col gap-4 sm:gap-5">
              {/* Top Row: Task Basics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 focus-within:z-10">
                  <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em] ml-1">
                    任务标题 <span className="text-apple-text-tertiary font-medium">(可选)</span>
                  </label>
                  <Input
                    variant="flat"
                    placeholder={`基于「${poolName || poolId}」的扫描任务`}
                    value={taskName}
                    onValueChange={setTaskName}
                    classNames={{ inputWrapper: 'bg-white/5 border border-white/10 h-10 rounded-xl hover:border-white/20 transition-all' }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em] ml-1">
                    搭载执行模板
                  </label>
                  <div className="flex items-center gap-2">
                    <Select
                      variant="flat"
                      aria-label="扫描模板"
                      isLoading={isLoadingTemplates}
                      isDisabled={!hasAvailableTemplates}
                      selectedKeys={selectedTemplateCode ? [selectedTemplateCode] : []}
                      onChange={(e) => setTemplateCode(e.target.value)}
                      className="flex-1"
                      classNames={{ trigger: 'bg-white/5 border border-white/10 h-10 pr-10 rounded-xl', value: 'text-sm font-bold truncate pl-1' }}
                      popoverProps={{ classNames: { content: "bg-apple-bg/95 backdrop-blur-3xl border border-white/10 shadow-2xl p-1 min-w-[240px]" } }}
                    >
                      {templates.map((t) => (
                        <SelectItem key={t.code} textValue={t.name}>
                          {t.name} {t.is_builtin ? '(内置)' : ''}
                        </SelectItem>
                      ))}
                    </Select>
                    {isLoadingTpl && <Spinner size="sm" color="white" className="shrink-0" />}
                  </div>
                  {!hasAvailableTemplates && <p className="text-[11px] text-apple-amber font-bold">暂无可用任务模板，请先在模板管理中启用模板。</p>}
                </div>
              </div>

              {/* Bento Grid for Overrides */}
              {(tplDetail?.allow_port_mode_override || tplDetail?.allow_http_probe_override || tplDetail?.allow_advanced_override || tplDetail?.supports_vul_scan || allowAttackSurfaceOverrides) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {allowAttackSurfaceOverrides && (
                     <div className="flex flex-col gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl md:col-span-2">
                       <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">攻击面扫描开关</label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                           <span className="text-[12px] text-white font-bold">漏洞扫描</span>
                           <Switch size="sm" isSelected={enableVulScan} onValueChange={setEnableVulScan} classNames={{ wrapper: 'group-data-[selected=true]:bg-apple-blue h-5 w-9', thumb: 'w-3 h-3 group-data-[selected=true]:ml-4' }} />
                         </div>
                         <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                           <span className="text-[12px] text-white font-bold">弱点扫描</span>
                           <Switch size="sm" isSelected={enableWeakScan} onValueChange={setEnableWeakScan} classNames={{ wrapper: 'group-data-[selected=true]:bg-apple-blue h-5 w-9', thumb: 'w-3 h-3 group-data-[selected=true]:ml-4' }} />
                         </div>
                       </div>
                     </div>
                   )}
                   {/* 端口扫描模块 */}
                   {tplDetail?.allow_port_mode_override && (
                     <div className="flex flex-col gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl relative overflow-hidden group">
                       <div className="flex items-center justify-between">
                         <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">端口扫描模式 (覆盖)</label>
                         {isHighCostPortTemplate(selectedTemplateCode) && (
                           <Chip size="sm" variant="dot" color="warning" classNames={{ base: "border-0 p-0 h-4", content: "text-[9px] font-black" }}>RISK</Chip>
                         )}
                       </div>
                       
                       <div className="flex flex-wrap gap-1.5">
                         {['web_common', 'top_100', 'common', 'full', 'custom'].map((mode) => (
                           <Button
                             key={mode}
                             size="sm"
                             variant={portMode === mode ? 'solid' : 'flat'}
                             className={`min-w-0 h-7 px-2.5 text-[11px] font-bold rounded-lg transition-all ${
                               portMode === mode 
                               ? 'bg-apple-blue text-white shadow-lg shadow-apple-blue/20' 
                               : 'bg-white/5 text-apple-text-secondary hover:bg-white/10'
                             }`}
                             onPress={() => setPortMode(mode)}
                           >
                             {getPortModeLabel(mode)}
                           </Button>
                         ))}
                       </div>
                       
                       {portMode === 'full' && (
                         <div className="absolute inset-x-0 bottom-0 py-1 px-3 bg-apple-amber/10 border-t border-apple-amber/20 animate-in slide-in-from-bottom-2 duration-300">
                            <p className="text-[9px] text-apple-amber font-bold leading-tight">⚠ {FULL_PORT_WARNING}</p>
                         </div>
                       )}
                     </div>
                   )}

                   {/* 扫描能力开关 */}
                   {tplDetail?.allow_http_probe_override && (
                     <div className="flex flex-col justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                       <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">业务感知能力 (覆盖)</label>
                       <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                         <span className="text-[12px] text-white font-bold">首页指纹识别</span>
                         <Switch 
                           size="sm" 
                           isSelected={httpProbe} 
                           onValueChange={setHttpProbe} 
                           classNames={{ wrapper: 'group-data-[selected=true]:bg-apple-blue h-5 w-9', thumb: 'w-3 h-3 group-data-[selected=true]:ml-4' }} 
                         />
                       </div>
                       <p className="text-[10px] text-apple-text-tertiary font-medium mt-1">开启 HTTP 协议深度指纹嗅探</p>
                     </div>
                   )}

                   {tplDetail?.supports_vul_scan && (!allowAttackSurfaceOverrides || enableVulScan) && (
                     <div className="flex flex-col gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl md:col-span-2">
                       <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">漏洞等级 (覆盖)</label>
                       <Select
                         selectionMode="multiple"
                         selectedKeys={new Set(vulScanSeverity)}
                         onSelectionChange={(keys) => setVulScanSeverity(keys === 'all' ? VUL_SCAN_SEVERITY_OPTIONS.map((item) => item.value) : Array.from(keys) as string[])}
                         variant="flat"
                         placeholder="请选择漏洞等级"
                         classNames={{ trigger: 'bg-white/5 border border-white/10 min-h-11 rounded-xl pr-10', value: 'text-sm text-apple-text-primary' }}
                         popoverProps={{ classNames: { content: "bg-apple-bg/95 backdrop-blur-3xl border border-white/10 shadow-2xl p-1 min-w-[240px]" } }}
                       >
                         {VUL_SCAN_SEVERITY_OPTIONS.map((item) => (
                           <SelectItem key={item.value} textValue={item.label}>
                             {item.label}
                           </SelectItem>
                         ))}
                       </Select>
                       <p className="text-[10px] text-apple-text-tertiary font-medium">模板默认：{formatVulScanSeverityLabels(tplDetail.default_vul_scan_severity)}</p>
                       {vulScanSeverity.length === 0 && <p className="text-[10px] text-apple-red-light font-bold">至少选择一个漏洞等级</p>}
                     </div>
                   )}

                   {/* 性能治理模块 */}
                   {tplDetail?.allow_advanced_override && (
                     <div className="flex flex-col gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl md:col-span-2">
                       <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">高级性能治理 (Scaling Overrides)</label>
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                         <div className="flex flex-col gap-1">
                           <span className="text-[9px] text-apple-text-tertiary font-bold ml-1">并发实例 (Concurrency)</span>
                           <Input 
                             size="sm" 
                             variant="flat" 
                             value={concurrency.toString()} 
                             onValueChange={(val) => setConcurrency(val ? Number(val) : '')} 
                             classNames={{ inputWrapper: 'bg-white/5 border border-white/10 h-9 rounded-xl px-3' }} 
                           />
                         </div>
                         <div className="flex flex-col gap-1">
                           <span className="text-[9px] text-apple-text-tertiary font-bold ml-1">线程发包速率 (Rate)</span>
                           <Input 
                             size="sm" 
                             variant="flat" 
                             value={rate.toString()} 
                             onValueChange={(val) => setRate(val ? Number(val) : '')} 
                             classNames={{ inputWrapper: 'bg-white/5 border border-white/10 h-9 rounded-xl px-3' }} 
                           />
                         </div>
                         <div className="flex flex-col gap-1">
                           <span className="text-[9px] text-apple-text-tertiary font-bold ml-1">超时容忍 (Timeout ms)</span>
                           <Input 
                             size="sm" 
                             variant="flat" 
                             value={timeoutMs.toString()} 
                             onValueChange={(val) => setTimeoutMs(val ? Number(val) : '')} 
                             classNames={{ inputWrapper: 'bg-white/5 border border-white/10 h-9 rounded-xl px-3' }} 
                           />
                         </div>
                       </div>
                     </div>
                   )}
                </div>
              )}



              {/* Bottom Row: Condensed Execution Summary */}
              <div className="bg-apple-blue/5 border border-apple-blue/10 rounded-2xl p-4 flex flex-col gap-1.5 overflow-hidden">
                 <h2 className="text-[9px] uppercase font-black tracking-[0.2em] text-apple-blue-light flex items-center gap-2">
                   <BeakerIcon className="w-3.5 h-3.5" /> 调度核心预览 (PREVIEW)
                 </h2>
                 {!hasAvailableTemplates ? (
                   <p className="text-[11px] text-apple-amber">暂无可用任务模板，当前无法从资产池发起任务。</p>
                 ) : !tplDetail ? (
                   <p className="text-[11px] text-apple-text-tertiary">正在获取模板元数据...</p>
                 ) : (
                   <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                     <p className="max-w-full text-[11px] text-apple-text-secondary leading-tight sm:max-w-[70%]">{previewSummary}</p>
                     <div className="flex flex-wrap items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-white/5 sm:shrink-0">
                        {!!tplDetail.default_port_scan_mode && <Chip size="sm" variant="flat" classNames={{ base: "bg-transparent border-0 h-4", content: "text-[10px] font-mono font-black border-r border-white/10 pr-2 mr-0.5" }}>{getPortModeLabel(portMode)}</Chip>}
                        {isSiteBasedSelectedTemplate && <Chip size="sm" variant="flat" classNames={{ base: "bg-transparent border-0 h-4", content: "text-[10px] font-black" }}>站点直扫</Chip>}
                        {httpProbe && <div className="w-1.5 h-1.5 rounded-full bg-apple-green animate-pulse" title="HomePage Probe Mode On" />}
                        {allowAttackSurfaceOverrides && enableVulScan && <Chip size="sm" variant="flat" classNames={{ base: "bg-transparent border-0 h-4", content: "text-[10px] font-black pl-1" }}>漏洞扫描</Chip>}
                        {allowAttackSurfaceOverrides && enableWeakScan && <Chip size="sm" variant="flat" classNames={{ base: "bg-transparent border-0 h-4", content: "text-[10px] font-black pl-1" }}>弱点扫描</Chip>}
                        {tplDetail.supports_vul_scan && (!allowAttackSurfaceOverrides || enableVulScan) && <Chip size="sm" variant="flat" classNames={{ base: "bg-transparent border-0 h-4", content: "text-[10px] font-black pl-1" }}>等级: {vulScanSeveritySummary}</Chip>}
                     </div>
                   </div>
                 )}
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="flat" onPress={onClose} className="w-full rounded-xl px-6 font-bold text-apple-text-secondary sm:w-auto">
              取消
            </Button>
            <Button
              color="primary"
              className="w-full rounded-xl px-10 font-black shadow-lg shadow-apple-blue/20 sm:w-auto"
              isLoading={createTask.isPending}
              isDisabled={!hasAvailableTemplates || Boolean(shouldRequireVulSeverity && vulScanSeverity.length === 0)}
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
