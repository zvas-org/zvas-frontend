import { ServerStackIcon } from '@heroicons/react/24/outline'

export function WorkersPage() {
  return (
    <div className="flex flex-col gap-8 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20 p-8">
      <section className="flex flex-col gap-2">
         <h1 className="text-4xl font-black tracking-tight text-white mb-2">引擎探针监测网 (Workers)</h1>
         <p className="text-apple-text-tertiary">由 Kafka/Celery 支撑的实时算力单元负荷热力监控面板</p>
      </section>

      <div className="flex items-center justify-center p-20 rounded-[32px] bg-apple-tertiary-bg/10 border border-white/5 backdrop-blur-3xl mt-10">
        <div className="flex flex-col items-center gap-6 opacity-60">
          <ServerStackIcon className="w-16 h-16 text-apple-text-secondary" />
          <p className="text-[12px] font-black tracking-[0.3em] text-apple-text-secondary uppercase">等待后端探针上报路由架构落盘后再行暴露此拓扑视图</p>
        </div>
      </div>
    </div>
  )
}
