import React, { useState } from 'react'
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Pagination, Skeleton, Input, Button, Tooltip } from '@heroui/react'
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

import { useAssetPoolAssets, parseHttpProbeSummary } from '@/api/adapters/asset'
import type { PoolAssetVM } from '@/api/adapters/asset'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

function joinTags(systemFacets: string[], customTags: string[]) {
  return [...systemFacets, ...customTags].slice(0, 4)
}

function sourceLabel(sourceSummary: Record<string, unknown>) {
  const candidate = sourceSummary?.primary_source ?? sourceSummary?.source_type
  return typeof candidate === 'string' && candidate ? candidate : '-'
}

function ExpandedSiteRow({ item }: { item: PoolAssetVM }) {
  const extra = item.detail?.extra_payload || item.detail
  const probe = parseHttpProbeSummary(extra)
  return (
    <div className="px-10 py-5 bg-white/[0.01] border-l-2 border-l-apple-blue flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">存活状态</span>
          <div className="flex items-center gap-2">
            {probe?.probe_status === 'alive' ? <span className="text-[10px] font-bold tracking-widest bg-apple-green/10 text-apple-green-light border border-apple-green/30 px-2 py-0.5 rounded uppercase">站点存活</span> :
             probe?.probe_status === 'unreachable' ? <Tooltip content={probe?.probe_error || '无法确认细节'}><span className="text-[10px] font-bold tracking-widest bg-white/5 text-apple-text-secondary border border-white/20 px-2 py-0.5 rounded uppercase cursor-help">站点不存活</span></Tooltip> :
             <span className="text-[10px] font-bold tracking-widest bg-white/5 text-white/50 border border-white/10 px-2 py-0.5 rounded uppercase">-</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">标题 (Title)</span>
          <span className="text-[12px] text-white font-medium break-all">{probe?.title || '-'}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">状态码</span>
          <span className="text-[12px] text-apple-text-secondary">
            {probe?.status_code ? (
              <span className={`px-2 py-0.5 rounded-md font-bold ${probe.status_code >= 200 && probe.status_code < 400 ? 'bg-apple-green/20 text-apple-green-light' : 'bg-white/10 text-white'}`}>
                {probe.status_code}
              </span>
            ) : '-'}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">内容长度</span>
          <span className="text-[12px] text-apple-text-secondary italic font-mono">{probe?.content_length ?? '-'}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">Server 响应头</span>
          <span className="text-[12px] text-apple-text-secondary italic font-mono">{probe?.server || '-'}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">Favicon Hash</span>
          <span className="text-[12px] text-apple-text-secondary italic font-mono">{probe?.favicon_hash || '-'}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">ICP 备案信息</span>
          <span className="text-[12px] text-apple-text-secondary italic">{probe?.icp || '-'}</span>
        </div>
        <div className="flex flex-col gap-1 col-span-2">
          <span className="text-[10px] uppercase font-black tracking-widest text-apple-text-tertiary">页面根 URL</span>
          <span className="text-[12px] text-apple-blue-light font-mono break-all">{probe?.site_url || item.display_name}</span>
        </div>
      </div>
    </div>
  )
}

export function AssetPoolSiteTab({ poolId }: { poolId: string }) {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

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
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4">
        <div className="flex flex-col">
          <h3 className="text-xl font-black text-white tracking-tight mb-1">站点与服务平面</h3>
          <p className="text-[13px] text-apple-text-tertiary font-medium">展示此资产池内暴露在互联网或内网的 Web 站点及 HTTP/HTTPS 服务事实。</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Input
            isClearable
            value={keyword}
            placeholder="搜索 URL 或站点名..."
            onValueChange={(v) => { setKeyword(v); setPage(1) }}
            classNames={{ 
              inputWrapper: 'bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-12 rounded-[16px] border border-white/5 backdrop-blur-md w-full md:w-64', 
              input: 'text-[13px] font-medium placeholder:text-apple-text-tertiary' 
            }}
            startContent={<MagnifyingGlassIcon className="w-5 h-5 text-apple-text-tertiary" />}
          />
          <Button isIconOnly variant="flat" onPress={() => refetch()} className="h-12 w-12 rounded-[16px] bg-apple-tertiary-bg/10 border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">
            <ArrowPathIcon className="w-5 h-5 text-apple-text-secondary" />
          </Button>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-x-auto scrollbar-hide md:scrollbar-default custom-scrollbar">
        <Table 
          removeWrapper 
          aria-label="Site Assets Table" 
          classNames={{ 
            base: "p-4 min-w-[940px]",
            thead: "[&>tr]:first:rounded-xl",
            th: "bg-transparent text-apple-text-tertiary uppercase text-[10px] tracking-[0.2em] font-black h-14 border-b border-white/5 pb-2 text-left",
            td: "border-b border-white/5 py-4 text-left last:border-0",
            tr: "hover:bg-white/[0.03] transition-colors cursor-default"
          }}>
          <TableHeader>
            <TableColumn width={280}>站点实体 / URL</TableColumn>
            <TableColumn width={240}>标准编目键</TableColumn>
            <TableColumn width={100}>置信度</TableColumn>
            <TableColumn width={100}>流状态</TableColumn>
            <TableColumn width={140}>来源标识</TableColumn>
            <TableColumn width={240}>特征映射列</TableColumn>
          </TableHeader>
          <TableBody 
            emptyContent={
              <div className="py-20 text-apple-text-tertiary text-sm font-bold flex flex-col items-center gap-2">
                <span>此资产池下暂无 Web 站点事实资产 (NULL_SITE_ASSETS)</span>
              </div>
            } 
            isLoading={isPending} 
            loadingContent={<Skeleton className="h-40 w-full rounded-[24px] bg-white/5" />}
          >
            {items.map((it) => {
              const isExpanded = expandedRowId === it.id
              return (
                <React.Fragment key={it.id}>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button isIconOnly size="sm" variant="light" className="text-apple-text-tertiary w-6 h-6 min-w-6" onPress={() => setExpandedRowId(isExpanded ? null : it.id)}>
                          {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                        </Button>
                        {(() => {
                           const sum = parseHttpProbeSummary(it.detail?.extra_payload || it.detail);
                           if (sum?.probe_status === 'alive') return <span className="w-2 h-2 rounded-full bg-apple-green shrink-0" title="站点存活"></span>;
                           if (sum?.probe_status === 'unreachable') return <span className="w-2 h-2 rounded-full bg-apple-text-secondary shrink-0" title={`站点不存活: ${sum?.probe_error || '未知'}`}></span>;
                           return null;
                        })()}
                        <span className="font-mono text-[14px] text-apple-blue-light font-black tracking-tight break-all drop-shadow-[0_0_8px_rgba(0,113,227,0.3)] cursor-pointer" onClick={() => setExpandedRowId(isExpanded ? null : it.id)}>{it.display_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[12px] text-white font-mono break-all font-bold">{it.normalized_key}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[9px] bg-apple-green/10 border border-apple-green/20 text-apple-green-light px-2.5 py-1 rounded-full tracking-[0.2em] font-black uppercase">
                        {it.confidence_level}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[9px] border border-white/10 bg-white/5 text-apple-text-secondary px-2.5 py-1 rounded-full font-black tracking-[0.2em] uppercase">
                        {it.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] font-bold text-apple-text-secondary uppercase tracking-wider">{sourceLabel(it.source_summary)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap">
                        {joinTags(it.system_facets, it.custom_tags).map((tag) => (
                          <span key={tag} className="text-[9px] font-black tracking-widest text-apple-text-secondary uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0 border-b border-white/5">
                        <ExpandedSiteRow item={it} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
        {total > 0 && (
          <div className="flex justify-between items-center px-6 py-5 border-t border-white/5 bg-white/[0.01]">
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-apple-text-tertiary">合计归集 <span className="text-white mx-1">{total}</span> 项站点实体</span>
            {totalPages > 1 && (
              <Pagination 
                size="sm" 
                page={page} 
                total={totalPages} 
                onChange={setPage} 
                classNames={{ 
                  wrapper: "gap-2",
                  item: "bg-white/5 text-apple-text-secondary font-bold rounded-xl border border-white/5 hover:bg-white/10 transition-all min-w-[32px] h-8 text-[12px]",
                  cursor: "bg-apple-blue font-black rounded-xl shadow-lg shadow-apple-blue/30 text-white",
                  prev: "bg-white/5 text-white/50 rounded-xl hover:bg-white/10",
                  next: "bg-white/5 text-white/50 rounded-xl hover:bg-white/10",
                }} 
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
