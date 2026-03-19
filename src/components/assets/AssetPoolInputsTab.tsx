import { useState } from 'react'
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Pagination, Skeleton, Button } from '@heroui/react'
import { DocumentPlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

import { useAssetPoolInputs } from '@/api/adapters/asset'
import { ManualInputModal } from './ManualInputModal'

function formatDateTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

export function AssetPoolInputsTab({ poolId }: { poolId: string }) {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [manualVisible, setManualVisible] = useState(false)

  const query = useAssetPoolInputs(poolId, { page, page_size: pageSize, sort: 'created_at', order: 'desc' })

  const items = query.data?.data || []
  const total = query.data?.pagination?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between w-full pb-2">
        <div className="flex flex-col text-sm">
          <h3 className="font-bold text-white">输入记录</h3>
          <p className="text-xs text-apple-text-tertiary">展示手工录入、文件导入和外部同步形成的原始输入记录。这里不是最终资产事实视图。</p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="flat" onPress={() => setManualVisible(true)} className="bg-white/5 border border-white/10 text-white font-bold h-9">
            <DocumentPlusIcon className="w-4 h-4" /> 手工录入
          </Button>
          <Button size="sm" variant="flat" className="bg-white/5 border border-white/10 text-white font-bold h-9" isDisabled>
            <ArrowDownTrayIcon className="w-4 h-4" /> 导出明细
          </Button>
        </div>
      </div>

      <div className="border border-white/10 rounded-2xl bg-white/[0.01] overflow-hidden">
        <Table removeWrapper aria-label="Input Records Table" classNames={{ th: 'bg-white/5 text-[10px] text-apple-text-secondary uppercase tracking-widest font-black border-b border-white/10 py-3', td: 'border-b border-white/5 py-3 text-sm' }}>
          <TableHeader>
            <TableColumn width={220}>原始输入</TableColumn>
            <TableColumn width={220}>标准化结果</TableColumn>
            <TableColumn width={120}>解析类型</TableColumn>
            <TableColumn width={120}>录入方式</TableColumn>
            <TableColumn width={140}>来源类型</TableColumn>
            <TableColumn width={120}>状态</TableColumn>
            <TableColumn width={180}>时间</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={<div className="py-20 text-apple-text-tertiary text-sm font-bold flex flex-col items-center gap-2"><span>当前资产池还没有输入记录</span><span className="text-xs font-normal opacity-50">你可以先从右上角手工录入一批目标</span></div>}
            isLoading={query.isPending}
            loadingContent={<Skeleton className="h-40 w-full rounded-none" />}
          >
            {items.map((it) => (
              <TableRow key={it.id}>
                <TableCell><span className="font-mono text-apple-blue-light break-all">{it.raw_value}</span></TableCell>
                <TableCell><span className="font-mono text-white break-all">{it.normalized_value}</span></TableCell>
                <TableCell><span className="text-[10px] border border-white/10 bg-white/5 text-apple-text-secondary px-2 py-0.5 rounded font-black tracking-widest uppercase">{it.parsed_type}</span></TableCell>
                <TableCell><span className="text-[10px] border border-apple-blue/20 bg-apple-blue/10 text-apple-blue-light px-2 py-0.5 rounded font-black tracking-widest uppercase">{it.ingest_type}</span></TableCell>
                <TableCell><span className="text-xs text-apple-text-secondary">{it.source_type}</span></TableCell>
                <TableCell><span className="text-[10px] border border-apple-green/20 bg-apple-green/10 text-apple-green-light px-2 py-0.5 rounded font-black tracking-widest uppercase">{it.status}</span></TableCell>
                <TableCell><span className="text-apple-text-secondary text-[11px] font-mono">{formatDateTime(it.created_at)}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {total > 0 && (
          <div className="flex flex-row justify-between items-center px-4 py-3 border-t border-white/5 bg-white/[0.01]">
            <span className="text-[10px] font-black text-apple-text-tertiary uppercase tracking-widest">输入记录共计 {total} 项</span>
            {totalPages > 1 && <Pagination size="sm" page={page} total={totalPages} onChange={setPage} classNames={{ cursor: 'bg-apple-blue font-bold shadow-lg' }} />}
          </div>
        )}
      </div>

      <ManualInputModal isOpen={manualVisible} onClose={() => setManualVisible(false)} defaultPoolId={poolId} />
    </div>
  )
}
