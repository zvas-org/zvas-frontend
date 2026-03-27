import {
  Button,
  Input,
  Select,
  SelectItem,
  Skeleton,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Chip,
} from '@heroui/react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

import { useTasks, usePauseTask, useResumeTask, useStopTask, getTaskStatusInfo, getActiveGroupLabel, getBlockedReasonLabel } from '@/api/adapters/task'
import { useAssetPools } from '@/api/adapters/asset'
import { useTaskRoutes } from '@/api/adapters/route'
import { PauseIcon, PlayIcon, StopIcon } from '@heroicons/react/24/solid'

function formatDateTime(isoStr?: string) {
  if (!isoStr) return '-'
  return new Date(isoStr).toLocaleString()
}

export function TasksPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  
  const [keyword, setKeyword] = useState('')
  // Read initial filter from URL if jump from asset pool details
  const [poolFilter, setPoolFilter] = useState(searchParams.get('asset_pool_id') || 'all')
  const [templateFilter, setTemplateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const tasksQuery = useTasks({
    page,
    page_size: pageSize,
    keyword: keyword || undefined,
    asset_pool_id: poolFilter === 'all' ? undefined : poolFilter,
    template_code: templateFilter === 'all' ? undefined : templateFilter,
    status: statusFilter === 'all' ? undefined : statusFilter
  })

  const pauseTask = usePauseTask()
  const resumeTask = useResumeTask()
  const stopTask = useStopTask()

  // 统一路由配置（模板筛选下拉）
  const { data: routesData } = useTaskRoutes()

  // To map pool id to names in dropdown
  const poolsQuery = useAssetPools({ page: 1, page_size: 100 })
  const poolItems = poolsQuery.data?.data || []

  const items = tasksQuery.data?.data || []
  const total = tasksQuery.data?.pagination?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col gap-6 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20 p-4">


      {/* 搜索与控制面板 */}
      <section className="flex flex-col md:flex-row items-center gap-4 w-full bg-white/[0.02] border border-white/5 p-4 rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
          <Input
            isClearable
            value={keyword}
            placeholder="搜索任务名称..."
            onValueChange={(val) => { setKeyword(val); setPage(1) }}
            variant="flat"
            startContent={<MagnifyingGlassIcon className="w-5 h-5 text-apple-text-tertiary" />}
            classNames={{ inputWrapper: "bg-white/5 border border-white/10 h-10", input: "text-sm" }}
          />
          <Select
            aria-label="资产池筛选"
            selectedKeys={new Set([poolFilter])}
            onChange={(e) => { setPoolFilter(e.target.value || 'all'); setPage(1) }}
            classNames={{ trigger: "bg-white/5 border border-white/10 h-10 pr-10", value: "truncate text-ellipsis" }}
          >
            {[
               { id: 'all', name: '全源资产池 (所有)' },
               ...poolItems
             ].map((p, idx) => (
               <SelectItem key={p.id || p.name || `pool-${idx}`} textValue={p.name || 'Untitled'}>
                 {p.name || 'Untitled'}
               </SelectItem>
            ))}
          </Select>
          <Select
            aria-label="模板筛选"
            selectedKeys={new Set([templateFilter])}
            onChange={(e) => { setTemplateFilter(e.target.value || 'all'); setPage(1) }}
            classNames={{ trigger: "bg-white/5 border border-white/10 h-10 pr-10", value: "truncate text-ellipsis" }}
            items={[{ key: 'all', label: '所有执行模板' }, ...(routesData || []).map(r => ({ key: r.key, label: r.label }))]}
          >
            {(item) => <SelectItem key={item.key} textValue={item.label}>{item.label}</SelectItem>}
          </Select>
          <Select
            aria-label="状态筛选"
            selectedKeys={new Set([statusFilter])}
            onChange={(e) => { setStatusFilter(e.target.value || 'all'); setPage(1) }}
             classNames={{ trigger: "bg-white/5 border border-white/10 h-10 pr-10", value: "truncate text-ellipsis" }}
          >
            <SelectItem key="all" textValue="任何状态流">任何状态流</SelectItem>
            <SelectItem key="draft" textValue="草稿 (draft)">草稿 (draft)</SelectItem>
            <SelectItem key="queued" textValue="已投入队列 (queued)">已投入队列 (queued)</SelectItem>
            <SelectItem key="running" textValue="执行中 (running)">执行中 (running)</SelectItem>
            <SelectItem key="succeeded" textValue="成功收口 (succeeded)">成功收口 (succeeded)</SelectItem>
            <SelectItem key="failed" textValue="阻断或失败 (failed)">阻断或失败 (failed)</SelectItem>
            <SelectItem key="stopped" textValue="人为终止 (stopped)">人为终止 (stopped)</SelectItem>
          </Select>
        </div>
        <Button
            variant="flat"
            isIconOnly
            className="h-10 w-10 min-w-[40px] rounded-lg bg-white/5 border border-white/10 ml-0 md:ml-auto"
            onPress={() => tasksQuery.refetch()}
          >
           <ArrowPathIcon className="w-5 h-5 text-apple-text-secondary" />
        </Button>
      </section>

      {/* 列表区 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-x-auto">
        <Table
          aria-label="Tasks table"
          layout="fixed"
          removeWrapper
          classNames={{
            base: "min-w-[1200px]",
            table: "table-fixed",
            th: "bg-white/5 text-apple-text-secondary uppercase text-xs tracking-wider font-semibold border-b border-white/10 py-3",
            td: "py-4 border-b border-white/5 last:border-0",
            tr: "hover:bg-white/[0.04] transition-colors"
          }}
        >
          <TableHeader>
            <TableColumn width={220}>任务名</TableColumn>
            <TableColumn width={160}>依赖模板</TableColumn>
            <TableColumn width={200}>归属资产池及目标</TableColumn>
            <TableColumn width={120}>当前状态</TableColumn>
            <TableColumn width={140}>阶段挂载计划</TableColumn>
            <TableColumn width={120}>创建人</TableColumn>
            <TableColumn width={160}>创建日期</TableColumn>
            <TableColumn width={120} align="end">干预动作</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={<div className="h-40 flex items-center justify-center text-apple-text-tertiary text-sm">暂无任务指令投递。</div>}
            isLoading={tasksQuery.isPending}
            loadingContent={<Skeleton className="rounded-xl w-full h-40 bg-white/5" />}
          >
            {items.map((task, index) => {
              const rowKey = task.id || `task-${index}`;
              const statusInfo = getTaskStatusInfo(task.status, task.desired_state)

              return (
              <TableRow key={rowKey}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis block tracking-tight">{task.name || 'Untitled Task'}</span>
                    <span className="text-[10px] font-mono text-apple-text-tertiary uppercase opacity-50">ID:{task.id.substring(0,8)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] bg-white/10 border border-white/10 text-apple-text-secondary px-2 py-0.5 rounded font-black font-mono uppercase tracking-widest leading-none">{task.template_code || '-'}</span>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-apple-text-secondary flex flex-col gap-1">
                     <span className="text-white font-bold truncate tracking-tight" title={task.asset_pool_name}>{task.asset_pool_name || '-'}</span>
                     <span className="font-mono text-[9px] opacity-40 truncate">REF_{task.target_set_id?.substring(0,8)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Chip size="sm" variant="flat" color={statusInfo.color} classNames={{ base: "border-0 font-black tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-md" }}>
                      {statusInfo.label}
                    </Chip>
                    {task.active_group && !task.blocked_reason && (
                      <span className="text-[10px] text-apple-blue-light font-bold">{getActiveGroupLabel(task.active_group)}</span>
                    )}
                    {task.blocked_reason && (
                      <span className="text-[10px] text-apple-amber font-bold">{getBlockedReasonLabel(task.blocked_reason)}</span>
                    )}
                    {task.active_attack_route && (
                      <span className="text-[9px] text-apple-text-tertiary font-mono truncate" title={task.active_attack_route}>→ {task.active_attack_route}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] truncate block w-full bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase tracking-wider text-apple-text-tertiary font-black opacity-80">
                     {Object.keys(task.stage_overrides || {}).length > 0 ? "CUSTOM DRY-RUN" : "DEFAULT ENGINE"}
                  </span>
                </TableCell>
                <TableCell>
                   <span className="text-xs text-apple-text-tertiary truncate block font-medium underline underline-offset-4 decoration-white/10">{task.created_by || 'SYSTEM_DAEMON'}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[11px] font-semibold text-apple-text-secondary font-mono tracking-tighter uppercase">{formatDateTime(task.updated_at || task.created_at).split(',')[0]}</span>
                    <span className="text-[11px] font-semibold text-apple-text-tertiary font-mono tracking-tighter opacity-60 uppercase">{formatDateTime(task.updated_at || task.created_at).split(',')[1]}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2 pr-2">
                    {/* Control Group */}
                    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 mr-2">
                      {statusInfo.canPause && (
                        <Button isIconOnly size="sm" variant="light" className="h-7 w-7 min-w-0 text-apple-warning hover:bg-apple-warning/20" onPress={() => pauseTask.mutate(task.id)}>
                          <PauseIcon className="w-4 h-4" />
                        </Button>
                      )}
                      {statusInfo.canResume && (
                        <Button isIconOnly size="sm" variant="light" className="h-7 w-7 min-w-0 text-apple-green hover:bg-apple-green/20" onPress={() => resumeTask.mutate(task.id)}>
                          <PlayIcon className="w-4 h-4" />
                        </Button>
                      )}
                      {statusInfo.canStop && (
                        <Button isIconOnly size="sm" variant="light" className="h-7 w-7 min-w-0 text-apple-red hover:bg-apple-red/20" onPress={() => stopTask.mutate(task.id)}>
                          <StopIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="bordered"
                      className="rounded-lg border-white/10 text-white font-bold h-7 min-w-0 px-3 text-[11px] hover:border-white/30 transition-all"
                      onPress={() => navigate(`/tasks/${rowKey}`)}
                    >
                      监控
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
        {total > 0 && (
          <div className="px-6 py-4 flex flex-col md:flex-row justify-between items-center border-t border-white/5 text-sm">
            <span className="text-apple-text-tertiary">筛选出 {total} 项作业指令</span>
            {totalPages > 1 && (
              <Pagination
                total={totalPages}
                page={page}
                onChange={setPage}
                size="sm"
                classNames={{
                   cursor: "bg-apple-blue text-white",
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
