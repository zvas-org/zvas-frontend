import { Button } from '@heroui/react'
import { useNavigate } from 'react-router-dom'

/**
 * ForbiddenPage 展示 403 权限不足页面。
 */
export function ForbiddenPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-apple-text-primary p-8 animate-in fade-in duration-500">
      <h1 className="text-4xl font-bold mb-4 tracking-tighter">403 无权限访问</h1>
      <p className="text-apple-text-secondary text-lg mb-8 max-w-sm text-center">当前身份令牌不具备访问该资源所需的授权等级。</p>

      <Button color="primary" variant="flat" onPress={() => navigate('/login')} className="rounded-full px-8 font-bold">
        切换令牌
      </Button>
    </div>
  )
}

