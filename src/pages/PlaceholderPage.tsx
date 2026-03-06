import { Button, Card, CardBody } from '@heroui/react'
import type { PropsWithChildren } from 'react'

interface PlaceholderPageProps extends PropsWithChildren {
  title: string
  subtitle: string
  badge: string
}

/**
 * PlaceholderPage 统一展示初始化阶段尚未联通接口的页面占位。
 */
export function PlaceholderPage({ title, subtitle, badge, children }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4 md:p-8">
      <Card className="bg-black border border-white/10 p-6 md:p-10 text-center flex flex-col items-center gap-6">
        <CardBody className="flex flex-col items-center gap-6 pb-0 px-0 pt-2">
          <span className="inline-block border border-blue-500/50 text-blue-400 bg-blue-500/10 text-xs px-2.5 py-1 rounded">
            {badge}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#f5f5f7]">
            {title}
          </h2>
          <p className="text-[#86868b] leading-relaxed max-w-2xl">
            {subtitle}
          </p>
          <div className="w-full flex justify-center">
            {children}
          </div>
          <Button variant="bordered" disabled className="mt-4 text-[#86868b] border-white/10 bg-transparent hover:bg-transparent opacity-50 cursor-not-allowed">
            等待 API 接入
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
