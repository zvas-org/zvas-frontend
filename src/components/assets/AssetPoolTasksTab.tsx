import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Chip, Pagination, Skeleton } from '@heroui/react'
import { 
  RocketLaunchIcon, 
  BoltIcon, 
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { PauseIcon, PlayIcon, StopIcon } from '@heroicons/react/24/solid'

import { CreateTaskFromPoolModal } from '@/components/assets/CreateTaskFromPoolModal'
import { useAssetPoolTasks } from '@/api/adapters/asset'
import { usePauseTask, useResumeTask, useStopTask, getTaskStatusInfo, getActiveGroupLabel } from '@/api/adapters/task'
import { useTaskRoutes, mapStageLabels } from '@/api/adapters/route'

function formatTime(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function AssetPoolTasksTab({ poolId }: { poolId: string }) {
  const navigate = useNavigate()
  const [createVisible, setCreateVisible] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useAssetPoolTasks(poolId, {
    page,
    page_size: 10,
    sort: 'updated_at',
    order: 'desc',
  })

  const pauseTask = usePauseTask()
  const resumeTask = useResumeTask()
  const stopTask = useStopTask()

  // 统一路由配置（stage 翻译）
  const { data: routes } = useTaskRoutes()

  const items = data?.data || []
  const pagination = data?.pagination
  const totalPages = useMemo(() => {
    if (!pagination?.total || !pagination?.page_size) return 1
    return Math.max(1, Math.ceil(pagination.total / pagination.page_size))
  }, [pagination])

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4">
        <div className="flex flex-col">
          <h3 className="text-xl font-black text-white tracking-tight mb-1 flex items-center gap-2">
            <BoltIcon className="w-6 h-6 text-apple-blue-light drop-shadow-[0_0_8px_rgba(0,113,227,0.5)]" />
            <span>靶向扫描任务线</span>
          </h3>
          <p className="text-[13px] text-apple-text-tertiary font-medium">查看基于当前资产池范围下发的全局任务，或直接发起新的探测调度流。</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="flat"
            isIconOnly
            className="h-12 w-12 rounded-[16px] bg-apple-tertiary-bg/10 border border-white/5 backdrop-blur-md"
            onPress={() => refetch()}
          >
            <ArrowPathIcon className="w-5 h-5 text-apple-text-secondary" />
          </Button>
          <Button
            variant="flat"
            onPress={() => navigate(`/tasks?asset_pool_id=${poolId}`)}
            className="h-12 rounded-[16px] px-6 bg-white/5 border border-white/5 text-apple-text-tertiary font-bold backdrop-blur-md hover:bg-white/10 transition-colors"
          >
            全局控制台视图
          </Button>
          <Button
            color="primary"
            variant="shadow"
            onPress={() => setCreateVisible(true)}
            className="h-12 rounded-[16px] px-6 font-bold shadow-apple-blue/30 bg-apple-blue"
          >
            <RocketLaunchIcon className="w-5 h-5 text-white" />
            <span className="text-white">由此下发新任务</span>
          </Button>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-x-auto scrollbar-hide md:scrollbar-default custom-scrollbar">
        <div className="min-w-[1000px]">
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1.2fr_1.2fr_130px] gap-4 px-6 h-14 items-center text-[10px] font-black tracking-[0.2em] uppercase text-apple-text-tertiary border-b border-white/5">
            <span>任务标识</span>
            <span>挂载模板序列</span>
            <span>流状态</span>
            <span>执行阶段进度</span>
            <span>时效</span>
            <span className="text-right">管控</span>
          </div>

          {isLoading && (
            <div className="p-4">
               <Skeleton className="h-40 w-full rounded-[24px] bg-white/5" />
            </div>
          )}

          {!isLoading && isError && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <p className="text-[13px] font-bold text-apple-red-light tracking-widest uppercase">ERR_FETCH_TASKS</p>
              <p className="text-[11px] text-apple-text-tertiary">调度网关读取失败，请检查网络或重试。</p>
              <Button size="sm" variant="flat" onPress={() => refetch()} className="mt-2 bg-white/5 font-bold">RELOAD</Button>
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <RocketLaunchIcon className="w-12 h-12 text-apple-blue-light opacity-30 drop-shadow-[0_0_12px_rgba(0,113,227,0.5)]" />
              <p className="text-[13px] font-black tracking-[0.1em] text-white uppercase">NULL_TARGETED_TASKS</p>
              <p className="text-[12px] text-apple-text-tertiary max-w-sm font-medium">当前资产池未关联任何存量扫描或探测任务，立刻创建以启动防护检查。</p>
              <Button color="primary" variant="flat" onPress={() => setCreateVisible(true)} className="mt-2 font-black rounded-xl">
                INITIATE TASK
              </Button>
            </div>
          )}

          {!isLoading && !isError && items.length > 0 && (
            <div className="flex flex-col">
              {items.map((item) => {
                const statusInfo = getTaskStatusInfo(item.status, item.desired_state)
                
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[2fr_1.5fr_1fr_1.2fr_1.2fr_130px] gap-4 px-6 py-5 items-center border-b border-white/5 hover:bg-white/[0.03] transition-colors leading-tight"
                  >
                    <div className="flex flex-col gap-1 overflow-hidden font-medium">
                      <span className="font-bold text-[14px] text-white truncate tracking-tight">{item.name || item.id}</span>
                      <span className="text-[11px] font-mono text-apple-text-secondary truncate">{item.id}</span>
                    </div>
                    <div className="flex flex-col gap-1 overflow-hidden font-medium">
                      <span className="text-[13px] font-bold text-white truncate">{item.template_name || item.template_code}</span>
                      <span className="text-[11px] font-mono text-apple-text-secondary truncate">TPL_{item.template_code}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <Chip size="sm" variant="flat" color={statusInfo.color} classNames={{ base: "border-0 font-black tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-md" }}>
                        {statusInfo.label}
                      </Chip>
                      {item.active_group && (
                        <span className="text-[9px] text-apple-blue-light font-bold pl-0.5">{getActiveGroupLabel(item.active_group)}</span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold tracking-widest text-apple-text-secondary uppercase truncate">
                      {item.stage_plan ? mapStageLabels(routes, item.stage_plan).join(' • ') : '—'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-apple-text-secondary font-mono tracking-tighter uppercase">{formatTime(item.updated_at).split(' ')[0]}</span>
                      <span className="text-[11px] font-semibold text-apple-text-tertiary font-mono tracking-tighter opacity-60">{formatTime(item.updated_at).split(' ')[1]}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                       {/* 交互控制组 */}
                       <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                          {statusInfo.canPause && (
                            <Button isIconOnly size="sm" variant="light" className="h-7 w-7 min-w-0 text-apple-warning hover:bg-apple-warning/20" onPress={() => pauseTask.mutate(item.id)}>
                              <PauseIcon className="w-4 h-4" />
                            </Button>
                          )}
                          {statusInfo.canResume && (
                            <Button isIconOnly size="sm" variant="light" className="h-7 w-7 min-w-0 text-apple-green hover:bg-apple-green/20" onPress={() => resumeTask.mutate(item.id)}>
                              <PlayIcon className="w-4 h-4" />
                            </Button>
                          )}
                          {statusInfo.canStop && (
                            <Button isIconOnly size="sm" variant="light" className="h-7 w-7 min-w-0 text-apple-red hover:bg-apple-red/20" onPress={() => stopTask.mutate(item.id)}>
                              <StopIcon className="w-4 h-4" />
                            </Button>
                          )}
                       </div>
                      
                      <Button
                        size="sm"
                        variant="bordered"
                        onPress={() => navigate(`/tasks/${item.id}`)}
                        className="border-white/10 text-white font-bold rounded-lg h-7 min-w-0 px-2.5 text-[11px]"
                      >
                        详情
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!isLoading && !isError && items.length > 0 && (
            <div className="flex justify-between items-center px-6 py-5 bg-white/[0.01]">
              <span className="text-[10px] uppercase font-black tracking-[0.2em] text-apple-text-tertiary">合计任务流 <span className="text-white mx-1">{pagination?.total ?? items.length}</span> 项</span>
              {totalPages > 1 && (
                <Pagination 
                  size="sm" 
                  page={page} 
                  total={totalPages} 
                  onChange={setPage} 
                  classNames={{ 
                    wrapper: "gap-2",
                    item: "bg-white/5 text-apple-text-secondary font-bold rounded-xl border border-white/5 hover:bg-white/10 transition-all min-w-[32px] h-8 text-[12px]",
                    cursor: "bg-apple-blue font-black rounded-xl shadow-lg shadow-apple-blue/30 text-white",
                    prev: "bg-white/5 text-white/50 rounded-xl hover:bg-white/10",
                    next: "bg-white/5 text-white/50 rounded-xl hover:bg-white/10",
                  }} 
                />
              )}
            </div>
          )}
        </div>
      </div>

      <CreateTaskFromPoolModal isOpen={createVisible} onClose={() => setCreateVisible(false)} poolId={poolId} />
    </div>
  )
}
