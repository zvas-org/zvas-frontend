import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { useAssetPools } from '@/api/adapters/asset'
import { useTaskRoutes } from '@/api/adapters/route'
import { useDeleteTask, usePauseTask, useResumeTask, useStopTask, useTasks } from '@/api/adapters/task'
import { TasksPage } from '@/pages/tasks/TasksPage'
import { useAuthStore } from '@/store/auth'

const navigateMock = vi.fn()
const refetchMock = vi.fn()
const pauseMutateMock = vi.fn()
const resumeMutateMock = vi.fn()
const stopMutateMock = vi.fn()
const deleteMutateAsyncMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@/api/adapters/task', async () => {
  const actual = await vi.importActual<typeof import('@/api/adapters/task')>('@/api/adapters/task')
  return {
    ...actual,
    useTasks: vi.fn(),
    usePauseTask: vi.fn(),
    useResumeTask: vi.fn(),
    useStopTask: vi.fn(),
    useDeleteTask: vi.fn(),
  }
})

vi.mock('@/api/adapters/asset', () => ({
  useAssetPools: vi.fn(),
}))

vi.mock('@/api/adapters/route', async () => {
  const actual = await vi.importActual<typeof import('@/api/adapters/route')>('@/api/adapters/route')
  return {
    ...actual,
    useTaskRoutes: vi.fn(),
  }
})

function mockTasksPageData() {
  vi.mocked(useTasks).mockReturnValue({
    data: {
      data: [
        {
          id: 'task-weak-1',
          name: '弱扫任务',
          template_code: 'site_weak_scan',
          template_name: '弱点扫描',
          asset_pool_id: 'pool-1',
          asset_pool_name: '测试资产池',
          target_set_id: 'ts-1',
          status: 'running',
          desired_state: 'running',
          stage_plan: ['weak_scan'],
          route_plan: ['weak_scan.site'],
          route_progress: [],
          group_progress: [],
          active_route_code: '',
          active_group: '',
          blocked_reason: '',
          active_attack_route: '',
          created_by: 'user-admin',
          created_at: '2026-04-20T10:00:00Z',
          updated_at: '2026-04-20T10:01:00Z',
          started_at: '2026-04-20T10:00:30Z',
          finished_at: '',
          stage_overrides: {},
        },
      ],
      pagination: {
        page: 1,
        page_size: 20,
        total: 1,
      },
    },
    isPending: false,
    refetch: refetchMock,
  } as ReturnType<typeof useTasks>)

  vi.mocked(useTaskRoutes).mockReturnValue({
    data: [
      {
        key: 'weak_scan.site',
        routeCode: 'weak_scan.site',
        label: '弱点扫描',
        description: '',
        taskType: 'weak_scan',
        taskSubtype: 'site_weak_scan',
        stage: 'weak_scan',
        defaultTopic: 'scan.weak.site',
        groupCode: 'attack',
        groupOrder: 2,
        dispatchOrder: 10,
        seedSource: 'site',
        budgetBucket: 'attack',
        siteLike: true,
      },
    ],
  } as ReturnType<typeof useTaskRoutes>)

  vi.mocked(useAssetPools).mockReturnValue({
    data: {
      data: [],
      pagination: {
        page: 1,
        page_size: 100,
        total: 0,
      },
    },
  } as ReturnType<typeof useAssetPools>)

  vi.mocked(usePauseTask).mockReturnValue({ mutate: pauseMutateMock } as ReturnType<typeof usePauseTask>)
  vi.mocked(useResumeTask).mockReturnValue({ mutate: resumeMutateMock } as ReturnType<typeof useResumeTask>)
  vi.mocked(useStopTask).mockReturnValue({ mutate: stopMutateMock } as ReturnType<typeof useStopTask>)
  vi.mocked(useDeleteTask).mockReturnValue({
    mutateAsync: deleteMutateAsyncMock,
    isPending: false,
  } as ReturnType<typeof useDeleteTask>)
}

describe('TasksPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    refetchMock.mockReset()
    pauseMutateMock.mockReset()
    resumeMutateMock.mockReset()
    stopMutateMock.mockReset()
    deleteMutateAsyncMock.mockReset()

    useAuthStore.setState({
      token: 'jwt-token',
      hydrating: false,
      currentUser: {
        id: 'user-admin',
        username: 'admin',
        name: '系统管理员',
        role: 'admin',
        roles: ['admin'],
        permissions: ['task:read', 'task:update'],
      },
    })

    mockTasksPageData()
  })

  it('navigates to task detail when the row is clicked', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    )

    const row = screen.getByText('弱扫任务').closest('tr')
    expect(row).not.toBeNull()

    await user.click(row!)

    expect(navigateMock).toHaveBeenCalledWith('/tasks/task-weak-1?tab=weak_scan')
  })

  it('does not render the monitor button in the action column', () => {
    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: '监控' })).not.toBeInTheDocument()
  })

  it('opens delete confirmation without navigating away when delete is clicked', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '删除任务' }))

    expect(screen.getByText('确认删除当前任务？')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
