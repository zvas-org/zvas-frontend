import { Skeleton, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react'
import type { TaskProgressVM } from '@/api/adapters/task'

export function TaskProgressTab({ progress }: { progress?: TaskProgressVM }) {
  if (!progress) return <Skeleton className="h-64 rounded-2xl bg-white/5" />


  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="bg-white/[0.02] border border-white/5 p-8 rounded-2xl flex flex-col gap-8">
         <h3 className="text-sm font-bold text-white w-full border-b border-white/5 pb-2">算子流调度指征负荷仪 (Global Flow Dispatch Metrics)</h3>
         <div className="flex justify-between items-center w-full px-4 gap-6 flex-wrap">
            <div className="flex flex-col border-r border-white/5 pr-8">
               <span className="text-[10px] text-apple-text-tertiary font-black tracking-[0.2em] uppercase mb-1">总计作业指令批</span>
               <span className="text-4xl font-mono text-white font-black">{progress.total_units || 0}</span>
            </div>
            <div className="flex flex-col border-r border-white/5 pr-8">
               <span className="text-[10px] text-apple-text-tertiary font-black tracking-[0.2em] uppercase mb-1">就绪停放队列层</span>
               <span className="text-4xl font-mono text-apple-text-tertiary font-black">{progress.queued || 0}</span>
            </div>
            <div className="flex flex-col border-r border-white/5 pr-8">
               <span className="text-[10px] text-apple-text-tertiary font-black tracking-[0.2em] uppercase mb-1">出列下沉推测</span>
               <span className="text-4xl font-mono text-apple-blue font-black drop-shadow-md">{progress.dispatched || 0}</span>
            </div>
            <div className="flex flex-col border-r border-white/5 pr-8">
               <span className="text-[10px] text-apple-text-tertiary font-black tracking-[0.2em] uppercase mb-1">引擎处理消耗态</span>
               <span className="text-4xl font-mono text-apple-amber font-black drop-shadow-md">{progress.running || 0}</span>
            </div>
            <div className="flex flex-col border-r border-white/5 pr-8">
               <span className="text-[10px] text-apple-text-tertiary font-black tracking-[0.2em] uppercase mb-1">顺利归档收口签</span>
               <span className="text-4xl font-mono text-apple-green font-black drop-shadow-md">{progress.succeeded || 0}</span>
            </div>
            <div className="flex flex-col pr-8">
               <span className="text-[10px] text-apple-text-tertiary font-black tracking-[0.2em] uppercase mb-1">失败退回或阻截</span>
               <span className="text-4xl font-mono text-apple-red font-black drop-shadow-md">{progress.failed || 0}</span>
            </div>
         </div>
      </div>

      <div className="border border-white/10 rounded-2xl bg-white/[0.01] overflow-hidden">
         <div className="p-5 border-b border-white/5 text-sm font-bold text-white bg-white/5">解析管道运行流状态跟踪列表 (Execution Pipeline)</div>
         <Table removeWrapper aria-label="Stages Table" classNames={{ th: "bg-white/5 text-[10px] font-black tracking-widest text-apple-text-secondary border-b border-white/10 lowercase", td: "border-b border-white/5 py-4 text-sm" }}>
           <TableHeader>
             <TableColumn width={280}>算子阶段级阶 (Stage Code)</TableColumn>
             <TableColumn width={100} align="center">解析域计</TableColumn>
             <TableColumn width={100} align="center">挂起数待</TableColumn>
             <TableColumn width={100} align="center">队列占仓</TableColumn>
             <TableColumn width={100} align="center">指令出射</TableColumn>
             <TableColumn width={100} align="center">引擎灼烧</TableColumn>
             <TableColumn width={100} align="center">平滑退离</TableColumn>
             <TableColumn width={100} align="center">事故阻截</TableColumn>
           </TableHeader>
           <TableBody emptyContent={<div className="py-20 text-apple-text-tertiary uppercase font-black text-xs tracking-widest">目前管线尚未启动或截获任何算子单元。</div>}>
              {(progress.stages || []).map((st, i: number) => (
                 <TableRow key={i}>
                   <TableCell><span className="font-mono font-bold text-apple-blue-light">{st.stage}</span></TableCell>
                   <TableCell><span className="font-mono text-white text-center block w-full">{st.total_units ?? 0}</span></TableCell>
                   <TableCell><span className="font-mono text-apple-text-tertiary text-center block w-full opacity-60">{st.pending ? 1 : 0}</span></TableCell>
                   <TableCell><span className="font-mono text-apple-text-tertiary text-center block w-full opacity-80">{st.queued ?? 0}</span></TableCell>
                   <TableCell><span className="font-mono text-apple-blue text-center block w-full">{st.dispatched ?? 0}</span></TableCell>
                   <TableCell><span className="font-mono text-apple-amber text-center block w-full font-bold">{st.running ?? 0}</span></TableCell>
                   <TableCell><span className="font-mono text-apple-green text-center block w-full">{st.succeeded ?? 0}</span></TableCell>
                   <TableCell><span className="font-mono text-apple-red text-center block w-full">{st.failed ?? 0}</span></TableCell>
                 </TableRow>
              ))}
           </TableBody>
         </Table>
       </div>
    </div>
  )
}
