import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from '@heroui/react'

function hasMeaningfulPayloadText(value: string): boolean {
  return value.trim().length > 0
}

export function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.length ? value.map((item) => formatPayloadValue(item)).join(', ') : ''

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function PayloadBlock({ title, content }: { title: string; content: unknown }) {
  const text = formatPayloadValue(content)
  const hasContent = hasMeaningfulPayloadText(text)

  return (
    <section className="min-w-0 rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
      <div className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-apple-text-tertiary">{title}</div>
      {hasContent ? (
        <pre
          className="min-w-0 bg-transparent font-mono text-[13px] leading-6 text-white"
          style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {text}
        </pre>
      ) : (
        <div className="text-sm text-apple-text-tertiary">暂无内容</div>
      )}
    </section>
  )
}

export function PayloadViewerDrawer({
  isOpen,
  request,
  response,
  onClose,
}: {
  isOpen: boolean
  request: unknown
  response: unknown
  onClose: () => void
}) {
  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      placement="right"
      backdrop="blur"
      scrollBehavior="inside"
      classNames={{
        base: '!w-screen sm:!w-[min(92vw,960px)] xl:!w-[min(82vw,1080px)] max-w-none h-dvh max-h-dvh border-l border-white/10 bg-apple-bg/92 text-apple-text-primary backdrop-blur-3xl',
        header: 'border-b border-white/6 px-5 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-6',
        body: 'px-5 py-5 sm:px-8 sm:py-6',
        footer: 'border-t border-white/6 px-5 py-4 sm:px-8 sm:py-5',
      }}
    >
      <DrawerContent>
        <>
          <DrawerHeader className="flex flex-col gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.28em] text-apple-text-tertiary">请求与响应详情</span>
          </DrawerHeader>
          <DrawerBody className="overflow-y-auto">
            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
              <PayloadBlock title="请求" content={request} />
              <PayloadBlock title="响应" content={response} />
            </div>
          </DrawerBody>
          <DrawerFooter className="justify-end">
            <Button variant="flat" className="rounded-xl bg-white/5 font-bold text-white hover:bg-white/10" onPress={onClose}>
              关闭
            </Button>
          </DrawerFooter>
        </>
      </DrawerContent>
    </Drawer>
  )
}
