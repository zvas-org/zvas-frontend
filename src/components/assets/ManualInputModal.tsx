import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea, Select, SelectItem } from '@heroui/react'
import { useState } from 'react'

import { useAssetPools, useImportInputs } from '@/api/adapters/asset'

interface ManualInputModalProps {
  isOpen: boolean
  onClose: () => void
  defaultPoolId?: string
}

export function ManualInputModal({ isOpen, onClose, defaultPoolId }: ManualInputModalProps) {
  const [poolId, setPoolId] = useState(defaultPoolId || '')
  const [content, setContent] = useState('')

  const importMutation = useImportInputs()
  
  // 拉取资产池以供选择
  const poolsQuery = useAssetPools({ page_size: 100 })
  const poolItems = poolsQuery.data?.data || []

  const handleSubmit = async () => {
    if (!poolId || !content.trim()) return
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return

    await importMutation.mutateAsync({
      id: poolId,
      payload: {
        mode: 'text',
        source: 'manual',
        items: lines,
      },
    })
    
    setContent('')
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={(open) => !open && onClose()} 
      placement="center"
      backdrop="blur"
      size="2xl"
      classNames={{
        base: "bg-apple-bg/80 backdrop-blur-3xl text-apple-text-primary border border-white/10 rounded-[32px] shadow-2xl",
        header: "border-b border-white/5 p-8",
        body: "p-8",
        footer: "border-t border-white/5 p-6 bg-white/[0.02] flex justify-end gap-3",
      }}
    >
      <ModalContent>
        <>
          <ModalHeader className="flex flex-col gap-1">
             <span className="text-[10px] text-apple-blue-light uppercase tracking-[0.3em] font-black">Data Ingestion / 目标入库</span>
             <h3 className="text-2xl font-black tracking-tight mt-1">手工投递资产 (种子输入)</h3>
          </ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-apple-text-secondary text-xs font-bold">归属资产池</label>
                <Select
                  placeholder="选择投递目标"
                  selectedKeys={poolId ? [poolId] : []}
                  onChange={(e) => setPoolId(e.target.value)}
                  isLoading={poolsQuery.isPending}
                  classNames={{ trigger: "bg-white/5 border border-white/10 h-12 pr-10", value: "truncate text-ellipsis" }}
                >
                  {poolItems.map(p => (
                    <SelectItem key={p.id} textValue={p.name}>{p.name}</SelectItem>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-apple-text-secondary text-xs font-bold">输入资源标识 (域名/IP/CIDR)，按行分割</label>
                 <Textarea
                    placeholder="example.com&#10;192.168.1.1&#10;10.0.0.0/24"
                    minRows={8}
                    maxRows={15}
                    value={content}
                    onValueChange={setContent}
                    classNames={{ inputWrapper: "bg-white/5 border border-white/10 font-mono text-xs leading-loose" }}
                 />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
             <Button variant="flat" onPress={onClose} className="rounded-xl px-6 font-bold text-apple-text-secondary">取消</Button>
             <Button 
               color="primary" 
               className="rounded-xl px-10 font-black shadow-lg shadow-apple-blue/20"
               isLoading={importMutation.isPending}
               isDisabled={!poolId || content.trim().length === 0}
               onPress={handleSubmit}
             >
               立即下发录入
             </Button>
          </ModalFooter>
        </>
      </ModalContent>
    </Modal>
  )
}
