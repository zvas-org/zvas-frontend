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
  Card,
  CardBody,
  Chip,
} from '@heroui/react'
import { useState } from 'react'
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

import { useReports } from '@/api/adapters/finding'

function formatDateTime(isoStr?: string) {
  if (!isoStr) return '-'
  return new Date(isoStr).toLocaleString()
}

export function ReportsPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')

  const reportsQuery = useReports({
    page,
    page_size: pageSize,
    keyword: keyword || undefined,
  })

  const items = reportsQuery.data?.data || []
  const total = reportsQuery.data?.pagination?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      {/* 1. 页面标题区 & 2. 摘要区 */}
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">报告分发</h1>
        <p className="text-default-500 text-sm">
          查看和下载安全审计分析报告，支持全局搜索与检索。
        </p>
      </section>

      <Card className="w-full" shadow="sm">
        <CardBody className="gap-6 p-4 md:p-6">
          {/* 3. 筛选工具栏 */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
            <div className="w-full md:w-96">
              <Input
                isClearable
                value={keyword}
                placeholder="搜索报告名称或标识..."
                onValueChange={(val) => { setKeyword(val); setPage(1) }}
                startContent={<MagnifyingGlassIcon className="w-4 h-4 text-default-400" />}
                variant="bordered"
                size="md"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                isIconOnly
                variant="flat"
                color="default"
                onPress={() => reportsQuery.refetch()}
                aria-label="Refresh reports"
              >
                <ArrowPathIcon className="w-4 h-4" />
              </Button>
              <Button
                color="primary"
                className="font-medium"
              >
                手工归档汇总
              </Button>
            </div>
          </div>

          {/* 4. 数据主体区 */}
          <div className="w-full overflow-x-auto">
            <Table
              aria-label="报告列表"
              layout="fixed"
              removeWrapper
              classNames={{
                th: "bg-default-100 text-default-600 font-semibold",
                td: "py-3",
              }}
            >
              <TableHeader>
                <TableColumn width={280}>报告名称</TableColumn>
                <TableColumn width={180}>作用域</TableColumn>
                <TableColumn width={140}>状态</TableColumn>
                <TableColumn width={180}>创建时间</TableColumn>
                <TableColumn width={120} align="end">操作</TableColumn>
              </TableHeader>
              <TableBody
                emptyContent={
                  <div className="py-10 flex flex-col items-center justify-center text-default-400 gap-2">
                    <span>暂无报告数据</span>
                  </div>
                }
                isLoading={reportsQuery.isPending}
                loadingContent={<Skeleton className="rounded-lg w-full h-32" />}
              >
                {items.map((rpt) => (
                  <TableRow key={rpt.id}>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground truncate block">{rpt.name}</span>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        variant="flat"
                        color="secondary"
                        className="font-mono text-xs"
                      >
                        @{rpt.scope_type}: {rpt.scope_name}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={rpt.status === 'generated' ? 'success' : 'default'}
                        className="text-xs font-semibold uppercase tracking-wider"
                      >
                        {rpt.status}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-default-500 font-mono">{formatDateTime(rpt.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end pr-2">
                        <Button
                          size="sm"
                          variant="light"
                          color="primary"
                          className="font-medium"
                        >
                          下载
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 分页区 */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-4 border-t border-divider mt-2">
              <p className="text-xs text-default-500">
                共 <span className="font-semibold text-foreground mx-1">{total}</span> 条记录
              </p>
              {totalPages > 1 && (
                <Pagination
                  total={totalPages}
                  page={page}
                  onChange={setPage}
                  showControls
                  color="primary"
                  variant="flat"
                  size="sm"
                />
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
