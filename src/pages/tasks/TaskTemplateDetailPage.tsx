import { useParams, useNavigate } from 'react-router-dom'
import { Button, Spinner, Chip } from '@heroui/react'
import { ArrowLeftIcon, RocketLaunchIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

import { useTaskTemplateDetail, getPortModeLabel, isHighCostPortTemplate, getTemplatePresetBadge, FULL_PORT_WARNING } from '@/api/adapters/template'
import { useTaskRoutes, getRouteLabel } from '@/api/adapters/route'

export function TaskTemplateDetailPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { data: detail, isPending, isError } = useTaskTemplateDetail(code)
  const { data: routes } = useTaskRoutes()

  if (isPending) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Spinner size="lg" color="white" />
      </div>
    )
  }

  if (isError || !detail) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <p className="text-apple-text-tertiary">无法加载该任务模板详情</p>
        <Button variant="flat" onPress={() => navigate(-1)}>
          返回列表
        </Button>
      </div>
    )
  }

  const presetBadge = getTemplatePresetBadge(detail.code)
  const isHighCost = isHighCostPortTemplate(detail.code)

  return (
    <div className="flex flex-col gap-6 w-full text-apple-text-primary animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-[1280px] mx-auto pb-20 px-8 pt-8">
      {/* ─── 页面 Header ─── */}
      <div className="flex flex-col gap-6 sticky top-0 bg-apple-bg/80 backdrop-blur-3xl z-40 py-4 -my-4 mb-2">
        {/* 面包屑 / 返回 */}
        <div className="flex items-center gap-2">
          <Button isIconOnly variant="light" className="text-apple-text-secondary" onPress={() => navigate('/tasks/templates')}>
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 text-[12px] font-black tracking-widest uppercase text-apple-text-tertiary">
            <span>任务模板</span>
            <span>/</span>
            <span className="text-apple-text-primary">{detail.name}</span>
          </div>
        </div>

        {/* 标题 & 操作 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black tracking-tight">{detail.name}</h1>
              {presetBadge && <Chip size="sm" variant="flat" color={presetBadge.color as 'default' | 'warning'} classNames={{ base: 'text-[9px] font-black tracking-widest uppercase border-0' }}>{presetBadge.label}</Chip>}
            </div>
            <p className="text-apple-text-secondary max-w-2xl">{detail.description || '暂无描述'}</p>
          </div>
          <div className="flex gap-4">
            <Button
              color="primary"
              className="rounded-2xl h-12 px-8 font-black shadow-lg shadow-apple-blue/20"
              startContent={<RocketLaunchIcon className="w-5 h-5" />}
              onPress={() => navigate(`/tasks/new?template_code=${detail.code}`)}
              isDisabled={!detail.is_enabled}
            >
              基于此模板创建任务
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Bento Grid 布局 ─── */}
      {isHighCost && (
        <div className="mt-4 px-5 py-3 rounded-2xl bg-apple-amber/10 border border-apple-amber/20 text-[13px] text-apple-amber font-bold flex items-center gap-2">
          <span>⚠️</span> {FULL_PORT_WARNING}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        {/* 左侧主要信息 */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* 属性信息 */}
          <div className="bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-[32px] p-8">
            <h2 className="text-[10px] uppercase font-black tracking-[0.2em] text-apple-text-tertiary mb-6">基础属性</h2>
            <div className="grid grid-cols-2 gap-y-6">
              <div>
                <div className="text-[12px] text-apple-text-secondary mb-1">唯一编码</div>
                <div className="font-mono text-[14px] font-bold text-apple-text-primary">{detail.code}</div>
              </div>
              <div>
                <div className="text-[12px] text-apple-text-secondary mb-1">模板状态</div>
                <div className="flex gap-2">
                  {detail.is_enabled ? (
                    <Chip color="success" variant="flat" size="sm" startContent={<CheckCircleIcon className="w-4 h-4 ml-1" />}>已启用</Chip>
                  ) : (
                    <Chip color="danger" variant="flat" size="sm" startContent={<XCircleIcon className="w-4 h-4 ml-1" />}>已禁用</Chip>
                  )}
                  {detail.is_builtin && <Chip variant="flat" size="sm" className="bg-white/5 text-white">系统内置</Chip>}
                </div>
              </div>
            </div>
          </div>

          {/* 默认策略 */}
          <div className="bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-[32px] p-8">
            <h2 className="text-[10px] uppercase font-black tracking-[0.2em] text-apple-text-tertiary mb-6">默认扫描策略</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <div className="text-[12px] text-apple-text-secondary mb-1">默认端口模式</div>
                <div className="text-[14px] font-bold text-apple-text-primary">{getPortModeLabel(detail.default_port_scan_mode)}</div>
              </div>
              <div>
                <div className="text-[12px] text-apple-text-secondary mb-1">默认首页识别</div>
                <div className="text-[14px] font-bold text-apple-text-primary">{detail.default_http_probe_enabled ? '开启' : '关闭'}</div>
              </div>
              {detail.default_port_scan_mode === 'custom' && (
                <div className="col-span-2">
                  <div className="text-[12px] text-apple-text-secondary mb-1">默认自定义端口</div>
                  <div className="text-[14px] font-mono whitespace-pre-wrap breakdown-all">{detail.default_custom_ports || '未设置'}</div>
                </div>
              )}
              <div>
                <div className="text-[12px] text-apple-text-secondary mb-1">默认并发度</div>
                <div className="text-[14px] font-bold text-apple-text-primary">{detail.default_concurrency}</div>
              </div>
              <div>
                <div className="text-[12px] text-apple-text-secondary mb-1">默认速率</div>
                <div className="text-[14px] font-bold text-apple-text-primary">{detail.default_rate}</div>
              </div>
              <div>
                <div className="text-[12px] text-apple-text-secondary mb-1">默认超时</div>
                <div className="text-[14px] font-bold text-apple-text-primary">
                  {detail.default_timeout_ms >= 60000 
                    ? `${detail.default_timeout_ms / 1000} 秒` 
                    : `${detail.default_timeout_ms} ms`}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[12px] text-apple-text-secondary mb-2">调度阶段执行流 (默认计划)</div>
                <div className="flex flex-wrap gap-2">
                  {detail.default_stage_plan.map(stage => (
                    <span key={stage} className="bg-white/5 px-3 py-1 rounded text-[12px] font-mono tracking-tight text-apple-text-secondary border border-white/5" title={stage}>
                      {getRouteLabel(routes, stage)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧边栏信息 */}
        <div className="flex flex-col gap-6">
          {/* 执行预览 (Preview Summary) */}
          <div className="bg-apple-blue/5 border border-apple-blue/10 backdrop-blur-3xl rounded-[32px] p-8">
            <h2 className="text-[10px] uppercase font-black tracking-[0.2em] text-apple-blue-light mb-4 flex items-center gap-2">
              <RocketLaunchIcon className="w-4 h-4" />
              执行预览摘要
            </h2>
            <div className="text-[13px] leading-relaxed text-apple-text-secondary whitespace-pre-wrap">
              {detail.preview_summary || '无执行预览信息。'}
            </div>
          </div>

          {/* 允许覆盖参数列表 */}
          <div className="bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-[32px] p-8">
            <h2 className="text-[10px] uppercase font-black tracking-[0.2em] text-apple-text-tertiary mb-6">
              允许在发任务时覆盖的参数
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-apple-text-secondary">端口模式覆盖</span>
                {detail.allow_port_mode_override ? (
                  <Chip size="sm" variant="dot" color="success" className="border-0 bg-transparent text-apple-text-primary font-bold">允许覆盖</Chip>
                ) : (
                  <Chip size="sm" variant="dot" color="default" className="border-0 bg-transparent text-apple-text-tertiary">模板写死</Chip>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-apple-text-secondary">首页识别开关</span>
                {detail.allow_http_probe_override ? (
                  <Chip size="sm" variant="dot" color="success" className="border-0 bg-transparent text-apple-text-primary font-bold">允许覆盖</Chip>
                ) : (
                  <Chip size="sm" variant="dot" color="default" className="border-0 bg-transparent text-apple-text-tertiary">模板写死</Chip>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-apple-text-secondary">高级参数 (并发/超时)</span>
                {detail.allow_advanced_override ? (
                  <Chip size="sm" variant="dot" color="success" className="border-0 bg-transparent text-apple-text-primary font-bold">允许覆盖</Chip>
                ) : (
                  <Chip size="sm" variant="dot" color="default" className="border-0 bg-transparent text-apple-text-tertiary">模板写死</Chip>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
