import {
  Button,
  Input,
  Select,
  SelectItem,
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
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

import { useFindings } from '@/api/adapters/finding'

function formatDateTime(isoStr?: string) {
  if (!isoStr) return '-'
  return new Date(isoStr).toLocaleString()
}

export function FindingsPage() {

  // 模拟一些数据联动状态
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')

  const findingsQuery = useFindings({
    page,
    page_size: pageSize,
    keyword: keyword || undefined,
    severity: severityFilter === 'all' ? undefined : severityFilter
  })

  const items = findingsQuery.data?.data || []
  const total = findingsQuery.data?.pagination?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col gap-8 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20 p-4">
      <section className="flex flex-col gap-2 relative">
        <h1 className="text-4xl font-black tracking-tight text-[#f5f5f7]">暴露面漏洞聚合</h1>
        <p className="text-[#86868b] leading-relaxed max-w-2xl font-medium">
          融合海量资产范围下发掘的高保真漏洞及配置脆弱点全景。
        </p>
      </section>

      <section className="flex flex-col md:flex-row items-center gap-4 w-full mt-4">
        <div className="flex-1 w-full relative">
          <Input
            isClearable
            value={keyword}
            placeholder="全文索引，搜索目标资产标识如 IP/域名..."
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
          <Select
            aria-label="等级筛选"
            selectedKeys={[severityFilter]}
            onChange={(e) => { setSeverityFilter(e.target.value as string || 'all'); setPage(1) }}
            variant="flat"
            classNames={{
              trigger: "bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-14 w-40 rounded-[20px] border border-white/5 backdrop-blur-md text-apple-text-primary font-bold pr-12",
              value: "text-apple-text-primary truncate text-ellipsis"
            }}
          >
            <SelectItem key="all" textValue="所有等级">所有等级风险</SelectItem>
            <SelectItem key="critical" textValue="严重 (Critical)">严重 (Critical)</SelectItem>
            <SelectItem key="high" textValue="高危 (High)">高危 (High)</SelectItem>
            <SelectItem key="medium" textValue="中危 (Medium)">中危 (Medium)</SelectItem>
            <SelectItem key="low" textValue="低危 (Low)">低危 (Low)</SelectItem>
          </Select>
          <Button
            variant="flat"
            isIconOnly
            className="h-14 w-14 rounded-[20px] bg-apple-tertiary-bg/10 border border-white/5 backdrop-blur-md"
            onPress={() => findingsQuery.refetch()}
          >
            <ArrowPathIcon className="w-6 h-6 text-apple-text-secondary" />
          </Button>
        </div>
      </section>

      <div className="rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-x-auto">
        <Table
          aria-label="Findings table"
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
            <TableColumn width={300}>严重脆弱点 (CVE / Issue Title)</TableColumn>
            <TableColumn width={120}>评级</TableColumn>
            <TableColumn width={100}>置信度</TableColumn>
            <TableColumn width={280}>命中网络拓扑目标</TableColumn>
            <TableColumn width={180}>曝光时间</TableColumn>
            <TableColumn width={120} align="end">溯源动作</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={<div className="h-40 flex items-center justify-center text-apple-text-tertiary font-bold">没有捕获到任何安全威胁。这很反常，或许您可以提高并发参数重新投递任务。</div>}
            isLoading={findingsQuery.isPending}
            loadingContent={<Skeleton className="rounded-xl w-full h-40 bg-white/5" />}
          >
            {items.map((finding) => (
              <TableRow key={finding.finding_id}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-white tracking-tight leading-loose text-balance">{finding.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${
                      finding.severity === 'critical' || finding.severity === 'high' ? 'border-apple-red/40 text-apple-red-light bg-apple-red/10' :
                      'border-white/20 text-apple-text-secondary bg-white/5'
                    }`}>
                    {finding.severity}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] text-apple-green-light font-mono bg-apple-green/10 px-2 py-0.5 rounded uppercase tracking-[0.2em]">High</span>
                </TableCell>
                 <TableCell>
                  <span className="text-xs text-apple-text-tertiary font-mono tracking-widest truncate block max-w-full">{finding.asset_ref}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-apple-text-secondary font-mono">{formatDateTime(finding.created_at)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end pr-2 gap-2">
                     <Button
                      size="sm"
                      variant="bordered"
                      className="rounded-full border-white/10 text-apple-text-secondary hover:text-white hover:border-white/30 font-bold"
                    >
                      举证包
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
              拦截日志总量 <span className="text-white">{total}</span>
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
