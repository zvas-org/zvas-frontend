import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { useSystemVersionView } from '@/api/adapters/system'
import { SystemVersionPage } from '@/pages/SystemVersionPage'

vi.mock('@/api/adapters/system', () => ({
  useSystemVersionView: vi.fn(),
}))

describe('SystemVersionPage', () => {
  it('should render version metadata from api adapter', () => {
    vi.mocked(useSystemVersionView).mockReturnValue({
      data: {
        service: 'zvas-center',
        version: '0.1.1',
        commit: 'abc123def456',
        buildTime: '2026-03-06T09:00:00Z',
        traceId: 'trace-demo',
        httpStatus: 200,
      },
      error: null,
      isError: false,
      isPending: false,
      refetch: vi.fn(),
    } as never)

    render(
      <MemoryRouter>
        <SystemVersionPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('系统版本视图')).toBeInTheDocument()
    expect(screen.getByText('0.1.1')).toBeInTheDocument()
    expect(screen.getByText('abc123def456')).toBeInTheDocument()
    expect(screen.getByText('trace-demo')).toBeInTheDocument()
    expect(screen.getByText('zvas-center')).toBeInTheDocument()
  })
})
