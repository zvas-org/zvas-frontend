import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { AppProviders } from '@/app/providers'
import { UserManagementPage } from '@/pages/UserManagementPage'
import { useAuthStore } from '@/store/auth'
import { useRoleOptionsView, useUserListView } from '@/api/adapters/user'

vi.mock('@/api/adapters/user', () => ({
  useUserListView: vi.fn(),
  useRoleOptionsView: vi.fn(),
  createUser: vi.fn(),
  updateUserStatus: vi.fn(),
  resetUserPassword: vi.fn(),
  replaceUserRoles: vi.fn(),
}))

describe('UserManagementPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'jwt-token',
      currentUser: {
        id: 'user-admin',
        username: 'admin',
        name: '系统管理员',
        role: 'admin',
        roles: ['admin'],
        permissions: ['user:read', 'user:manage', 'role:manage', 'audit:read'],
      },
    })
  })

  it('should render user management table and actions', () => {
    vi.mocked(useUserListView).mockReturnValue({
      data: {
        items: [
          {
            id: 'user-1',
            username: 'operator-1',
            displayName: '操作员一号',
            status: 'active',
            isBuiltin: false,
            lastLoginAt: '2026-03-06T14:38:57Z',
            roles: [{ id: 'role-operator', code: 'operator', name: '操作员', description: '', isBuiltin: true }],
          },
        ],
        traceId: 'trace-users',
        pagination: { page: 1, pageSize: 20, total: 1 },
      },
      error: null,
      isError: false,
      isPending: false,
    } as never)
    vi.mocked(useRoleOptionsView).mockReturnValue({
      data: [{ id: 'role-operator', code: 'operator', name: '操作员', description: '', isBuiltin: true }],
      error: null,
      isError: false,
      isPending: false,
    } as never)

    render(
      <AppProviders>
        <MemoryRouter>
          <UserManagementPage />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText('用户管理台')).toBeInTheDocument()
    expect(screen.getByText('操作员一号')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建用户' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重置密码' })).toBeInTheDocument()
  })
})
