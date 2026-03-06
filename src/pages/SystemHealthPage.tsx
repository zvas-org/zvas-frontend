import { Button, Card, Descriptions, Empty, Result, Skeleton, Space, Tag, Typography } from '@arco-design/web-react'

import { useSystemHealthView } from '@/api/adapters/system'

const { Paragraph, Title } = Typography

/**
 * SystemHealthPage 展示系统健康接口的实时联调结果。
 */
export function SystemHealthPage() {
  const healthQuery = useSystemHealthView()

  if (healthQuery.isPending) {
    return (
      <Card className="page-card">
        <Skeleton text={{ rows: 6 }} animation />
      </Card>
    )
  }

  if (healthQuery.isError) {
    return (
      <div className="status-page-shell compact-shell">
        <Result
          status="error"
          title="系统健康接口请求失败"
          subTitle={healthQuery.error.message}
          extra={
            <Button type="primary" onClick={() => healthQuery.refetch()}>
              重新请求
            </Button>
          }
        />
      </div>
    )
  }

  if (!healthQuery.data) {
    return (
      <Card className="page-card">
        <Empty description="系统健康接口未返回可展示数据。" />
      </Card>
    )
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Card className="page-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Tag color="arcoblue" bordered>
            /api/v1/system/health
          </Tag>
          <Title heading={3} className="page-title">
            系统健康视图
          </Title>
          <Paragraph className="page-copy">
            该页面直接联调后端统一响应结构，展示服务名、状态、trace_id 和 HTTP 状态码。
          </Paragraph>
        </Space>
      </Card>
      <section className="detail-grid">
        <Card className="metric-card">
          <span className="metric-label">Service</span>
          <strong className="metric-value">{healthQuery.data.service}</strong>
        </Card>
        <Card className="metric-card accent-card">
          <span className="metric-label">Status</span>
          <strong className="metric-value">{healthQuery.data.status}</strong>
        </Card>
        <Card className="metric-card">
          <span className="metric-label">HTTP</span>
          <strong className="metric-value">{healthQuery.data.httpStatus}</strong>
        </Card>
      </section>
      <Card className="page-card">
        <Descriptions
          column={1}
          data={[
            { label: 'trace_id', value: healthQuery.data.traceId },
            { label: 'query_key', value: '/system/health' },
          ]}
          labelStyle={{ width: 140 }}
        />
      </Card>
    </Space>
  )
}
