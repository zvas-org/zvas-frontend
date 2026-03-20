import { useMemo, useState } from 'react'
import { Tabs, Tab, Skeleton, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Pagination } from '@heroui/react'

import { useTaskSnapshotAssets, type TaskDetailVM, type TaskSnapshotAssetVM } from '@/api/adapters/task'

const ASSET_KIND_LABEL: Record<string, string> = {
  ip: 'IP',
  domain: '域名',
  site: '站点',
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function formatPorts(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return '-'
  return value.join(', ')
}

function formatServices(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return '-'
  return value.join(', ')
}

function renderRowCells(kind: string, item: TaskSnapshotAssetVM) {
  const cells = [
    <TableCell key="display_name">
      <span className="font-mono text-[13px] text-white font-bold break-all">{item.display_name}</span>
    </TableCell>,
    <TableCell key="normalized_key">
      <span className="text-[11px] text-apple-text-secondary font-mono break-all">{item.normalized_key}</span>
    </TableCell>,
  ]

  if (kind === 'ip') {
    cells.push(
      <TableCell key="open_port_count">{item.extra_payload?.open_port_count ?? 0}</TableCell>,
      <TableCell key="open_ports">{formatPorts(item.extra_payload?.open_ports)}</TableCell>,
      <TableCell key="services">{formatServices(item.extra_payload?.services)}</TableCell>,
    )
  }

  cells.push(
    <TableCell key="source_type">{item.source_type || '-'}</TableCell>,
    <TableCell key="confidence_level">{item.confidence_level || '-'}</TableCell>,
    <TableCell key="created_at">{formatDateTime(item.created_at)}</TableCell>,
  )

  return cells
}

export function TaskSnapshotAssetsPanel({ task, originType, title, desc }: { task?: TaskDetailVM; originType: 'input' | 'expanded'; title: string; desc: string }) {
  const [assetKind, setAssetKind] = useState<'ip' | 'domain' | 'site'>('ip')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const query = useTaskSnapshotAssets(task?.id, {
    page,
    page_size: pageSize,
    origin_type: originType,
    asset_kind: assetKind,
    sort: 'created_at',
    order: 'desc',
  })

  const items = query.data?.data || []
  const total = query.data?.pagination?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const columns = useMemo(() => {
    const base = [
      <TableColumn key="display_name" width={240}>显示值</TableColumn>,
      <TableColumn key="normalized_key" width={260}>标准键</TableColumn>,
    ]
    if (assetKind === 'ip') {
      base.push(
        <TableColumn key="open_port_count" width={100}>开放端口数</TableColumn>,
        <TableColumn key="open_ports" width={220}>端口摘要</TableColumn>,
        <TableColumn key="services" width={200}>服务摘要</TableColumn>,
      )
    }
    base.push(
      <TableColumn key="source_type" width={160}>来源</TableColumn>,
      <TableColumn key="confidence_level" width={120}>可信度</TableColumn>,
      <TableColumn key="created_at" width={180}>记录时间</TableColumn>,
    )
    return base
  }, [assetKind])

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full mb-8">
      <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl backdrop-blur-3xl">
        <h3 className="text-xl font-black text-white tracking-tight mb-1">{title}</h3>
        <p className="text-[13px] text-apple-text-tertiary font-medium">{desc}</p>
      </div>

      <div className="border-b border-white/5">
        <Tabs
          aria-label={`${title}资产视角`}
          selectedKey={assetKind}
          onSelectionChange={(key) => {
            setAssetKind(key as 'ip' | 'domain' | 'site')
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
      </div>

      <div className="rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-x-auto">
        <Table
          removeWrapper
          aria-label={`${title}${ASSET_KIND_LABEL[assetKind]}资产表`}
          layout="fixed"
          classNames={{
            base: 'p-4 min-w-[980px]',
            table: 'table-fixed',
            th: 'bg-transparent text-apple-text-tertiary uppercase text-[10px] tracking-[0.2em] font-black h-14 border-b border-white/5 pb-2 text-left',
            td: 'border-b border-white/5 py-4 text-left last:border-0',
            tr: 'hover:bg-white/[0.03] transition-colors',
          }}
        >
          <TableHeader>{columns}</TableHeader>
          <TableBody
            emptyContent={<div className="py-20 text-apple-text-tertiary text-[13px] font-bold tracking-widest uppercase">当前视角下暂无资产记录。</div>}
            isLoading={query.isPending}
            loadingContent={<Skeleton className="h-40 w-full rounded-[24px] bg-white/5" />}
          >
            {items.map((item) => (
              <TableRow key={item.id}>{renderRowCells(assetKind, item)}</TableRow>
            ))}
          </TableBody>
        </Table>
        {total > 0 && (
          <div className="flex justify-between items-center px-6 py-5 border-t border-white/5 bg-white/[0.01]">
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-apple-text-tertiary">当前视角共 <span className="text-white mx-1">{total}</span> 项</span>
            {totalPages > 1 && (
              <Pagination
                size="sm"
                page={page}
                total={totalPages}
                onChange={setPage}
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
