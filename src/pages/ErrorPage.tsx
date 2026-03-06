import { Button, Result } from '@arco-design/web-react'
import { useNavigate } from 'react-router-dom'

/**
 * ErrorPage 展示通用异常页面。
 */
export function ErrorPage() {
  const navigate = useNavigate()

  return (
    <div className="status-page-shell">
      <Result
        status="error"
        title="页面发生异常"
        subTitle="请返回系统首页重试，若问题持续存在请检查浏览器控制台和后端日志。"
        extra={
          <Button type="primary" onClick={() => navigate('/system/health')}>
            返回首页
          </Button>
        }
      />
    </div>
  )
}
