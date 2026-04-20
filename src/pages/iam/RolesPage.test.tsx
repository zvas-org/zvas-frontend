import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { AppProviders } from '@/app/providers'
import { ApiError } from '@/api/client'
import { RolesPage } from '@/pages/iam/RolesPage'
import { useAuthStore } from '@/store/auth'
import {
  cloneRole,
  createPermission,
  createRole,
  deleteRole,
  updatePermission,
  updateRole,
  usePermissionCatalogView,
  useRoleOptionsView,
} from '@/api/adapters/user'

vi.mock('@/api/adapters/user', () => ({
  useRoleOptionsView: vi.fn(),
  usePermissionCatalogView: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  cloneRole: vi.fn(),
  deleteRole: vi.fn(),
  createPermission: vi.fn(),
  updatePermission: vi.fn(),
}))

describe('RolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      token: '',
      currentUser: {
        id: 'user-admin',
        username: 'admin',
        name: '系统管理员',
        role: 'admin',
        roles: ['admin'],
        permissions: ['role:read', 'role:manage'],
      },
      hydrating: false,
    })

    vi.mocked(useRoleOptionsView).mockReturnValue({
      data: [
        {
          id: 'role-admin',
          code: 'admin',
          name: '管理员',
          description: '平台管理员',
          isBuiltin: true,
          permissions: ['role:manage', 'role:read'],
        },
        {
          id: 'role-custom',
          code: 'custom-operator',
          name: '自定义操作员',
          description: '扩展角色',
          isBuiltin: false,
          permissions: ['task:read'],
        },
      ],
      isPending: false,
      isError: false,
      error: null,
    } as never)

    vi.mocked(usePermissionCatalogView).mockReturnValue({
      data: [
        {
          code: 'role:manage',
          name: '管理角色',
          description: '系统权限',
          isBuiltin: true,
          status: 'active',
        },
        {
          code: 'task:read',
          name: '查看任务',
          description: '任务读取',
          isBuiltin: false,
          status: 'active',
        },
      ],
      isPending: false,
      isError: false,
      error: null,
    } as never)

    vi.mocked(createRole).mockResolvedValue({
      id: 'role-created',
      code: 'new-role',
      name: '新角色',
      description: 'desc',
      isBuiltin: false,
      permissions: ['task:read'],
    })
    vi.mocked(updateRole).mockResolvedValue({
      id: 'role-custom',
      code: 'custom-operator',
      name: '自定义操作员',
      description: '扩展角色',
      isBuiltin: false,
      permissions: ['task:read'],
    })
    vi.mocked(cloneRole).mockResolvedValue({
      id: 'role-clone',
      code: 'admin-copy',
      name: '管理员副本',
      description: '复制',
      isBuiltin: false,
      permissions: ['role:manage', 'role:read'],
    })
    vi.mocked(createPermission).mockResolvedValue({
      code: 'iam:custom_manage',
      name: '自定义 IAM 管理',
      description: '自定义权限',
      isBuiltin: false,
      status: 'active',
    })
    vi.mocked(updatePermission).mockResolvedValue({
      code: 'task:read',
      name: '查看任务',
      description: '任务读取',
      isBuiltin: false,
      status: 'active',
    })
    vi.mocked(deleteRole).mockResolvedValue(true)
  })

  function renderPage() {
    render(
      <AppProviders>
        <MemoryRouter>
          <RolesPage />
        </MemoryRouter>
      </AppProviders>,
    )
  }

  it('renders editable IAM workspace with role and permission sections', () => {
    renderPage()

    expect(screen.getByText('IAM 角色与权限工作台')).toBeInTheDocument()
    expect(screen.getByText('权限目录')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建角色' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建权限' })).toBeInTheDocument()
  })

  it('keeps read-only matrix access for role:read users without write actions', () => {
    useAuthStore.setState({
      token: '',
      currentUser: {
        id: 'user-reader',
        username: 'reader',
        name: '只读角色',
        role: 'readonly',
        roles: ['readonly'],
        permissions: ['role:read'],
      },
      hydrating: false,
    })

    renderPage()

    expect(screen.getByText('Permission Matrix')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新建角色' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新建权限' })).not.toBeInTheDocument()
  })

  it('prevents edit buttons for builtin roles and shows clone action', () => {
    renderPage()

    const builtinCard = screen.getByTestId('role-card-admin')
    expect(within(builtinCard).queryByRole('button', { name: '编辑角色' })).not.toBeInTheDocument()
    expect(within(builtinCard).queryByRole('button', { name: '删除角色' })).not.toBeInTheDocument()
    expect(within(builtinCard).getByRole('button', { name: '复制为自定义角色' })).toBeInTheDocument()
  })

  it('creates a custom permission through the catalog modal', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: '新建权限' }))
    await user.type(screen.getByLabelText('权限编码'), 'iam:custom_manage')
    await user.type(screen.getByLabelText('权限名称'), '自定义 IAM 管理')
    await user.type(screen.getByLabelText('权限描述'), '自定义权限')
    await user.click(screen.getByRole('button', { name: '创建权限' }))

    await waitFor(() =>
      expect(vi.mocked(createPermission).mock.calls[0]?.[0]).toEqual({
        code: 'iam:custom_manage',
        name: '自定义 IAM 管理',
        description: '自定义权限',
      }),
    )
  })

  it('shows role delete blocked state when API returns in-use error', async () => {
    const user = userEvent.setup()
    vi.mocked(deleteRole).mockRejectedValueOnce(new ApiError('角色仍被用户占用，不能删除', 409))

    renderPage()

    const customCard = screen.getByTestId('role-card-custom-operator')
    await user.click(within(customCard).getByRole('button', { name: '删除角色' }))

    await waitFor(() => expect(screen.getByText('角色仍被用户占用，不能删除')).toBeInTheDocument())
  })
})
