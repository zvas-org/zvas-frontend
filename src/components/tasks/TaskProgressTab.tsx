import { Progress, Skeleton } from '@heroui/react'
import type { TaskProgressVM } from '@/api/adapters/task'
import { useTaskRoutes, getRouteLabel } from '@/api/adapters/route'

function percent(done: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.round((done / total) * 100))
}

export function TaskProgressTab({ progress }: { progress?: TaskProgressVM }) {
  // 统一路由配置
  const { data: routes } = useTaskRoutes()

  if (!progress) return <Skeleton className="h-64 rounded-2xl bg-white/5" />

  const finished = (progress.succeeded || 0) + (progress.failed || 0)
  const overall = percent(finished, progress.total_units || 0)

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full mb-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: '总单元数', value: progress.total_units || 0 },
          { label: '已完成', value: finished },
          { label: '运行中', value: progress.running || 0 },
          { label: '失败', value: progress.failed || 0 },
          { label: '总体进度', value: `${overall}%` },
        ].map((card) => (
          <div key={card.label} className="bg-white/[0.02] border border-white/10 p-5 rounded-[24px] backdrop-blur-3xl">
            <div className="text-[10px] text-apple-text-tertiary uppercase tracking-[0.2em] font-black mb-2">{card.label}</div>
            <div className="text-3xl font-black text-white">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white/[0.02] border border-white/10 p-6 rounded-[24px] backdrop-blur-3xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-black text-white">总体进度</h3>
          <span className="text-sm font-bold text-apple-text-secondary">{finished} / {progress.total_units || 0}</span>
        </div>
        <Progress value={overall} color={progress.failed > 0 ? 'warning' : 'primary'} classNames={{ track: 'bg-white/5', indicator: progress.failed > 0 ? 'bg-apple-amber' : 'bg-apple-blue', label: 'text-white' }} />
      </div>

      <div className="bg-white/[0.02] border border-white/10 p-6 rounded-[24px] backdrop-blur-3xl flex flex-col gap-5">
        <h3 className="text-lg font-black text-white">阶段进度</h3>
        {(progress.stages || []).map((stage) => {
          const stageDone = (stage.succeeded || 0) + (stage.failed || 0)
          const stageTotal = stage.total_units || 0
          const stageProgress = percent(stageDone, stageTotal)
          return (
            <div key={stage.stage} className="flex flex-col gap-2 border border-white/5 rounded-2xl px-4 py-4 bg-white/[0.01]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-white">{getRouteLabel(routes, stage.stage)}</div>
                  <div className="text-xs text-apple-text-tertiary">
                    {stage.pending && stageTotal === 0 ? '等待生成扫描单元' : `完成 ${stageDone} / ${stageTotal}`}
                  </div>
                </div>
                <div className="text-xs text-apple-text-secondary text-right">
                  <div>运行中 {stage.running || 0}</div>
                  <div>失败 {stage.failed || 0}</div>
                </div>
              </div>
              <Progress value={stage.pending && stageTotal === 0 ? 0 : stageProgress} color={stage.failed > 0 ? 'warning' : 'success'} classNames={{ track: 'bg-white/5', indicator: stage.failed > 0 ? 'bg-apple-amber' : 'bg-apple-green' }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
