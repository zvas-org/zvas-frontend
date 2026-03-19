import { useState } from 'react'
import { Skeleton, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Pagination } from '@heroui/react'
import { useTaskSnapshotAssets, type TaskDetailVM } from '@/api/adapters/task'

function formatDateTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

export function TaskSnapshotExpandedTab({ task }: { task?: TaskDetailVM }) {
  const [page, setPage] = useState(1)
  const pageSize = 20
  const query = useTaskSnapshotAssets(task?.id, { page, page_size: pageSize, origin_type: 'expanded', sort: 'created_at', order: 'desc' })

  const items = query.data?.data || []
  const total = query.data?.pagination?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold mb-1">快照扩展</h3>
          <p className="text-xs text-apple-text-tertiary font-medium">任务执行期间新增发现并写入当前快照的扩展资产。</p>
        </div>
      </div>

      <div className="border border-white/10 rounded-2xl bg-white/[0.01] overflow-hidden">
        <Table removeWrapper aria-label="Task Snapshot Expanded Assets" classNames={{ th: 'bg-white/5 text-[10px] uppercase font-black tracking-widest text-apple-text-secondary border-b border-white/10 py-3', td: 'border-b border-white/5 py-4 text-sm' }}>
          <TableHeader>
            <TableColumn width={220}>显示值</TableColumn>
            <TableColumn width={120}>类型</TableColumn>
            <TableColumn width={220}>标准键</TableColumn>
            <TableColumn width={140}>来源</TableColumn>
            <TableColumn width={120}>可信度</TableColumn>
            <TableColumn width={100}>已晋升</TableColumn>
            <TableColumn width={180}>发现时间</TableColumn>
          </TableHeader>
          <TableBody emptyContent={<div className="py-20 text-apple-text-tertiary text-sm">当前任务还没有扩展资产，或相关阶段尚未写入快照资产。</div>} isLoading={query.isPending} loadingContent={<Skeleton className="h-40 w-full rounded-none" />}>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell><span className="font-mono text-white break-all">{item.display_name}</span></TableCell>
                <TableCell><span className="text-[10px] border border-white/10 bg-white/5 text-apple-text-secondary px-2 py-0.5 rounded font-black tracking-widest uppercase">{item.asset_kind}</span></TableCell>
                <TableCell><span className="text-xs text-apple-text-secondary font-mono break-all">{item.normalized_key}</span></TableCell>
                <TableCell><span className="text-[10px] bg-apple-blue/10 border border-apple-blue/20 text-apple-blue-light px-2 py-0.5 rounded tracking-widest font-black uppercase">{item.source_type}</span></TableCell>
                <TableCell><span className="text-[10px] bg-apple-green/10 border border-apple-green/20 text-apple-green-light px-2 py-0.5 rounded tracking-widest font-black uppercase">{item.confidence_level}</span></TableCell>
                <TableCell><span className={`text-[10px] px-2 py-0.5 rounded font-black tracking-widest uppercase ${item.promoted_to_pool ? 'bg-apple-green/10 border border-apple-green/20 text-apple-green-light' : 'bg-white/5 border border-white/10 text-apple-text-secondary'}`}>{item.promoted_to_pool ? 'yes' : 'no'}</span></TableCell>
                <TableCell><span className="text-apple-text-secondary text-[11px] font-mono">{formatDateTime(item.created_at)}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex justify-end px-4 py-3 border-t border-white/5 bg-white/[0.01]">
            <Pagination size="sm" page={page} total={totalPages} onChange={setPage} classNames={{ cursor: 'bg-apple-blue font-bold shadow-lg' }} />
          </div>
        )}
      </div>
    </div>
  )
}
