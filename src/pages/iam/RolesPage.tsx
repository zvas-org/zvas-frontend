import { ShieldCheckIcon } from '@heroicons/react/24/outline'

export function RolesPage() {
  return (
    <div className="flex flex-col gap-8 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20 p-8">
      <section className="flex flex-col gap-2">
         <h1 className="text-4xl font-black tracking-tight text-white mb-2">角色与权限组合矩阵</h1>
         <p className="text-apple-text-tertiary">细粒度 ACL 编辑组表</p>
      </section>

      <div className="flex items-center justify-center p-20 rounded-[32px] bg-apple-tertiary-bg/10 border border-white/5 backdrop-blur-3xl">
        <div className="flex flex-col items-center gap-4 opacity-50">
          <ShieldCheckIcon className="w-12 h-12 text-apple-text-secondary" />
          <p className="text-sm font-bold tracking-widest text-apple-text-tertiary uppercase">策略绑定模型视图级联页面待后续接入</p>
        </div>
      </div>
    </div>
  )
}
