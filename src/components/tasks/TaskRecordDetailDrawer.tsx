import { useMemo, useState } from 'react'

import {
  Button,
  Chip,
  Divider,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  Skeleton,
  Tooltip,
} from '@heroui/react'

import type { TaskRecordDetailVM, TaskRecordVM, TaskRecordVulnerabilityVM } from '@/api/adapters/task'
import { useTaskRecordDetail } from '@/api/adapters/task'
import { getRecordTypeLabel, useTaskRoutes } from '@/api/adapters/route'

interface Props {
  taskId?: string
  record: TaskRecordVM | null
  isOpen: boolean
  onClose: () => void
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function severityColor(severity: string): 'default' | 'success' | 'warning' | 'danger' | 'secondary' {
  switch ((severity || '').toLowerCase()) {
    case 'critical':
    case 'high':
      return 'danger'
    case 'medium':
      return 'warning'
    case 'low':
      return 'secondary'
    case 'info':
      return 'success'
    default:
      return 'default'
  }
}

function severityRank(severity: string): number {
  switch ((severity || '').toLowerCase()) {
    case 'critical':
      return 0
    case 'high':
      return 1
    case 'medium':
      return 2
    case 'low':
      return 3
    case 'info':
      return 4
    default:
      return 5
  }
}

function formatPlainValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string') return value || '-'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.length ? value.map((item) => formatPlainValue(item)).join(', ') : '-'
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${formatPlainValue(item)}`)
      .join(' | ')
  }
  return String(value)
}

function firstNonEmptyText(...values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined) continue
    const text = typeof value === 'string' ? value.trim() : String(value).trim()
    if (text) return text
  }
  return ''
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => firstNonEmptyText(item)).filter(Boolean)
  }
  const text = firstNonEmptyText(value)
  if (!text) return []
  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => firstNonEmptyText(item)).filter(Boolean)
      }
    } catch {
      return [text]
    }
  }
  return [text]
}

function buildRequestMessage(detail: TaskRecordDetailVM): string {
  const httpResult = detail.http_result
  if (!httpResult) return '当前记录没有请求报文。'
  if (httpResult.request_message) return httpResult.request_message

  const homepageURL =
    httpResult.site_url ||
    httpResult.target ||
    String(detail.payload?.homepage_url || detail.payload?.site_url || detail.target_key || '')

  if (!homepageURL) return '当前记录未保存可用于重建请求报文的目标 URL。'

  try {
    const parsed = new URL(homepageURL)
    const path = `${parsed.pathname || '/'}${parsed.search || ''}` || '/'
    return [`GET ${path} HTTP/1.1`, `Host: ${parsed.host}`, ''].join('\n')
  } catch {
    return homepageURL
  }
}

function buildResponseMessage(detail: TaskRecordDetailVM): string {
  const httpResult = detail.http_result
  if (!httpResult) return '当前记录没有响应报文。'

  const lines: string[] = []
  const statusCode = httpResult.status_code || 0
  lines.push(statusCode > 0 ? `HTTP/1.1 ${statusCode}` : 'HTTP/1.1 -')

  const headerText = httpResult.response_header_text || ''
  if (headerText) {
    lines.push(headerText)
  } else {
    Object.entries(httpResult.response_header_map || {}).forEach(([key, value]) => {
      const text = formatPlainValue(value)
      if (text && text !== '-') {
        lines.push(`${key}: ${text}`)
      }
    })
  }

  lines.push('')

  if (httpResult.response_body) {
    lines.push(httpResult.response_body)
  } else if (httpResult.probe_error) {
    lines.push(httpResult.probe_error)
  } else {
    lines.push('(empty body)')
  }

  return lines.join('\n')
}

function MessageBlock({
  title,
  content,
  hint,
  copyable = false,
  collapsible = false,
  collapseThreshold = 1200,
}: {
  title: string
  content: string
  hint?: string
  copyable?: boolean
  collapsible?: boolean
  collapseThreshold?: number
}) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const text = content || '-'
  const canCollapse = collapsible && text.length > collapseThreshold

  async function handleCopy() {
    if (!copyable || !text || text === '-') return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-[11px] font-bold text-apple-text-tertiary uppercase tracking-[0.24em]">{title}</h3>
          {hint && <p className="text-xs text-apple-text-tertiary">{hint}</p>}
        </div>
        <div className="flex items-center gap-2">
          {copyable && (
            <Button
              size="sm"
              variant="flat"
              className="min-w-0 rounded-lg bg-white/6 px-3 text-[11px] font-bold text-white hover:bg-white/10"
              onPress={handleCopy}
            >
              {copied ? '已复制' : '复制'}
            </Button>
          )}
          {canCollapse && (
            <Button
              size="sm"
              variant="flat"
              className="min-w-0 rounded-lg bg-white/6 px-3 text-[11px] font-bold text-white hover:bg-white/10"
              onPress={() => setExpanded((prev) => !prev)}
            >
              {expanded ? '收起' : '展开'}
            </Button>
          )}
        </div>
      </div>
      <pre
        className={`${expanded ? 'max-h-[min(70vh,900px)]' : 'max-h-[min(44vh,560px)]'} overflow-auto rounded-[24px] border border-white/8 bg-black/30 p-5 text-xs leading-relaxed text-apple-text-secondary font-mono whitespace-pre-wrap break-all`}
      >
        {text}
      </pre>
    </section>
  )
}

function DetailPair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-apple-text-tertiary">{label}</div>
      <div className="break-all text-sm text-white">{value}</div>
    </div>
  )
}

function TruncatedText({
  value,
  limit = 10,
  mono = false,
}: {
  value?: string
  limit?: number
  mono?: boolean
}) {
  const text = (value || '').trim()
  if (!text) return <span className="text-apple-text-tertiary">-</span>

  const display = text.length > limit ? `${text.slice(0, limit)}...` : text
  const className = mono ? 'break-all font-mono text-xs text-white' : 'break-all text-sm text-white'

  if (text.length <= limit) {
    return <span className={className}>{display}</span>
  }

  return (
    <Tooltip
      content={<div className="max-w-[480px] whitespace-pre-wrap break-all text-xs">{text}</div>}
      classNames={{ content: 'border border-white/10 bg-apple-bg/95 px-3 py-2 text-white' }}
    >
      <span className={`${className} cursor-help underline decoration-dotted underline-offset-4`}>{display}</span>
    </Tooltip>
  )
}

function renderChipList(items: string[], mono = false) {
  if (!items.length) return <span className="text-apple-text-tertiary">-</span>
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Chip
          key={item}
          size="sm"
          variant="flat"
          classNames={{
            base: 'border border-white/8 bg-white/[0.05]',
            content: mono ? 'font-mono text-[11px] text-white' : 'text-[11px] text-white',
          }}
        >
          {item}
        </Chip>
      ))}
    </div>
  )
}

function compareService(a: string, b: string): number {
  const left = a.trim().toLowerCase()
  const right = b.trim().toLowerCase()
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1
  return left.localeCompare(right)
}

function renderPortResults(
  items: TaskRecordDetailVM['port_results'],
  sortBy: 'port' | 'service',
  onSortByChange: (next: 'port' | 'service') => void,
) {
  if (!items.length) return null

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.24em] text-apple-text-tertiary">端口开放明细</h3>
          <p className="text-xs text-apple-text-tertiary">共 {items.length} 个开放端口。滚动查看完整列表，banner 默认截断，悬停可展开。</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            className={`min-w-0 rounded-lg px-3 text-[11px] font-bold ${sortBy === 'port' ? 'bg-white/14 text-white' : 'bg-white/6 text-apple-text-secondary hover:bg-white/10 hover:text-white'}`}
            onPress={() => onSortByChange('port')}
          >
            按端口
          </Button>
          <Button
            size="sm"
            variant="flat"
            className={`min-w-0 rounded-lg px-3 text-[11px] font-bold ${sortBy === 'service' ? 'bg-white/14 text-white' : 'bg-white/6 text-apple-text-secondary hover:bg-white/10 hover:text-white'}`}
            onPress={() => onSortByChange('service')}
          >
            按服务
          </Button>
        </div>
      </div>
      <div className="max-h-[min(52vh,640px)] overflow-auto rounded-[24px] border border-white/8 bg-white/[0.03] overscroll-contain">
        <div className="min-w-[920px]">
          <div className="sticky top-0 z-10 grid grid-cols-[120px_120px_140px_140px_220px_260px] gap-0 border-b border-white/8 bg-apple-bg/95 px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-apple-text-tertiary backdrop-blur-xl">
            <div>端口 | 协议</div>
            <div>服务</div>
            <div>版本</div>
            <div>解析 IP</div>
            <div>Banner / 证书</div>
            <div>首页地址 / DNS</div>
          </div>
          {items.map((item) => (
            <div
              key={`${item.port}-${item.protocol}-${item.target}`}
              className="grid grid-cols-[120px_120px_140px_140px_220px_260px] gap-0 border-b border-white/6 px-5 py-4 text-sm text-white last:border-b-0"
            >
              <div className="pr-4">
                <code className="font-mono text-xs text-apple-blue-light">{item.port}|{item.protocol || 'tcp'}</code>
              </div>
              <div className="pr-4">
                <span>{item.service || '-'}</span>
              </div>
              <div className="pr-4">
                <TruncatedText value={item.version} limit={18} />
              </div>
              <div className="pr-4">
                <TruncatedText value={item.resolved_ip} limit={18} mono />
              </div>
              <div className="space-y-2 pr-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-apple-text-tertiary">Banner</div>
                <TruncatedText value={item.banner} limit={10} mono />
                <div className="text-[10px] uppercase tracking-[0.18em] text-apple-text-tertiary">证书主题</div>
                <TruncatedText value={item.subject} limit={18} />
              </div>
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-apple-text-tertiary">首页地址</div>
                <TruncatedText value={item.homepage_url} limit={28} mono />
                <div className="text-[10px] uppercase tracking-[0.18em] text-apple-text-tertiary">DNS Names</div>
                <TruncatedText value={item.dns_names.join(', ')} limit={28} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function renderHTTPResult(detail: TaskRecordDetailVM) {
  if (!detail.http_result) return null

  const item = detail.http_result
  const requestMessage = buildRequestMessage(detail)
  const responseMessage = buildResponseMessage(detail)

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.24em] text-apple-text-tertiary">站点报文详情</h3>
        <p className="text-xs text-apple-text-tertiary">面向运维查看站点请求与响应内容。</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DetailPair label="站点 URL" value={item.site_url || '-'} />
        <DetailPair
          label="探测状态"
          value={
            <Chip size="sm" variant="flat" color={item.probe_status === 'alive' ? 'success' : item.probe_status === 'unreachable' ? 'warning' : 'default'}>
              {item.probe_status || '-'}
            </Chip>
          }
        />
        <DetailPair label="HTTP 状态码" value={item.status_code || '-'} />
        <DetailPair label="标题" value={item.title || '-'} />
        <DetailPair label="服务标识" value={item.server || '-'} />
        <DetailPair label="内容长度" value={item.content_length || '-'} />
        <DetailPair label="HTML Hash" value={<TruncatedText value={item.html_hash} limit={18} mono />} />
        <DetailPair label="Favicon Hash" value={<TruncatedText value={item.favicon_hash} limit={18} mono />} />
        <DetailPair label="ICP" value={item.icp || '-'} />
        <DetailPair label="探测错误" value={item.probe_error || '-'} />
      </div>
      <MessageBlock
        title="请求报文"
        content={requestMessage}
        hint="请求报文按 gomap 实际请求模板持久化；其中 User-Agent 由引擎随机生成，这里以占位值记录。"
        copyable
      />
      <MessageBlock title="响应报文" content={responseMessage} copyable collapsible collapseThreshold={1600} />
    </section>
  )
}

function renderSeveritySummary(summary: Record<string, any>) {
  const items = Object.entries(summary || {})
    .map(([severity, count]) => ({ severity, count: Number(count) || 0 }))
    .filter((item) => item.count > 0)
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))

  if (!items.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Chip key={item.severity} size="sm" variant="flat" color={severityColor(item.severity)}>
          {item.severity} {item.count}
        </Chip>
      ))}
    </div>
  )
}

function renderClassification(item: TaskRecordVulnerabilityVM) {
  const classification = item.classification || {}
  const rows = [
    { label: 'CVE', value: firstNonEmptyText(classification['cve-id'], classification.cve_id, classification.cve) },
    { label: 'CWE', value: firstNonEmptyText(classification['cwe-id'], classification.cwe_id, classification.cwe) },
    { label: 'CVSS 分数', value: firstNonEmptyText(classification['cvss-score'], classification.cvss_score) },
    { label: 'CVSS 向量', value: firstNonEmptyText(classification['cvss-metrics'], classification.cvss_metrics) },
    { label: 'CPE', value: firstNonEmptyText(classification.cpe) },
    { label: 'EPSS', value: firstNonEmptyText(classification['epss-score'], classification.epss_score) },
  ].filter((row) => row.value)

  if (!rows.length) return null

  return (
    <section className="space-y-3">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.24em] text-apple-text-tertiary">漏洞分类</h4>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <DetailPair key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </section>
  )
}

function renderVulnerabilityEvidence(item: TaskRecordVulnerabilityVM) {
  const evidence = item.evidence || {}
  const curlCommand = firstNonEmptyText(evidence.curl_command)
  const matcherStatus = firstNonEmptyText(evidence.matcher_status)
  const extractedResults = normalizeStringArray(evidence.extracted_results)
  const requestText = firstNonEmptyText(evidence.request)
  const responseText = firstNonEmptyText(evidence.response)

  if (!curlCommand && !matcherStatus && !extractedResults.length && !requestText && !responseText) {
    return null
  }

  return (
    <section className="space-y-4">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.24em] text-apple-text-tertiary">命中证据</h4>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DetailPair label="匹配状态" value={matcherStatus || '-'} />
        <DetailPair label="提取结果" value={renderChipList(extractedResults, true)} />
        <DetailPair label="cURL 复现" value={<TruncatedText value={curlCommand} limit={48} mono />} />
      </div>
      {requestText && <MessageBlock title="漏洞请求" content={requestText} copyable />}
      {responseText && <MessageBlock title="漏洞响应" content={responseText} copyable collapsible collapseThreshold={1800} />}
    </section>
  )
}

function renderVulnerabilityCard(item: TaskRecordVulnerabilityVM) {
  return (
    <div key={item.id || item.vulnerability_key} className="space-y-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip size="sm" variant="flat" color={severityColor(item.severity)}>
          {item.severity || 'unknown'}
        </Chip>
        <span className="text-sm font-semibold text-white">{item.rule_name || item.rule_id || '未命名规则'}</span>
        {item.rule_id && <code className="font-mono text-[11px] text-apple-text-tertiary">{item.rule_id}</code>}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DetailPair label="目标 URL" value={item.target_url || '-'} />
        <DetailPair label="匹配器" value={item.matcher_name || '-'} />
        <DetailPair label="主机 / IP" value={[item.host, item.ip].filter(Boolean).join(' / ') || '-'} />
        <DetailPair label="协议 / 端口" value={[item.scheme, item.port || ''].filter(Boolean).join(' : ') || '-'} />
        <DetailPair label="命中时间" value={formatDateTime(item.matched_at)} />
        <DetailPair label="Tags" value={renderChipList(item.tags)} />
      </div>
      {renderClassification(item)}
      {renderVulnerabilityEvidence(item)}
    </div>
  )
}

function renderVulScan(detail: TaskRecordDetailVM) {
  if (!detail.vul_scan_summary && !detail.vulnerabilities.length) return null

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.24em] text-apple-text-tertiary">漏洞扫描详情</h3>
        <p className="text-xs text-apple-text-tertiary">按扫描摘要、漏洞分类和命中证据展示站点漏洞结果。</p>
      </div>
      {detail.vul_scan_summary && (
        <div className="space-y-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DetailPair label="目标站点" value={detail.vul_scan_summary.target_url || '-'} />
            <DetailPair label="漏洞数量" value={detail.vul_scan_summary.vulnerability_count} />
            <DetailPair label="扫描模式" value={detail.vul_scan_summary.scan_mode || '-'} />
            <DetailPair label="Profile" value={detail.vul_scan_summary.profile_code || '-'} />
            <DetailPair label="跳过原因" value={detail.vul_scan_summary.skip_reason || '-'} />
            <DetailPair label="执行错误" value={detail.vul_scan_summary.error || '-'} />
          </div>
          {renderSeveritySummary(detail.vul_scan_summary.severity_summary)}
        </div>
      )}
      {!!detail.vulnerabilities.length && <div className="space-y-4">{detail.vulnerabilities.map(renderVulnerabilityCard)}</div>}
    </section>
  )
}

function renderFallbackSummary(detail: TaskRecordDetailVM) {
  const summary = detail.result_summary?.trim()
  if (!summary) {
    return (
      <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-6 text-sm text-apple-text-secondary">
        当前记录暂无可展示的结构化结果。
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.24em] text-apple-text-tertiary">执行摘要</h3>
        <p className="text-xs text-apple-text-tertiary">当前记录没有结构化详情时，展示回传摘要。</p>
      </div>
      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-white whitespace-pre-wrap break-all">
        {summary}
      </div>
    </section>
  )
}

export function TaskRecordDetailDrawer({ taskId, record, isOpen, onClose }: Props) {
  const { data: routes } = useTaskRoutes()
  const query = useTaskRecordDetail(taskId, record?.unit_id, isOpen)
  const [portSort, setPortSort] = useState<'port' | 'service'>('port')
  const detail = query.data
  const sortedPortResults = useMemo(() => {
    const items = detail?.port_results ? [...detail.port_results] : []
    items.sort((a, b) => {
      if (portSort === 'service') {
        const byService = compareService(a.service || '', b.service || '')
        if (byService !== 0) return byService
      }
      if (a.port !== b.port) return a.port - b.port
      return compareService(a.service || '', b.service || '')
    })
    return items
  }, [detail?.port_results, portSort])

  if (!record) return null

  const stageLabel = getRecordTypeLabel(routes, detail?.task_type || record.task_type, detail?.task_subtype || record.task_subtype)
  const hasPortDetail = Boolean(detail?.port_results.length)
  const hasHTTPDetail = Boolean(detail?.http_result)
  const hasVulDetail = Boolean(detail?.vul_scan_summary || detail?.vulnerabilities.length)
  const hasStructuredResult = hasPortDetail || hasHTTPDetail || hasVulDetail

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      placement="right"
      backdrop="blur"
      scrollBehavior="inside"
      classNames={{
        base: '!w-screen sm:!w-[min(94vw,1120px)] xl:!w-[min(90vw,1360px)] max-w-none h-dvh max-h-dvh border-l border-white/10 bg-apple-bg/92 text-apple-text-primary backdrop-blur-3xl',
        header: 'border-b border-white/6 px-5 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-6',
        body: 'px-5 py-5 sm:px-8 sm:py-6',
        footer: 'border-t border-white/6 px-5 py-4 sm:px-8 sm:py-5',
      }}
    >
      <DrawerContent>
        <>
          <DrawerHeader className="flex flex-col gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.28em] text-apple-text-tertiary">扫描结果详情</span>
            <h3 className="text-2xl font-black tracking-tight text-white">{stageLabel || '扫描单元'}</h3>
            <p className="break-all font-mono text-sm text-apple-text-secondary">{record.target_key || '-'}</p>
          </DrawerHeader>
          <DrawerBody className="space-y-8 overflow-y-auto">
            {query.isPending && (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-[24px] bg-white/5" />
                <Skeleton className="h-52 w-full rounded-[24px] bg-white/5" />
                <Skeleton className="h-72 w-full rounded-[24px] bg-white/5" />
              </div>
            )}
            {query.isError && (
              <div className="rounded-[24px] border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-200">
                记录详情加载失败，请关闭后重试。
              </div>
            )}
            {detail && (
              <>
                {renderPortResults(sortedPortResults, portSort, setPortSort)}
                {hasPortDetail && (hasHTTPDetail || hasVulDetail) && <Divider className="bg-white/6" />}
                {renderHTTPResult(detail)}
                {hasHTTPDetail && hasVulDetail && <Divider className="bg-white/6" />}
                {renderVulScan(detail)}
                {!hasStructuredResult && renderFallbackSummary(detail)}
              </>
            )}
          </DrawerBody>
          <DrawerFooter>
            <Button fullWidth variant="flat" className="rounded-xl bg-white/5 font-bold text-white hover:bg-white/10" onPress={onClose}>
              关闭
            </Button>
          </DrawerFooter>
        </>
      </DrawerContent>
    </Drawer>
  )
}
