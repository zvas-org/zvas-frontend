import { Button, Card, Descriptions, Result, Skeleton, Space, Tag, Typography } from '@arco-design/web-react'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { isApiError, useSystemSettingsView } from '@/api/adapters/system'
import { appEnv } from '@/app/env'

const { Paragraph, Title } = Typography

/**
 * SystemSettingsPage 展示受保护系统接口的联调结果。
 */
export function SystemSettingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const settingsQuery = useSystemSettingsView()

  useEffect(() => {
    if (!settingsQuery.error || !isApiError(settingsQuery.error)) {
      return
    }

    if (settingsQuery.error.status === 401) {
      navigate(`${appEnv.basePath}/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true })
      return
    }

    if (settingsQuery.error.status === 403) {
      navigate(`${appEnv.basePath}/403`, { replace: true })
    }
  }, [location.pathname, navigate, settingsQuery.error])

  if (settingsQuery.isPending) {
    return (
      <Card className="page-card">
        <Skeleton text={{ rows: 7 }} animation />
      </Card>
    )
  }

  if (settingsQuery.isError) {
    if (isApiError(settingsQuery.error) && (settingsQuery.error.status === 401 || settingsQuery.error.status === 403)) {
      return null
    }

    return (
      <div className="status-page-shell compact-shell">
        <Result
          status="error"
          title="系统设置接口请求失败"
          subTitle={settingsQuery.error.message}
          extra={
            <Button type="primary" onClick={() => settingsQuery.refetch()}>
              重新请求
            </Button>
          }
        />
      </div>
    )
  }

  if (!settingsQuery.data) {
    return null
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Card className="page-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Tag color="green" bordered>
            /api/v1/system/settings
          </Tag>
          <Title heading={3} className="page-title">
            系统设置视图
          </Title>
          <Paragraph className="page-copy">
            该页面验证受保护接口的 401/403 语义，并展示后端注入的当前用户信息。
          </Paragraph>
        </Space>
      </Card>
      <section className="detail-grid two-columns">
        <Card className="page-card">
          <Descriptions
            column={1}
            data={[
              { label: 'service', value: settingsQuery.data.service },
              { label: 'trace_id', value: settingsQuery.data.traceId },
              { label: 'user_id', value: settingsQuery.data.user.id },
              { label: 'user_name', value: settingsQuery.data.user.name },
              { label: 'role', value: settingsQuery.data.user.role },
            ]}
            labelStyle={{ width: 140 }}
          />
        </Card>
        <Card className="page-card">
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Title heading={5}>权限集合</Title>
            <Space wrap>
              {settingsQuery.data.user.permissions.map((permission) => (
                <Tag color="arcoblue" key={permission}>
                  {permission}
                </Tag>
              ))}
            </Space>
          </Space>
        </Card>
      </section>
    </Space>
  )
}
