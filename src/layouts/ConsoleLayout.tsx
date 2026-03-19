import { Avatar, Button } from '@heroui/react'
import {
  UsersIcon,
  UserIcon,
  ChartPieIcon,
  CubeTransparentIcon,
  RocketLaunchIcon,
  ShieldExclamationIcon,
  WrenchScrewdriverIcon,
  SunIcon,
  MoonIcon,
  PowerIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { useTheme } from '@heroui/use-theme'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { logout } from '@/api/adapters/auth'
import { useAuthStore } from '@/store/auth'

type SubMenu = {
  key: string
  path: string
  label: string
  kicker: string
  permission?: string
}

type MainMenu = {
  key: string
  label: string
  icon: React.ReactNode
  permission?: string
  children: SubMenu[]
}

const MENU_CONFIG: MainMenu[] = [
  {
     key: 'overview', label: 'Overview', icon: <ChartPieIcon className="w-[18px] h-[18px]" />,
     children: [
       { key: 'overview-main', path: '/overview', label: '仪表盘', kicker: 'GLOBAL VIEW' }
     ]
  },
  {
     key: 'assets', label: 'Assets', icon: <CubeTransparentIcon className="w-[18px] h-[18px]" />,
     children: [
       { key: 'asset-pools', path: '/assets', label: '资产池', kicker: 'ASSET POOLS' },
       { key: 'asset-inventory', path: '/assets/inventory', label: '资产清单', kicker: 'INVENTORY' }
     ]
  },
  {
     key: 'tasks', label: 'Tasks', icon: <RocketLaunchIcon className="w-[18px] h-[18px]" />,
     children: [
       { key: 'tasks-list', path: '/tasks', label: '任务列表', kicker: 'TASKS & OPS' },
       { key: 'tasks-templates', path: '/tasks/templates', label: '任务模板', kicker: 'TEMPLATES' },
       { key: 'tasks-workers', path: '/tasks/workers', label: 'Worker / 引擎', kicker: 'WORKERS' }
     ]
  },
  {
     key: 'findings', label: 'Findings', icon: <ShieldExclamationIcon className="w-[18px] h-[18px]" />,
     children: [
       { key: 'findings-list', path: '/findings', label: '漏洞结果', kicker: 'THREAT INTELLIGENCE' },
       { key: 'findings-evidences', path: '/findings/evidences', label: '证据管理', kicker: 'EVIDENCES' },
       { key: 'findings-reports', path: '/findings/reports', label: '报告中心', kicker: 'REPORTS' }
     ]
  },
  {
     key: 'iam', label: 'IAM', icon: <UsersIcon className="w-[18px] h-[18px]" />,
     children: [
       { key: 'iam-users', path: '/iam/users', label: '用户管理', kicker: 'USERS' },
       { key: 'iam-roles', path: '/iam/roles', label: '角色与权限', kicker: 'ROLES' },
       { key: 'iam-audits', path: '/iam/audits', label: '审计日志', kicker: 'AUDIT TRAIL' }
     ]
  },
  {
     key: 'system', label: 'System', icon: <WrenchScrewdriverIcon className="w-[18px] h-[18px]" />,
     children: [
       { key: 'system-health', path: '/system/health', label: '系统健康', kicker: 'HEALTH' },
       { key: 'system-version', path: '/system/version', label: '系统版本', kicker: 'VERSION' },
       { key: 'system-settings', path: '/system/settings', label: '系统设置', kicker: 'SETTINGS', permission: 'settings:manage' }
     ]
  }
]

export interface SubMenuSection {
  key: string
  label: string
  icon?: React.ReactNode
  permission?: string
  items: SubMenu[]
}

export function ConsoleLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = useAuthStore((state) => state.currentUser)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [logoutPending, setLogoutPending] = useState(false)
  const { theme, setTheme } = useTheme()
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const toggleGroup = (key: string) => {
    setExpandedKey(prev => prev === key ? null : key)
  }

  const permissions = useMemo(() => {
    return currentUser?.permissions || []
  }, [currentUser])

  // 展开哪些带子菜单模块（当前策略：默认全部呈开，如果空间过小才折叠。由于只有6大项，直接展开显示更好）
  
  // 计算过滤后的菜单项
  const filteredMenu: SubMenuSection[] = useMemo(() => {
    return MENU_CONFIG.map(section => {
      // 检测父权限
      if (section.permission && !permissions.includes(section.permission)) return null

      // 过滤子项权限
      const visibleChildren = section.children.filter(c => !c.permission || permissions.includes(c.permission))

      if (visibleChildren.length === 0) return null

      return {
        ...section,
        items: visibleChildren
      }
    })
    .filter(section => section !== null) as SubMenuSection[]
  }, [permissions])

  // 计算扁平路由的当前高亮项
  const flatMenus = useMemo(() => {
    return filteredMenu.flatMap(m => m.items.map(c => ({
      ...c, parentKey: m.key, parentLabel: m.label
    })))
  }, [filteredMenu])

  const selectedSub = useMemo(() => {
    // Exact or partial match logic
    const path = location.pathname
    // 如果是带 ID 的详情页如 /assets/123，仍然高亮 /assets，采用倒序长度匹配等
    const matches = flatMenus.filter(m => path.startsWith(m.path)).sort((a, b) => b.path.length - a.path.length)
    return matches.length > 0 ? matches[0] : flatMenus[0]
  }, [location.pathname, flatMenus])

  useEffect(() => {
    if (selectedSub?.parentKey) {
      setExpandedKey(selectedSub.parentKey)
    }
  }, [selectedSub?.parentKey])

  const handleMenuClick = (path: string) => {
    navigate(path)
  }

  const handleLogout = async () => {
    setLogoutPending(true)
    try {
      await logout()
    } catch {
      // ignore
    } finally {
      clearSession()
      setLogoutPending(false)
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="flex h-screen w-full bg-apple-black overflow-hidden">
      <aside className="w-[260px] flex-shrink-0 flex flex-col relative z-20 border-r border-apple-border custom-scrollbar">
        <div className="absolute inset-0 bg-apple-bg/90 backdrop-blur-2xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[200px] bg-gradient-to-b from-apple-blue/5 to-transparent pointer-events-none" />

        <div className="relative flex flex-col h-full">
          <div className="px-6 pt-8 pb-6 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-apple-blue to-apple-blue-light flex items-center justify-center shadow-lg shadow-apple-blue/30 flex-shrink-0">
                <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                  <div className="bg-white rounded-[2px] opacity-90" />
                  <div className="bg-white rounded-[2px] opacity-40" />
                  <div className="bg-white rounded-[2px] opacity-40" />
                  <div className="bg-white rounded-[2px] opacity-90" />
                </div>
              </div>
              <div>
                <div className="text-[11px] font-black tracking-[0.25em] text-apple-text-tertiary uppercase">ZVAS</div>
                <div className="text-[13px] font-semibold text-apple-text-primary tracking-tight leading-tight">Control Center</div>
              </div>
            </div>
          </div>

          <div className="mx-6 mb-4 h-px bg-apple-border" />

          <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2 pb-8 mt-2">
            {filteredMenu.map(group => {
              const isExpanded = expandedKey === group.key
              return (
                <div key={group.key} className="flex flex-col">
                  <button 
                    onClick={() => toggleGroup(group.key)}
                    className={`flex items-center justify-between gap-2 mb-1 px-3 py-1.5 rounded-lg transition-colors cursor-pointer w-full text-left ${isExpanded ? 'text-apple-text-primary' : 'text-apple-text-tertiary hover:bg-white/5 hover:text-apple-text-secondary'}`}
                  >
                     <div className="flex items-center gap-2">
                       <span className={`w-4 h-4 ${isExpanded ? 'text-apple-blue-light' : ''}`}>{group.icon}</span>
                       <span className="text-[11px] font-black tracking-[0.2em] uppercase">{group.label}</span>
                     </div>
                     <span className="w-3.5 h-3.5 opacity-40">
                       {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                     </span>
                  </button>
                  <div className={`grid transition-all duration-300 ease-in-out ${!isExpanded ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100 mb-2'}`}>
                    <div className="overflow-hidden">
                      <nav className="flex flex-col gap-1 pl-4 border-l border-white/5 ml-4 mt-1">
                    {group.items.map(child => {
                      const isSelected = selectedSub?.key === child.key
                      return (
                        <button
                          key={child.key}
                          onClick={() => handleMenuClick(child.path)}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 text-left group relative
                            ${isSelected
                              ? 'bg-apple-blue/10 text-apple-blue-light border border-apple-blue/20 shadow-inner'
                              : 'text-apple-text-secondary hover:bg-white/5 hover:text-apple-text-primary border border-transparent'
                            }
                          `}
                        >
                          <span className={`text-[13px] font-medium tracking-tight transition-colors duration-200 ${isSelected ? 'font-bold' : ''}`}>
                            {child.label}
                          </span>
                        </button>
                      )
                    })}
                      </nav>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="px-4 pt-4 pb-6 flex flex-col gap-3 shrink-0">
            <div className="h-px bg-apple-border" />
            <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-white/[0.04] border border-white/5">
              <Avatar
                size="sm"
                icon={<UserIcon className="w-4 h-4" />}
                classNames={{ base: "bg-gradient-to-br from-apple-blue to-apple-blue-light shadow shadow-apple-blue/20 flex-shrink-0" }}
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-semibold text-apple-text-primary tracking-tight truncate leading-tight">
                  {currentUser?.name || '未知身份'}
                </span>
                <span className="text-[11px] text-apple-text-tertiary truncate leading-tight opacity-80 uppercase tracking-wider">
                  {currentUser?.role || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-apple-black relative">
        <header className="h-[60px] flex-shrink-0 flex items-center justify-between px-8 border-b border-apple-border bg-apple-bg/60 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] font-black tracking-[0.25em] text-apple-text-tertiary uppercase leading-none mb-1">
                {selectedSub?.parentLabel} / {selectedSub?.kicker}
              </div>
              <h1 className="text-[16px] font-bold text-apple-text-primary tracking-tight leading-tight">
                {selectedSub?.label ?? 'ZVAS Console'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="flat"
              size="sm"
              title={theme === 'dark' ? '切至明亮模式' : '切至深色模式'}
              onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="bg-white/5 text-apple-text-tertiary hover:text-apple-text-primary rounded-xl border border-apple-border w-9 h-9 min-w-0"
            >
              {theme === 'dark'
                ? <SunIcon className="w-4 h-4" />
                : <MoonIcon className="w-4 h-4" />}
            </Button>
            <Button
              isIconOnly
              variant="flat"
              size="sm"
              isLoading={logoutPending}
              onPress={handleLogout}
              className="bg-apple-red/8 text-apple-red-light rounded-xl border border-apple-red/20 w-9 h-9 min-w-0"
            >
              <PowerIcon className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto relative custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
