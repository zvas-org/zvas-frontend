import {
  Button,
  Tabs,
  Tab,
  Skeleton,
  Chip,
} from '@heroui/react'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, EyeIcon, PlayIcon } from '@heroicons/react/24/outline'

import type { TaskDetailVM } from '@/api/adapters/task'
import { useTaskDetail, useTaskProgress, useTaskRecords, useRunTask, usePauseTask, useResumeTask, useStopTask, getTaskStatusInfo } from '@/api/adapters/task'
import { TaskOverviewTab } from '@/components/tasks/TaskOverviewTab'
import { TaskAssetViewTab } from '@/components/tasks/TaskAssetViewTab'
import { TaskProgressTab } from '@/components/tasks/TaskProgressTab'
import { TaskRecordsTab } from '@/components/tasks/TaskRecordsTab'
import { TaskFindingsTab } from '@/components/tasks/TaskFindingsTab'
import { TaskWeakScanResultsTab } from '@/components/tasks/TaskWeakScanResultsTab'
import { PauseIcon, PlayIcon as PlayIconSolid, StopIcon } from '@heroicons/react/24/solid'
import { useUrlTabState } from '@/hooks/useUrlTabState'

const TASK_DETAIL_TABS = ['overview', 'assets', 'records', 'progress', 'findings', 'weak_scan', 'reports'] as const
type TaskDetailTabKey = (typeof TASK_DETAIL_TABS)[number]

const VULN_SCAN_PLANS = new Set(['vuln_scan', 'vul_scan', 'vul_scan.site', 'vuln_scan.nuclei'])
const WEAK_SCAN_PLANS = new Set(['weak_scan', 'weak_scan.site'])
const VULN_SCAN_TEMPLATES = new Set(['site_vuln_scan', 'vuln_scan'])
const WEAK_SCAN_TEMPLATES = new Set(['site_weak_scan', 'weak_scan'])

function hasPlan(task: TaskDetailVM | undefined, plans: Set<string>, templates: Set<string>) {
  if (!task) return false

  const combinedPlans = [...(task.route_plan || []), ...(task.stage_plan || [])]
  if (combinedPlans.some((item) => plans.has(item))) {
    return true
  }

  return templates.has(task.template_code)
}

export function TaskDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const detailQuery = useTaskDetail(id)
  const progressQuery = useTaskProgress(id)
  const weakScanRecordQuery = useTaskRecords(id, {
    page: 1,
    page_size: 1,
    stage: 'weak_scan',
    sort: 'updated_at',
    order: 'desc',
  })
  const runTask = useRunTask()
  const pauseTask = usePauseTask()
  const resumeTask = useResumeTask()
  const stopTask = useStopTask()

  const [activeTab, setActiveTab] = useUrlTabState<TaskDetailTabKey>({ param: 'tab', defaultValue: 'overview', values: TASK_DETAIL_TABS })
  const [runError, setRunError] = useState<string | null>(null)
  const task = detailQuery.data
  const progress = progressQuery.data

  const showFindingsTab = useMemo(() => hasPlan(task, VULN_SCAN_PLANS, VULN_SCAN_TEMPLATES), [task])
  const showWeakScanTab = useMemo(() => {
    const hasRuntimeRecords = Boolean((weakScanRecordQuery.data?.pagination?.total || 0) > 0 || (weakScanRecordQuery.data?.data || []).length > 0)
    return hasPlan(task, WEAK_SCAN_PLANS, WEAK_SCAN_TEMPLATES) || hasRuntimeRecords
  }, [task, weakScanRecordQuery.data])
  const visibleTabs = useMemo<TaskDetailTabKey[]>(() => {
    const tabs: TaskDetailTabKey[] = ['overview', 'assets', 'records', 'progress']
    if (showFindingsTab) tabs.push('findings')
    if (showWeakScanTab) tabs.push('weak_scan')
    tabs.push('reports')
    return tabs
  }, [showFindingsTab, showWeakScanTab])
  const selectedTab: TaskDetailTabKey = visibleTabs.includes(activeTab) ? activeTab : 'overview'

  useEffect(() => {
    if (!task) return
    if (visibleTabs.includes(activeTab)) return
    setActiveTab('overview')
  }, [activeTab, setActiveTab, task, visibleTabs])

  if (detailQuery.isPending) {
    return (
      <div className="flex flex-col gap-6 p-4 max-w-[1600px] mx-auto w-full pt-10">
        <Skeleton className="h-10 w-1/4 rounded-2xl bg-white/5 animate-pulse" />
        <Skeleton className="h-40 w-full rounded-2xl bg-white/5 animate-pulse" />
      </div>
    )
  }

  if (detailQuery.isError || !task) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4 text-apple-red text-sm h-[50vh]">
        <span className="font-bold tracking-widest text-lg">当前任务记录不存在或无法访问</span>
        <Button variant="flat" onPress={() => navigate('/tasks')} className="bg-white/5 text-white border border-white/10 rounded-xl px-8 font-bold mt-4">返回任务列表</Button>
      </div>
    )
  }

  const statusInfo = getTaskStatusInfo(task.status, task.desired_state)

  const handleRunTask = () => {
    if (!id) return
    setRunError(null)
    runTask.mutate(id, {
      onSuccess: () => {
        detailQuery.refetch()
        progressQuery.refetch()
      },
      onError: () => {
        setRunError('任务启动失败，请稍后重试')
      },
    })
  }

  return (
    <div className="flex flex-col gap-6 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button isIconOnly variant="flat" className="rounded-full bg-white/5 border border-white/5 text-apple-text-secondary h-12 w-12 hover:scale-105 hover:bg-white/10 transition-transform" onPress={() => navigate('/tasks')}>
            <ChevronLeftIcon className="w-5 h-5 ml-[-2px]" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tight text-white mb-0.5">{task.name || '无名任务'}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-apple-text-tertiary font-mono">{task.id}</span>
              <span className="w-1 h-1 rounded-full bg-apple-text-tertiary"></span>
              <span className="text-[10px] uppercase font-black text-apple-border tracking-wider">运行视图</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Chip color={statusInfo.color} variant="flat" classNames={{ base: 'h-10 px-4 rounded-xl', content: 'font-black text-[12px] uppercase tracking-wider' }}>
            {statusInfo.label}
          </Chip>
          
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-[18px] p-1 shadow-inner">
             {statusInfo.canPause && (
               <Button variant="flat" size="sm" className="h-10 rounded-xl bg-apple-warning/20 text-apple-warning-light font-black px-4 flex items-center gap-2" onPress={() => pauseTask.mutate(id!)}>
                 <PauseIcon className="w-4 h-4" />
                 <span>暂停</span>
               </Button>
             )}
             {statusInfo.canResume && (
               <Button variant="flat" size="sm" className="h-10 rounded-xl bg-apple-green/20 text-apple-green-light font-black px-4 flex items-center gap-2" onPress={() => resumeTask.mutate(id!)}>
                 <PlayIconSolid className="w-4 h-4" />
                 <span>恢复</span>
               </Button>
             )}
             {statusInfo.canStop && (
               <Button variant="flat" size="sm" className="h-10 rounded-xl bg-apple-red/20 text-apple-red-light font-black px-4 flex items-center gap-2" onPress={() => stopTask.mutate(id!)}>
                 <StopIcon className="w-4 h-4" />
                 <span>终止</span>
               </Button>
             )}
             {task.status === 'draft' && (
               <Button color="primary" className="h-10 rounded-[14px] font-black px-6 shadow-xl shadow-apple-blue/20 flex items-center gap-2" isLoading={runTask.isPending} isDisabled={runTask.isPending} onPress={handleRunTask} startContent={!runTask.isPending ? <PlayIcon className="w-4 h-4" /> : undefined}>
                 启动任务
               </Button>
             )}
          </div>
        </div>
      </div>

      {runError && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-[16px] bg-apple-red/10 border border-apple-red/30 text-apple-red-light text-[13px] font-bold animate-in fade-in duration-300">
          <span>{runError}</span>
          <button onClick={() => setRunError(null)} className="ml-auto text-apple-text-tertiary hover:text-white transition-colors text-lg">×</button>
        </div>
      )}

      <div className="border-b border-white/5 mt-2">
        <Tabs aria-label="Task Options" selectedKey={selectedTab} onSelectionChange={(k) => setActiveTab(k as TaskDetailTabKey)} variant="underlined" classNames={{ tabList: 'gap-6 p-0', cursor: 'bg-apple-blue h-[2px] w-full', tab: 'h-14 px-2 text-apple-text-secondary data-[selected=true]:text-white data-[selected=true]:font-black text-[13px] uppercase tracking-widest transition-colors' }}>
          <Tab key="overview" title="概览" />
          <Tab key="assets" title="资产视图" />
          <Tab key="records" title="扫描记录" />
          <Tab key="progress" title="执行进度" />
          {showFindingsTab && <Tab key="findings" title="漏洞结果" />}
          {showWeakScanTab && <Tab key="weak_scan" title="弱点扫描结果" />}
          <Tab key="reports" title="报告" />
        </Tabs>
      </div>

      <div className="pt-2 min-h-[50vh]">
        {selectedTab === 'overview' && <TaskOverviewTab task={task} />}
        {selectedTab === 'assets' && <TaskAssetViewTab taskId={task.id} />}
        {selectedTab === 'records' && <TaskRecordsTab taskId={task.id} />}
        {selectedTab === 'progress' && <TaskProgressTab progress={progress} />}
        {selectedTab === 'findings' && <TaskFindingsTab taskId={task.id} />}
        {selectedTab === 'weak_scan' && <TaskWeakScanResultsTab taskId={task.id} />}
        {selectedTab === 'reports' && <PlaceholderTab title="待模块接入" desc="系统将在扫描结束后统一生成分析报表，当前模块暂未开放。" />}
      </div>
    </div>
  )
}

function PlaceholderTab({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="bg-white/[0.01] border border-white/5 border-dashed p-16 rounded-[32px] flex flex-col items-center justify-center text-center gap-3 animate-in fade-in duration-500 min-h-[400px]">
      <EyeIcon className="w-12 h-12 text-apple-text-tertiary mb-2 opacity-50" />
      <span className="text-[10px] text-apple-text-tertiary font-black tracking-[0.3em] uppercase bg-white/5 px-2 py-0.5 rounded-md">Reserved Edge</span>
      <h3 className="text-2xl font-black text-white tracking-tight">{title}</h3>
      <p className="text-sm text-apple-text-tertiary max-w-sm mt-1">{desc}</p>
    </div>
  )
}
