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
  DropdownItem,
  Card,
  CardBody,
} from '@heroui/react'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  ArrowPathIcon, 
  CloudArrowDownIcon, 
  DocumentPlusIcon, 
  ArrowDownTrayIcon, 
  ServerStackIcon 
} from '@heroicons/react/24/outline'

import { useAssetPools, useDeleteAssetPool } from '@/api/adapters/asset'
import { CreateAssetPoolModal } from '@/components/assets/CreateAssetPoolModal'
import { ManualInputModal } from '@/components/assets/ManualInputModal'
import { FileImportModal } from '@/components/assets/FileImportModal'
import { ConfirmModal } from '@/components/common/ConfirmModal'

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
  const [deleteVisible, setDeleteVisible] = useState(false)
  const [targetPool, setTargetPool] = useState<{ id: string; name: string } | null>(null)

  const deleteMutation = useDeleteAssetPool()

  const poolsQuery = useAssetPools({
    page,
    page_size: pageSize,
    keyword: keyword || undefined,
    tag: tagFilter || undefined,
  })

  const items = poolsQuery.data?.data || []
  const total = poolsQuery.data?.pagination?.total || 0
  const totalPages = Math.ceil(total / pageSize)
  
  const metrics = useMemo(() => {
    const dataItems = poolsQuery.data?.data || []
    return {
      totalPools: total,
      totalAssets: dataItems.reduce((sum, item) => sum + (item.asset_count || 0), 0),
      totalTasks: dataItems.reduce((sum, item) => sum + (item.task_count || 0), 0),
      totalFindings: dataItems.reduce((sum, item) => sum + (item.finding_count || 0), 0),
    }
  }, [poolsQuery.data?.data, total])

  return (
    <div className="flex flex-col gap-14 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20 p-4 md:p-8">
      
      {/* 紧凑型指标概览区 (iPhone 风格) */}
      {/* <section className="grid grid-cols-1 md:grid-cols-4 gap-6 h-auto md:h-[130px]">
        <Card className="bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-3xl h-full shadow-none rounded-[32px]">
          <CardBody className="p-6 flex flex-col justify-center">
            <span className="text-[10px] text-apple-blue-light uppercase tracking-[0.3em] font-black opacity-80 mb-1">Pools_Vault</span>
            {poolsQuery.isPending ? <Skeleton className="h-8 w-12 rounded-lg bg-white/10 mt-1" /> : (
              <strong className="text-4xl font-black tracking-tighter mt-1 text-white leading-none">{metrics.totalPools}</strong>
            )}
          </CardBody>
        </Card>

        <Card className="bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-3xl h-full shadow-none rounded-[32px]">
          <CardBody className="p-6 flex flex-col justify-center">
            <span className="text-[10px] text-apple-green-light uppercase tracking-[0.3em] font-black opacity-80 mb-1">Global_Assets</span>
            {poolsQuery.isPending ? <Skeleton className="h-8 w-12 rounded-lg bg-white/10" /> : (
              <strong className="text-4xl font-black tracking-tighter text-white leading-none">{metrics.totalAssets}</strong>
            )}
          </CardBody>
        </Card>

        <Card className="bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-3xl h-full shadow-none rounded-[32px]">
          <CardBody className="p-6 flex flex-col justify-center">
            <span className="text-[10px] text-apple-blue-light uppercase tracking-[0.3em] font-black opacity-80 mb-1">Linked_Tasks</span>
            {poolsQuery.isPending ? <Skeleton className="h-8 w-12 rounded-lg bg-white/10" /> : (
              <strong className="text-4xl font-black tracking-tighter text-white leading-none">{metrics.totalTasks}</strong>
            )}
          </CardBody>
        </Card>

        <Card className="bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-3xl h-full shadow-none rounded-[32px]">
          <CardBody className="p-6 flex flex-col justify-center">
            <span className="text-[10px] text-apple-red-light uppercase tracking-[0.3em] font-black opacity-80 mb-1">Risk_Findings</span>
            {poolsQuery.isPending ? <Skeleton className="h-8 w-12 rounded-lg bg-white/10" /> : (
              <strong className="text-4xl font-black tracking-tighter text-white leading-none">{metrics.totalFindings}</strong>
            )}
          </CardBody>
        </Card>
      </section> */}

      {/* 操作与搜索胶囊栏 */}
      <section className="flex flex-col md:flex-row items-center gap-4 w-full">
        <div className="flex flex-col md:flex-row flex-1 w-full gap-4 relative">
          <Input
            isClearable
            value={keyword}
            placeholder="搜寻资产池名称..."
            onValueChange={(val) => { setKeyword(val); setPage(1) }}
            variant="flat"
            startContent={<MagnifyingGlassIcon className="w-5 h-5 text-apple-text-tertiary" />}
            classNames={{
              inputWrapper: "bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-14 rounded-2xl border border-white/5 backdrop-blur-md",
              input: "text-sm font-medium placeholder:text-apple-text-tertiary",
            }}
          />
          <Input
            isClearable
            value={tagFilter}
            placeholder="依照系统级 Tag 筛选 (如 external)..."
            onValueChange={(val) => { setTagFilter(val); setPage(1) }}
            variant="flat"
            classNames={{
              inputWrapper: "bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-14 rounded-2xl border border-white/5 backdrop-blur-md",
              input: "text-sm font-medium placeholder:text-apple-text-tertiary",
            }}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="flat"
            isIconOnly
            className="h-14 w-14 rounded-2xl bg-apple-tertiary-bg/10 border border-white/5 backdrop-blur-md"
            onPress={() => poolsQuery.refetch()}
          >
            <ArrowPathIcon className="w-6 h-6 text-apple-text-secondary" />
          </Button>

          <Dropdown
            classNames={{
              content: "bg-apple-bg/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[200px]"
            }}
          >
            <DropdownTrigger>
              <Button 
                variant="flat"
                className="h-14 rounded-2xl font-black px-6 border border-white/5 bg-apple-tertiary-bg/10 backdrop-blur-md text-white hover:bg-apple-tertiary-bg/20 transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5 text-apple-blue-light" />
                <span>导入资产</span>
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Ingestion Actions" variant="flat">
              <DropdownItem 
                key="manual" 
                startContent={<DocumentPlusIcon className="w-5 h-5 text-apple-text-tertiary" />}
                onPress={() => setManualVisible(true)}
              >
                手动录入
              </DropdownItem>
              <DropdownItem 
                key="file" 
                startContent={<CloudArrowDownIcon className="w-5 h-5 text-apple-text-tertiary" />}
                onPress={() => setFileImportVisible(true)}
              >
                上传文件
              </DropdownItem>
              <DropdownItem 
                key="sync" 
                startContent={<ServerStackIcon className="w-5 h-5 text-apple-text-tertiary" />}
                className="opacity-50 cursor-not-allowed"
                isReadOnly
              >
                外部同步扩展
              </DropdownItem> 
            </DropdownMenu>
          </Dropdown>

          <Button
            color="primary"
            className="h-14 rounded-2xl font-black px-8 shadow-2xl shadow-apple-blue/20 flex items-center gap-2"
            onPress={() => setCreateVisible(true)}
          >
            <PlusIcon className="w-5 h-5" />
            <span>新建实体池</span>
          </Button>
        </div>
      </section>

      {/* 资产池列表表格容器 */}
      {poolsQuery.isError ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-apple-text-tertiary bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-3xl rounded-[32px]">
          <p className="text-base font-medium">数据源拉取中断</p>
          <p className="text-xs opacity-60">{poolsQuery.error instanceof Error ? poolsQuery.error.message : '核心通讯网关响应超时'}</p>
          <Button
            size="sm"
            variant="flat"
            color="primary"
            className="rounded-full font-bold px-6 border border-white/10"
            onPress={() => poolsQuery.refetch()}
          >
            强制刷新
          </Button>
        </div>
      ) : !poolsQuery.data && !poolsQuery.isPending ? (
        <div className="flex flex-col items-center justify-center h-64 text-apple-text-tertiary bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-3xl rounded-[32px]">
          <p className="font-bold">库表游标已探底 (NULL_PAYLOAD)</p>
        </div>
      ) : (
        <div className="rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-x-auto">
          <Table
            aria-label="Asset pools advanced table"
            layout="fixed"
            removeWrapper
            classNames={{
              base: "p-4 min-w-[1240px]",
              table: "table-fixed",
              thead: "[&>tr]:first:rounded-xl",
              th: "bg-transparent text-apple-text-tertiary uppercase text-[10px] tracking-[0.2em] font-black h-14 border-b border-white/5 pb-2 text-left",
              td: "py-5 border-b border-white/5 last:border-0 text-left",
              tr: "hover:bg-white/[0.03] transition-colors"
            }}
          >
            <TableHeader>
              <TableColumn width={220} align="start">资产池单元</TableColumn>
              <TableColumn width={160} align="start">边界定义</TableColumn>
              <TableColumn width={160} align="start">汇编标签</TableColumn>
              <TableColumn width={80} align="end">IP节点</TableColumn>
              <TableColumn width={80} align="end">解析域名</TableColumn>
              <TableColumn width={80} align="end">承载站点</TableColumn>
              <TableColumn width={80} align="end">派发任务</TableColumn>
              <TableColumn width={80} align="end">脆弱点</TableColumn>
              <TableColumn width={140} align="end">上次编目</TableColumn>
              <TableColumn width={160} align="end">流操作</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent={<div className="h-40 flex items-center justify-center text-apple-text-tertiary font-bold">空图纸。核心系统需介入新建资产对象。</div>}
              isLoading={poolsQuery.isPending}
              loadingContent={<Skeleton className="rounded-xl w-full h-40 bg-white/5" />}
            >
              {items.map((pool) => {
                return (
                  <TableRow key={pool.id} className="cursor-pointer" onClick={() => navigate(`/assets/${pool.id}`)}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 max-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white tracking-tight leading-tight truncate">{pool.name}</span>
                        </div>
                        <span className="text-[11px] text-apple-text-tertiary font-mono tracking-tighter uppercase opacity-60">ID:{pool.id.substring(0,8)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-apple-text-secondary whitespace-normal overflow-hidden line-clamp-2 max-w-[140px] font-medium leading-relaxed">
                        {pool.description || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {(!pool.tags || pool.tags.length === 0) ? <span className="text-[10px] text-apple-text-tertiary italic">-</span> : pool.tags.map(t => (
                          <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-apple-text-secondary text-[10px] font-black uppercase tracking-wider">
                            {t}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-apple-blue-light text-[14px] font-black drop-shadow-[0_0_8px_rgba(0,113,227,0.3)]">{pool.asset_count ?? '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-apple-blue-light/50 text-[14px] font-bold">—</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-apple-blue-light/50 text-[14px] font-bold">—</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-apple-text-secondary text-[14px] font-black">{pool.task_count ?? 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono text-[14px] font-black ${pool.finding_count && pool.finding_count > 0 ? 'text-apple-red-light drop-shadow-[0_0_8px_rgba(255,59,48,0.5)]' : 'text-apple-text-tertiary opacity-40'}`}>
                        {pool.finding_count ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-semibold text-apple-text-secondary font-mono tracking-tighter uppercase">{formatDateTime(pool.updated_at || pool.created_at).split(' ')[0]}</span>
                        <span className="text-[11px] font-semibold text-apple-text-tertiary font-mono tracking-tighter opacity-60">{formatDateTime(pool.updated_at || pool.created_at).split(' ')[1]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end pr-2 gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="bordered"
                          className="rounded-full border-white/10 text-apple-text-secondary hover:text-white hover:border-white/30 font-bold h-8 px-4"
                          onPress={() => navigate(`/assets/${pool.id}`)}
                        >
                          详情
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          color="danger"
                          className="rounded-full bg-apple-red/10 text-apple-red-light border border-apple-red/20 font-bold h-8 px-4"
                          onPress={() => { setTargetPool(pool); setDeleteVisible(true) }}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          
          {total > 0 && (
            <div className="px-6 py-6 flex flex-col md:flex-row gap-4 justify-between items-center border-t border-white/5 bg-white/[0.01]">
              <p className="text-[11px] text-apple-text-tertiary font-bold uppercase tracking-[0.2em]">
                合规录入池总卷 <span className="text-white mx-1">{total}</span>
              </p>
              {totalPages > 1 && (
                <Pagination
                  total={totalPages}
                  page={page}
                  onChange={setPage}
                  showControls
                  classNames={{
                    wrapper: "gap-2",
                    item: "bg-white/5 text-apple-text-secondary font-bold rounded-xl border border-white/5 hover:bg-white/10 transition-all min-w-[40px] h-10",
                    cursor: "bg-apple-blue font-black rounded-xl shadow-lg shadow-apple-blue/30 text-white",
                    prev: "bg-white/5 text-white/50 rounded-xl hover:bg-white/10",
                    next: "bg-white/5 text-white/50 rounded-xl hover:bg-white/10",
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* 底部溯源信息卡片 */}
      <Card className="bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-md rounded-[32px] mt-4 shadow-none">
        <CardBody className="p-8">
          <div className="grid grid-cols-[160px_1fr] gap-y-4 text-sm font-medium">
            <div className="text-apple-text-tertiary text-[10px] tracking-[0.2em] uppercase font-black">资产映射 (Mapping_Index)</div>
            <div className="text-apple-text-tertiary uppercase text-[10px] tracking-tight opacity-50 font-mono">LIVE_NODE_SYNC_ACTIVE</div>
            
            <div className="text-apple-text-tertiary text-[10px] tracking-[0.2em] uppercase font-black mt-2">权能鉴权 (Auth_Level)</div>
            <div className="text-apple-text-tertiary uppercase text-[10px] tracking-tight opacity-50 mt-2">
              当前用户态具有完全浏览及操作权限
            </div>
          </div>
        </CardBody>
      </Card>

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
      
      <ConfirmModal
        isOpen={deleteVisible}
        onClose={() => { setDeleteVisible(false); setTargetPool(null) }}
        title="确认释放资产池？"
        message={`您确定要删除资产池 "${targetPool?.name}" 吗？删除后相关联的任务将自动废置。确认后该项将立即从列表中移除，相关数据将在后台异步清理。`}
        confirmText="确认删除"
        confirmColor="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!targetPool) return
          await deleteMutation.mutateAsync(targetPool.id)
          setDeleteVisible(false)
          setTargetPool(null)
        }}
      />
    </div>
  )
}
