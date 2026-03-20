import {
  Button,
  Tabs,
  Tab,
  Skeleton,
  Chip,
} from '@heroui/react'
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, EyeIcon, PlayIcon } from '@heroicons/react/24/outline'

import { useTaskDetail, useTaskProgress, useRunTask } from '@/api/adapters/task'
import { TaskOverviewTab } from '@/components/tasks/TaskOverviewTab'
import { TaskSnapshotInputTab } from '@/components/tasks/TaskSnapshotInputTab'
import { TaskSnapshotExpandedTab } from '@/components/tasks/TaskSnapshotExpandedTab'
import { TaskProgressTab } from '@/components/tasks/TaskProgressTab'
import { TaskRecordsTab } from '@/components/tasks/TaskRecordsTab'

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'danger' | 'warning' }> = {
  draft: { label: '草稿', color: 'default' },
  queued: { label: '排队中', color: 'primary' },
  running: { label: '执行中', color: 'warning' },
  succeeded: { label: '已完成', color: 'success' },
  failed: { label: '已失败', color: 'danger' },
  stopped: { label: '已终止', color: 'danger' },
}

export function TaskDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const detailQuery = useTaskDetail(id)
  const progressQuery = useTaskProgress(id)
  const runTask = useRunTask()

  const [activeTab, setActiveTab] = useState('overview')
  const [runError, setRunError] = useState<string | null>(null)

  if (detailQuery.isPending) {
    return (
      <div className="flex flex-col gap-6 p-4 max-w-[1600px] mx-auto w-full pt-10">
        <Skeleton className="h-10 w-1/4 rounded-2xl bg-white/5 animate-pulse" />
        <Skeleton className="h-40 w-full rounded-2xl bg-white/5 animate-pulse" />
      </div>
    )
  }

  const task = detailQuery.data
  const progress = progressQuery.data

  if (detailQuery.isError || !task) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4 text-apple-red text-sm h-[50vh]">
        <span className="font-bold tracking-widest text-lg">当前任务记录不存在或无法访问</span>
        <Button variant="flat" onPress={() => navigate('/tasks')} className="bg-white/5 text-white border border-white/10 rounded-xl px-8 font-bold mt-4">返回任务列表</Button>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[task.status] ?? { label: task.status, color: 'default' as const }

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

        <div className="flex items-center gap-3">
          <Chip color={statusCfg.color} variant="flat" classNames={{ base: 'h-9 px-3', content: 'font-black text-[11px] uppercase tracking-wider' }}>
            {statusCfg.label}
          </Chip>
          {task.status === 'draft' && (
            <Button color="primary" className="h-10 rounded-xl font-black px-6 shadow-lg shadow-apple-blue/20 flex items-center gap-2" isLoading={runTask.isPending} isDisabled={runTask.isPending} onPress={handleRunTask} startContent={!runTask.isPending ? <PlayIcon className="w-4 h-4" /> : undefined}>
              启动任务
            </Button>
          )}
        </div>
      </div>

      {runError && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-[16px] bg-apple-red/10 border border-apple-red/30 text-apple-red-light text-[13px] font-bold animate-in fade-in duration-300">
          <span>{runError}</span>
          <button onClick={() => setRunError(null)} className="ml-auto text-apple-text-tertiary hover:text-white transition-colors text-lg">×</button>
        </div>
      )}

      <div className="border-b border-white/5 mt-2">
        <Tabs aria-label="Task Options" selectedKey={activeTab} onSelectionChange={(k) => setActiveTab(k as string)} variant="underlined" classNames={{ tabList: 'gap-6 p-0', cursor: 'bg-apple-blue h-[2px] w-full', tab: 'h-14 px-2 text-apple-text-secondary data-[selected=true]:text-white data-[selected=true]:font-black text-[13px] uppercase tracking-widest transition-colors' }}>
          <Tab key="overview" title="概览" />
          <Tab key="target" title="扫描目标" />
          <Tab key="expanded" title="本次发现资产" />
          <Tab key="records" title="扫描记录" />
          <Tab key="progress" title="执行进度" />
          <Tab key="findings" title="扫描结果" />
          <Tab key="reports" title="报告" />
        </Tabs>
      </div>

      <div className="pt-2 min-h-[50vh]">
        {activeTab === 'overview' && <TaskOverviewTab task={task} />}
        {activeTab === 'target' && <TaskSnapshotInputTab task={task} />}
        {activeTab === 'expanded' && <TaskSnapshotExpandedTab task={task} />}
        {activeTab === 'records' && <TaskRecordsTab taskId={task.id} />}
        {activeTab === 'progress' && <TaskProgressTab progress={progress} />}
        {activeTab === 'findings' && <PlaceholderTab title="待模块接入" desc="此页面保留为以后开放扫描结果的专门呈现。当前暂无真实业务数据。" />}
        {activeTab === 'reports' && <PlaceholderTab title="待模块接入" desc="系统将在扫描结束后统一生成分析报表，当前模块暂未开放。" />}
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
