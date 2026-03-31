import { Link } from 'react-router-dom'
import { Card, CardBody, CardHeader, Chip, Input, Spinner } from '@heroui/react'
import { DocumentDuplicateIcon, MagnifyingGlassIcon, RocketLaunchIcon } from '@heroicons/react/24/outline'

import { useTaskTemplates, getPortModeLabel, isHighCostPortTemplate, getTemplatePresetBadge } from '@/api/adapters/template'
import { useState } from 'react'

export function TaskTemplatesPage() {
  const [keyword, setKeyword] = useState('')
  const { data: qData, isPending } = useTaskTemplates()
  
  const rawTemplates = qData?.data || []
  const templates = keyword.trim()
    ? rawTemplates.filter(t => 
        t.name.toLowerCase().includes(keyword.toLowerCase().trim()) || 
        t.code.toLowerCase().includes(keyword.toLowerCase().trim()) ||
        t.description.toLowerCase().includes(keyword.toLowerCase().trim())
      )
    : rawTemplates

  return (
    <div className="flex flex-col gap-6 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20 p-8 pt-4">
      {/* ─── 页面 Header ─── */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <DocumentDuplicateIcon className="w-8 h-8 text-apple-text-secondary" />
          任务引擎驱动模版
        </h1>
        <p className="text-[14px] text-apple-text-secondary">
          系统提供了预置扫描模版，用以固化检测场景的最佳实践与默认参数体系。
        </p>

        {/* 搜索/过滤条 */}
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
      </div>

      {isPending ? (
          <div className="flex py-20 items-center justify-center"><Spinner color="white" /></div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {templates.map(tpl => (
              <Link to={`/tasks/templates/${tpl.code}`} key={tpl.code} className="group">
                <Card 
                  className="bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-[28px] overflow-visible hover:border-white/10 transition-all cursor-pointer h-full"
                  shadow="sm"
                >
                  <CardHeader className="flex flex-col items-start gap-2 p-6 pb-2">
                    <div className="flex justify-between w-full items-start">
                       <h3 className="text-lg font-black tracking-tight group-hover:text-apple-blue-light transition-colors">{tpl.name}</h3>
                       <div className="flex items-center gap-1.5">
                         {(() => { const badge = getTemplatePresetBadge(tpl.code); return badge ? <Chip size="sm" variant="flat" color={badge.color as 'default' | 'warning'} classNames={{ base: 'text-[9px] font-black tracking-widest uppercase border-0' }}>{badge.label}</Chip> : null })()}
                         {tpl.is_builtin && <Chip size="sm" variant="flat" className="bg-white/5 text-[10px] font-black tracking-widest uppercase">默认预置</Chip>}
                       </div>
                    </div>
                    <div className="font-mono text-[11px] text-apple-text-tertiary">{tpl.code}</div>
                  </CardHeader>
                  <CardBody className="p-6 pt-2 flex flex-col justify-between flex-grow">
                     <div>
                       <p className="text-[13px] text-apple-text-secondary leading-relaxed line-clamp-3 mb-4">
                         {tpl.description || '暂无描述信息'}
                       </p>
                       {isHighCostPortTemplate(tpl.code) && (
                         <div className="mb-4 px-3 py-2 rounded-xl bg-apple-amber/10 border border-apple-amber/20 text-[11px] text-apple-amber font-bold flex items-center gap-1.5">
                           <span>⚠</span> 全端口 · 耗时高 · 资源占用高
                         </div>
                       )}
                       <div className="flex flex-col gap-2 bg-black/20 rounded-xl p-4 border border-white/5">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-apple-text-tertiary">端口模式</span>
                            <span className="text-[12px] font-bold text-apple-text-primary">{getPortModeLabel(tpl.default_port_scan_mode)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-apple-text-tertiary">并发/速率/超时</span>
                            <span className="text-[12px] font-bold text-apple-text-primary">{tpl.default_concurrency} / {tpl.default_rate} / {tpl.default_timeout_ms}ms</span>
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
            ))}
            {templates.length === 0 && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 py-20 text-center text-apple-text-tertiary font-medium">无匹配的任务模板</div>
            )}
         </div>
      )}
    </div>
  )
}
