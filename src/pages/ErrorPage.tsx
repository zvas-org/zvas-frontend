import { Button } from '@heroui/react'
import { useNavigate } from 'react-router-dom'

/**
 * ErrorPage 展示通用异常页面。
 */
export function ErrorPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-apple-text-primary p-8 animate-in fade-in duration-500">
      <h1 className="text-4xl font-bold mb-4 tracking-tighter">页面发生异常</h1>
      <p className="text-apple-text-secondary text-lg mb-8 max-w-md text-center">请返回系统首页重试，若问题持续存在请检查浏览器控制台或联系系统管理员。</p>

      <Button color="primary" variant="flat" onPress={() => navigate('/system/health')} className="rounded-full px-8 font-bold">
        返回首页
      </Button>
    </div>
  )
}

