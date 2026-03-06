import { Button, Result } from '@arco-design/web-react'
import { useNavigate } from 'react-router-dom'

import { appEnv } from '@/app/env'

/**
 * NotFoundPage 展示 404 页面。
 */
export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="status-page-shell">
      <Result
        status="404"
        title="页面不存在"
        subTitle="当前地址不在 ZVAS 控制台路由表内。"
        extra={
          <Button type="primary" onClick={() => navigate(`${appEnv.basePath}/system/health`)}>
            返回控制台
          </Button>
        }
      />
    </div>
  )
}
