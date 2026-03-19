import {
  Button,
  Tabs,
  Tab,
  Skeleton,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react'
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, CloudArrowDownIcon, DocumentPlusIcon, ArrowDownTrayIcon, ServerStackIcon, RocketLaunchIcon } from '@heroicons/react/24/outline'

import { useAssetPoolDetail } from '@/api/adapters/asset'
import { AssetPoolOverviewTab } from '@/components/assets/AssetPoolOverviewTab'
import { AssetPoolInputsTab } from '@/components/assets/AssetPoolInputsTab'
import { AssetPoolIpTab } from '@/components/assets/AssetPoolIpTab'
import { AssetPoolDomainTab } from '@/components/assets/AssetPoolDomainTab'
import { AssetPoolSiteTab } from '@/components/assets/AssetPoolSiteTab'
import { AssetPoolTasksTab } from '@/components/assets/AssetPoolTasksTab'
import { CreateTaskFromPoolModal } from '@/components/assets/CreateTaskFromPoolModal'
import { ManualInputModal } from '@/components/assets/ManualInputModal'
import { FileImportModal } from '@/components/assets/FileImportModal'

export function AssetPoolDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const poolQuery = useAssetPoolDetail(id)
  const pool = poolQuery.data
  
  const [activeTab, setActiveTab] = useState('overview')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [manualModeOpen, setManualModeOpen] = useState(false)
  const [fileImportOpen, setFileImportOpen] = useState(false)

  if (poolQuery.isPending) {
    return (
      <div className="flex flex-col gap-6 p-4 max-w-[1600px] mx-auto w-full pt-10">
        <Skeleton className="h-10 w-1/4 rounded-2xl bg-white/5 animate-pulse" />
        <Skeleton className="h-40 w-full rounded-2xl bg-white/5 animate-pulse" />
      </div>
    )
  }

  if (poolQuery.isError || !pool) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4 text-apple-red text-sm h-[50vh]">
        <span className="font-bold tracking-widest text-lg">无法连接至远端资产池或节点已失效</span>
        <Button variant="flat" onPress={() => navigate('/assets')} className="bg-white/5 text-white border border-white/10 rounded-xl px-8 font-bold mt-4">中止查看并返回</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            isIconOnly 
            variant="flat" 
            className="rounded-full bg-white/5 border border-white/5 text-apple-text-secondary h-12 w-12 hover:scale-105 hover:bg-white/10 transition-transform"
            onPress={() => navigate('/assets')}
          >
            <ChevronLeftIcon className="w-5 h-5 ml-[-2px]" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tight text-white mb-0.5">{pool.name}</h1>
            <div className="flex items-center gap-2">
               {pool.description && <p className="text-xs text-apple-text-tertiary font-medium">{pool.description}</p>}
               {pool.tags && pool.tags.length > 0 && <span className="w-1 h-1 rounded-full bg-apple-text-tertiary"></span>}
               {pool.tags && pool.tags.map((t: string) => (
                   <span key={t} className="text-[9px] uppercase font-black text-apple-border tracking-wider">{t}</span>
               ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
                  <span>添加记录 (Ingest)</span>
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Ingestion Actions" variant="flat">
                <DropdownItem 
                  key="manual" 
                  startContent={<DocumentPlusIcon className="w-5 h-5 text-apple-text-tertiary" />}
                  onPress={() => setManualModeOpen(true)}
                >
                  手工种源映射录入
                </DropdownItem>
                <DropdownItem 
                  key="file" 
                  startContent={<CloudArrowDownIcon className="w-5 h-5 text-apple-text-tertiary" />}
                  onPress={() => setFileImportOpen(true)}
                >
                  批处理关联文件导入
                </DropdownItem>
                <DropdownItem 
                  key="sync" 
                  startContent={<ServerStackIcon className="w-5 h-5 text-apple-text-tertiary" />}
                  className="opacity-50 cursor-not-allowed"
                  isReadOnly
                >
                  远端节点动态同步
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            <Button
              color="primary"
              className="h-10 rounded-lg font-bold px-6 shadow-lg shadow-apple-blue/20"
              onPress={() => setTaskModalOpen(true)}
            >
              <RocketLaunchIcon className="w-4 h-4" />
              <span>极速下发审计</span>
            </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/5">
        <Tabs 
          aria-label="Asset Pool Options" 
          selectedKey={activeTab} 
          onSelectionChange={(k) => setActiveTab(k as string)}
          variant="underlined"
          classNames={{
            tabList: "gap-6 p-0",
            cursor: "bg-apple-blue h-[2px] w-full",
            tab: "h-14 px-2 text-apple-text-secondary data-[selected=true]:text-white data-[selected=true]:font-black text-[13px] uppercase tracking-widest transition-colors"
          }}
        >
          <Tab key="overview" title="系统概览" />
          <Tab key="inputs" title="数据输入流" />
          <Tab key="ip" title="IP / 网络段" />
          <Tab key="domain" title="域名资产集" />
          <Tab key="site" title="Web 站点簇" />
          <Tab key="tasks" title="联动任务区" />
          <Tab key="findings" title="漏洞汇存板" />
          <Tab key="reports" title="出表中心" />
        </Tabs>
      </div>

      <div className="pt-4 min-h-[50vh]">
        {activeTab === 'overview' && <AssetPoolOverviewTab pool={pool} />}
        {activeTab === 'inputs' && <AssetPoolInputsTab poolId={id!} />}
        {activeTab === 'ip' && <AssetPoolIpTab poolId={id!} />}
        {activeTab === 'domain' && <AssetPoolDomainTab poolId={id!} />}
        {activeTab === 'site' && <AssetPoolSiteTab poolId={id!} />}
        {activeTab === 'tasks' && <AssetPoolTasksTab poolId={id!} />}
        {activeTab === 'findings' && <PlaceholderTab title="待 Findings 模块扩展实装" desc="受前端迭代规划所限，聚合类风险漏洞面板此轮保持占位，即将随 Findings 视图完整揭幕。" />}
        {activeTab === 'reports' && <PlaceholderTab title="待 Report 模块扩展实装" desc="本库的巡检、漏洞统计与周期健康报告服务将在 Report 模块落地后在此开放下接。" />}
      </div>

      <CreateTaskFromPoolModal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} poolId={id!} />
      <ManualInputModal isOpen={manualModeOpen} onClose={() => setManualModeOpen(false)} defaultPoolId={id!} />
      <FileImportModal isOpen={fileImportOpen} onClose={() => setFileImportOpen(false)} />
    </div>
  )
}

function PlaceholderTab({ title, desc }: { title: string, desc: string }) {
   return (
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/5 bg-white/[0.01] rounded-[32px] h-[400px] text-center p-8 animate-in fade-in duration-500">
         <span className="text-[10px] text-apple-text-tertiary font-black tracking-[0.3em] uppercase mb-4 px-3 py-1 bg-white/5 rounded-md">Reserved Function</span>
         <h2 className="text-2xl font-black text-white mb-2 tracking-tight">{title}</h2>
         <p className="text-apple-text-secondary text-sm max-w-sm">{desc}</p>
      </div>
   )
}
