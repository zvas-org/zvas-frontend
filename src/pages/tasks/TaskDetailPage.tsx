import {
  Button,
  Tabs,
  Tab,
  Skeleton,
} from '@heroui/react'
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, EyeIcon } from '@heroicons/react/24/outline'

import { useTaskDetail, useTaskProgress } from '@/api/adapters/task'
import { TaskOverviewTab } from '@/components/tasks/TaskOverviewTab'
import { TaskSnapshotInputTab } from '@/components/tasks/TaskSnapshotInputTab'
import { TaskSnapshotExpandedTab } from '@/components/tasks/TaskSnapshotExpandedTab'
import { TaskProgressTab } from '@/components/tasks/TaskProgressTab'

export function TaskDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const detailQuery = useTaskDetail(id)
  const progressQuery = useTaskProgress(id)

  const [activeTab, setActiveTab] = useState('overview')

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
        <span className="font-bold tracking-widest text-lg">当前任务调度栈记录丢失或凭证无效</span>
        <Button variant="flat" onPress={() => navigate('/tasks')} className="bg-white/5 text-white border border-white/10 rounded-xl px-8 font-bold mt-4">放弃监听并返回</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            isIconOnly
            variant="flat"
            className="rounded-full bg-white/5 border border-white/5 text-apple-text-secondary h-12 w-12 hover:scale-105 hover:bg-white/10 transition-transform"
            onPress={() => navigate('/tasks')}
          >
            <ChevronLeftIcon className="w-5 h-5 ml-[-2px]" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tight text-white mb-0.5">{task.name || '无名任务'}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-apple-text-tertiary font-mono">{task.id}</span>
              <span className="w-1 h-1 rounded-full bg-apple-text-tertiary"></span>
              <span className="text-[10px] uppercase font-black text-apple-border tracking-wider">执行记录轴</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] font-black text-apple-text-tertiary">Task Status</div>
            <div className="text-sm font-black text-white mt-1">{task.status}</div>
          </div>
        </div>
      </div>

      <div className="border-b border-white/5 mt-2">
        <Tabs
          aria-label="Task Options"
          selectedKey={activeTab}
          onSelectionChange={(k) => setActiveTab(k as string)}
          variant="underlined"
          classNames={{
            tabList: 'gap-6 p-0',
            cursor: 'bg-apple-blue h-[2px] w-full',
            tab: 'h-14 px-2 text-apple-text-secondary data-[selected=true]:text-white data-[selected=true]:font-black text-[13px] uppercase tracking-widest transition-colors',
          }}
        >
          <Tab key="overview" title="参数概览" />
          <Tab key="target" title="快照输入" />
          <Tab key="expanded" title="快照扩展" />
          <Tab key="progress" title="执行跟踪监控" />
          <Tab key="findings" title="漏洞结果流" />
          <Tab key="reports" title="留存报告" />
        </Tabs>
      </div>

      <div className="pt-2 min-h-[50vh]">
        {activeTab === 'overview' && <TaskOverviewTab task={task} />}
        {activeTab === 'target' && <TaskSnapshotInputTab task={task} />}
        {activeTab === 'expanded' && <TaskSnapshotExpandedTab task={task} />}
        {activeTab === 'progress' && <TaskProgressTab progress={progress} />}
        {activeTab === 'findings' && <PlaceholderTab title="待后续模块聚合接入" desc="待 Findings 实装完毕后，此处将开放专门由于此任务所直接导致的漏洞与风险识别列表。" />}
        {activeTab === 'reports' && <PlaceholderTab title="待核验报告组件接驳" desc="系统将在审计流运行结束后，将过程证据通过格式化模板在此组装生成可用以报备的高管凭证。" />}
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
