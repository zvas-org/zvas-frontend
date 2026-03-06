import { Button, Card, Space, Tag, Typography } from '@arco-design/web-react'
import type { PropsWithChildren } from 'react'

const { Paragraph, Title } = Typography

interface PlaceholderPageProps extends PropsWithChildren {
  title: string
  subtitle: string
  badge: string
}

/**
 * PlaceholderPage 统一展示初始化阶段尚未联通接口的页面占位。
 */
export function PlaceholderPage({ title, subtitle, badge, children }: PlaceholderPageProps) {
  return (
    <Card className="page-card">
      <Space direction="vertical" size={18} style={{ width: '100%' }}>
        <Tag color="arcoblue" bordered>
          {badge}
        </Tag>
        <Title heading={3} className="page-title">
          {title}
        </Title>
        <Paragraph className="page-copy">{subtitle}</Paragraph>
        {children}
        <Button>等待 API 接入</Button>
      </Space>
    </Card>
  )
}
