import {
  Button,
  Tabs,
  Tab,
  Skeleton,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from '@heroui/react'
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, CloudArrowDownIcon, DocumentPlusIcon, ArrowDownTrayIcon, ServerStackIcon, RocketLaunchIcon } from '@heroicons/react/24/outline'

import { useAssetPoolDetail, useDeleteAssetPool } from '@/api/adapters/asset'
import { AssetPoolOverviewTab } from '@/components/assets/AssetPoolOverviewTab'
import { AssetPoolInputsTab } from '@/components/assets/AssetPoolInputsTab'
import { AssetPoolIpTab } from '@/components/assets/AssetPoolIpTab'
import { AssetPoolDomainTab } from '@/components/assets/AssetPoolDomainTab'
import { AssetPoolSiteTab } from '@/components/assets/AssetPoolSiteTab'
import { AssetPoolTasksTab } from '@/components/assets/AssetPoolTasksTab'
import { AssetPoolFindingsTab } from '@/components/assets/AssetPoolFindingsTab'
import { AssetPoolReportsTab } from '@/components/assets/AssetPoolReportsTab'
import { CreateTaskFromPoolModal } from '@/components/assets/CreateTaskFromPoolModal'
import { ManualInputModal } from '@/components/assets/ManualInputModal'
import { FileImportModal } from '@/components/assets/FileImportModal'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { TrashIcon } from '@heroicons/react/24/outline'

export function AssetPoolDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const poolQuery = useAssetPoolDetail(id)
  const pool = poolQuery.data
  
  const [activeTab, setActiveTab] = useState('overview')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [manualModeOpen, setManualModeOpen] = useState(false)
  const [fileImportOpen, setFileImportOpen] = useState(false)
  const [deleteVisible, setDeleteVisible] = useState(false)

  const deleteMutation = useDeleteAssetPool()

  if (poolQuery.isPending) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto p-4 md:p-8">
        <Skeleton className="h-10 w-1/4 rounded-xl bg-white/5" />
        <Skeleton className="h-64 w-full rounded-[32px] bg-white/5" />
      </div>
    )
  }

  if (poolQuery.isError || !pool) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4 text-apple-red-light text-sm min-h-[50vh] bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-3xl rounded-[32px] mt-8 mx-8">
        <span className="font-black text-lg">无法连接至远端资产池或节点已失效</span>
        <Button variant="flat" onPress={() => navigate('/assets')} className="mt-4 rounded-full border border-white/10 font-bold px-6 text-white hover:bg-white/10">
          返回资产池列表
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20 p-4 md:p-8">
      {/* 页面头部 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Button 
            isIconOnly 
            variant="flat" 
            className="text-apple-text-secondary bg-apple-tertiary-bg/10 border border-white/5 rounded-2xl h-14 w-14 hover:text-white backdrop-blur-md"
            onPress={() => navigate('/assets')}
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">{pool.name}</h1>
            <div className="flex items-center gap-3">
               {pool.description && <p className="text-[13px] text-apple-text-tertiary font-medium">{pool.description}</p>}
               {pool.tags && pool.tags.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-apple-blue-light/50"></span>}
               {pool.tags && pool.tags.map((t: string) => (
                   <span key={t} className="text-[10px] uppercase font-black text-apple-text-secondary tracking-widest border border-white/10 px-2 py-0.5 rounded-full bg-white/5">{t}</span>
               ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <Dropdown
              classNames={{
                content: "bg-apple-bg/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[200px]"
              }}
           >
              <DropdownTrigger>
                <Button 
                  variant="flat"
                  className="h-14 w-full sm:w-auto rounded-2xl font-black px-6 border border-white/5 bg-apple-tertiary-bg/10 backdrop-blur-md text-white hover:bg-white/10 transition-colors"
                >
                  <ArrowDownTrayIcon className="w-5 h-5 text-apple-blue-light" />
                  <span>手动录入</span>
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Ingestion Actions">
                <DropdownItem 
                  key="manual" 
                  startContent={<DocumentPlusIcon className="w-5 h-5 text-apple-text-tertiary" />}
                  onPress={() => setManualModeOpen(true)}
                >
                  高级录入模式
                </DropdownItem>
                <DropdownItem 
                  key="file" 
                  startContent={<CloudArrowDownIcon className="w-5 h-5 text-apple-text-tertiary" />}
                  onPress={() => setFileImportOpen(true)}
                >
                  批处理导入
                </DropdownItem>
                <DropdownItem 
                  key="sync" 
                  startContent={<ServerStackIcon className="w-5 h-5 text-apple-text-tertiary" />}
                  className="opacity-50 cursor-not-allowed"
                  isReadOnly
                >
                  跨系统自动同步
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            <Button
              color="primary"
              className="h-14 w-full sm:w-auto rounded-2xl font-black px-8 shadow-2xl shadow-apple-blue/20 flex items-center gap-2"
              onPress={() => setTaskModalOpen(true)}
            >
              <RocketLaunchIcon className="w-5 h-5" />
              <span>下发任务</span>
            </Button>

            <Button
              variant="flat"
              color="danger"
              className="h-14 w-full sm:w-auto rounded-2xl bg-apple-red/10 border border-apple-red/20 font-black px-6 text-apple-red-light hover:bg-apple-red/20 transition-colors"
              onPress={() => setDeleteVisible(true)}
            >
              <TrashIcon className="w-5 h-5" />
              <span>删除</span>
            </Button>
        </div>
      </div>

      {/* 玻璃拟态 Tabs */}
      <div className="w-full">
        <Tabs 
          aria-label="Asset Pool Workspaces" 
          selectedKey={activeTab} 
          onSelectionChange={(k) => setActiveTab(k as string)}
          variant="light"
          classNames={{
            base: "w-full overflow-x-auto scrollbar-hide mb-4",
            tabList: "gap-2 p-1 bg-white/5 border border-white/5 backdrop-blur-3xl rounded-[20px] shadow-inner",
            cursor: "w-full bg-apple-tertiary-bg/20 rounded-[16px] shadow-lg border border-white/10",
            tab: "px-6 py-4 h-12 font-black text-sm tracking-wider uppercase text-apple-text-tertiary data-[selected=true]:text-white transition-colors"
          }}
        >
          <Tab key="overview" title="态势概览" />
          <Tab key="inputs" title="资产轨迹" />
          <Tab key="ip" title="网段/IP" />
          <Tab key="domain" title="域名树" />
          <Tab key="site" title="站点指纹" />
          <Tab key="tasks" title="任务执行" />
          <Tab key="findings" title="弱点与漏洞" />
          <Tab key="reports" title="分析报告" />
        </Tabs>
      </div>

      {/* 标签页内容体 */}
      <div className="w-full relative">
        <div className="animate-in slide-in-from-bottom-4 fade-in duration-700 w-full h-full">
          {activeTab === 'overview' && <AssetPoolOverviewTab pool={pool} />}
          {activeTab === 'inputs' && <AssetPoolInputsTab poolId={id!} />}
          {activeTab === 'ip' && <AssetPoolIpTab poolId={id!} />}
          {activeTab === 'domain' && <AssetPoolDomainTab poolId={id!} />}
          {activeTab === 'site' && <AssetPoolSiteTab poolId={id!} />}
          {activeTab === 'tasks' && <AssetPoolTasksTab poolId={id!} />}
          
          {activeTab === 'findings' && <AssetPoolFindingsTab poolId={id!} />}
          {activeTab === 'reports' && <AssetPoolReportsTab poolId={id!} />}
        </div>
      </div>

      {/* 模态框组件 (子组件内部样式视情况跟进) */}
      <CreateTaskFromPoolModal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} poolId={id!} poolName={pool?.name} />
      <ManualInputModal isOpen={manualModeOpen} onClose={() => setManualModeOpen(false)} defaultPoolId={id!} />
      <FileImportModal isOpen={fileImportOpen} onClose={() => setFileImportOpen(false)} />
      
      <ConfirmModal
        isOpen={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        title="确认释放资产池？"
        message={`您确定要删除资产池 "${pool?.name}" 吗？删除后相关联的任务将自动废置，相关数据将在后台异步清理。确认后该项将立即从列表中移除。`}
        confirmText="确认删除"
        confirmColor="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(id!)
          setDeleteVisible(false)
          navigate('/assets')
        }}
      />
    </div>
  )
}

