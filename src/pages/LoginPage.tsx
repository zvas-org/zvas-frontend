import { Button, Card, Form, Grid, Input, Message, Space, Tag, Typography } from '@arco-design/web-react'
import { IconLock, IconUser } from '@arco-design/web-react/icon'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { login } from '@/api/adapters/auth'
import { ApiError } from '@/api/client'
import { useAuthStore } from '@/store/auth'

const { Row, Col } = Grid
const FormItem = Form.Item
const { Paragraph, Text, Title } = Typography

interface LoginFormValues {
  username: string
  password: string
}

/**
 * LoginPage 提供真实账号密码登录入口。
 */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((state) => state.setSession)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<LoginFormValues>()

  const redirectPath = new URLSearchParams(location.search).get('redirect') || '/system/health'

  const submit = async () => {
    try {
      const values = await form.validate()
      setSubmitting(true)
      const result = await login(values)
      setSession(result.accessToken, result.user)
      Message.success('登录成功。')
      navigate(redirectPath, { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        Message.error(error.message)
        return
      }
      if (error instanceof Error) {
        Message.warning(error.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-grid">
        <Card className="login-hero">
          <Space direction="vertical" size={22} style={{ width: '100%' }}>
            <div className="login-brand-badge" aria-hidden>
              <span className="console-brand-cell console-brand-cell-primary" />
              <span className="console-brand-cell console-brand-cell-secondary" />
              <span className="console-brand-cell console-brand-cell-secondary" />
              <span className="console-brand-cell console-brand-cell-primary" />
            </div>
            <Tag color="arcoblue" bordered>
              ZVAS / Private Console
            </Tag>
            <div>
              <Text className="section-label">Identity Access</Text>
              <Title heading={1} className="login-title">
                登录控制台，先确认身份，再进入资产和扫描工作面板
              </Title>
            </div>
            <Paragraph className="login-copy">
              这套界面不走展示型产品页路线，而是按运维控制台收紧信息密度。当前已接真实 `/api/v1/auth/login`、RBAC 和审计日志链路。
            </Paragraph>
            <div className="login-bullet-list">
              <div className="login-bullet-item">
                <Text className="login-bullet-label">Runtime</Text>
                <Text className="login-bullet-value">PostgreSQL / NATS 已接入</Text>
              </div>
              <div className="login-bullet-item">
                <Text className="login-bullet-label">IAM</Text>
                <Text className="login-bullet-value">用户、角色、审计已启用</Text>
              </div>
              <div className="login-bullet-item">
                <Text className="login-bullet-label">Mode</Text>
                <Text className="login-bullet-value">Center Console / Local Dev</Text>
              </div>
            </div>
            <Button onClick={() => navigate('/system/version')}>查看版本元数据</Button>
          </Space>
        </Card>
        <Card className="login-panel">
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <div>
              <Text className="section-label">账号密码登录</Text>
              <Title heading={4} className="login-panel-title">使用有效账号进入控制台</Title>
              <Paragraph className="login-copy">
                默认管理员仅用于本地初始化联调，后续应通过用户管理页创建并分配角色。
              </Paragraph>
            </div>
            <Form<LoginFormValues>
              layout="vertical"
              form={form}
              initialValues={{ username: 'admin', password: 'Admin@123456' }}
              onSubmit={submit}
            >
              <FormItem field="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input prefix={<IconUser />} placeholder="例如：admin" autoComplete="username" />
              </FormItem>
              <FormItem field="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password prefix={<IconLock />} placeholder="请输入密码" autoComplete="current-password" />
              </FormItem>
              <Row gutter={[12, 12]}>
                <Col span={24}>
                  <Button long type="primary" htmlType="submit" loading={submitting}>
                    登录
                  </Button>
                </Col>
              </Row>
            </Form>
            <Card className="token-card" hoverable={false}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text bold>默认管理员</Text>
                <Text className="token-copy">用户名：admin</Text>
                <Text className="token-copy">密码：Admin@123456</Text>
              </Space>
            </Card>
          </Space>
        </Card>
      </section>
    </main>
  )
}
