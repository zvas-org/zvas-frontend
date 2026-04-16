import { type MouseEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, CardBody, CardHeader, Chip, Input, Spinner } from '@heroui/react'
import { DocumentDuplicateIcon, MagnifyingGlassIcon, RocketLaunchIcon } from '@heroicons/react/24/outline'

import { getPortModeLabel, getTemplatePresetBadge, isHighCostPortTemplate, useTaskTemplates, useUpdateTaskTemplateStatus } from '@/api/adapters/template'
import { useAuthStore } from '@/store/auth'

export function TaskTemplatesPage() {
  const [keyword, setKeyword] = useState('')
  const [pendingCode, setPendingCode] = useState('')
  const currentUser = useAuthStore((state) => state.currentUser)
  const canManageTemplates = Boolean(currentUser?.permissions?.includes('settings:manage'))
  const { data: qData, isPending } = useTaskTemplates()
  const updateStatus = useUpdateTaskTemplateStatus()

  const rawTemplates = qData?.data || []
  const templates = keyword.trim()
    ? rawTemplates.filter((item) => {
        const needle = keyword.toLowerCase().trim()
        return item.name.toLowerCase().includes(needle) || item.code.toLowerCase().includes(needle) || item.description.toLowerCase().includes(needle)
      })
    : rawTemplates

  const handleToggle = (event: MouseEvent, code: string, enabled: boolean) => {
    event.preventDefault()
    event.stopPropagation()
    setPendingCode(code)
    updateStatus.mutate(
      { code, enabled },
      { onSettled: () => setPendingCode('') },
    )
  }

  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-6 mx-auto pb-20 p-8 pt-4 text-apple-text-primary animate-in fade-in duration-1000">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <DocumentDuplicateIcon className="w-8 h-8 text-apple-text-secondary" />
          任务执行模板
        </h1>
        <p className="text-[14px] text-apple-text-secondary">系统提供了预置扫描模板，用于固化检测场景的最佳实践与默认参数体系。</p>
        <div className="flex items-center gap-4 mt-2">
          <Input
            classNames={{
              base: 'w-full max-w-[320px]',
              inputWrapper: 'bg-white/5 border border-white/10 hover:bg-white/10 focus-within:bg-white/10 focus-within:border-apple-blue/50 transition-colors rounded-[16px] h-12',
            }}
            placeholder="搜索模板名称 / 编码..."
            startContent={<MagnifyingGlassIcon className="w-5 h-5 text-white/40" />}
            value={keyword}
            onValueChange={setKeyword}
          />
        </div>
        {updateStatus.isError && <p className="text-[12px] text-apple-red-light">{updateStatus.error instanceof Error ? updateStatus.error.message : '模板状态更新失败'}</p>}
      </div>

      {isPending ? (
        <div className="flex py-20 items-center justify-center"><Spinner color="white" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {templates.map((tpl) => {
            const badge = getTemplatePresetBadge(tpl.code)
            const isToggling = pendingCode === tpl.code && updateStatus.isPending
            return (
              <Link to={`/tasks/templates/${tpl.code}`} key={tpl.code} className="group">
                <Card className="bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-[28px] overflow-visible hover:border-white/10 transition-all cursor-pointer h-full" shadow="sm">
                  <CardHeader className="flex flex-col items-start gap-3 p-6 pb-2">
                    <div className="flex justify-between w-full items-start gap-3">
                      <div>
                        <h3 className="text-lg font-black tracking-tight group-hover:text-apple-blue-light transition-colors">{tpl.name}</h3>
                        <div className="font-mono text-[11px] text-apple-text-tertiary mt-1">{tpl.code}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {badge ? <Chip size="sm" variant="flat" color={badge.color as 'default' | 'warning'} classNames={{ base: 'text-[9px] font-black tracking-widest uppercase border-0' }}>{badge.label}</Chip> : null}
                        {tpl.is_builtin && <Chip size="sm" variant="flat" className="bg-white/5 text-[10px] font-black tracking-widest uppercase">默认预置</Chip>}
                        <Chip size="sm" variant="flat" color={tpl.is_enabled ? 'success' : 'danger'} classNames={{ base: 'text-[10px] font-black tracking-widest uppercase border-0' }}>
                          {tpl.is_enabled ? '已启用' : '已禁用'}
                        </Chip>
                      </div>
                    </div>
                    {canManageTemplates && (
                      <div className="flex w-full justify-end">
                        <Button
                          size="sm"
                          variant="flat"
                          color={tpl.is_enabled ? 'danger' : 'success'}
                          isLoading={isToggling}
                          onClick={(event) => handleToggle(event, tpl.code, !tpl.is_enabled)}
                          className="rounded-xl px-4 font-bold"
                        >
                          {tpl.is_enabled ? '禁用模板' : '启用模板'}
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardBody className="p-6 pt-2 flex flex-col justify-between flex-grow">
                    <div>
                      <p className="text-[13px] text-apple-text-secondary leading-relaxed line-clamp-3 mb-4">{tpl.description || '暂无描述信息'}</p>
                      {isHighCostPortTemplate(tpl.code) && (
                        <div className="mb-4 px-3 py-2 rounded-xl bg-apple-amber/10 border border-apple-amber/20 text-[11px] text-apple-amber font-bold flex items-center gap-1.5">
                          <span>⚠</span> 全端口 · 耗时高 · 资源占用高
                        </div>
                      )}
                      <div className="flex flex-col gap-2 bg-black/20 rounded-xl p-4 border border-white/5">
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[11px] text-apple-text-tertiary">端口模式</span>
                          <span className="text-[12px] font-bold text-apple-text-primary text-right">{getPortModeLabel(tpl.default_port_scan_mode)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[11px] text-apple-text-tertiary">并发/速率/超时</span>
                          <span className="text-[12px] font-bold text-apple-text-primary text-right">{tpl.default_concurrency} / {tpl.default_rate} / {tpl.default_timeout_ms}ms</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                      <span className="text-[12px] text-apple-blue-light font-bold flex items-center gap-1">
                        <RocketLaunchIcon className="w-4 h-4" /> 查看详情与配置
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            )
          })}
          {templates.length === 0 && <div className="col-span-1 md:col-span-2 lg:col-span-3 py-20 text-center text-apple-text-tertiary font-medium">无匹配的任务模板</div>}
        </div>
      )}
    </div>
  )
}
