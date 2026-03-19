import { Drawer, DrawerContent, DrawerHeader, DrawerBody, Button } from '@heroui/react'
import { CloudArrowUpIcon } from '@heroicons/react/24/outline'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function FileImportModal({ isOpen, onClose }: Props) {
  return (
    <Drawer 
      isOpen={isOpen} 
      onOpenChange={(open) => !open && onClose()} 
      placement="right"
      backdrop="blur"
      size="sm"
      classNames={{
        base: "bg-apple-bg/90 backdrop-blur-3xl text-apple-text-primary border-l border-white/10",
        header: "border-b border-white/5 px-8 pt-10 pb-6",
        body: "px-8 py-6",
      }}
    >
      <DrawerContent>
        <>
          <DrawerHeader className="flex flex-col gap-1">
             <span className="text-[10px] text-apple-blue-light uppercase tracking-[0.3em] font-black">Data Ingestion / 批处理入库</span>
             <h3 className="text-2xl font-black tracking-tight mt-1">文件批量导入</h3>
          </DrawerHeader>
          <DrawerBody>
             <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/10 rounded-[32px] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer group mt-8">
                <CloudArrowUpIcon className="w-12 h-12 text-apple-text-tertiary group-hover:text-apple-blue-light transition-colors mb-4" />
                <p className="text-sm font-bold text-white mb-2">拖拽或点击上传文件</p>
                <p className="text-xs text-apple-text-tertiary text-center">支持 TXT, CSV 格式文件，单次上限 500,000 行资产信息。</p>
                <Button size="sm" variant="flat" className="mt-6 rounded-full font-bold">浏览本地文件</Button>
             </div>
          </DrawerBody>
        </>
      </DrawerContent>
    </Drawer>
  )
}
