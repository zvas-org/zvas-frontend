import { Button, Card, Grid, Input, Message, Space, Tag, Typography } from '@arco-design/web-react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { appEnv } from '@/app/env'
import { useAuthStore } from '@/store/auth'
import { demoTokenPresets } from '@/utils/token'

const { Row, Col } = Grid
const { Paragraph, Text, Title } = Typography

/**
 * LoginPage 提供初始化阶段的 Bearer Token 录入页。
 */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentToken = useAuthStore((state) => state.token)
  const setToken = useAuthStore((state) => state.setToken)
  const [token, setLocalToken] = useState(currentToken)

  const redirectPath = useMemo(() => {
    const search = new URLSearchParams(location.search)
    return search.get('redirect') || `${appEnv.basePath}/system/health`
  }, [location.search])

  const submit = () => {
    if (!token.trim()) {
      Message.warning('请先录入 Bearer Token。')
      return
    }
    setToken(token)
    Message.success('令牌已保存。')
    navigate(redirectPath, { replace: true })
  }

  return (
    <main className="login-shell">
      <section className="login-grid">
        <Card className="login-hero">
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <Tag color="arcoblue" bordered>
              ZVAS / Console
            </Tag>
            <Title heading={1} className="login-title">
              先固化控制台壳层，再扩资产与扫描业务
            </Title>
            <Paragraph className="login-copy">
              当前版本只实现 Bearer Token 占位登录，便于联调后端统一的 401/403 和 trace_id 语义。
            </Paragraph>
            <Space wrap size={10}>
              <Button type="primary" onClick={submit}>
                进入控制台
              </Button>
              <Button onClick={() => navigate(`${appEnv.basePath}/system/health`)}>查看默认路由</Button>
            </Space>
          </Space>
        </Card>
        <Card className="login-panel">
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <div>
              <Text className="section-label">令牌录入</Text>
              <Title heading={4}>使用后端占位令牌快速进入</Title>
            </div>
            <Input.TextArea
              value={token}
              rows={5}
              placeholder="例如：demo-admin"
              onChange={setLocalToken}
            />
            <Row gutter={[12, 12]}>
              {demoTokenPresets.map((preset) => (
                <Col xs={24} sm={12} key={preset.token}>
                  <Card className="token-card" hoverable>
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      <Space align="center">
                        <Tag color="green">{preset.role}</Tag>
                        <Text bold>{preset.label}</Text>
                      </Space>
                      <Paragraph className="token-copy">{preset.description}</Paragraph>
                      <Button
                        long
                        onClick={() => {
                          setLocalToken(preset.token)
                          setToken(preset.token)
                          navigate(redirectPath, { replace: true })
                        }}
                      >
                        使用 {preset.token}
                      </Button>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Space>
        </Card>
      </section>
    </main>
  )
}
