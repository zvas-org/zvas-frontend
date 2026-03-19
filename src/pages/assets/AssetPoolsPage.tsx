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
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, PlusIcon, ArrowPathIcon, CloudArrowDownIcon, DocumentPlusIcon, ArrowDownTrayIcon, ServerStackIcon } from '@heroicons/react/24/outline'

import { useAssetPools } from '@/api/adapters/asset'
import { CreateAssetPoolModal } from '@/components/assets/CreateAssetPoolModal'
import { ManualInputModal } from '@/components/assets/ManualInputModal'
import { FileImportModal } from '@/components/assets/FileImportModal'

function formatDateTime(isoStr?: string) {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function AssetPoolsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  
  // Modals state
  const [createVisible, setCreateVisible] = useState(false)
  const [manualVisible, setManualVisible] = useState(false)
  const [fileImportVisible, setFileImportVisible] = useState(false)

  const poolsQuery = useAssetPools({
    page,
    page_size: pageSize,
    keyword: keyword || undefined,
    tag: tagFilter || undefined,
  })

  const items = poolsQuery.data?.data || []
  const total = poolsQuery.data?.pagination?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col gap-8 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20 p-4">
      {/* 头部：标题与介绍 */}
      <section className="flex flex-col gap-2 relative">
        <h1 className="text-3xl font-black tracking-tight text-[#f5f5f7]">资产源 (Asset Pools)</h1>
        <p className="text-apple-text-secondary text-sm font-medium">物理域与逻辑域的顶层分组架构。全站业务运转的核心主入口。</p>
      </section>

      {/* 搜索与工具栏 */}
      <section className="flex flex-col md:flex-row items-center gap-4 w-full">
        <div className="flex flex-1 gap-2 w-full">
          <Input
            isClearable
            value={keyword}
            placeholder="搜索资产池名称..."
            onValueChange={(val) => { setKeyword(val); setPage(1) }}
            variant="flat"
            startContent={<MagnifyingGlassIcon className="w-5 h-5 text-apple-text-tertiary" />}
            classNames={{
              inputWrapper: "bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-10 rounded-lg border border-white/5",
              input: "text-sm text-white placeholder:text-apple-text-tertiary",
            }}
          />
          <Input
            isClearable
            value={tagFilter}
            placeholder="按系统标签筛选 (例如 prod, external)..."
            onValueChange={(val) => { setTagFilter(val); setPage(1) }}
            variant="flat"
            classNames={{
              inputWrapper: "bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-10 rounded-lg border border-white/5",
              input: "text-sm text-white placeholder:text-apple-text-tertiary",
            }}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="flat"
            isIconOnly
            className="h-10 w-10 rounded-lg bg-apple-tertiary-bg/10 border border-white/5"
            onPress={() => poolsQuery.refetch()}
          >
            <ArrowPathIcon className="w-5 h-5 text-apple-text-secondary" />
          </Button>

          <Dropdown
            classNames={{
              content: "bg-apple-bg/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[200px]"
            }}
          >
            <DropdownTrigger>
              <Button 
                variant="flat"
                className="h-10 rounded-lg font-bold px-6 border border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                <ArrowDownTrayIcon className="w-4 h-4 text-apple-blue-light" />
                <span>目标源投递 (Data Ingestion)</span>
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Ingestion Actions" variant="flat">
              <DropdownItem 
                key="manual" 
                startContent={<DocumentPlusIcon className="w-5 h-5 text-apple-text-tertiary" />}
                description="复制粘贴批量录入 IP/域名"
                onPress={() => setManualVisible(true)}
              >
                手工种源录入
              </DropdownItem>
              <DropdownItem 
                key="file" 
                startContent={<CloudArrowDownIcon className="w-5 h-5 text-apple-text-tertiary" />}
                description="依托 CSV/TXT 映射批量导入"
                onPress={() => setFileImportVisible(true)}
              >
                结构化文件导入
              </DropdownItem>
              <DropdownItem 
                key="sync" 
                startContent={<ServerStackIcon className="w-5 h-5 text-apple-text-tertiary" />}
                description="依托云平台 AK/SK 持续同步"
                className="opacity-50 cursor-not-allowed"
                isReadOnly
              >
                跨环境源同步 (暂未实装)
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>

          <Button
            color="primary"
            className="h-10 rounded-lg font-bold px-6 border-none"
            onPress={() => setCreateVisible(true)}
          >
            <PlusIcon className="w-4 h-4" />
            <span>新建实体池</span>
          </Button>
        </div>
      </section>

      {/* 资产池大宽表 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-x-auto">
        <Table
          aria-label="Asset pools table"
          layout="fixed"
          removeWrapper
          classNames={{
            base: "min-w-[1200px]",
            table: "table-fixed",
            th: "bg-white/5 text-apple-text-secondary uppercase text-[10px] tracking-[0.1em] font-black border-b border-white/10 py-3",
            td: "py-4 border-b border-white/5 last:border-0",
            tr: "hover:bg-white/[0.04] transition-colors cursor-pointer"
          }}
          onRowAction={(key) => navigate(`/assets/${key}`)}
        >
          <TableHeader>
            <TableColumn width={220}>结构名称</TableColumn>
            <TableColumn width={160}>描述</TableColumn>
            <TableColumn width={140}>聚合标签</TableColumn>
            <TableColumn width={80} align="end">IP 数</TableColumn>
            <TableColumn width={80} align="end">域名数</TableColumn>
            <TableColumn width={80} align="end">站点数</TableColumn>
            <TableColumn width={80} align="end">任务数</TableColumn>
            <TableColumn width={80} align="end">漏洞数</TableColumn>
            <TableColumn width={140}>最近更新</TableColumn>
            <TableColumn width={100} align="end">操作入口</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={
               <div className="h-40 flex items-center justify-center flex-col gap-2 text-apple-text-tertiary">
                 <p className="text-sm font-bold">源视图全空，无任何已分配实体。</p>
                 <p className="text-xs">请创建一个资产池或向现有模型结构进行播种动作。</p>
               </div>
            }
            isLoading={poolsQuery.isPending}
            loadingContent={<Skeleton className="rounded-xl w-full h-40 bg-white/5 animate-pulse" />}
          >
            {items.map((pool) => (
              <TableRow key={pool.id}>
                <TableCell>
                  <span className="text-sm font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis block">{pool.name}</span>
                </TableCell>
                <TableCell>
                   <span className="text-xs text-apple-text-secondary whitespace-nowrap overflow-hidden text-ellipsis block">{pool.description || '-'}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(!pool.tags || pool.tags.length === 0) ? <span className="text-xs text-apple-text-tertiary">-</span> : pool.tags.map(t => (
                      <span key={t} className="text-[10px] bg-white/10 border border-white/10 text-apple-text-secondary px-1.5 py-0.5 rounded-md uppercase tracking-wider">{t}</span>
                    ))}
                  </div>
                </TableCell>
                {/* 如下三列 IP, Domain, Site 为 UI 结构层分离的展示预期，由于目前后端 API 只提供了一个 aggregate asset_count，故先模拟拆分或做独立占位，未来联调解构 */}
                <TableCell>
                  <span className="font-mono text-apple-blue-light text-[13px] font-semibold">{pool.asset_count ?? '-'}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-apple-blue-light text-[13px] font-semibold opacity-60">-</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-apple-blue-light text-[13px] font-semibold opacity-60">-</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-apple-text-secondary text-[13px] font-semibold">{pool.task_count ?? 0}</span>
                </TableCell>
                <TableCell>
                  <span className={`font-mono text-[13px] font-black ${pool.finding_count && pool.finding_count > 0 ? 'text-apple-red shadow-apple-red/20 drop-shadow-md' : 'text-apple-text-secondary opacity-30'}`}>
                    {pool.finding_count ?? 0}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-[11px] text-apple-text-secondary font-mono tracking-tight">{formatDateTime(pool.updated_at || pool.created_at)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end pr-2">
                    <Button
                      size="sm"
                      variant="flat"
                      className="rounded-lg text-apple-blue font-bold tracking-widest text-[11px] bg-apple-blue/10 hover:bg-apple-blue/20 px-4"
                      onPress={() => navigate(`/assets/${pool.id}`)}
                    >
                      洞察控制台
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* 分页组件 */}
        {total > 0 && (
          <div className="px-6 py-4 flex flex-col md:flex-row justify-between items-center border-t border-white/5 text-sm bg-white/[0.01]">
            <span className="text-[11px] font-black text-apple-text-tertiary tracking-[0.2em] uppercase">合规录入池卷数 {total}</span>
            {totalPages > 1 && (
              <Pagination
                total={totalPages}
                page={page}
                onChange={setPage}
                size="sm"
                classNames={{
                  wrapper: "gap-1",
                  item: "bg-white/5 text-apple-text-secondary font-bold rounded-md border border-white/5 min-w-8 h-8",
                  cursor: "bg-apple-blue text-white font-black rounded-md shadow-lg",
                  prev: "bg-white/5 rounded-md",
                  next: "bg-white/5 rounded-md",
                }}
              />
            )}
          </div>
        )}
      </div>

      <CreateAssetPoolModal 
        isOpen={createVisible} 
        onClose={() => setCreateVisible(false)} 
        onSuccess={() => poolsQuery.refetch()} 
      />
      <ManualInputModal 
        isOpen={manualVisible} 
        onClose={() => setManualVisible(false)} 
      />
      <FileImportModal 
        isOpen={fileImportVisible} 
        onClose={() => setFileImportVisible(false)} 
      />
    </div>
  )
}
