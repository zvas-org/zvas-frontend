import { Avatar, Button, Layout, Menu, Space, Tag, Typography } from '@arco-design/web-react'
import {
  IconApps,
  IconCode,
  IconDashboard,
  IconHistory,
  IconPoweroff,
  IconSettings,
  IconUser,
  IconUserGroup,
} from '@arco-design/web-react/icon'
import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { logout } from '@/api/adapters/auth'
import { useAuthStore } from '@/store/auth'

const { Header, Sider, Content } = Layout
const { Text, Title } = Typography

/**
 * ConsoleLayout 提供 ZVAS 控制台的基础导航壳。
 */
export function ConsoleLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = useAuthStore((state) => state.currentUser)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [logoutPending, setLogoutPending] = useState(false)

  const menuItems = useMemo(() => {
    const permissions = currentUser?.permissions || []
    return [
      { key: 'system-health', path: '/system/health', label: '系统健康', icon: <IconDashboard /> },
      { key: 'system-version', path: '/system/version', label: '系统版本', icon: <IconCode /> },
      { key: 'system-settings', path: '/system/settings', label: '系统设置', icon: <IconSettings />, permission: 'settings:manage' },
      { key: 'iam-users', path: '/iam/users', label: '用户管理', icon: <IconUserGroup />, permission: 'user:read' },
      { key: 'iam-audits', path: '/iam/audits', label: '审计日志', icon: <IconHistory />, permission: 'audit:read' },
    ].filter((item) => !item.permission || permissions.includes(item.permission))
  }, [currentUser?.permissions])

  const selectedKeys = useMemo(() => {
    if (location.pathname.includes('/iam/users')) {
      return ['iam-users']
    }
    if (location.pathname.includes('/iam/audits')) {
      return ['iam-audits']
    }
    if (location.pathname.includes('/system/version')) {
      return ['system-version']
    }
    if (location.pathname.includes('/system/settings')) {
      return ['system-settings']
    }
    return ['system-health']
  }, [location.pathname])

  const handleLogout = async () => {
    setLogoutPending(true)
    try {
      await logout()
    } catch {
      // 后端当前为无状态 JWT，退出接口失败不影响本地清理。
    } finally {
      clearSession()
      setLogoutPending(false)
      navigate('/login', { replace: true })
    }
  }

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
            const target = menuItems.find((item) => item.key === key)
            if (target) {
              navigate(target.path)
            }
          }}
        >
          {menuItems.map((item) => (
            <Menu.Item key={item.key}>
              {item.icon}
              {item.label}
            </Menu.Item>
          ))}
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
              已登录
            </Tag>
            <Avatar size={28} style={{ backgroundColor: '#165dff' }}>
              <IconUser />
            </Avatar>
            <Space size={4} direction="vertical" className="console-user-block">
              <Text className="console-user-name">{currentUser?.name || '未知用户'}</Text>
              <Text className="console-user-meta">{currentUser?.username || '-'} / {currentUser?.role || '-'}</Text>
            </Space>
            <Button icon={<IconPoweroff />} loading={logoutPending} onClick={handleLogout}>
              退出登录
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
