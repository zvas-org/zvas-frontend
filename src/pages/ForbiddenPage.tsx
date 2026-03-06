import { Button, Result } from '@arco-design/web-react'
import { useNavigate } from 'react-router-dom'

/**
 * ForbiddenPage 展示 403 权限不足页面。
 */
export function ForbiddenPage() {
  const navigate = useNavigate()

  return (
    <div className="status-page-shell">
      <Result
        status="403"
        title="无权限访问"
        subTitle="当前令牌不具备访问该页面对应接口的权限。"
        extra={
          <Button type="primary" onClick={() => navigate('/login')}>
            切换令牌
          </Button>
        }
      />
    </div>
  )
}
