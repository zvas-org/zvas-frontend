import { Avatar, Button } from '@heroui/react'
import {
  CodeBracketIcon,
  HomeIcon,
  ClockIcon,
  PowerIcon,
  Cog6ToothIcon,
  UserIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { logout } from '@/api/adapters/auth'
import { useAuthStore } from '@/store/auth'

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
      { key: 'system-health', path: '/system/health', label: '系统健康', icon: <HomeIcon className="w-5 h-5" /> },
      { key: 'system-version', path: '/system/version', label: '系统版本', icon: <CodeBracketIcon className="w-5 h-5" /> },
      { key: 'system-settings', path: '/system/settings', label: '系统设置', icon: <Cog6ToothIcon className="w-5 h-5" />, permission: 'settings:manage' },
    ],
    [],
  )

  const iamItems = useMemo(
    () => [
      { key: 'iam-users', path: '/iam/users', label: '用户管理', icon: <UsersIcon className="w-5 h-5" />, permission: 'user:read' },
      { key: 'iam-audits', path: '/iam/audits', label: '审计日志', icon: <ClockIcon className="w-5 h-5" />, permission: 'audit:read' },
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

  const routeMeta = routeMetaMap[selectedKey as keyof typeof routeMetaMap] || routeMetaMap['system-health']

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

  const renderMenuItem = (item: typeof allItems[0]) => {
    const isSelected = selectedKey === item.key
    return (
      <button
        key={item.key}
        onClick={() => handleMenuClick(item.key)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isSelected
          ? 'bg-apple-blue-light/10 text-apple-blue-light font-medium'
          : 'text-apple-text-secondary hover:bg-white/5 hover:text-apple-text-primary'
          }`}
      >
        <span className={isSelected ? 'text-apple-blue-light' : ''}>{item.icon}</span>
        <span className="text-[15px]">{item.label}</span>
      </button>
    )
  }

  return (
    <div className="flex h-screen w-full bg-apple-black text-apple-text-primary overflow-hidden">
      {/* 侧边栏 */}
      <aside className="w-[280px] flex-shrink-0 flex flex-col border-r border-apple-border bg-apple-bg z-20">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="grid grid-cols-2 gap-1 w-6 h-6">
              <div className="bg-apple-blue-light rounded-sm" />
              <div className="bg-white/20 rounded-sm" />
              <div className="bg-white/20 rounded-sm" />
              <div className="bg-apple-blue-light rounded-sm" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-widest text-apple-text-secondary">ZVAS CONTROL</div>
            </div>
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-apple-text-primary">
            资产运营与漏洞扫描平台
          </h2>
          <p className="text-[13px] text-apple-text-secondary leading-relaxed">
            面向私有部署的小团队控制台，先收紧壳层、权限和审计，再扩业务模块。
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-6">
          <div>
            <div className="text-[11px] font-semibold text-apple-text-secondary tracking-wider mb-2 px-3">SYSTEM</div>
            <nav className="flex flex-col gap-1">
              {visibleSystemItems.map(renderMenuItem)}
            </nav>
          </div>

          {visibleIAMItems.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-apple-text-secondary tracking-wider mb-2 px-3">IDENTITY</div>
              <nav className="flex flex-col gap-1">
                {visibleIAMItems.map(renderMenuItem)}
              </nav>
            </div>
          )}
        </div>
      </aside>

      {/* 主体内容 */}
      <main className="flex-1 flex flex-col min-w-0 bg-apple-black relative">
        {/* 顶部状态栏 */}
        <header className="h-[72px] flex-shrink-0 flex items-center justify-between px-8 border-b border-apple-border bg-apple-black/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-apple-text-secondary uppercase">
                {routeMeta.kicker}
              </div>
              <h1 className="text-lg font-bold text-apple-text-primary">
                {routeMeta.title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block border border-apple-blue-light/50 text-apple-blue-light bg-apple-blue-light/10 text-[11px] font-medium px-2 py-0.5 rounded">
                center
              </span>
              <span className="inline-block border border-apple-green-light/50 text-apple-green-light bg-apple-green-light/10 text-[11px] font-medium px-2 py-0.5 rounded">
                online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 py-1.5 px-3 rounded-full bg-apple-secondary-bg/50 border border-apple-border">
              <Avatar size="sm" icon={<UserIcon className="w-4 h-4" />} classNames={{ base: "bg-apple-blue-light" }} />
              <div className="flex flex-col mr-2">
                <span className="text-sm font-medium text-apple-text-primary leading-tight">{currentUser?.name || '未知用户'}</span>
                <span className="text-[11px] text-apple-text-secondary leading-tight">{currentUser?.username || '-'} / {currentUser?.role || '-'}</span>
              </div>
            </div>

            <Button
              isIconOnly
              variant="flat"
              color="danger"
              isLoading={logoutPending}
              onPress={handleLogout}
              className="bg-apple-red/10 text-apple-red-light rounded-full"
            >
              <PowerIcon className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* 页面内容注入点 */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

