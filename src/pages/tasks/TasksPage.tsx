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
import { MagnifyingGlassIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline'

import { useTasks, usePauseTask, useResumeTask, useStopTask, useDeleteTask, getTaskStatusInfo, getActiveGroupLabel, getBlockedReasonLabel, isTerminalTaskStatus, getTemplateCodeLabel, taskHasWeakScanPlan } from '@/api/adapters/task'
import { useAssetPools } from '@/api/adapters/asset'
import { useTaskRoutes, getRouteActiveLabel, mapStageLabels } from '@/api/adapters/route'
import { PauseIcon, PlayIcon, StopIcon } from '@heroicons/react/24/solid'
import { useAuthStore } from '@/store/auth'
import { APPLE_TABLE_CLASSES } from '@/utils/theme'
import { PERMISSIONS, hasPermission } from '@/utils/permissions'
import { ConfirmModal } from '@/components/common/ConfirmModal'

function formatDateTime(isoStr?: string) {
  if (!isoStr) return '-'
  return new Date(isoStr).toLocaleString()
}

export function TasksPage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.currentUser)
  const [searchParams] = useSearchParams()

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [poolFilter, setPoolFilter] = useState(searchParams.get('asset_pool_id') || 'all')
  const [templateFilter, setTemplateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteVisible, setDeleteVisible] = useState(false)
  const [targetTask, setTargetTask] = useState<{ id: string; name: string } | null>(null)

  const tasksQuery = useTasks({
    page,
    page_size: pageSize,
    keyword: keyword || undefined,
    asset_pool_id: poolFilter === 'all' ? undefined : poolFilter,
    template_code: templateFilter === 'all' ? undefined : templateFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const pauseTask = usePauseTask()
  const resumeTask = useResumeTask()
  const stopTask = useStopTask()
  const deleteTask = useDeleteTask()
  const { data: routesData } = useTaskRoutes()
  const poolsQuery = useAssetPools({ page: 1, page_size: 100 })
  const poolItems = poolsQuery.data?.data || []
  const canControlTask = hasPermission(currentUser?.permissions, PERMISSIONS.taskUpdate)

  const items = tasksQuery.data?.data || []
  const total = tasksQuery.data?.pagination?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  function buildTaskDetailPath(taskID: string, hasWeakScan: boolean) {
    if (!hasWeakScan) return `/tasks/${taskID}`
    return `/tasks/${taskID}?tab=weak_scan`
  }

  return (
    <div className="flex flex-col gap-6 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20 p-4">
      <section className="flex flex-col md:flex-row items-center gap-4 w-full bg-white/[0.02] border border-white/5 p-4 rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
          <Input
            isClearable
            value={keyword}
            placeholder="搜索任务名称..."
            onValueChange={(val) => { setKeyword(val); setPage(1) }}
            variant="flat"
            startContent={<MagnifyingGlassIcon className="w-5 h-5 text-apple-text-tertiary" />}
            classNames={{ inputWrapper: 'bg-white/5 border border-white/10 h-10', input: 'text-sm' }}
          />
          <Select
            aria-label="资产池筛选"
            selectedKeys={new Set([poolFilter])}
            onChange={(e) => { setPoolFilter(e.target.value || 'all'); setPage(1) }}
            classNames={{ trigger: 'bg-white/5 border border-white/10 h-10 pr-10', value: 'truncate text-ellipsis pl-1' }}
            popoverProps={{ classNames: { content: 'bg-apple-bg/95 backdrop-blur-3xl border border-white/10 shadow-2xl p-1 min-w-[200px]' } }}
          >
            {[
               { id: 'all', name: '全源资产池 (所有)' },
               ...poolItems,
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
            classNames={{ trigger: 'bg-white/5 border border-white/10 h-10 pr-10', value: 'truncate text-ellipsis pl-1' }}
            popoverProps={{ classNames: { content: 'bg-apple-bg/95 backdrop-blur-3xl border border-white/10 shadow-2xl p-1 min-w-[200px]' } }}
            items={[{ key: 'all', label: '所有执行模板' }, ...(routesData || []).map(r => ({ key: r.key, label: r.label }))]}
          >
            {(item) => <SelectItem key={item.key} textValue={item.label}>{item.label}</SelectItem>}
          </Select>
          <Select
            aria-label="状态筛选"
            selectedKeys={new Set([statusFilter])}
            onChange={(e) => { setStatusFilter(e.target.value || 'all'); setPage(1) }}
            classNames={{ trigger: 'bg-white/5 border border-white/10 h-10 pr-10', value: 'truncate text-ellipsis pl-1' }}
            popoverProps={{ classNames: { content: 'bg-apple-bg/95 backdrop-blur-3xl border border-white/10 shadow-2xl p-1 min-w-[200px]' } }}
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

      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-x-auto">
        <Table
          aria-label="Tasks table"
          layout="fixed"
          removeWrapper
          classNames={{
            ...APPLE_TABLE_CLASSES,
            base: 'min-w-[1200px] p-4',
          }}
        >
          <TableHeader>
            <TableColumn width={220}>任务名</TableColumn>
            <TableColumn width={160}>依赖模板</TableColumn>
            <TableColumn width={200}>归属资产池及目标</TableColumn>
            <TableColumn width={150}>当前状态</TableColumn>
            <TableColumn width={220}>执行路线计划</TableColumn>
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
              const rowKey = task.id || `task-${index}`
              const statusInfo = getTaskStatusInfo(task.status, task.desired_state)
              const isTerminal = isTerminalTaskStatus(task.status)
              const activeRouteLabel = task.active_route_code ? getRouteActiveLabel(routesData, task.active_route_code) : ''
              const planLabels = mapStageLabels(routesData, task.route_plan.length > 0 ? task.route_plan : task.stage_plan)

              return (
                <TableRow
                  key={rowKey}
                  className="cursor-pointer hover:bg-white/[0.03]"
                  onClick={() => navigate(buildTaskDetailPath(rowKey, taskHasWeakScanPlan(task)))}
                >
                  <TableCell>
                    <span className="text-sm font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis block tracking-tight">{task.name || 'Untitled Task'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] bg-white/10 border border-white/10 text-apple-text-secondary px-2 py-0.5 rounded font-black font-mono uppercase tracking-widest leading-none">{getTemplateCodeLabel(task.template_code)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-white font-bold truncate tracking-tight block" title={task.asset_pool_name}>{task.asset_pool_name || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Chip size="sm" variant="flat" color={statusInfo.color} classNames={{ base: 'border-0 font-black tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-md' }}>
                        {statusInfo.label}
                      </Chip>
                      {!isTerminal && activeRouteLabel && (
                        <span className="text-[10px] text-apple-blue-light font-bold">{activeRouteLabel}</span>
                      )}
                      {!isTerminal && task.active_group && (
                        <span className="text-[9px] text-apple-text-tertiary font-bold">{getActiveGroupLabel(task.active_group)}</span>
                      )}
                      {!isTerminal && task.blocked_reason && (
                        <span className="text-[10px] text-apple-amber font-bold">{getBlockedReasonLabel(task.blocked_reason)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] truncate block w-full bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase tracking-wider text-apple-text-tertiary font-black opacity-80" title={planLabels.join(' • ')}>
                      {planLabels.length > 0 ? planLabels.join(' • ') : '—'}
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
                    <div className="flex justify-end gap-2 pr-2" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 mr-2">
                        {statusInfo.canPause && (
                          <Button aria-label="暂停任务" isIconOnly size="sm" variant="light" isDisabled={!canControlTask} className="h-7 w-7 min-w-0 text-apple-warning hover:bg-apple-warning/20" onPress={() => pauseTask.mutate(task.id)}>
                            <PauseIcon className="w-4 h-4" />
                          </Button>
                        )}
                        {statusInfo.canResume && (
                          <Button aria-label="恢复任务" isIconOnly size="sm" variant="light" isDisabled={!canControlTask} className="h-7 w-7 min-w-0 text-apple-green hover:bg-apple-green/20" onPress={() => resumeTask.mutate(task.id)}>
                            <PlayIcon className="w-4 h-4" />
                          </Button>
                        )}
                        {statusInfo.canStop && (
                          <Button aria-label="终止任务" isIconOnly size="sm" variant="light" isDisabled={!canControlTask} className="h-7 w-7 min-w-0 text-apple-red hover:bg-apple-red/20" onPress={() => stopTask.mutate(task.id)}>
                            <StopIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <Button
                        aria-label="删除任务"
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="h-7 w-7 min-w-0 text-apple-red hover:bg-apple-red/20"
                        onPress={() => {
                          setTargetTask({ id: task.id, name: task.name || '未命名任务' })
                          setDeleteVisible(true)
                        }}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
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
                classNames={{
                  wrapper: 'gap-2',
                  item: 'bg-white/5 text-apple-text-secondary font-bold rounded-xl border border-white/5 hover:bg-white/10 transition-all min-w-[32px] h-8 text-[12px]',
                  cursor: 'bg-apple-blue font-black rounded-xl shadow-lg shadow-apple-blue/30 text-white',
                  prev: 'bg-white/5 text-white/50 rounded-xl hover:bg-white/10',
                  next: 'bg-white/5 text-white/50 rounded-xl hover:bg-white/10',
                }}
              />
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteVisible}
        onClose={() => {
          setDeleteVisible(false)
          setTargetTask(null)
        }}
        title="确认删除当前任务？"
        message={`将只删除任务 "${targetTask?.name || '未命名任务'}"，不会删除归属资产池。该任务会立即从列表中移除，关联执行数据将在后台异步清理。`}
        confirmText="确认删除"
        confirmColor="danger"
        isLoading={deleteTask.isPending}
        onConfirm={async () => {
          if (!targetTask) return
          await deleteTask.mutateAsync(targetTask.id)
          setDeleteVisible(false)
          setTargetTask(null)
        }}
      />
    </div>
  )
}
