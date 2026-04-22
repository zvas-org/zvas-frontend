import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import {
  useDeleteTaskFinding,
  useTaskFindingDetail,
  useTaskFindingRuleMap,
  useTaskFindings,
  useUpdateTaskFinding,
} from '@/api/adapters/task'
import { AppProviders } from '@/app/providers'
import { buildMappingPatch } from '@/components/tasks/FindingReportEditModal'
import { TaskFindingsTab } from '@/components/tasks/TaskFindingsTab'
import { useAuthStore } from '@/store/auth'

const saveMock = vi.fn()
const deleteMock = vi.fn()
const refetchListMock = vi.fn()
const refetchDetailMock = vi.fn()
const refetchRuleMapMock = vi.fn()

vi.mock('@/api/adapters/task', async () => {
  const actual = await vi.importActual<typeof import('@/api/adapters/task')>('@/api/adapters/task')
  return {
    ...actual,
    useTaskFindings: vi.fn(),
    useTaskFindingDetail: vi.fn(),
    useTaskFindingRuleMap: vi.fn(),
    useUpdateTaskFinding: vi.fn(),
    useDeleteTaskFinding: vi.fn(),
  }
})

function mockFindingList() {
  vi.mocked(useTaskFindings).mockReturnValue({
    data: {
      data: [{
        id: 'finding-1',
        vulnerability_key: 'demo-rule|https://demo.example.com|1',
        base_url: 'https://demo.example.com',
        link: 'https://demo.example.com/.git/config',
        target_url: 'https://demo.example.com/.git/config',
        rule_id: 'demo-rule',
        rule_name: 'Git 配置泄露',
        severity: 'high',
        tags: ['demo'],
        matcher_name: 'body',
        matched_at: '2026-04-22T08:00:00Z',
        host: 'demo.example.com',
        ip: '192.0.2.10',
        port: 443,
        scheme: 'https',
        classification: { description: '原始描述', remediation: '原始修复建议' },
        evidence: { request: 'GET / HTTP/1.1', response: 'HTTP/1.1 200 OK' },
        raw: { info: { description: '原始描述', remediation: '原始修复建议' } },
      }],
      pagination: { page: 1, page_size: 20, total: 1 },
    },
    isPending: false,
    isError: false,
    refetch: refetchListMock,
  } as never)
}

function mockFindingDetail() {
  vi.mocked(useTaskFindingDetail).mockReturnValue({
    data: {
      id: 'finding-1',
      vulnerability_key: 'demo-rule|https://demo.example.com|1',
      base_url: 'https://demo.example.com',
      link: 'https://demo.example.com/.git/config',
      target_url: 'https://demo.example.com/.git/config',
      rule_id: 'demo-rule',
      rule_name: 'Git 配置泄露',
      severity: '高危',
      tags: ['demo'],
      matcher_name: 'body',
      matched_at: '2026-04-22T08:00:00Z',
      host: 'demo.example.com',
      ip: '192.0.2.10',
      port: 443,
      scheme: 'https',
      classification: { description: '中文描述', remediation: '中文修复建议' },
      evidence: { request: 'GET / HTTP/1.1', response: 'HTTP/1.1 200 OK' },
      raw: { info: { description: '中文描述', remediation: '中文修复建议' } },
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: refetchDetailMock,
  } as never)
}

function mockFindingRuleMap() {
  vi.mocked(useTaskFindingRuleMap).mockReturnValue({
    data: {
      template_id: 'demo-rule',
      current: {
        vul_type_id: 2,
        code: 'git-config',
        vul_type: '敏感文件泄露',
        default_severity: '高危',
        impact_zh: '映射描述',
        remediation_zh: '映射修复建议',
      },
      candidates: [{
        vul_type_id: 2,
        code: 'git-config',
        vul_type: '敏感文件泄露',
        default_severity: '高危',
        impact_zh: '映射描述',
        remediation_zh: '映射修复建议',
      }],
    },
    isPending: false,
    refetch: refetchRuleMapMock,
  } as never)
}

function renderTab() {
  render(
    <AppProviders>
      <TaskFindingsTab taskId="task-1" />
    </AppProviders>,
  )
}

describe('TaskFindingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      token: '',
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

    mockFindingList()
    mockFindingDetail()
    mockFindingRuleMap()

    saveMock.mockResolvedValue({
      id: 'finding-1',
      vulnerability_key: 'demo-rule|https://demo.example.com|1',
      base_url: 'https://demo.example.com',
      link: 'https://demo.example.com/.git/config',
      target_url: 'https://demo.example.com/.git/config',
      rule_id: 'demo-rule',
      rule_name: '保存后的漏洞名称',
      severity: '高危',
      tags: ['demo'],
      matcher_name: 'body',
      matched_at: '2026-04-22T08:00:00Z',
      host: 'demo.example.com',
      ip: '192.0.2.10',
      port: 443,
      scheme: 'https',
      classification: { description: '中文描述', remediation: '中文修复建议' },
      evidence: { request: 'GET / HTTP/1.1', response: 'HTTP/1.1 200 OK' },
      raw: {},
    })
    deleteMock.mockResolvedValue(undefined)

    vi.mocked(useUpdateTaskFinding).mockReturnValue({
      mutateAsync: saveMock,
      isPending: false,
    } as never)
    vi.mocked(useDeleteTaskFinding).mockReturnValue({
      mutateAsync: deleteMock,
      isPending: false,
    } as never)
  })

  it('renders Chinese severity text in the findings list', () => {
    renderTab()

    expect(screen.getAllByText('高危').length).toBeGreaterThan(0)
    expect(screen.queryByText('high')).not.toBeInTheDocument()
  })

  it('renders the request-response column with view edit and delete actions', () => {
    renderTab()

    expect(screen.getByRole('columnheader', { name: '请求与响应' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()
  })

  it('opens a read-only payload viewer from the view action', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: '查看' }))

    expect(await screen.findByText('请求与响应详情')).toBeInTheDocument()
    expect(screen.getByText('请求')).toBeInTheDocument()
    expect(screen.getByText('响应')).toBeInTheDocument()
    expect(screen.getByText('GET / HTTP/1.1')).toBeInTheDocument()
    expect(screen.getByText('HTTP/1.1 200 OK')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '保存修改' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /映射覆盖/i })).not.toBeInTheDocument()
  })

  it('submits edited finding fields through the aggregate save API', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: '编辑' }))
    await user.clear(screen.getByLabelText('漏洞名称'))
    await user.type(screen.getByLabelText('漏洞名称'), '人工修正标题')
    await user.click(screen.getByRole('button', { name: '保存修改' }))

    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1))
    expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'task-1',
      findingId: 'finding-1',
      payload: expect.objectContaining({
        finding_patch: expect.objectContaining({
          rule_name: '人工修正标题',
          severity: 'high',
        }),
      }),
    }))
  })

  it('opens a focused edit modal with only the core report fields', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: '编辑' }))

    expect(await screen.findByLabelText('漏洞描述')).toBeInTheDocument()
    expect(screen.getByLabelText('修复建议')).toBeInTheDocument()
    expect(screen.getByLabelText('漏洞名称')).toBeInTheDocument()
    expect(screen.getAllByLabelText('漏洞级别').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /映射覆盖/i })).toBeInTheDocument()
    expect(screen.queryByLabelText('请求报文')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('响应报文')).not.toBeInTheDocument()
  })

  it('builds a clear-mapping patch when switching an existing mapping to none', () => {
    expect(buildMappingPatch('__none__', {
      template_id: 'demo-rule',
      current: {
        vul_type_id: 2,
        code: 'git-config',
        vul_type: '敏感文件泄露',
        default_severity: '高危',
        impact_zh: '映射描述',
        remediation_zh: '映射修复建议',
      },
      candidates: [],
    })).toEqual({ clear_mapping: true })
  })

  it('confirms and deletes a finding from the action column', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: '删除' }))
    expect(screen.getByText(/确定删除漏洞/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith({ taskId: 'task-1', findingId: 'finding-1' }))
  })
})
