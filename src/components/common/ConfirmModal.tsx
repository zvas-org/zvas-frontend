import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmColor?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  confirmColor = 'primary',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      classNames={{
        backdrop: "bg-apple-bg/80 backdrop-blur-md",
        base: "bg-apple-tertiary-bg/90 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden",
        header: "border-b border-white/5 p-6",
        body: "p-6",
        footer: "border-t border-white/5 p-6",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <span className="text-xl font-black text-white tracking-tight">{title}</span>
        </ModalHeader>
        <ModalBody>
          <p className="text-[14px] text-apple-text-secondary leading-relaxed font-medium">
            {message}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button 
            variant="flat" 
            onPress={onClose}
            className="rounded-2xl font-bold px-6 bg-white/5 text-apple-text-secondary hover:bg-white/10 transition-colors"
          >
            {cancelText}
          </Button>
          <Button 
            color={confirmColor} 
            onPress={onConfirm}
            isLoading={isLoading}
            className="rounded-2xl font-black px-8 shadow-xl"
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
