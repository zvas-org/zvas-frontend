import { Button, Card, Descriptions, Empty, Result, Space, Tag, Typography } from '@arco-design/web-react'

import { useSystemVersionView } from '@/api/adapters/system'

const { Paragraph, Title, Text } = Typography

/**
 * SystemVersionPage 展示构建版本元数据与发布校验信息。
 */
export function SystemVersionPage() {
  const versionQuery = useSystemVersionView()

  if (versionQuery.isPending) {
    return (
      <Card className="page-card">
        <div className="page-loading-block">正在读取构建元数据...</div>
      </Card>
    )
  }

  if (versionQuery.isError) {
    return (
      <div className="status-page-shell compact-shell">
        <Result
          status="error"
          title="系统版本接口请求失败"
          subTitle={versionQuery.error.message}
          extra={
            <Button type="primary" onClick={() => versionQuery.refetch()}>
              重新请求
            </Button>
          }
        />
      </div>
    )
  }

  if (!versionQuery.data) {
    return (
      <Card className="page-card">
        <Empty description="系统版本接口未返回可展示数据。" />
      </Card>
    )
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Card className="page-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Tag color="orangered" bordered>
            /api/v1/system/version
          </Tag>
          <Title heading={3} className="page-title">
            系统版本视图
          </Title>
          <Paragraph className="page-copy">
            该页面直接联调后端构建元数据接口，用于确认当前前端连接的服务版本、提交号和构建时间，便于发布核验与问题追踪。
          </Paragraph>
        </Space>
      </Card>
      <section className="detail-grid">
        <Card className="metric-card accent-card">
          <span className="metric-label">Version</span>
          <strong className="metric-value">{versionQuery.data.version}</strong>
        </Card>
        <Card className="metric-card">
          <span className="metric-label">Commit</span>
          <strong className="metric-value metric-value-compact">{versionQuery.data.commit}</strong>
        </Card>
        <Card className="metric-card">
          <span className="metric-label">Build Time</span>
          <strong className="metric-value metric-value-compact">{formatBuildTime(versionQuery.data.buildTime)}</strong>
        </Card>
      </section>
      <Card className="page-card">
        <Descriptions
          column={1}
          data={[
            { label: 'service', value: versionQuery.data.service },
            { label: 'trace_id', value: versionQuery.data.traceId },
            { label: 'http_status', value: String(versionQuery.data.httpStatus) },
            { label: 'endpoint', value: '/system/version' },
            { label: 'raw_build_time', value: versionQuery.data.buildTime },
          ]}
          labelStyle={{ width: 140 }}
        />
      </Card>
      <Card className="page-card">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Title heading={5}>构建摘要</Title>
          <Text className="page-copy">
            当前展示值来自服务端编译阶段的 ldflags 注入，不依赖数据库和缓存，适合作为排障时的第一手交付校验信息。
          </Text>
        </Space>
      </Card>
    </Space>
  )
}

function formatBuildTime(buildTime: string) {
  const timestamp = Date.parse(buildTime)
  if (Number.isNaN(timestamp)) {
    return buildTime
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: false,
  }).format(new Date(timestamp))
}
