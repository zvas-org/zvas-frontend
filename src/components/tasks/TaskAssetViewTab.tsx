import { useMemo, useState } from 'react'
import { Tabs, Tab, Skeleton, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Pagination, Button, ButtonGroup } from '@heroui/react'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

import { useTaskSnapshotAssets, useTaskSnapshotAssetDetail, type TaskSnapshotAssetVM } from '@/api/adapters/task'

const ASSET_KIND_LABEL: Record<string, string> = {
  ip: 'IP',
  domain: '域名',
  site: '站点',
}

function formatPorts(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return '-'
  return (value as (string | number)[]).slice(0, 5).join(', ') + (value.length > 5 ? ` …+${value.length - 5}` : '')
}

// ──────────────────────────────────────────────────────────────────────────────
// 展开行详情组件：展开时按需加载 detail 接口，支持 IP 端口子表 / 域名关联列表
// ──────────────────────────────────────────────────────────────────────────────
function ExpandedRow({ taskId, item, assetKind }: { taskId?: string; item: TaskSnapshotAssetVM; assetKind: string }) {
  const detailQuery = useTaskSnapshotAssetDetail(taskId, item.id)

  if (detailQuery.isPending) {
    return (
      <div className="px-6 py-5 bg-white/[0.01] border-l-2 border-l-apple-blue animate-in fade-in duration-200">
        <Skeleton className="h-20 w-full rounded-2xl bg-white/5" />
      </div>
    )
  }

  if (detailQuery.isError) {
    return (
      <div className="px-6 py-4 bg-white/[0.01] border-l-2 border-l-apple-red text-apple-red-light text-[13px] font-bold animate-in fade-in duration-200">
        详情加载失败，请收起后重试。
      </div>
    )
  }

  // detail 成功后才能读取数据，优先读 detail 接口字段，降级到列表字段
  const detail = detailQuery.data ?? item
  const payload = detail.extra_payload

  if (assetKind === 'ip') {
    // 优先读结构化 ports[]，降级读 open_ports / services 数组
    const ports = Array.isArray(payload?.ports) && payload.ports.length > 0
      ? (payload.ports as Record<string, string>[])
      : (Array.isArray(payload?.open_ports) ? (payload.open_ports as (string | number)[]).map((p, idx) => ({
          port: String(p),
          protocol: '-',
          service: (Array.isArray(payload?.services) ? payload.services[idx] : '-') ?? '-',
          banner: '-',
          cert_subject: '-',
          dns_names: '-',
          status: '-',
        })) : [])

    return (
      <div className="px-6 py-4 bg-white/[0.01] border-l-2 border-l-apple-blue animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="mb-3">
          <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">端口明细</span>
        </div>
        {ports.length === 0 ? (
          <div className="py-6 text-center text-[12px] text-apple-text-tertiary italic">暂无端口明细记录</div>
        ) : (
          <div className="overflow-x-auto rounded-[16px] border border-white/5">
            <table className="w-full min-w-[860px] text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  {['端口', '协议', '服务', 'Banner', '证书 Subject', 'DNS 名称', '状态'].map((h) => (
                    <th key={h} className="text-[9px] uppercase tracking-[0.2em] font-black text-apple-text-tertiary px-4 py-3 bg-white/[0.02] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ports.map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3"><span className="font-mono text-[13px] text-apple-blue-light font-black">{row.port ?? '-'}</span></td>
                    <td className="px-4 py-3"><span className="text-[11px] text-apple-text-secondary font-mono">{row.protocol ?? '-'}</span></td>
                    <td className="px-4 py-3"><span className="text-[11px] text-white font-bold">{row.service ?? '-'}</span></td>
                    <td className="px-4 py-3"><span className="text-[11px] text-apple-text-tertiary italic">{row.banner ?? '-'}</span></td>
                    <td className="px-4 py-3"><span className="text-[11px] text-apple-text-tertiary italic">{row.cert_subject ?? '-'}</span></td>
                    <td className="px-4 py-3"><span className="text-[11px] text-apple-text-tertiary italic">{row.dns_names ?? '-'}</span></td>
                    <td className="px-4 py-3"><span className="text-[11px] text-apple-text-tertiary">{row.status ?? '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-black tracking-widest text-apple-text-tertiary">关联域名推断</span>
            <span className="text-[12px] text-apple-text-secondary italic">暂无数据</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-black tracking-widest text-apple-text-tertiary">关联域名数</span>
            <span className="text-[12px] text-apple-text-secondary italic">{payload?.domain_count ?? '-'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-black tracking-widest text-apple-text-tertiary">证书主体数</span>
            <span className="text-[12px] text-apple-text-secondary italic">{payload?.cert_count ?? '-'}</span>
          </div>
        </div>
      </div>
    )
  }

  if (assetKind === 'domain') {
    const relatedIps: string[] = Array.isArray(payload?.related_ips) ? payload.related_ips : []
    const relatedSites: string[] = Array.isArray(payload?.related_sites) ? payload.related_sites : []
    return (
      <div className="px-6 py-5 bg-white/[0.01] border-l-2 border-l-apple-blue flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3">
            <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">关联解析 IP</span>
            {relatedIps.length === 0 ? (
              <span className="text-[12px] text-apple-text-secondary italic">暂无关联 IP</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {relatedIps.map((ip) => (
                  <span key={ip} className="font-mono text-[12px] text-apple-blue-light bg-apple-blue/10 border border-apple-blue/20 px-2.5 py-1 rounded-lg font-bold">{ip}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">关联站点</span>
            {relatedSites.length === 0 ? (
              <span className="text-[12px] text-apple-text-secondary italic">暂无关联站点</span>
            ) : (
              <div className="flex flex-col gap-1.5">
                {relatedSites.map((site) => (
                  <span key={site} className="text-[12px] text-white font-mono break-all">{site}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-black tracking-widest text-apple-text-tertiary">DNS 记录</span>
            <span className="text-[12px] text-apple-text-secondary italic">待引擎结果补齐</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-black tracking-widest text-apple-text-tertiary">证书发现</span>
            <span className="text-[12px] text-apple-text-secondary italic">待引擎结果补齐</span>
          </div>
        </div>
      </div>
    )
  }

  if (assetKind === 'site') {
    return (
      <div className="px-10 py-5 bg-white/[0.01] border-l-2 border-l-apple-blue flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">HTTP 响应头特征</span>
            <span className="text-[12px] text-apple-text-secondary italic">暂无数据</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">Favicon Hash</span>
            <span className="text-[12px] text-apple-text-secondary italic">-</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">所属服务器 IP</span>
            <span className="text-[12px] text-apple-text-secondary italic">-</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">所属域名</span>
            <span className="text-[12px] text-apple-text-secondary italic">-</span>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export function TaskAssetViewTab({ taskId }: { taskId?: string }) {
  const [assetKind, setAssetKind] = useState<'ip' | 'domain' | 'site'>('ip')
  const [originFilter, setOriginFilter] = useState<'all' | 'input' | 'expanded'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  const queryParams = {
    page,
    page_size: pageSize,
    asset_kind: assetKind,
    sort: 'created_at',
    order: 'desc',
    ...(originFilter !== 'all' ? { origin_type: originFilter } : {}),
  }

  const query = useTaskSnapshotAssets(taskId, queryParams)

  const items = query.data?.data || []
  const total = query.data?.pagination?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const handleToggleExpand = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id))
  }

  const renderRowCells = (item: TaskSnapshotAssetVM) => {
    const isExpanded = expandedRowId === item.id
    const toggleIcon = isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />

    const cells = [
      <TableCell key="display_name">
        <div className="flex items-center gap-2">
          <Button isIconOnly size="sm" variant="light" className="text-apple-text-tertiary w-6 h-6 min-w-6" onPress={() => handleToggleExpand(item.id)}>
            {toggleIcon}
          </Button>
          <span className="font-mono text-[13px] text-white font-bold break-all cursor-pointer" onClick={() => handleToggleExpand(item.id)}>{item.display_name}</span>
        </div>
      </TableCell>
    ]

    if (assetKind === 'ip') {
      cells.push(
        <TableCell key="open_port_count">{item.extra_payload?.open_port_count ?? 0}</TableCell>,
        <TableCell key="open_ports"><span className="truncate block max-w-[180px] text-apple-text-secondary">{formatPorts(item.extra_payload?.open_ports)}</span></TableCell>,
      )
    } else if (assetKind === 'domain') {
      const rootDomain = item.extra_payload?.root_domain || item.display_name.split('.').slice(-2).join('.')
      const ipCount = item.extra_payload?.ip_count ?? '-'
      const siteCount = item.extra_payload?.site_count ?? '-'
      cells.push(
        <TableCell key="root_domain"><span className="text-apple-text-secondary font-mono text-[12px]">{rootDomain}</span></TableCell>,
        <TableCell key="ip_count"><span className="text-[12px] text-white font-bold">{ipCount}</span></TableCell>,
        <TableCell key="site_count"><span className="text-[12px] text-white font-bold">{siteCount}</span></TableCell>,
      )
    } else if (assetKind === 'site') {
      cells.push(
        <TableCell key="title"><span className="text-apple-text-secondary truncate block max-w-[180px]">-</span></TableCell>,
        <TableCell key="status_code"><span className="text-apple-text-secondary">-</span></TableCell>,
        <TableCell key="cert"><span className="text-apple-text-secondary">-</span></TableCell>,
      )
    }

    cells.push(
      <TableCell key="source_type"><span className="text-[10px] bg-white/5 border border-white/10 text-apple-text-secondary px-2 py-0.5 rounded uppercase font-bold">{item.source_type || '-'}</span></TableCell>,
      <TableCell key="confidence_level"><span className="text-[10px] text-apple-green-light font-bold uppercase">{item.confidence_level || '-'}</span></TableCell>,
      <TableCell key="labels"><span className="text-[11px] text-apple-text-tertiary">-</span></TableCell>,
    )

    return cells
  }




  const columns = useMemo(() => {
    const base = [
      <TableColumn key="display_name" width={260}>显示值</TableColumn>,
    ]
    if (assetKind === 'ip') {
      base.push(
        <TableColumn key="open_port_count" width={100}>开放端口数</TableColumn>,
        <TableColumn key="open_ports" width={200}>端口摘要</TableColumn>,
      )
    } else if (assetKind === 'domain') {
       base.push(
         <TableColumn key="root_domain" width={200}>根域</TableColumn>,
         <TableColumn key="ip_count" width={100}>关联 IP 数</TableColumn>,
         <TableColumn key="site_count" width={110}>关联站点数</TableColumn>,
       )
    } else if (assetKind === 'site') {
       base.push(
         <TableColumn key="title" width={200}>Title</TableColumn>,
         <TableColumn key="status_code" width={100}>状态码</TableColumn>,
         <TableColumn key="cert" width={140}>证书</TableColumn>
       )
    }

    base.push(
      <TableColumn key="source_type" width={140}>来源</TableColumn>,
      <TableColumn key="confidence_level" width={100}>可信度</TableColumn>,
      <TableColumn key="labels" width={160}>标签</TableColumn>,
    )
    return base
  }, [assetKind])

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full mb-8">
      <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex items-center justify-between backdrop-blur-3xl">
        <div>
          <h3 className="text-xl font-black text-white tracking-tight mb-1">资产视图</h3>
          <p className="text-[13px] text-apple-text-tertiary font-medium">展示本次任务涉及的输入资产以及扫描阶段新发现的衍生资产。</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-2">
        <Tabs
          aria-label="Asset Type"
          selectedKey={assetKind}
          onSelectionChange={(key) => {
            setAssetKind(key as 'ip' | 'domain' | 'site')
            setExpandedRowId(null)
            setPage(1)
          }}
          variant="underlined"
          classNames={{
            tabList: 'gap-6 p-0',
            cursor: 'bg-apple-blue h-[2px] w-full',
            tab: 'h-12 px-2 text-apple-text-secondary data-[selected=true]:text-white data-[selected=true]:font-black text-[12px] uppercase tracking-widest transition-colors',
          }}
        >
          <Tab key="ip" title="IP" />
          <Tab key="domain" title="域名" />
          <Tab key="site" title="站点" />
        </Tabs>

        <ButtonGroup size="sm" variant="flat" className="bg-apple-tertiary-bg/20 backdrop-blur-xl border border-white/10 rounded-xl p-1 h-10">
          <Button
            className={`font-black tracking-widest text-[11px] rounded-lg px-4 transition-all ${originFilter === 'all' ? 'bg-white/10 text-white shadow-md' : 'bg-transparent text-apple-text-tertiary hover:text-white'}`}
            onPress={() => { setOriginFilter('all'); setExpandedRowId(null); setPage(1) }}
          >
            全部
          </Button>
          <Button
            className={`font-black tracking-widest text-[11px] rounded-lg px-4 transition-all ${originFilter === 'input' ? 'bg-white/10 text-white shadow-md' : 'bg-transparent text-apple-text-tertiary hover:text-white'}`}
            onPress={() => { setOriginFilter('input'); setExpandedRowId(null); setPage(1) }}
          >
            输入资产
          </Button>
          <Button
            className={`font-black tracking-widest text-[11px] rounded-lg px-4 transition-all ${originFilter === 'expanded' ? 'bg-white/10 text-white shadow-md' : 'bg-transparent text-apple-text-tertiary hover:text-white'}`}
            onPress={() => { setOriginFilter('expanded'); setExpandedRowId(null); setPage(1) }}
          >
            本次发现
          </Button>
        </ButtonGroup>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-x-auto">
        <Table
          removeWrapper
          aria-label={`Task Asset ${ASSET_KIND_LABEL[assetKind]} Table`}
          layout="fixed"
          classNames={{
            base: 'p-4 min-w-[980px]',
            table: 'table-fixed',
            th: 'bg-transparent text-apple-text-tertiary uppercase text-[10px] tracking-[0.2em] font-black h-14 border-b border-white/5 pb-2 text-left',
            td: 'border-b border-white/5 py-4 text-left last:border-0 relative',
            tr: 'hover:bg-white/[0.03] transition-colors',
          }}
        >
          <TableHeader>{columns}</TableHeader>
          <TableBody
            emptyContent={<div className="py-20 text-apple-text-tertiary text-[13px] font-bold tracking-widest uppercase flex flex-col items-center gap-2">当前筛选条件下暂无资产记录。</div>}
            isLoading={query.isPending}
            loadingContent={<Skeleton className="h-40 w-full rounded-[24px] bg-white/5" />}
          >
            {items.flatMap((item) => {
              const rowId = item.id
              const isExpanded = expandedRowId === rowId
              const rowCells = renderRowCells(item)

              const mainRow = (
                <TableRow key={rowId} className={`cursor-pointer ${isExpanded ? 'bg-white/[0.03]' : ''}`} onClick={() => handleToggleExpand(item.id)}>
                  {rowCells}
                </TableRow>
              )

              if (isExpanded) {
                 const expandedBg = (
                   <TableRow key={`${rowId}-expanded`} className="bg-white/[0.01]">
                     <TableCell colSpan={columns.length} className="p-0 border-b border-white/5">
                        <ExpandedRow taskId={taskId} item={item} assetKind={assetKind} />
                     </TableCell>
                   </TableRow>
                 )
                 return [mainRow, expandedBg]
              }

              return [mainRow]
            })}
          </TableBody>
        </Table>
        {total > 0 && (
          <div className="flex justify-between items-center px-6 py-5 border-t border-white/5 bg-white/[0.01]">
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-apple-text-tertiary">合计本次视图资产 <span className="text-white mx-1">{total}</span> 项</span>
            {totalPages > 1 && (
              <Pagination
                size="sm"
                page={page}
                total={totalPages}
                onChange={(p) => { setPage(p); setExpandedRowId(null) }}
                classNames={{
                  wrapper: 'gap-2',
                  item: 'bg-white/5 text-apple-text-secondary font-bold rounded-xl border border-white/5 hover:bg-white/10 transition-all min-w-[32px] h-8 text-[12px]',
                  cursor: 'bg-apple-blue font-black rounded-xl shadow-lg shadow-apple-blue/30 text-white',
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
