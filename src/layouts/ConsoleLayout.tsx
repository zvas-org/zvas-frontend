import { Button, Layout, Menu, Space, Tag, Typography } from '@arco-design/web-react'
import { IconApps, IconDashboard, IconPoweroff, IconSettings } from '@arco-design/web-react/icon'
import { useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { appEnv } from '@/app/env'
import { useAuthStore } from '@/store/auth'

const { Header, Sider, Content } = Layout
const { Text, Title } = Typography

/**
 * ConsoleLayout 提供 ZVAS 控制台的基础导航壳。
 */
export function ConsoleLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const clearToken = useAuthStore((state) => state.clearToken)

  const selectedKeys = useMemo(() => {
    if (location.pathname.includes('/system/settings')) {
      return ['system-settings']
    }
    return ['system-health']
  }, [location.pathname])

  return (
    <Layout className="console-shell">
      <Sider collapsible breakpoint="lg" width={248} className="console-sider">
        <div className="console-brand">
          <Tag color="arcoblue" bordered>
            ZVAS / UI
          </Tag>
          <Title heading={5} className="console-brand-title">
            资产运营与漏洞扫描控制台
          </Title>
          <Text className="console-brand-copy">初始化阶段先固化壳层、鉴权与接口契约。</Text>
        </div>
        <Menu
          selectedKeys={selectedKeys}
          className="console-menu"
          onClickMenuItem={(key) => {
            const routes: Record<string, string> = {
              'system-health': `${appEnv.basePath}/system/health`,
              'system-settings': `${appEnv.basePath}/system/settings`,
            }
            navigate(routes[key])
          }}
        >
          <Menu.Item key="system-health">
            <IconDashboard />
            系统健康
          </Menu.Item>
          <Menu.Item key="system-settings">
            <IconSettings />
            系统设置
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header className="console-header">
          <Space size={12}>
            <IconApps />
            <span>zvas 管理控制台</span>
          </Space>
          <Space size={12}>
            <Tag color="green" bordered>
              令牌已接入
            </Tag>
            <Text className="console-token">{token || '未设置令牌'}</Text>
            <Button
              icon={<IconPoweroff />}
              onClick={() => {
                clearToken()
                navigate(`${appEnv.basePath}/login`, { replace: true })
              }}
            >
              清除令牌
            </Button>
          </Space>
        </Header>
        <Content className="console-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
