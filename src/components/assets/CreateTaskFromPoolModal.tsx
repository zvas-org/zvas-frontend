import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem } from '@heroui/react'
import { useState } from 'react'
import { RocketLaunchIcon } from '@heroicons/react/24/outline'

import { useCreateTaskFromPool } from '@/api/adapters/asset'

interface Props {
  poolId: string
  isOpen: boolean
  onClose: () => void
}

export function CreateTaskFromPoolModal({ poolId, isOpen, onClose }: Props) {
  const createTaskMutation = useCreateTaskFromPool()

  const [taskName, setTaskName] = useState('')
  const [templateCode, setTemplateCode] = useState('full_scan')
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterAssetType, setFilterAssetType] = useState('all')

  const handleCreateTask = () => {
    if (!taskName.trim()) return

    createTaskMutation.mutate({
      id: poolId,
      payload: {
        name: taskName,
        template_code: templateCode,
        target_set_request: {
          generation_source: "pool_filter",
          filters: {
            view: "default",
            keyword: filterKeyword || undefined,
            asset_type: filterAssetType === 'all' ? undefined : filterAssetType
          }
        }
      }
    }, {
      onSuccess: () => {
        setTaskName('')
        onClose()
      }
    })
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} placement="center" backdrop="blur" classNames={{
      base: "bg-apple-bg/80 backdrop-blur-3xl text-apple-text-primary border border-white/10 rounded-[32px] max-w-lg shadow-2xl",
      header: "border-b border-white/5 p-8",
      body: "p-8",
      footer: "border-t border-white/5 p-6 bg-white/[0.02] flex justify-end gap-3",
    }}>
      <ModalContent>
        <>
          <ModalHeader className="flex flex-col gap-1">
             <span className="text-[10px] text-apple-blue-light uppercase tracking-[0.3em] font-black">Tasks Operation / 调度指挥</span>
             <h3 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
                <RocketLaunchIcon className="w-6 h-6 text-[#f5f5f7]" /> 新建结构池任务
             </h3>
          </ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-apple-text-secondary text-xs font-bold uppercase tracking-widest pb-1">指派代号 (Task Designation)</label>
                <Input
                  variant="flat"
                  placeholder="请输入用于归档识别的任务名"
                  value={taskName}
                  onValueChange={setTaskName}
                  classNames={{ inputWrapper: "bg-white/5 border border-white/10 h-12" }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-apple-text-secondary text-xs font-bold uppercase tracking-widest pb-1">投递执行模型 (Scanner App)</label>
                <Select
                  variant="flat"
                  selectedKeys={[templateCode]}
                  onChange={(e) => setTemplateCode(e.target.value as string)}
                  classNames={{ trigger: "bg-white/5 border border-white/10 h-12 pr-10", value: "truncate text-ellipsis" }}
                >
                  <SelectItem key="full_scan" textValue="全面深度探针检查">全面深度探针检查 (Full Discovery & Audit)</SelectItem>
                  <SelectItem key="port_scan" textValue="暴露面轻量测绘">暴露面轻量测绘 (Port Scan)</SelectItem>
                </Select>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                 <h4 className="border-b border-white/10 pb-2 text-[10px] text-white font-black uppercase tracking-[0.2em]">Target Filtering / 作用目标截断圈定</h4>
                 <div className="flex flex-col gap-2 mt-2">
                   <Input
                      variant="flat"
                      placeholder="指定目标特征 (Keyword)..."
                      value={filterKeyword}
                      onValueChange={setFilterKeyword}
                      classNames={{ inputWrapper: "bg-white/5 border border-white/10 h-10" }}
                   />
                   <Select
                     variant="flat"
                     selectedKeys={[filterAssetType]}
                     onChange={(e) => setFilterAssetType(e.target.value as string)}
                     classNames={{ trigger: "bg-white/5 border border-white/10 h-10 pr-10", value: "truncate text-ellipsis" }}
                   >
                     <SelectItem key="all" textValue="覆盖关联下所有实体">覆盖关联下所有实体</SelectItem>
                     <SelectItem key="domain" textValue="仅限域名">仅限域名实体</SelectItem>
                     <SelectItem key="exact_ip" textValue="仅限单 IP 输入">仅限单 IP 输入</SelectItem>
                     <SelectItem key="url" textValue="仅限 URL 输入">仅限 URL 输入</SelectItem>
                   </Select>
                 </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
             <Button variant="flat" onPress={onClose} className="rounded-xl px-6 font-bold text-apple-text-secondary">取消</Button>
             <Button 
               color="primary" 
               className="rounded-xl px-10 font-bold shadow-lg shadow-apple-blue/20"
               isLoading={createTaskMutation.isPending}
               isDisabled={!taskName.trim()}
               onPress={handleCreateTask}
             >
               投递发布
             </Button>
          </ModalFooter>
        </>
      </ModalContent>
    </Modal>
  )
}
