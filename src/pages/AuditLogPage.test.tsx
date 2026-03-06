import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { AppProviders } from '@/app/providers'
import { useAuditListView } from '@/api/adapters/audit'
import { AuditLogPage } from '@/pages/AuditLogPage'

vi.mock('@/api/adapters/audit', () => ({
  useAuditListView: vi.fn(),
}))

describe('AuditLogPage', () => {
  it('should render audit list summary and rows', () => {
    vi.mocked(useAuditListView).mockReturnValue({
      data: {
        items: [
          {
            id: 'audit-1',
            actorUserID: 'user-admin',
            actorUsername: 'admin',
            actorRole: 'admin',
            action: 'user.password.reset',
            resourceType: 'user',
            resourceID: 'user-1',
            riskLevel: 'high',
            result: 'success',
            traceId: 'trace-audit',
            path: '/api/v1/users/:id/reset-password',
            method: 'POST',
            remoteIP: '127.0.0.1',
            errorMessage: '',
            detail: { source: 'test' },
            createdAt: '2026-03-06T14:38:57Z',
          },
        ],
        traceId: 'trace-list',
        pagination: { page: 1, pageSize: 20, total: 1 },
      },
      error: null,
      isError: false,
      isPending: false,
      refetch: vi.fn(),
    } as never)

    render(
      <AppProviders>
        <MemoryRouter>
          <AuditLogPage />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText('审计日志视图')).toBeInTheDocument()
    expect(screen.getByText('user.password.reset')).toBeInTheDocument()
    expect(screen.getByText('高风险')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看' })).toBeInTheDocument()
  })
})
