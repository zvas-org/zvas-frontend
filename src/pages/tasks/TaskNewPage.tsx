import { Button, Input, Select, SelectItem, Textarea, RadioGroup, Radio, Switch, Chip, Spinner } from '@heroui/react'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PlusCircleIcon, FolderOpenIcon, BeakerIcon } from '@heroicons/react/24/outline'

import { useCreateTask } from '@/api/adapters/task'
import { useAssetPools } from '@/api/adapters/asset'
import { useTaskTemplates, useTaskTemplateDetail, getPortModeLabel, isHighCostPortTemplate, FULL_PORT_WARNING, VUL_SCAN_SEVERITY_OPTIONS, buildVulScanSeverityParam, formatVulScanSeverityLabels } from '@/api/adapters/template'

/** 模式 A：归并到已有资产池；模式 B：创建新资产池并启动 */
type AdHocMode = 'existing' | 'create'

export function TaskNewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedTemplateCode = searchParams.get('template_code') || ''
  const createTask = useCreateTask()

  const poolsQuery = useAssetPools({ page: 1, page_size: 100 })
  const poolItems = poolsQuery.data?.data || []

  // ── 模板驱动数据源 ───────────────────────────────────────────────
  const { data: templatesData, isPending: isLoadingTemplates } = useTaskTemplates({ page_size: 100 })
  const templates = useMemo(() => (templatesData?.data || []).filter((item) => item.is_enabled), [templatesData?.data])
  const hasAvailableTemplates = templates.length > 0

  // ── 公共字段 ──────────────────────────────────────────────────
  const [taskName, setTaskName] = useState('')
  const [templateCode, setTemplateCode] = useState(requestedTemplateCode)
  const [targets, setTargets] = useState('')
  const [adHocMode, setAdHocMode] = useState<AdHocMode>('existing')

  useEffect(() => {
    if (templates.length === 0) {
      if (templateCode) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTemplateCode('')
      }
      return
    }
    if (templateCode && templates.some((item) => item.code === templateCode)) {
      return
    }
    if (requestedTemplateCode && templates.some((item) => item.code === requestedTemplateCode)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTemplateCode(requestedTemplateCode)
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTemplateCode(templates[0].code)
  }, [requestedTemplateCode, templateCode, templates])

  const { data: tplDetail, isPending: isLoadingTpl } = useTaskTemplateDetail(templateCode)

  // ── 模板覆盖参数 (Overrides) ───────────────────────────────────
  const [portMode, setPortMode] = useState('')
  const [httpProbe, setHttpProbe] = useState(false)
  const [concurrency, setConcurrency] = useState<number | ''>('')
  const [rate, setRate] = useState<number | ''>('')
  const [timeoutMs, setTimeoutMs] = useState<number | ''>('')
  const [vulScanSeverity, setVulScanSeverity] = useState<string[]>([])

  // 模板切换时，重置默认值
  useEffect(() => {
    if (tplDetail) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPortMode(tplDetail.default_port_scan_mode)
      setHttpProbe(tplDetail.default_http_probe_enabled)
      setConcurrency(tplDetail.default_concurrency)
      setRate(tplDetail.default_rate)
      setTimeoutMs(tplDetail.default_timeout_ms)
      setVulScanSeverity(tplDetail.supports_vul_scan ? tplDetail.default_vul_scan_severity : [])
    }
  }, [tplDetail])

  const vulScanSeveritySummary = useMemo(() => formatVulScanSeverityLabels(vulScanSeverity), [vulScanSeverity])

  // ── 模式 A：归并到已有资产池 ──────────────────────────────────
  const [existingPoolId, setExistingPoolId] = useState('')

  // ── 模式 B：创建新资产池 ──────────────────────────────────────
  const [newPoolName, setNewPoolName] = useState('')
  const [newPoolDesc, setNewPoolDesc] = useState('')
  const [newPoolTags, setNewPoolTags] = useState('')

  const isValid = () => {
    if (!taskName.trim()) return false
    if (!targets.trim()) return false
    if (!hasAvailableTemplates) return false
    if (!templateCode) return false
    if (adHocMode === 'existing' && !existingPoolId) return false
    if (adHocMode === 'create' && !newPoolName.trim()) return false
    if (tplDetail?.supports_vul_scan && vulScanSeverity.length === 0) return false
    return true
  }

  const handleSubmit = () => {
    if (!hasAvailableTemplates || !templateCode) return
    const items = targets.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
    const tags = newPoolTags
      .split(/[\n,，]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    // 构建待覆盖 template_overrides
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
    if (tplDetail?.supports_vul_scan) {
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
        mode: 'ad_hoc',
        name: taskName.trim(),
        template_code: templateCode,
        asset_pool:
          adHocMode === 'existing'
            ? { mode: 'existing', asset_pool_id: existingPoolId }
            : { mode: 'create', name: newPoolName.trim(), description: newPoolDesc.trim() || undefined, tags: tags.length > 0 ? tags : undefined },
        input: { source: 'manual', items },
        template_overrides: Object.keys(templateOverrides).length > 0 ? templateOverrides : undefined,
        params: Object.keys(params).length > 0 ? params : undefined,
      },
      {
        onSuccess: (res) => {
          navigate(`/tasks/${res.task_id}`)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-8 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[860px] mx-auto pb-20 p-4 md:p-8">

      {/* ─── 模式选择 ── */}
      <div className="bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-[28px] p-6">
        <p className="text-[10px] text-apple-text-tertiary uppercase tracking-[0.2em] font-black mb-4">任务来源</p>
        <RadioGroup
          value={adHocMode}
          onValueChange={(v) => setAdHocMode(v as AdHocMode)}
          classNames={{ wrapper: 'gap-4' }}
        >
          <div
            onClick={() => setAdHocMode('existing')}
            className={`flex items-start gap-4 cursor-pointer p-4 rounded-[20px] border transition-all ${
              adHocMode === 'existing'
                ? 'border-apple-blue/40 bg-apple-blue/5'
                : 'border-white/5 hover:border-white/15 bg-white/[0.02]'
            }`}
          >
            <FolderOpenIcon className={`w-7 h-7 mt-0.5 flex-shrink-0 ${adHocMode === 'existing' ? 'text-apple-blue-light' : 'text-apple-text-tertiary'}`} />
            <div>
              <div className="text-[14px] font-black text-white mb-0.5">归并到已有资产池</div>
              <div className="text-[12px] text-apple-text-tertiary font-medium">本次扫描目标将作为临时任务关联到已有资产池，发现的资产会归并进该池。</div>
            </div>
            <Radio value="existing" className="ml-auto" />
          </div>
          <div
            onClick={() => setAdHocMode('create')}
            className={`flex items-start gap-4 cursor-pointer p-4 rounded-[20px] border transition-all ${
              adHocMode === 'create'
                ? 'border-apple-blue/40 bg-apple-blue/5'
                : 'border-white/5 hover:border-white/15 bg-white/[0.02]'
            }`}
          >
            <PlusCircleIcon className={`w-7 h-7 mt-0.5 flex-shrink-0 ${adHocMode === 'create' ? 'text-apple-blue-light' : 'text-apple-text-tertiary'}`} />
            <div>
              <div className="text-[14px] font-black text-white mb-0.5">同时创建新资产池</div>
              <div className="text-[12px] text-apple-text-tertiary font-medium">系统将自动建立一个新资产池，并将本次扫描目标及发现资产归入其中。</div>
            </div>
            <Radio value="create" className="ml-auto" />
          </div>
        </RadioGroup>
      </div>

      {/* ─── 任务基础字段 ── */}
      <div className="bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-[28px] p-6 flex flex-col gap-5">
        <p className="text-[10px] text-apple-text-tertiary uppercase tracking-[0.2em] font-black mb-1">任务配置</p>

        <div className="flex flex-col gap-1.5">
          <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">任务名称</label>
          <Input
            variant="flat"
            placeholder="为本次扫描任务起个名字"
            value={taskName}
            onValueChange={setTaskName}
            classNames={{ inputWrapper: 'bg-white/5 border border-white/10 h-12 rounded-[16px]' }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">扫描模板</label>
          <div className="flex items-center gap-4">
            <Select
              variant="flat"
              aria-label="扫描模板"
              isLoading={isLoadingTemplates}
              isDisabled={!hasAvailableTemplates}
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
          {!hasAvailableTemplates && <p className="text-[12px] text-apple-amber font-bold">暂无可用任务模板，请先在模板管理中启用模板。</p>}
        </div>

        {/* 覆盖参数区 */}
        {(tplDetail?.allow_port_mode_override || tplDetail?.allow_http_probe_override || tplDetail?.allow_advanced_override || tplDetail?.supports_vul_scan) && (
          <div className="flex flex-col gap-5 mt-4 pt-4 border-t border-white/5">
             <p className="text-[10px] text-apple-text-tertiary uppercase tracking-[0.2em] font-black">模板高级控制</p>
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
             {tplDetail.supports_vul_scan && (
               <div className="flex flex-col gap-2 mt-2">
                 <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">漏洞等级 (覆盖)</label>
                 <Select
                   selectionMode="multiple"
                   variant="flat"
                   selectedKeys={new Set(vulScanSeverity)}
                   onSelectionChange={(keys) => setVulScanSeverity(keys === 'all' ? VUL_SCAN_SEVERITY_OPTIONS.map((item) => item.value) : Array.from(keys) as string[])}
                   placeholder="请选择漏洞等级"
                   classNames={{ trigger: 'bg-white/5 border border-white/10 min-h-12 rounded-[16px] pr-10', value: 'text-sm text-apple-text-primary' }}
                 >
                   {VUL_SCAN_SEVERITY_OPTIONS.map((item) => (
                     <SelectItem key={item.value} textValue={item.label}>{item.label}</SelectItem>
                   ))}
                 </Select>
                 <p className="text-[11px] text-apple-text-tertiary">模板默认：{formatVulScanSeverityLabels(tplDetail.default_vul_scan_severity)}</p>
                 {vulScanSeverity.length === 0 && <p className="text-[11px] text-apple-red-light font-bold">至少选择一个漏洞等级</p>}
               </div>
             )}
             {tplDetail.allow_advanced_override && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
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

      </div>

      {/* ─── 模式 A：选择已有资产池 ── */}
      {adHocMode === 'existing' && (
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-[28px] p-6 flex flex-col gap-5 animate-in fade-in duration-300">
          <p className="text-[10px] text-apple-text-tertiary uppercase tracking-[0.2em] font-black mb-1">归并到哪个资产池</p>
          <Select
            variant="flat"
            aria-label="选择资产池"
            placeholder="请选择一个资产池"
            selectedKeys={existingPoolId ? [existingPoolId] : []}
            onChange={(e) => setExistingPoolId(e.target.value)}
            classNames={{ trigger: 'bg-white/5 border border-white/10 h-12 pr-10 rounded-[16px]', value: 'truncate' }}
          >
            {poolItems.map((p) => (
              <SelectItem key={p.id} textValue={p.name}>
                {p.name}
              </SelectItem>
            ))}
          </Select>
        </div>
      )}

      {/* ─── 模式 B：创建新资产池配置 ── */}
      {adHocMode === 'create' && (
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-[28px] p-6 flex flex-col gap-5 animate-in fade-in duration-300">
          <p className="text-[10px] text-apple-text-tertiary uppercase tracking-[0.2em] font-black mb-1">新资产池信息</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">资产池名称</label>
            <Input
              variant="flat"
              placeholder="如：2024-Q1 某单位外网"
              value={newPoolName}
              onValueChange={setNewPoolName}
              classNames={{ inputWrapper: 'bg-white/5 border border-white/10 h-12 rounded-[16px]' }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">描述 <span className="text-apple-text-tertiary font-medium">(可选)</span></label>
            <Input
              variant="flat"
              placeholder="一句话说明资产池用途"
              value={newPoolDesc}
              onValueChange={setNewPoolDesc}
              classNames={{ inputWrapper: 'bg-white/5 border border-white/10 h-12 rounded-[16px]' }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-apple-text-secondary text-[10px] font-black uppercase tracking-[0.2em]">标签 <span className="text-apple-text-tertiary font-medium">(可选，逗号分隔)</span></label>
            <Input
              variant="flat"
              placeholder="external, temp, 2024"
              value={newPoolTags}
              onValueChange={setNewPoolTags}
              classNames={{ inputWrapper: 'bg-white/5 border border-white/10 h-12 rounded-[16px]' }}
            />
          </div>
        </div>
      )}

      {/* ─── 本次扫描目标 ── */}
      <div className="bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-[28px] p-6 flex flex-col gap-5">
        <p className="text-[10px] text-apple-text-tertiary uppercase tracking-[0.2em] font-black mb-1">本次扫描目标</p>
        <p className="text-[12px] text-apple-text-tertiary">
          每行一个目标，支持 IP / CIDR / 域名 / URL，也可以用逗号分隔。
        </p>
        <Textarea
          variant="flat"
          placeholder={'example.com\n192.0.2.0/24\nhttps://demo.site.com'}
          minRows={5}
          value={targets}
          onValueChange={setTargets}
          classNames={{ inputWrapper: 'bg-white/5 border border-white/10 rounded-[16px]' }}
        />
      </div>

      {/* ─── 提交区 ── */}
      <div className="bg-apple-blue/5 border border-apple-blue/10 backdrop-blur-3xl rounded-[28px] p-6 mb-4 flex flex-col gap-4">
         <h2 className="text-[10px] uppercase font-black tracking-[0.2em] text-apple-blue-light flex items-center gap-2">
           <BeakerIcon className="w-4 h-4" /> 执行预览
         </h2>
         {!hasAvailableTemplates ? (
           <p className="text-[12px] text-apple-amber">暂无可用任务模板，当前无法创建任务。</p>
         ) : !tplDetail ? (
           <p className="text-[12px] text-apple-text-tertiary">正在拉取模板评述...</p>
         ) : (
           <div className="flex flex-col gap-3">
             <p className="text-[13px] text-apple-text-secondary leading-relaxed">{tplDetail.preview_summary || '未定义模板细节行为。'}</p>
             <div className="flex gap-2 flex-wrap">
                <Chip size="sm" variant="flat" className="bg-white/5 border-white/10 text-white font-mono h-6">{getPortModeLabel(portMode)}</Chip>
                {httpProbe && <Chip size="sm" variant="flat" className="bg-white/5 border-white/10 text-white font-mono h-6">http probe enabled</Chip>}
                {tplDetail.supports_vul_scan && <Chip size="sm" variant="flat" className="bg-white/5 border-white/10 text-white h-6">漏洞等级: {vulScanSeveritySummary}</Chip>}
             </div>
           </div>
         )}
      </div>

      <div className="flex justify-end gap-4">
        <Button
          variant="flat"
          className="h-14 rounded-2xl px-8 font-bold text-apple-text-secondary border border-white/5"
          onPress={() => navigate(-1)}
        >
          取消
        </Button>
        <Button
          color="primary"
          className="h-14 rounded-2xl px-12 font-black shadow-2xl shadow-apple-blue/20"
          isLoading={createTask.isPending}
          isDisabled={!isValid()}
          onPress={handleSubmit}
        >
          发起扫描任务
        </Button>
      </div>
    </div>
  )
}
