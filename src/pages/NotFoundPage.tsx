import { Button } from '@heroui/react'
import { useNavigate } from 'react-router-dom'

/**
 * NotFoundPage 展示 404 页面。
 */
export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-apple-text-primary p-8 animate-in fade-in duration-500">
      <h1 className="text-4xl font-bold mb-4 tracking-tighter">404 路径不存在</h1>
      <p className="text-apple-text-secondary text-lg mb-8 max-w-sm text-center">控制台未识别到该请求地址，请确认路径或返回至健康监测首页。</p>

      <Button color="primary" variant="flat" onPress={() => navigate('/system/health')} className="rounded-full px-8 font-bold">
        返回首页
      </Button>
    </div>
  )
}

