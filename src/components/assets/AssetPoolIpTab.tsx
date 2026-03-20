import { useState } from 'react'
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Pagination, Skeleton, Input, Button } from '@heroui/react'
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

import { useAssetPoolAssets } from '@/api/adapters/asset'

function joinTags(systemFacets: string[], customTags: string[]) {
  return [...systemFacets, ...customTags].slice(0, 4)
}

function sourceLabel(sourceSummary: Record<string, unknown>) {
  const candidate = sourceSummary?.primary_source ?? sourceSummary?.source_type
  return typeof candidate === 'string' && candidate ? candidate : '-'
}

function joinList(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return '-'
  return value.join(', ')
}

export function AssetPoolIpTab({ poolId }: { poolId: string }) {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')

  const { data, isPending, refetch } = useAssetPoolAssets(poolId, {
    page,
    page_size: pageSize,
    keyword: keyword || undefined,
    view: 'ip',
  })

  const items = data?.data || []
  const total = data?.pagination?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4">
        <div className="flex flex-col">
          <h3 className="text-xl font-black text-white tracking-tight mb-1">IP 视角网络资产</h3>
          <p className="text-[13px] text-apple-text-tertiary font-medium">展示资产池中长期沉淀的 IP 资产，以及最近扫描归并出的端口和服务摘要。</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Input
            isClearable
            value={keyword}
            placeholder="搜索 IP / 网段..."
            onValueChange={(v) => { setKeyword(v); setPage(1) }}
            classNames={{ inputWrapper: 'bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-12 rounded-[16px] border border-white/5 backdrop-blur-md w-full md:w-64', input: 'text-[13px] font-medium placeholder:text-apple-text-tertiary' }}
            startContent={<MagnifyingGlassIcon className="w-5 h-5 text-apple-text-tertiary" />}
          />
          <Button isIconOnly variant="flat" onPress={() => refetch()} className="h-12 w-12 rounded-[16px] bg-apple-tertiary-bg/10 border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">
            <ArrowPathIcon className="w-5 h-5 text-apple-text-secondary" />
          </Button>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-x-auto scrollbar-hide md:scrollbar-default custom-scrollbar">
        <Table removeWrapper aria-label="IP Assets Table" layout="fixed" classNames={{ base: 'p-4 min-w-[1200px]', table: 'table-fixed', thead: '[&>tr]:first:rounded-xl', th: 'bg-transparent text-apple-text-tertiary uppercase text-[10px] tracking-[0.2em] font-black h-14 border-b border-white/5 pb-2 text-left', td: 'border-b border-white/5 py-4 text-left last:border-0', tr: 'hover:bg-white/[0.03] transition-colors cursor-default' }}>
          <TableHeader>
            <TableColumn width={200}>IP / 网段</TableColumn>
            <TableColumn width={220}>标准编目键</TableColumn>
            <TableColumn width={110}>开放端口数</TableColumn>
            <TableColumn width={220}>端口摘要</TableColumn>
            <TableColumn width={180}>服务摘要</TableColumn>
            <TableColumn width={100}>置信度</TableColumn>
            <TableColumn width={100}>状态</TableColumn>
            <TableColumn width={140}>来源标识</TableColumn>
            <TableColumn width={220}>标签</TableColumn>
          </TableHeader>
          <TableBody emptyContent={<div className="py-20 text-apple-text-tertiary text-sm font-bold flex flex-col items-center gap-2"><span>此资产池下暂无 IP 事实资产。</span></div>} isLoading={isPending} loadingContent={<Skeleton className="h-40 w-full rounded-[24px] bg-white/5" />}>
            {items.map((it) => (
              <TableRow key={it.id}>
                <TableCell><span className="font-mono text-[14px] text-apple-blue-light font-black tracking-tight">{it.display_name}</span></TableCell>
                <TableCell><span className="text-[12px] text-white font-mono break-all font-bold">{it.normalized_key}</span></TableCell>
                <TableCell>{it.detail?.open_port_count ?? 0}</TableCell>
                <TableCell>{joinList(it.detail?.open_ports)}</TableCell>
                <TableCell>{joinList(it.detail?.services)}</TableCell>
                <TableCell><span className="text-[9px] bg-apple-green/10 border border-apple-green/20 text-apple-green-light px-2.5 py-1 rounded-full tracking-[0.2em] font-black uppercase">{it.confidence_level}</span></TableCell>
                <TableCell><span className="text-[9px] border border-white/10 bg-white/5 text-apple-text-secondary px-2.5 py-1 rounded-full font-black tracking-[0.2em] uppercase">{it.status}</span></TableCell>
                <TableCell><span className="text-[11px] font-bold text-apple-text-secondary uppercase tracking-wider">{sourceLabel(it.source_summary)}</span></TableCell>
                <TableCell><div className="flex gap-1.5 flex-wrap">{joinTags(it.system_facets, it.custom_tags).map((tag) => (<span key={tag} className="text-[9px] font-black tracking-widest text-apple-text-secondary uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">{tag}</span>))}</div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {total > 0 && (
          <div className="flex justify-between items-center px-6 py-5 border-t border-white/5 bg-white/[0.01]">
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-apple-text-tertiary">合计归集 <span className="text-white mx-1">{total}</span> 项 IP 实体</span>
            {totalPages > 1 && <Pagination size="sm" page={page} total={totalPages} onChange={setPage} classNames={{ wrapper: 'gap-2', item: 'bg-white/5 text-apple-text-secondary font-bold rounded-xl border border-white/5 hover:bg-white/10 transition-all min-w-[32px] h-8 text-[12px]', cursor: 'bg-apple-blue font-black rounded-xl shadow-lg shadow-apple-blue/30 text-white', prev: 'bg-white/5 text-white/50 rounded-xl hover:bg-white/10', next: 'bg-white/5 text-white/50 rounded-xl hover:bg-white/10' }} />}
          </div>
        )}
      </div>
    </div>
  )
}
