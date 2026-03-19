import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from '@heroui/react'
import { useState } from 'react'
import { useCreateAssetPool } from '@/api/adapters/asset'

interface CreateAssetPoolModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateAssetPoolModal({ isOpen, onClose, onSuccess }: CreateAssetPoolModalProps) {
  const [draftName, setDraftName] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  const [draftTags, setDraftTags] = useState('')

  const createMutation = useCreateAssetPool()

  const handleSubmit = async () => {
    if (!draftName.trim()) return
    const tagsArray = draftTags.split(',').map(s => s.trim()).filter(Boolean)
    
    await createMutation.mutateAsync({
      name: draftName,
      description: draftDesc,
      tags: tagsArray,
      scope_rule: {
        root_domains: [],
        wildcard_domains: [],
        exact_ips: [],
        cidrs: [],
        allowlist: [],
        denylist: [],
        notes: "初始构建资产池"
      }
    })
    
    // reset
    setDraftName('')
    setDraftDesc('')
    setDraftTags('')
    
    onSuccess?.()
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={(open) => !open && onClose()} 
      placement="center"
      backdrop="blur"
      classNames={{
        base: "bg-apple-bg/80 backdrop-blur-3xl text-apple-text-primary border border-white/10 rounded-[32px] max-w-md shadow-2xl",
        header: "border-b border-white/5 p-8",
        body: "p-8",
        footer: "border-t border-white/5 p-6 bg-white/[0.02] flex justify-end gap-3",
      }}
    >
      <ModalContent>
        <>
          <ModalHeader className="flex flex-col gap-1">
             <span className="text-[10px] text-apple-blue-light uppercase tracking-[0.3em] font-black">Workspace / 工作组</span>
             <h3 className="text-2xl font-black tracking-tight mt-1">新建核心资产池</h3>
          </ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-apple-text-secondary text-xs font-bold">资产池名称</label>
                <Input
                  placeholder="业务线、应用名称等"
                  value={draftName}
                  onValueChange={setDraftName}
                  classNames={{ inputWrapper: "bg-white/5 border border-white/10" }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-apple-text-secondary text-xs font-bold">描述 (可选)</label>
                <Input
                  placeholder="附加说明"
                  value={draftDesc}
                  onValueChange={setDraftDesc}
                  classNames={{ inputWrapper: "bg-white/5 border border-white/10" }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-apple-text-secondary text-xs font-bold">标签</label>
                <Input
                  placeholder="逗号分隔，如: prod, external"
                  value={draftTags}
                  onValueChange={setDraftTags}
                  classNames={{ inputWrapper: "bg-white/5 border border-white/10" }}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
             <Button variant="flat" onPress={onClose} className="rounded-xl px-6 font-bold text-apple-text-secondary">取消</Button>
             <Button 
               color="primary" 
               className="rounded-xl px-8 font-black shadow-lg shadow-apple-blue/20"
               isLoading={createMutation.isPending}
               isDisabled={draftName.trim().length === 0}
               onPress={handleSubmit}
             >
               确认创建
             </Button>
          </ModalFooter>
        </>
      </ModalContent>
    </Modal>
  )
}
