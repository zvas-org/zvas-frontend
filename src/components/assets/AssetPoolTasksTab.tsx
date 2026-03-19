import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Chip, Pagination, Spinner } from '@heroui/react'
import { RocketLaunchIcon, BoltIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

import { CreateTaskFromPoolModal } from '@/components/assets/CreateTaskFromPoolModal'
import { useAssetPoolTasks } from '@/api/adapters/asset'

function statusColor(status: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'running':
      return 'primary'
    case 'succeeded':
      return 'success'
    case 'queued':
    case 'draft':
      return 'warning'
    case 'failed':
    case 'stopped':
      return 'danger'
    default:
      return 'default'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return '草稿'
    case 'queued':
      return '待执行'
    case 'running':
      return '执行中'
    case 'paused':
      return '已暂停'
    case 'stopping':
      return '停止中'
    case 'succeeded':
      return '已成功'
    case 'failed':
      return '已失败'
    case 'stopped':
      return '已停止'
    default:
      return status || '未知'
  }
}

function formatTime(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

export function AssetPoolTasksTab({ poolId }: { poolId: string }) {
  const navigate = useNavigate()
  const [createVisible, setCreateVisible] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useAssetPoolTasks(poolId, {
    page,
    page_size: 10,
    sort: 'updated_at',
    order: 'desc',
  })

  const items = data?.data || []
  const pagination = data?.pagination
  const totalPages = useMemo(() => {
    if (!pagination?.total || !pagination?.page_size) return 1
    return Math.max(1, Math.ceil(pagination.total / pagination.page_size))
  }, [pagination])

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between w-full gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col text-sm">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <BoltIcon className="w-5 h-5 text-apple-blue-light" />
              <span>关联任务</span>
            </h3>
            <p className="text-xs text-apple-text-tertiary mt-1">
              查看当前资产池下已创建的任务，快速跳转到全局任务专控台或发起新的任务。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="flat"
            onPress={() => navigate(`/tasks?asset_pool_id=${poolId}`)}
            className="bg-white/5 border border-white/10 text-white font-bold h-10 px-4"
          >
            全局专控台视图
          </Button>
          <Button
            color="primary"
            onPress={() => setCreateVisible(true)}
            className="h-10 px-6 font-bold shadow-lg shadow-apple-blue/20"
          >
            <RocketLaunchIcon className="w-4 h-4" /> 基于本库下发新任务
          </Button>
        </div>
      </div>

      <div className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden">
        <div className="grid grid-cols-[2fr_1.1fr_1.1fr_1fr_1.2fr_auto] gap-4 px-6 py-4 text-xs font-bold tracking-widest uppercase text-apple-text-tertiary border-b border-white/10">
          <span>任务</span>
          <span>模板</span>
          <span>状态</span>
          <span>阶段</span>
          <span>更新时间</span>
          <span className="text-right">操作</span>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-3 px-6 py-12 text-apple-text-tertiary">
            <Spinner size="sm" color="primary" />
            <span className="text-sm">正在加载资产池关联任务...</span>
          </div>
        )}

        {!isLoading && isError && (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-white">关联任务读取失败</p>
            <p className="text-xs text-apple-text-tertiary">当前资产池任务列表暂时不可用，请刷新后重试。</p>
            <Button size="sm" variant="flat" onPress={() => refetch()}>
              重新加载
            </Button>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
            <RocketLaunchIcon className="w-10 h-10 text-apple-blue-light opacity-60" />
            <p className="text-sm font-semibold text-white">当前资产池还没有关联任务</p>
            <p className="text-xs text-apple-text-tertiary max-w-md">
              可以直接基于当前资产池冻结目标快照并创建首个任务，后续这里会展示最近的任务执行记录。
            </p>
            <Button color="primary" onPress={() => setCreateVisible(true)}>
              创建首个任务
            </Button>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <>
            <div className="divide-y divide-white/10">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_1.1fr_1.1fr_1fr_1.2fr_auto] gap-4 px-6 py-4 items-center text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{item.name || item.id}</div>
                    <div className="text-xs text-apple-text-tertiary truncate">{item.id}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-white truncate">{item.template_name || item.template_code}</div>
                    <div className="text-xs text-apple-text-tertiary truncate">{item.template_code}</div>
                  </div>
                  <div>
                    <Chip size="sm" variant="flat" color={statusColor(item.status)}>
                      {statusLabel(item.status)}
                    </Chip>
                  </div>
                  <div className="text-xs text-apple-text-tertiary truncate">{item.stage_plan?.join(' / ') || '-'}</div>
                  <div className="text-xs text-apple-text-tertiary">{formatTime(item.updated_at)}</div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      onPress={() => navigate(`/tasks/${item.id}`)}
                      className="bg-white/5 border border-white/10 text-white"
                    >
                      查看详情
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      aria-label="跳转任务列表"
                      onPress={() => navigate(`/tasks?asset_pool_id=${poolId}`)}
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-white/10">
              <p className="text-xs text-apple-text-tertiary">共 {pagination?.total ?? items.length} 条任务记录</p>
              <Pagination
                page={page}
                total={totalPages}
                onChange={setPage}
                showControls
                size="sm"
                classNames={{
                  cursor: 'bg-apple-blue text-white',
                }}
              />
            </div>
          </>
        )}
      </div>

      <CreateTaskFromPoolModal isOpen={createVisible} onClose={() => setCreateVisible(false)} poolId={poolId} />
    </div>
  )
}
