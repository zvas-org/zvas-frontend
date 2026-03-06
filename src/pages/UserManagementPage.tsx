import {
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Message,
  Modal,
  Popconfirm,
  Result,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { isApiError } from '@/api/client'
import {
  createUser,
  replaceUserRoles,
  resetUserPassword,
  updateUserStatus,
  useRoleOptionsView,
  useUserListView,
  type CreateUserPayload,
  type UserView,
} from '@/api/adapters/user'
import { useAuthStore } from '@/store/auth'

const { Search } = Input
const { Paragraph, Text, Title } = Typography

interface CreateUserDraft {
  username: string
  displayName: string
  password: string
  roleCodes: string[]
}

/**
 * UserManagementPage 展示用户管理、状态控制和角色编辑能力。
 */
export function UserManagementPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.currentUser)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all')
  const [createVisible, setCreateVisible] = useState(false)
  const [createDraft, setCreateDraft] = useState<CreateUserDraft>({
    username: '',
    displayName: '',
    password: '',
    roleCodes: [],
  })
  const [resetTarget, setResetTarget] = useState<UserView | null>(null)
  const [resetPasswordDraft, setResetPasswordDraft] = useState('')
  const [roleTarget, setRoleTarget] = useState<UserView | null>(null)
  const [roleDraft, setRoleDraft] = useState<string[]>([])

  const usersQuery = useUserListView({ page, page_size: pageSize })
  const rolesQuery = useRoleOptionsView()

  useEffect(() => {
    const error = usersQuery.error || rolesQuery.error
    if (!error || !isApiError(error)) {
      return
    }

    if (error.status === 401) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true })
      return
    }

    if (error.status === 403) {
      navigate('/403', { replace: true })
    }
  }, [location.pathname, navigate, rolesQuery.error, usersQuery.error])

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      Message.success('用户已创建')
      setCreateVisible(false)
      setCreateDraft({ username: '', displayName: '', password: '', roleCodes: [] })
      await refreshUsersAndAudits(queryClient)
    },
    onError: (error) => {
      Message.error(resolveActionError(error, '创建用户失败'))
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ userID, status }: { userID: string; status: 'active' | 'disabled' }) => updateUserStatus(userID, { status }),
    onSuccess: async (_, variables) => {
      Message.success(variables.status === 'disabled' ? '用户已禁用' : '用户已启用')
      await refreshUsersAndAudits(queryClient)
    },
    onError: (error) => {
      Message.error(resolveActionError(error, '更新用户状态失败'))
    },
  })

  const resetMutation = useMutation({
    mutationFn: ({ userID, password }: { userID: string; password: string }) => resetUserPassword(userID, { newPassword: password }),
    onSuccess: async () => {
      Message.success('密码已重置')
      setResetTarget(null)
      setResetPasswordDraft('')
      await refreshUsersAndAudits(queryClient)
    },
    onError: (error) => {
      Message.error(resolveActionError(error, '重置密码失败'))
    },
  })

  const roleMutation = useMutation({
    mutationFn: ({ userID, roleCodes }: { userID: string; roleCodes: string[] }) => replaceUserRoles(userID, { roleCodes }),
    onSuccess: async () => {
      Message.success('角色已更新')
      setRoleTarget(null)
      setRoleDraft([])
      await refreshUsersAndAudits(queryClient)
    },
    onError: (error) => {
      Message.error(resolveActionError(error, '更新用户角色失败'))
    },
  })

  const canManageUsers = hasPermission(currentUser?.permissions, 'user:manage')
  const canManageRoles = hasPermission(currentUser?.permissions, 'role:manage')
  const roleOptions = rolesQuery.data || []

  const filteredItems = useMemo(() => {
    const base = usersQuery.data?.items || []
    return base.filter((item) => {
      const keywordValue = keyword.trim().toLowerCase()
      const matchesKeyword =
        keywordValue.length === 0 ||
        item.username.toLowerCase().includes(keywordValue) ||
        item.displayName.toLowerCase().includes(keywordValue) ||
        item.roles.some((role) => `${role.name} ${role.code}`.toLowerCase().includes(keywordValue))

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      return matchesKeyword && matchesStatus
    })
  }, [keyword, statusFilter, usersQuery.data?.items])

  const metrics = useMemo(() => {
    const items = usersQuery.data?.items || []
    return {
      total: usersQuery.data?.pagination.total || 0,
      active: items.filter((item) => item.status === 'active').length,
      disabled: items.filter((item) => item.status === 'disabled').length,
      builtin: items.filter((item) => item.isBuiltin).length,
    }
  }, [usersQuery.data])

  if (usersQuery.isPending || rolesQuery.isPending) {
    return (
      <Card className="page-card">
        <Skeleton text={{ rows: 8 }} animation />
      </Card>
    )
  }

  if (usersQuery.isError || rolesQuery.isError) {
    const error = usersQuery.error || rolesQuery.error
    if (isApiError(error) && (error.status === 401 || error.status === 403)) {
      return null
    }

    return (
      <div className="status-page-shell compact-shell">
        <Result
          status="error"
          title="用户管理接口请求失败"
          subTitle={error instanceof Error ? error.message : '未知错误'}
          extra={
            <Button type="primary" onClick={() => void refreshUsersAndAudits(queryClient, false)}>
              刷新页面
            </Button>
          }
        />
      </div>
    )
  }

  if (!usersQuery.data) {
    return (
      <Card className="page-card">
        <Empty description="用户接口未返回可展示数据。" />
      </Card>
    )
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Card className="page-card page-hero-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Tag color="cyan" bordered>
            /api/v1/users + /api/v1/roles
          </Tag>
          <Title heading={3} className="page-title">
            用户管理台
          </Title>
          <Paragraph className="page-copy">
            该页面承接账号运营的核心动作：创建用户、禁用账号、重置密码、替换角色，并直接反映后台 RBAC 与审计链路是否可用。
          </Paragraph>
        </Space>
      </Card>

      <section className="detail-grid management-metrics">
        <Card className="metric-card accent-card">
          <span className="metric-label">Total Users</span>
          <strong className="metric-value">{metrics.total}</strong>
        </Card>
        <Card className="metric-card">
          <span className="metric-label">Active</span>
          <strong className="metric-value">{metrics.active}</strong>
        </Card>
        <Card className="metric-card">
          <span className="metric-label">Disabled</span>
          <strong className="metric-value">{metrics.disabled}</strong>
        </Card>
        <Card className="metric-card">
          <span className="metric-label">Builtin</span>
          <strong className="metric-value">{metrics.builtin}</strong>
        </Card>
      </section>

      <Card className="page-card toolbar-card">
        <div className="toolbar-grid">
          <Search
            allowClear
            value={keyword}
            placeholder="按用户名、显示名、角色页内筛选"
            onChange={setKeyword}
          />
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as 'all' | 'active' | 'disabled')}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '启用', value: 'active' },
              { label: '禁用', value: 'disabled' },
            ]}
          />
          <Button onClick={() => void refreshUsersAndAudits(queryClient, false)}>刷新列表</Button>
          <Button type="primary" disabled={!canManageUsers} onClick={() => setCreateVisible(true)}>
            新建用户
          </Button>
        </div>
        <Text className="toolbar-meta">当前筛选仅作用于本页数据；跨页检索等后端条件查询将在资产与用户检索阶段补齐。</Text>
      </Card>

      <Card className="page-card table-card">
        <Table<UserView>
          rowKey="id"
          data={filteredItems}
          pagination={{
            current: usersQuery.data.pagination.page,
            pageSize: usersQuery.data.pagination.pageSize,
            total: usersQuery.data.pagination.total,
            onChange: (nextPage) => setPage(nextPage),
            onPageSizeChange: (nextPageSize) => {
              setPage(1)
              setPageSize(nextPageSize)
            },
            showTotal: true,
            sizeCanChange: true,
          }}
          columns={[
            {
              title: '用户',
              dataIndex: 'username',
              width: 220,
              render: (_, record) => (
                <Space direction="vertical" size={2}>
                  <Text className="table-main-text">{record.displayName}</Text>
                  <Text className="table-sub-text">{record.username}</Text>
                </Space>
              ),
            },
            {
              title: '角色集合',
              dataIndex: 'roles',
              width: 260,
              render: (_, record) => (
                <Space wrap>
                  {record.roles.map((role) => (
                    <Tag color="arcoblue" key={`${record.id}-${role.code}`}>
                      {role.name}
                    </Tag>
                  ))}
                </Space>
              ),
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 120,
              render: (_, record) => <Tag color={record.status === 'active' ? 'green' : 'red'}>{record.status === 'active' ? '启用' : '禁用'}</Tag>,
            },
            {
              title: '属性',
              dataIndex: 'isBuiltin',
              width: 120,
              render: (_, record) => (
                <Tag color={record.isBuiltin ? 'gold' : 'gray'}>{record.isBuiltin ? '内置用户' : '普通用户'}</Tag>
              ),
            },
            {
              title: '最近登录',
              dataIndex: 'lastLoginAt',
              width: 220,
              render: (_, record) => (record.lastLoginAt ? formatDateTime(record.lastLoginAt) : <Text className="table-sub-text">暂无记录</Text>),
            },
            {
              title: '动作',
              dataIndex: 'actions',
              width: 320,
              render: (_, record) => (
                <Space wrap>
                  <Popconfirm
                    focusLock
                    title={record.status === 'active' ? '确认禁用该用户？' : '确认启用该用户？'}
                    content={record.status === 'active' ? '禁用后该用户将无法登录控制台。' : '启用后该用户可重新登录控制台。'}
                    onOk={() => statusMutation.mutate({ userID: record.id, status: record.status === 'active' ? 'disabled' : 'active' })}
                    disabled={!canManageUsers || record.isBuiltin || statusMutation.isPending}
                  >
                    <Button
                      size="mini"
                      status={record.status === 'active' ? 'danger' : 'success'}
                      disabled={!canManageUsers || record.isBuiltin}
                    >
                      {record.status === 'active' ? '禁用' : '启用'}
                    </Button>
                  </Popconfirm>
                  <Button
                    size="mini"
                    disabled={!canManageUsers}
                    onClick={() => {
                      setResetTarget(record)
                      setResetPasswordDraft('')
                    }}
                  >
                    重置密码
                  </Button>
                  <Button
                    size="mini"
                    disabled={!canManageRoles || record.isBuiltin}
                    onClick={() => {
                      setRoleTarget(record)
                      setRoleDraft(record.roles.map((role) => role.code))
                    }}
                  >
                    编辑角色
                  </Button>
                </Space>
              ),
            },
          ]}
          noDataElement={<Empty description="当前页没有可展示用户。" />}
        />
      </Card>

      <Card className="page-card">
        <Descriptions
          column={1}
          data={[
            { label: 'trace_id', value: usersQuery.data.traceId },
            { label: 'page', value: String(usersQuery.data.pagination.page) },
            { label: 'page_size', value: String(usersQuery.data.pagination.pageSize) },
            { label: 'permissions', value: (currentUser?.permissions || []).join(', ') || '-' },
          ]}
          labelStyle={{ width: 140 }}
        />
      </Card>

      <Modal
        title="创建新用户"
        visible={createVisible}
        onCancel={() => {
          setCreateVisible(false)
          setCreateDraft({ username: '', displayName: '', password: '', roleCodes: [] })
        }}
        onOk={() => createMutation.mutate(toCreatePayload(createDraft))}
        okButtonProps={{
          loading: createMutation.isPending,
          disabled:
            createDraft.username.trim().length === 0 ||
            createDraft.displayName.trim().length === 0 ||
            createDraft.password.length < 8 ||
            createDraft.roleCodes.length === 0,
        }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Input
            placeholder="用户名，例如 operator-01"
            value={createDraft.username}
            onChange={(value) => setCreateDraft((draft) => ({ ...draft, username: value }))}
          />
          <Input
            placeholder="显示名，例如 漏洞运营一组"
            value={createDraft.displayName}
            onChange={(value) => setCreateDraft((draft) => ({ ...draft, displayName: value }))}
          />
          <Input.Password
            placeholder="初始密码，至少 8 位"
            value={createDraft.password}
            onChange={(value) => setCreateDraft((draft) => ({ ...draft, password: value }))}
          />
          <Select
            mode="multiple"
            placeholder="选择一个或多个角色"
            value={createDraft.roleCodes}
            onChange={(value) => setCreateDraft((draft) => ({ ...draft, roleCodes: value as string[] }))}
            options={roleOptions.map((role) => ({ label: `${role.name} / ${role.code}`, value: role.code }))}
          />
        </Space>
      </Modal>

      <Modal
        title={`重置密码 · ${resetTarget?.displayName || ''}`}
        visible={Boolean(resetTarget)}
        onCancel={() => {
          setResetTarget(null)
          setResetPasswordDraft('')
        }}
        onOk={() => {
          if (!resetTarget) {
            return
          }
          resetMutation.mutate({ userID: resetTarget.id, password: resetPasswordDraft })
        }}
        okButtonProps={{
          loading: resetMutation.isPending,
          disabled: resetPasswordDraft.length < 8,
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text className="page-copy">重置密码属于高风险动作，将进入审计日志。</Text>
          <Input.Password value={resetPasswordDraft} placeholder="输入新的临时密码" onChange={setResetPasswordDraft} />
        </Space>
      </Modal>

      <Modal
        title={`编辑角色 · ${roleTarget?.displayName || ''}`}
        visible={Boolean(roleTarget)}
        onCancel={() => {
          setRoleTarget(null)
          setRoleDraft([])
        }}
        onOk={() => {
          if (!roleTarget) {
            return
          }
          roleMutation.mutate({ userID: roleTarget.id, roleCodes: roleDraft })
        }}
        okButtonProps={{
          loading: roleMutation.isPending,
          disabled: roleDraft.length === 0,
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text className="page-copy">替换角色会直接改变该用户的权限集合。</Text>
          <Select
            mode="multiple"
            value={roleDraft}
            onChange={(value) => setRoleDraft(value as string[])}
            options={roleOptions.map((role) => ({ label: `${role.name} / ${role.code}`, value: role.code }))}
          />
        </Space>
      </Modal>
    </Space>
  )
}

function toCreatePayload(draft: CreateUserDraft): CreateUserPayload {
  return {
    username: draft.username.trim(),
    displayName: draft.displayName.trim(),
    password: draft.password,
    roleCodes: draft.roleCodes,
  }
}

function hasPermission(permissions: string[] | undefined, permission: string) {
  return Boolean(permissions?.includes(permission))
}

async function refreshUsersAndAudits(queryClient: ReturnType<typeof useQueryClient>, includeAudits = true) {
  await queryClient.invalidateQueries({ queryKey: ['/users'] })
  if (includeAudits) {
    await queryClient.invalidateQueries({ queryKey: ['/audits'] })
  }
}

function resolveActionError(error: unknown, fallback: string) {
  if (isApiError(error)) {
    return error.message
  }
  return error instanceof Error ? error.message : fallback
}

function formatDateTime(value: string) {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  }).format(new Date(timestamp))
}
