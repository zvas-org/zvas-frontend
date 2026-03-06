import { Avatar, Button, Layout, Menu, Space, Tag, Typography } from '@arco-design/web-react'
import {
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

const routeMetaMap = {
  'system-health': { title: '系统健康', kicker: 'SYSTEM HEALTH' },
  'system-version': { title: '系统版本', kicker: 'BUILD METADATA' },
  'system-settings': { title: '系统设置', kicker: 'PLATFORM SETTINGS' },
  'iam-users': { title: '用户管理', kicker: 'IDENTITY & ACCESS' },
  'iam-audits': { title: '审计日志', kicker: 'AUDIT TRAIL' },
} as const

/**
 * ConsoleLayout 提供 ZVAS 控制台的基础导航壳。
 */
export function ConsoleLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = useAuthStore((state) => state.currentUser)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [logoutPending, setLogoutPending] = useState(false)

  const systemItems = useMemo(
    () => [
      { key: 'system-health', path: '/system/health', label: '系统健康', icon: <IconDashboard /> },
      { key: 'system-version', path: '/system/version', label: '系统版本', icon: <IconCode /> },
      { key: 'system-settings', path: '/system/settings', label: '系统设置', icon: <IconSettings />, permission: 'settings:manage' },
    ],
    [],
  )

  const iamItems = useMemo(
    () => [
      { key: 'iam-users', path: '/iam/users', label: '用户管理', icon: <IconUserGroup />, permission: 'user:read' },
      { key: 'iam-audits', path: '/iam/audits', label: '审计日志', icon: <IconHistory />, permission: 'audit:read' },
    ],
    [],
  )

  const permissions = currentUser?.permissions || []
  const visibleSystemItems = systemItems.filter((item) => !item.permission || permissions.includes(item.permission))
  const visibleIAMItems = iamItems.filter((item) => !item.permission || permissions.includes(item.permission))
  const allItems = [...visibleSystemItems, ...visibleIAMItems]

  const selectedKey = useMemo(() => {
    if (location.pathname.includes('/iam/users')) {
      return 'iam-users'
    }
    if (location.pathname.includes('/iam/audits')) {
      return 'iam-audits'
    }
    if (location.pathname.includes('/system/version')) {
      return 'system-version'
    }
    if (location.pathname.includes('/system/settings')) {
      return 'system-settings'
    }
    return 'system-health'
  }, [location.pathname])

  const routeMeta = routeMetaMap[selectedKey]

  const handleMenuClick = (key: string) => {
    const target = allItems.find((item) => item.key === key)
    if (target) {
      navigate(target.path)
    }
  }

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
      <Sider collapsible breakpoint="lg" width={276} className="console-sider">
        <div className="console-brand">
          <div className="console-brand-mark" aria-hidden>
            <span className="console-brand-cell console-brand-cell-primary" />
            <span className="console-brand-cell console-brand-cell-secondary" />
            <span className="console-brand-cell console-brand-cell-secondary" />
            <span className="console-brand-cell console-brand-cell-primary" />
          </div>
          <div className="console-brand-meta">
            <Text className="console-brand-kicker">ZVAS CONTROL</Text>
            <Title heading={5} className="console-brand-title">
              资产运营与漏洞扫描平台
            </Title>
            <Text className="console-brand-copy">面向私有部署的小团队控制台，先收紧壳层、权限和审计，再扩业务模块。</Text>
          </div>
        </div>

        <div className="console-nav-block">
          <Text className="console-nav-title">SYSTEM</Text>
          <Menu selectedKeys={[selectedKey]} className="console-menu" onClickMenuItem={handleMenuClick}>
            {visibleSystemItems.map((item) => (
              <Menu.Item key={item.key}>
                {item.icon}
                {item.label}
              </Menu.Item>
            ))}
          </Menu>
        </div>

        <div className="console-nav-block">
          <Text className="console-nav-title">IDENTITY</Text>
          <Menu selectedKeys={[selectedKey]} className="console-menu" onClickMenuItem={handleMenuClick}>
            {visibleIAMItems.map((item) => (
              <Menu.Item key={item.key}>
                {item.icon}
                {item.label}
              </Menu.Item>
            ))}
          </Menu>
        </div>
      </Sider>
      <Layout>
        <Header className="console-header">
          <div className="console-header-main">
            <div>
              <Text className="console-header-kicker">{routeMeta.kicker}</Text>
              <Title heading={6} className="console-header-title">
                {routeMeta.title}
              </Title>
            </div>
            <Space size={8}>
              <Tag color="blue" bordered>
                center
              </Tag>
              <Tag color="green" bordered>
                online
              </Tag>
            </Space>
          </div>
          <div className="console-user-panel">
            <Avatar size={30} className="console-user-avatar">
              <IconUser />
            </Avatar>
            <div className="console-user-block">
              <Text className="console-user-name">{currentUser?.name || '未知用户'}</Text>
              <Text className="console-user-meta">{currentUser?.username || '-'} / {currentUser?.role || '-'}</Text>
            </div>
            <Button icon={<IconPoweroff />} loading={logoutPending} onClick={handleLogout}>
              退出
            </Button>
          </div>
        </Header>
        <Content className="console-content">
          <div className="console-page-frame">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
