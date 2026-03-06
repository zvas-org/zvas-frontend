import type { DemoTokenPreset } from '@/types/auth'

/**
 * demoTokenPresets 提供与当前后端占位认证兼容的演示令牌。
 */
export const demoTokenPresets: DemoTokenPreset[] = [
  {
    label: '管理员',
    token: 'demo-admin',
    role: 'admin',
    description: '可访问系统设置与扫描控制类接口。',
  },
  {
    label: '操作员',
    token: 'demo-operator',
    role: 'operator',
    description: '具备扫描执行能力，但无法访问系统设置接口。',
  },
  {
    label: '审计员',
    token: 'demo-auditor',
    role: 'auditor',
    description: '适合审阅结果与报表，不具备管理权限。',
  },
  {
    label: '只读',
    token: 'demo-readonly',
    role: 'readonly',
    description: '适合资产和结果浏览。',
  },
]
