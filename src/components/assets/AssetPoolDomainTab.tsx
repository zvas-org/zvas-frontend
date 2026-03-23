import { useState } from 'react'
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Pagination, Skeleton, Input, Button } from '@heroui/react'
import { MagnifyingGlassIcon, ArrowPathIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

import { useAssetPoolAssets, useAssetPoolAssetDetail, type PoolAssetVM } from '@/api/adapters/asset'

function sourceLabel(sourceSummary: Record<string, unknown>) {
  const candidate = sourceSummary?.primary_source ?? sourceSummary?.source_type
  return typeof candidate === 'string' && candidate ? candidate : '-'
}

function joinTags(systemFacets: string[], customTags: string[]) {
  return [...systemFacets, ...customTags].slice(0, 3)
}

function getRootDomain(item: PoolAssetVM) {
  // 优先读后端结构化字段，降级为字符串推导
  return item.detail?.root_domain || item.display_name.split('.').slice(-2).join('.')
}

// ─── 域名展开组件（懒加载 detail 接口）─────────────────────────────────────────────
function ExpandedDomainRow({ poolId, item }: { poolId: string; item: PoolAssetVM }) {
  const detailQuery = useAssetPoolAssetDetail(poolId, item.id)

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

  const detail = detailQuery.data ?? item
  const payload = detail.detail
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

export function AssetPoolDomainTab({ poolId }: { poolId: string }) {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isPending, refetch } = useAssetPoolAssets(poolId, {
    page,
    page_size: pageSize,
    keyword: keyword || undefined,
    view: 'domain',
  })

  const items = data?.data || []
  const total = data?.pagination?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4">
        <div className="flex flex-col">
          <h3 className="text-xl font-black text-white tracking-tight mb-1">域名资产</h3>
          <p className="text-[13px] text-apple-text-tertiary font-medium">展示此资产池归集的域名资产及关联关系摘要。</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Input
            isClearable
            value={keyword}
            placeholder="检索域名..."
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

      <div className="rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-x-auto">
        <Table
          removeWrapper
          aria-label="Domain Assets Table"
          layout="fixed"
          classNames={{
            base: 'p-4 min-w-[1100px]',
            table: 'table-fixed',
            th: 'bg-transparent text-apple-text-tertiary uppercase text-[10px] tracking-[0.2em] font-black h-14 border-b border-white/5 pb-2 text-left',
            td: 'border-b border-white/5 py-4 text-left last:border-0',
            tr: 'hover:bg-white/[0.03] transition-colors cursor-pointer',
          }}
        >
          <TableHeader>
            <TableColumn width={280}>域名</TableColumn>
            <TableColumn width={200}>根域</TableColumn>
            <TableColumn width={110}>关联 IP 数</TableColumn>
            <TableColumn width={110}>关联站点数</TableColumn>
            <TableColumn width={130}>来源</TableColumn>
            <TableColumn width={100}>可信度</TableColumn>
            <TableColumn width={160}>标签</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={
              <div className="py-20 text-apple-text-tertiary text-sm font-bold flex flex-col items-center gap-2">
                <span>暂无域名资产记录。</span>
              </div>
            }
            isLoading={isPending}
            loadingContent={<Skeleton className="h-40 w-full rounded-[24px] bg-white/5" />}
          >
            {items.flatMap((it) => {
              const isExpanded = expandedId === it.id
              const mainRow = (
                <TableRow key={it.id} onClick={() => toggle(it.id)} className={isExpanded ? 'bg-white/[0.03]' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-apple-text-tertiary flex-shrink-0">
                        {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                      </span>
                      <span className="font-mono text-[13px] text-apple-blue-light font-black break-all">{it.display_name}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-[12px] font-mono text-apple-text-secondary">{getRootDomain(it)}</span></TableCell>
                  <TableCell><span className="text-[12px] text-white font-bold">{it.detail?.ip_count ?? '-'}</span></TableCell>
                  <TableCell><span className="text-[12px] text-white font-bold">{it.detail?.site_count ?? '-'}</span></TableCell>
                  <TableCell><span className="text-[11px] font-bold text-apple-text-secondary uppercase tracking-wider">{sourceLabel(it.source_summary)}</span></TableCell>
                  <TableCell><span className="text-[9px] bg-apple-green/10 border border-apple-green/20 text-apple-green-light px-2.5 py-1 rounded-full tracking-[0.2em] font-black uppercase">{it.confidence_level}</span></TableCell>
                  <TableCell>
                    <div className="flex gap-1.5 flex-wrap">
                      {joinTags(it.system_facets, it.custom_tags).map((tag) => (
                        <span key={tag} className="text-[9px] font-black tracking-widest text-apple-text-secondary uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )

              if (isExpanded) {
                const expandRow = (
                  <TableRow key={`${it.id}-expanded`} className="bg-white/[0.01]">
                    <TableCell colSpan={7} className="p-0 border-b border-white/5">
                      <ExpandedDomainRow poolId={poolId} item={it} />
                    </TableCell>
                  </TableRow>
                )
                return [mainRow, expandRow]
              }
              return [mainRow]
            })}
          </TableBody>
        </Table>
        {total > 0 && (
          <div className="flex justify-between items-center px-6 py-5 border-t border-white/5 bg-white/[0.01]">
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-apple-text-tertiary">合计归集 <span className="text-white mx-1">{total}</span> 项域名资产</span>
            {totalPages > 1 && (
              <Pagination
                size="sm"
                page={page}
                total={totalPages}
                onChange={(p) => { setPage(p); setExpandedId(null) }}
                classNames={{
                  wrapper: 'gap-2',
                  item: 'bg-white/5 text-apple-text-secondary font-bold rounded-xl border border-white/5 hover:bg-white/10 transition-all min-w-[32px] h-8 text-[12px]',
                  cursor: 'bg-apple-blue font-black rounded-xl shadow-lg shadow-apple-blue/30 text-white',
                  prev: 'bg-white/5 text-white/50 rounded-xl hover:bg-white/10',
                  next: 'bg-white/5 text-white/50 rounded-xl hover:bg-white/10',
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
