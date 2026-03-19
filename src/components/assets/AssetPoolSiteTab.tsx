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

export function AssetPoolSiteTab({ poolId }: { poolId: string }) {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')

  const { data, isPending, refetch } = useAssetPoolAssets(poolId, {
    page,
    page_size: pageSize,
    keyword: keyword || undefined,
    view: 'site',
  })

  const items = data?.data || []
  const total = data?.pagination?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between pb-2">
        <div className="flex flex-col text-sm">
          <h3 className="font-bold text-white text-lg">站点视角</h3>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <Input
          isClearable
          value={keyword}
          placeholder="搜索 URL 或站点名..."
          onValueChange={(v) => { setKeyword(v); setPage(1) }}
          classNames={{ inputWrapper: 'bg-white/5 border border-white/10 h-10 w-80' }}
          startContent={<MagnifyingGlassIcon className="w-4 h-4 text-apple-text-tertiary" />}
        />
        <Button isIconOnly variant="flat" onPress={() => refetch()} className="bg-white/5 border border-white/10 text-apple-text-secondary h-10 w-10 min-w-10">
          <ArrowPathIcon className="w-4 h-4" />
        </Button>
      </div>

      <div className="border border-white/10 rounded-2xl bg-white/[0.01]">
        <Table removeWrapper aria-label="Site Assets Table" classNames={{ th: 'bg-white/5 text-[10px] uppercase font-black tracking-widest text-apple-text-secondary border-b border-white/10 py-3', td: 'border-b border-white/5 py-4 text-sm' }}>
          <TableHeader>
            <TableColumn width={280}>站点 / URL</TableColumn>
            <TableColumn width={240}>标准键</TableColumn>
            <TableColumn width={120}>状态</TableColumn>
            <TableColumn width={120}>可信度</TableColumn>
            <TableColumn width={160}>来源</TableColumn>
            <TableColumn width={220}>系统/自定义标签</TableColumn>
          </TableHeader>
          <TableBody emptyContent={<div className="py-20 text-apple-text-tertiary">此资产池下暂无站点事实资产。</div>} isLoading={isPending} loadingContent={<Skeleton className="h-40 w-full rounded-b-2xl" />}>
            {items.map((it) => (
              <TableRow key={it.id}>
                <TableCell><span className="font-mono font-bold tracking-tight text-white break-all">{it.display_name}</span></TableCell>
                <TableCell><span className="text-xs text-apple-text-secondary font-mono break-all">{it.normalized_key}</span></TableCell>
                <TableCell><span className="text-[10px] border border-white/10 bg-white/5 text-apple-text-secondary px-2 py-0.5 rounded font-black tracking-widest uppercase">{it.status}</span></TableCell>
                <TableCell><span className="text-[10px] bg-apple-green/10 border border-apple-green/20 text-apple-green-light px-2 py-0.5 rounded tracking-widest font-black uppercase">{it.confidence_level}</span></TableCell>
                <TableCell><span className="text-[10px] bg-apple-blue/10 border border-apple-blue/20 text-apple-blue-light px-2 py-0.5 rounded tracking-widest font-black uppercase">{sourceLabel(it.source_summary)}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {joinTags(it.system_facets, it.custom_tags).map((tag) => (
                      <span key={tag} className="text-[9px] font-bold text-apple-text-tertiary uppercase bg-white/5 px-1 rounded">{tag}</span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {total > 0 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-white/5">
            <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">站点事实资产 {total} 项</span>
            {totalPages > 1 && <Pagination size="sm" page={page} total={totalPages} onChange={setPage} classNames={{ cursor: 'bg-apple-blue font-bold shadow-lg' }} />}
          </div>
        )}
      </div>
    </div>
  )
}
