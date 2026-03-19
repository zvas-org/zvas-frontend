import {
  Button,
  Input,
  Skeleton,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
} from '@heroui/react'
import { useState } from 'react'
import { MagnifyingGlassIcon, ArrowPathIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline'

import { useEvidences } from '@/api/adapters/finding'

function formatDateTime(isoStr?: string) {
  if (!isoStr) return '-'
  return new Date(isoStr).toLocaleString()
}

export function EvidencesPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')

  const evidencesQuery = useEvidences({
    page,
    page_size: pageSize,
    keyword: keyword || undefined,
  })

  const items = evidencesQuery.data?.data || []
  const total = evidencesQuery.data?.pagination?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col gap-8 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20 p-4">
      <section className="flex flex-col gap-2 relative">
        <h1 className="text-4xl font-black tracking-tight text-[#f5f5f7]">法医学 / 证据归档管理</h1>
        <p className="text-[#86868b] leading-relaxed max-w-2xl font-medium">
          一切扫描引擎发出的测试载荷和回显、加密截图记录等司法溯源包均冻结于此。
        </p>
      </section>

      <section className="flex flex-col md:flex-row items-center gap-4 w-full mt-4">
        <div className="flex-1 w-full relative">
          <Input
            isClearable
            value={keyword}
            placeholder="全文索引，或者按 Task UUID, Finding UUID 锁定请求包..."
            onValueChange={(val) => { setKeyword(val); setPage(1) }}
            variant="flat"
            startContent={<MagnifyingGlassIcon className="w-5 h-5 text-apple-text-tertiary" />}
            classNames={{
              inputWrapper: "bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-14 rounded-[20px] border border-white/5 backdrop-blur-md",
              input: "text-base font-medium placeholder:text-apple-text-tertiary",
            }}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="flat"
            isIconOnly
            className="h-14 w-14 rounded-[20px] bg-apple-tertiary-bg/10 border border-white/5 backdrop-blur-md"
            onPress={() => evidencesQuery.refetch()}
          >
            <ArrowPathIcon className="w-6 h-6 text-apple-text-secondary" />
          </Button>
        </div>
      </section>

      <div className="rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-x-auto">
        <Table
          aria-label="Evidences table"
          layout="fixed"
          removeWrapper
          classNames={{
            base: "p-4 min-w-[1000px]",
            table: "table-fixed",
            th: "bg-transparent text-apple-text-tertiary uppercase text-[10px] tracking-[0.2em] font-black h-14 border-b border-white/5 pb-2 text-left",
            td: "py-5 border-b border-white/5 last:border-0 text-left",
            tr: "hover:bg-white/[0.03] transition-colors cursor-pointer"
          }}
        >
          <TableHeader>
            <TableColumn width={100}>数据簇介质</TableColumn>
            <TableColumn width={240}>所属的漏洞事件引用</TableColumn>
            <TableColumn width={300}>智能分析摘要</TableColumn>
            <TableColumn width={180}>冻结快照时间</TableColumn>
            <TableColumn width={140} align="end">解析 / 克隆</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={<div className="h-40 flex items-center justify-center text-apple-text-tertiary font-bold">无证据材料挂载。</div>}
            isLoading={evidencesQuery.isPending}
            loadingContent={<Skeleton className="rounded-xl w-full h-40 bg-white/5" />}
          >
            {items.map((evi) => (
              <TableRow key={evi.id}>
                <TableCell>
                  <span className="text-[10px] text-white font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase tracking-[0.2em]">
                     {evi.evidence_type}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-apple-text-secondary tracking-tight leading-loose text-balance truncate max-w-[200px]">{evi.finding_title}</span>
                  </div>
                </TableCell>
                <TableCell>
                   <span className="text-xs text-apple-text-tertiary font-mono italic max-w-full inline-block truncate">{evi.summary}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-apple-text-secondary font-mono">{formatDateTime(evi.created_at)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end pr-2 gap-2">
                     <Button
                      size="sm"
                      variant="bordered"
                      color="primary"
                      className="rounded-full border-white/10 hover:border-apple-blue/50 text-apple-text-secondary hover:text-apple-blue-light font-bold"
                    >
                      <CloudArrowDownIcon className="w-4 h-4"/>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {total > 0 && (
          <div className="px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center border-t border-white/5 bg-white/[0.01]">
            <p className="text-[11px] text-apple-text-tertiary font-bold uppercase tracking-[0.2em]">
              当前材料批次 <span className="text-white">{total}</span>
            </p>
            {totalPages > 1 && (
              <Pagination
                total={totalPages}
                page={page}
                onChange={setPage}
                classNames={{
                  wrapper: "gap-2",
                  item: "bg-white/5 text-apple-text-secondary font-bold rounded-xl border border-white/5 h-10 min-w-[40px]",
                  cursor: "bg-apple-blue font-black rounded-xl shadow-lg",
                  prev: "bg-white/5",
                  next: "bg-white/5",
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
