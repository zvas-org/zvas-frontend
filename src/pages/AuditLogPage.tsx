import {
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Modal,
  Result,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { isApiError } from '@/api/client'
import { useAuditListView, type AuditEntryView } from '@/api/adapters/audit'

const { Search } = Input
const { Paragraph, Text, Title } = Typography

/**
 * AuditLogPage 展示系统操作审计和高风险动作记录。
 */
export function AuditLogPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [resultFilter, setResultFilter] = useState<'all' | 'success' | 'failure'>('all')
  const [detailTarget, setDetailTarget] = useState<AuditEntryView | null>(null)

  const auditsQuery = useAuditListView({ page, page_size: pageSize })

  useEffect(() => {
    if (!auditsQuery.error || !isApiError(auditsQuery.error)) {
      return
    }

    if (auditsQuery.error.status === 401) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true })
      return
    }

    if (auditsQuery.error.status === 403) {
      navigate('/403', { replace: true })
    }
  }, [auditsQuery.error, location.pathname, navigate])

  const filteredItems = useMemo(() => {
    const items = auditsQuery.data?.items || []
    const normalizedKeyword = keyword.trim().toLowerCase()

    return items.filter((item) => {
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        [
          item.actorUsername,
          item.actorRole,
          item.action,
          item.resourceType,
          item.resourceID,
          item.traceId,
          item.path,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword)

      const matchesRisk = riskFilter === 'all' || item.riskLevel === riskFilter
      const matchesResult = resultFilter === 'all' || item.result === resultFilter
      return matchesKeyword && matchesRisk && matchesResult
    })
  }, [auditsQuery.data?.items, keyword, resultFilter, riskFilter])

  const metrics = useMemo(() => {
    const items = auditsQuery.data?.items || []
    return {
      total: auditsQuery.data?.pagination.total || 0,
      highRisk: items.filter((item) => item.riskLevel === 'high').length,
      failures: items.filter((item) => item.result === 'failure').length,
      actors: new Set(items.map((item) => item.actorUsername).filter(Boolean)).size,
    }
  }, [auditsQuery.data])

  if (auditsQuery.isPending) {
    return (
      <Card className="page-card">
        <Skeleton text={{ rows: 8 }} animation />
      </Card>
    )
  }

  if (auditsQuery.isError) {
    if (isApiError(auditsQuery.error) && (auditsQuery.error.status === 401 || auditsQuery.error.status === 403)) {
      return null
    }

    return (
      <div className="status-page-shell compact-shell">
        <Result
          status="error"
          title="审计日志接口请求失败"
          subTitle={auditsQuery.error.message}
          extra={
            <Button type="primary" onClick={() => auditsQuery.refetch()}>
              重新请求
            </Button>
          }
        />
      </div>
    )
  }

  if (!auditsQuery.data) {
    return (
      <Card className="page-card">
        <Empty description="审计接口未返回可展示数据。" />
      </Card>
    )
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Card className="page-card page-hero-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Tag color="red" bordered>
            /api/v1/audits
          </Tag>
          <Title heading={3} className="page-title">
            审计日志视图
          </Title>
          <Paragraph className="page-copy">
            该页面聚合登录、账号管理和其他高风险动作的审计记录，用来确认谁在什么时候对什么资源做了什么修改，以及结果是否成功。
          </Paragraph>
        </Space>
      </Card>

      <section className="detail-grid management-metrics">
        <Card className="metric-card accent-card">
          <span className="metric-label">Total Logs</span>
          <strong className="metric-value">{metrics.total}</strong>
        </Card>
        <Card className="metric-card">
          <span className="metric-label">High Risk</span>
          <strong className="metric-value">{metrics.highRisk}</strong>
        </Card>
        <Card className="metric-card">
          <span className="metric-label">Failures</span>
          <strong className="metric-value">{metrics.failures}</strong>
        </Card>
        <Card className="metric-card">
          <span className="metric-label">Actors</span>
          <strong className="metric-value">{metrics.actors}</strong>
        </Card>
      </section>

      <Card className="page-card toolbar-card">
        <div className="toolbar-grid audit-toolbar-grid">
          <Search
            allowClear
            value={keyword}
            placeholder="按操作者、动作、资源、trace_id 页内筛选"
            onChange={setKeyword}
          />
          <Select
            value={riskFilter}
            onChange={(value) => setRiskFilter(value as 'all' | 'low' | 'medium' | 'high')}
            options={[
              { label: '全部风险', value: 'all' },
              { label: '低风险', value: 'low' },
              { label: '中风险', value: 'medium' },
              { label: '高风险', value: 'high' },
            ]}
          />
          <Select
            value={resultFilter}
            onChange={(value) => setResultFilter(value as 'all' | 'success' | 'failure')}
            options={[
              { label: '全部结果', value: 'all' },
              { label: '成功', value: 'success' },
              { label: '失败', value: 'failure' },
            ]}
          />
          <Button onClick={() => auditsQuery.refetch()}>刷新日志</Button>
        </div>
        <Text className="toolbar-meta">当前筛选作用于本页日志；服务端条件查询和组合检索会在审计模块下一轮增强。</Text>
      </Card>

      <Card className="page-card table-card">
        <Table<AuditEntryView>
          rowKey="id"
          data={filteredItems}
          pagination={{
            current: auditsQuery.data.pagination.page,
            pageSize: auditsQuery.data.pagination.pageSize,
            total: auditsQuery.data.pagination.total,
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
              title: '时间',
              dataIndex: 'createdAt',
              width: 180,
              render: (_, record) => <Text className="table-main-text">{formatDateTime(record.createdAt)}</Text>,
            },
            {
              title: '操作者',
              dataIndex: 'actorUsername',
              width: 180,
              render: (_, record) => (
                <Space direction="vertical" size={2}>
                  <Text className="table-main-text">{record.actorUsername || '匿名'}</Text>
                  <Text className="table-sub-text">{record.actorRole || '-'}</Text>
                </Space>
              ),
            },
            {
              title: '动作',
              dataIndex: 'action',
              width: 220,
              render: (_, record) => (
                <Space direction="vertical" size={2}>
                  <Tag color="arcoblue">{record.action}</Tag>
                  <Text className="table-sub-text">{record.method} {record.path}</Text>
                </Space>
              ),
            },
            {
              title: '资源',
              dataIndex: 'resourceType',
              width: 200,
              render: (_, record) => (
                <Space direction="vertical" size={2}>
                  <Text className="table-main-text">{record.resourceType || '-'}</Text>
                  <Text className="table-sub-text">{record.resourceID || '-'}</Text>
                </Space>
              ),
            },
            {
              title: '风险',
              dataIndex: 'riskLevel',
              width: 120,
              render: (_, record) => <Tag color={riskColorMap[record.riskLevel] || 'gray'}>{riskLabelMap[record.riskLevel] || record.riskLevel}</Tag>,
            },
            {
              title: '结果',
              dataIndex: 'result',
              width: 120,
              render: (_, record) => <Tag color={record.result === 'success' ? 'green' : 'red'}>{record.result === 'success' ? '成功' : '失败'}</Tag>,
            },
            {
              title: '链路',
              dataIndex: 'traceId',
              width: 220,
              render: (_, record) => (
                <Space direction="vertical" size={2}>
                  <Text className="table-main-text table-code-text">{record.traceId || '-'}</Text>
                  <Text className="table-sub-text">{record.remoteIP || '-'}</Text>
                </Space>
              ),
            },
            {
              title: '详情',
              dataIndex: 'detail',
              width: 120,
              render: (_, record) => (
                <Button size="mini" onClick={() => setDetailTarget(record)}>
                  查看
                </Button>
              ),
            },
          ]}
          noDataElement={<Empty description="当前页没有可展示审计日志。" />}
        />
      </Card>

      <Card className="page-card">
        <Descriptions
          column={1}
          data={[
            { label: 'trace_id', value: auditsQuery.data.traceId },
            { label: 'page', value: String(auditsQuery.data.pagination.page) },
            { label: 'page_size', value: String(auditsQuery.data.pagination.pageSize) },
            { label: 'total', value: String(auditsQuery.data.pagination.total) },
          ]}
          labelStyle={{ width: 140 }}
        />
      </Card>

      <Modal
        title={detailTarget?.action || '审计详情'}
        visible={Boolean(detailTarget)}
        footer={null}
        onCancel={() => setDetailTarget(null)}
      >
        {detailTarget ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions
              column={1}
              data={[
                { label: 'actor', value: `${detailTarget.actorUsername || '-'} / ${detailTarget.actorRole || '-'}` },
                { label: 'resource', value: `${detailTarget.resourceType || '-'} / ${detailTarget.resourceID || '-'}` },
                { label: 'risk', value: riskLabelMap[detailTarget.riskLevel] || detailTarget.riskLevel },
                { label: 'result', value: detailTarget.result },
                { label: 'trace_id', value: detailTarget.traceId || '-' },
                { label: 'path', value: `${detailTarget.method} ${detailTarget.path}` },
                { label: 'error', value: detailTarget.errorMessage || '-' },
              ]}
              labelStyle={{ width: 120 }}
            />
            <div className="audit-detail-block">
              <Text className="metric-label">detail_json</Text>
              <pre className="audit-detail-json">{formatDetail(detailTarget.detail)}</pre>
            </div>
          </Space>
        ) : null}
      </Modal>
    </Space>
  )
}

const riskLabelMap: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
}

const riskColorMap: Record<string, string> = {
  low: 'gray',
  medium: 'orange',
  high: 'red',
}

function formatDetail(detail: Record<string, unknown>) {
  try {
    return JSON.stringify(detail, null, 2)
  } catch {
    return '{}'
  }
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
