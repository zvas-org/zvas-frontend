import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'

export function TaskTemplatesPage() {
  return (
    <div className="flex flex-col gap-8 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20 p-8">
      <section className="flex flex-col gap-2">
         <h1 className="text-4xl font-black tracking-tight text-white mb-2">执行流模板 (Templates)</h1>
         <p className="text-apple-text-tertiary font-bold tracking-tight">控制与编排底层 Scanner 与探测节点的阶段组合算子</p>
      </section>

      <div className="flex items-center justify-center p-20 rounded-[32px] bg-apple-tertiary-bg/10 border border-white/5 backdrop-blur-3xl mt-10">
        <div className="flex flex-col items-center gap-6 opacity-60">
          <DocumentDuplicateIcon className="w-16 h-16 text-apple-text-secondary" />
          <p className="text-[12px] font-black tracking-[0.3em] text-apple-text-secondary uppercase">此界面暂时封存处理，留待后续迭代接驳模板调度器</p>
        </div>
      </div>
    </div>
  )
}
