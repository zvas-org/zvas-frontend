import { Button, Result } from '@arco-design/web-react'
import { useNavigate } from 'react-router-dom'

import { appEnv } from '@/app/env'

/**
 * ErrorPage 展示通用异常页面。
 */
export function ErrorPage() {
  const navigate = useNavigate()

  return (
    <div className="status-page-shell">
      <Result
        status="error"
        title="请求或页面处理失败"
        subTitle="请检查网络连通性、令牌配置或后端服务状态。"
        extra={
          <Button type="primary" onClick={() => navigate(`${appEnv.basePath}/system/health`)}>
            回到系统页
          </Button>
        }
      />
    </div>
  )
}
