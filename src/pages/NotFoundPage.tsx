import { Button, Result } from '@arco-design/web-react'
import { useNavigate } from 'react-router-dom'

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
        subTitle="当前地址未匹配到控制台页面，请检查链接或返回首页。"
        extra={
          <Button type="primary" onClick={() => navigate('/system/health')}>
            返回首页
          </Button>
        }
      />
    </div>
  )
}
