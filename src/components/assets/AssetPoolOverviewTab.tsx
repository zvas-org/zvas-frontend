import { Skeleton } from '@heroui/react'
import type { AssetPoolDetailVM } from '@/api/adapters/asset'

function formatDateTime(isoStr?: string) {
  if (!isoStr) return '-'
  return new Date(isoStr).toLocaleString()
}

export function AssetPoolOverviewTab({ pool }: { pool: AssetPoolDetailVM }) {
  if (!pool) return <Skeleton className="h-64 w-full rounded-2xl bg-white/5" />

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl">
           <div className="text-[10px] text-apple-text-tertiary mb-2 uppercase tracking-[0.2em] font-black">有效录入条目限制</div>
           <div className="text-3xl font-mono tracking-tight text-white">{pool.summary?.asset_count ?? pool.asset_count ?? 0}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl">
           <div className="text-[10px] text-apple-text-tertiary mb-2 uppercase tracking-[0.2em] font-black">池内流转评估任务</div>
           <div className="text-3xl font-mono tracking-tight text-apple-blue-light drop-shadow-md">{pool.summary?.task_count ?? pool.task_count ?? 0}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl">
           <div className="text-[10px] text-apple-text-tertiary mb-2 uppercase tracking-[0.2em] font-black">当前系统遗留风险</div>
           <div className="text-3xl font-mono tracking-tight text-apple-red-light drop-shadow-md">{pool.summary?.finding_count ?? pool.finding_count ?? 0}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
           <div className="text-[10px] text-apple-text-tertiary mb-2 uppercase tracking-[0.2em] font-black">标签分组 (Labels)</div>
           <div className="flex flex-wrap gap-1 mt-2">
             {pool.tags?.length ? pool.tags.map((t: string) => (
                <span key={t} className="text-[10px] uppercase font-black tracking-widest bg-white/10 px-2 py-1 rounded-md text-apple-text-secondary">{t}</span>
             )) : <span className="text-apple-text-tertiary text-xs">-</span>}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_2fr] gap-6">
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
          <h3 className="text-sm font-bold tracking-tight text-white pb-2 flex items-center justify-between">
            <span>基础定义 (Metadata)</span>
          </h3>
          <div className="flex flex-col gap-4 text-sm mt-2">
             <div className="flex flex-col gap-1">
               <span className="text-[10px] text-apple-text-tertiary uppercase tracking-widest font-black">系统关联句柄</span> 
               <span className="font-mono text-apple-text-secondary">{pool.id}</span>
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-[10px] text-apple-text-tertiary uppercase tracking-widest font-black">构建初生时间</span> 
               <span className="font-mono text-apple-text-secondary">{formatDateTime(pool.created_at)}</span>
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-[10px] text-apple-text-tertiary uppercase tracking-widest font-black">数据边界规则 (Scope Rule)</span> 
               <span className="text-xs text-apple-text-secondary bg-black/40 p-3 rounded-lg border border-white/5 font-mono overflow-auto max-h-40 relative group">
                  <div className="absolute top-2 right-2 px-1 rounded bg-white/10 text-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">复制 JSON</div>
                  {JSON.stringify(pool.scope_rule, null, 2)}
               </span>
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white/[0.02] border border-dashed border-white/10 p-10 rounded-2xl flex flex-col items-center justify-center text-apple-text-tertiary h-[180px]">
             <span className="text-sm font-bold tracking-tight text-white mb-1">[最近任务卡片队列]</span>
             <span className="text-xs">等待 /tasks 相关 API 扩充 Dashboard 支持</span>
          </div>
          <div className="bg-white/[0.02] border border-dashed border-white/10 p-10 rounded-2xl flex flex-col items-center justify-center text-apple-text-tertiary flex-1">
             <span className="text-sm font-bold tracking-tight text-white mb-1">[Top 5 风险暴露面缩略图]</span>
             <span className="text-xs">等待 /findings 聚合统计查询实装后接入</span>
          </div>
        </div>
      </div>
    </div>
  )
}
