import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Skeleton,
} from '@heroui/react'
import {
  ArrowPathIcon,
  LinkIcon,
  PencilSquareIcon,
  SignalIcon,
  WifiIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  type NetworkInterfaceView,
  type TestNetworkInterfaceInput,
  type UpdateNetworkInterfaceInput,
  useSystemNetworkInterfaces,
  useTestSystemNetworkInterface,
  useUpdateSystemNetworkInterface,
} from '@/api/adapters/system'
import { isApiError } from '@/api/client'

const NETWORK_MODE_OPTIONS = [
  { key: 'dhcp', label: 'DHCP 自动获取' },
  { key: 'static', label: '静态地址' },
] as const

const NETWORK_TEST_COUNT_OPTIONS = [
  { key: '3', label: '3 次' },
  { key: '5', label: '5 次' },
  { key: '10', label: '10 次' },
] as const

/**
 * SystemNetworkPage 展示最小可用的网络管理页面。
 */
export function SystemNetworkPage() {
  const navigate = useNavigate()
  const interfacesQuery = useSystemNetworkInterfaces()
  const updateMutation = useUpdateSystemNetworkInterface()
  const testMutation = useTestSystemNetworkInterface()
  const [editingItem, setEditingItem] = useState<NetworkInterfaceView | null>(null)
  const [testingItem, setTestingItem] = useState<NetworkInterfaceView | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft>(buildEditDraft(null))
  const [testDraft, setTestDraft] = useState<TestDraft>({ target: '', count: '3' })

  useEffect(() => {
    if (!interfacesQuery.error || !isApiError(interfacesQuery.error)) {
      return
    }
    if (interfacesQuery.error.status === 401) {
      navigate('/login', { replace: true })
      return
    }
    if (interfacesQuery.error.status === 403) {
      navigate('/403', { replace: true })
    }
  }, [interfacesQuery.error, navigate])

  useEffect(() => {
    setEditDraft(buildEditDraft(editingItem))
  }, [editingItem])

  const groupedInterfaces = useMemo(() => {
    const interfaceItems = interfacesQuery.data || []
    const mgmtItems = interfaceItems.filter((item) => item.role === 'mgmt')
    const scanItems = interfaceItems.filter((item) => item.role !== 'mgmt')
    return { mgmtItems, scanItems }
  }, [interfacesQuery.data])

  async function handleSave() {
    if (!editingItem) {
      return
    }
    const payload: UpdateNetworkInterfaceInput = {
      name: editingItem.name,
      mode: editDraft.mode,
      address: editDraft.address.trim(),
      gateway: editDraft.gateway.trim(),
      dnsServers: editDraft.dnsServers
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
      mtu: Number(editDraft.mtu || 0),
    }
    await updateMutation.mutateAsync(payload)
    setEditingItem(null)
  }

  async function handleTest() {
    if (!testingItem) {
      return
    }
    const payload: TestNetworkInterfaceInput = {
      name: testingItem.name,
      target: testDraft.target.trim(),
      count: Number(testDraft.count || '3'),
    }
    await testMutation.mutateAsync(payload)
  }

  if (interfacesQuery.isPending) {
    return <NetworkPageSkeleton />
  }

  if (interfacesQuery.isError) {
    if (isApiError(interfacesQuery.error) && (interfacesQuery.error.status === 401 || interfacesQuery.error.status === 403)) {
      return null
    }

    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-5 text-center text-apple-text-primary">
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight">网络管理当前不可用</h2>
          <p className="max-w-2xl text-sm text-apple-text-secondary">
            {interfacesQuery.error.message || '当前系统未启用网络管理模块，或宿主机不支持 nmcli 管理。'}
          </p>
        </div>
        <Button
          variant="flat"
          className="rounded-2xl bg-white/8 px-6 font-bold text-white hover:bg-white/12"
          onPress={() => interfacesQuery.refetch()}
        >
          重新检测
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 pb-16 text-apple-text-primary">
      <Card className="border border-white/10 bg-apple-black/70 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <CardBody className="flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-apple-blue/20 bg-apple-blue/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-apple-blue-light">
              System / Network
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight text-white">网络管理</h1>
              <p className="max-w-3xl text-sm leading-7 text-apple-text-secondary">
                当前版本只收口业务口基础配置与连通性测试。管理口仅查看，不允许在线修改；业务口支持 DHCP 与静态地址切换。
              </p>
            </div>
          </div>
          <Button
            variant="flat"
            startContent={<ArrowPathIcon className="h-4 w-4" />}
            className="rounded-2xl bg-white/8 px-5 font-bold text-white hover:bg-white/12"
            onPress={() => interfacesQuery.refetch()}
          >
            刷新状态
          </Button>
        </CardBody>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_2fr]">
        <NetworkSection
          title="管理口"
          description="中心节点的宿主机管理链路，仅用于查看当前状态。"
          items={groupedInterfaces.mgmtItems}
          emptyText="尚未识别到管理口。"
          onEdit={setEditingItem}
          onTest={setTestingItem}
        />
        <NetworkSection
          title="业务口"
          description="扫描流量通过业务口发出，可按现场网络规划切换 DHCP/静态地址。"
          items={groupedInterfaces.scanItems}
          emptyText="尚未识别到业务口。"
          onEdit={setEditingItem}
          onTest={setTestingItem}
        />
      </section>

      <Modal
        isOpen={Boolean(editingItem)}
        onOpenChange={(open) => !open && setEditingItem(null)}
        placement="center"
        size="3xl"
        backdrop="blur"
        classNames={{
          base: 'border border-white/10 bg-[#09111d]/95 text-white',
          header: 'border-b border-white/8 px-6 py-5',
          body: 'px-6 py-5',
          footer: 'border-t border-white/8 px-6 py-4',
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-2">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-apple-text-tertiary">
                  编辑业务口配置
                </div>
                <div className="text-xl font-black tracking-tight text-white">{editingItem?.name || '-'}</div>
              </ModalHeader>
              <ModalBody className="space-y-4">
                <Select
                  label="地址模式"
                  selectedKeys={[editDraft.mode]}
                  onSelectionChange={(keys) => {
                    const nextMode = Array.from(keys)[0]
                    if (typeof nextMode === 'string') {
                      setEditDraft((current) => ({ ...current, mode: nextMode as EditDraft['mode'] }))
                    }
                  }}
                  classNames={{
                    trigger: 'border border-white/10 bg-white/[0.04] text-white',
                    label: 'text-apple-text-secondary',
                    value: 'text-white',
                  }}
                >
                  {NETWORK_MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.key} textValue={option.label}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="静态 IP/CIDR"
                    value={editDraft.address}
                    onValueChange={(value) => setEditDraft((current) => ({ ...current, address: value }))}
                    isDisabled={editDraft.mode !== 'static'}
                    placeholder="例如 192.168.10.20/24"
                    classNames={inputClassNames}
                  />
                  <Input
                    label="网关"
                    value={editDraft.gateway}
                    onValueChange={(value) => setEditDraft((current) => ({ ...current, gateway: value }))}
                    isDisabled={editDraft.mode !== 'static'}
                    placeholder="例如 192.168.10.1"
                    classNames={inputClassNames}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-[1.6fr_0.8fr]">
                  <Input
                    label="DNS 服务器"
                    value={editDraft.dnsServers}
                    onValueChange={(value) => setEditDraft((current) => ({ ...current, dnsServers: value }))}
                    isDisabled={editDraft.mode !== 'static'}
                    placeholder={'每行一个 DNS，例如\n223.5.5.5\n114.114.114.114'}
                    classNames={inputClassNames}
                  />
                  <Input
                    label="MTU"
                    value={editDraft.mtu}
                    onValueChange={(value) => setEditDraft((current) => ({ ...current, mtu: value }))}
                    placeholder="1500"
                    classNames={inputClassNames}
                  />
                </div>

                {updateMutation.isError && (
                  <InlineError message={updateMutation.error.message} />
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  className="rounded-xl bg-white/8 px-5 font-bold text-white hover:bg-white/12"
                  onPress={() => setEditingItem(null)}
                >
                  取消
                </Button>
                <Button
                  color="primary"
                  className="rounded-xl px-5 font-bold"
                  isLoading={updateMutation.isPending}
                  onPress={handleSave}
                >
                  保存配置
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={Boolean(testingItem)}
        onOpenChange={(open) => {
          if (!open) {
            setTestingItem(null)
            testMutation.reset()
          }
        }}
        placement="center"
        size="2xl"
        backdrop="blur"
        classNames={{
          base: 'border border-white/10 bg-[#09111d]/95 text-white',
          header: 'border-b border-white/8 px-6 py-5',
          body: 'px-6 py-5',
          footer: 'border-t border-white/8 px-6 py-4',
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-2">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-apple-text-tertiary">
                  连通性测试
                </div>
                <div className="text-xl font-black tracking-tight text-white">{testingItem?.name || '-'}</div>
              </ModalHeader>
              <ModalBody className="space-y-4">
                <Input
                  label="目标 IP"
                  value={testDraft.target}
                  onValueChange={(value) => setTestDraft((current) => ({ ...current, target: value }))}
                  placeholder="例如 8.8.8.8"
                  classNames={inputClassNames}
                />
                <Select
                  label="探测次数"
                  selectedKeys={[testDraft.count]}
                  onSelectionChange={(keys) => {
                    const nextCount = Array.from(keys)[0]
                    if (typeof nextCount === 'string') {
                      setTestDraft((current) => ({ ...current, count: nextCount }))
                    }
                  }}
                  classNames={{
                    trigger: 'border border-white/10 bg-white/[0.04] text-white',
                    label: 'text-apple-text-secondary',
                    value: 'text-white',
                  }}
                >
                  {NETWORK_TEST_COUNT_OPTIONS.map((option) => (
                    <SelectItem key={option.key} textValue={option.label}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>

                {testMutation.data && (
                  <div className="grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 md:grid-cols-3">
                    <MetricCard label="可达性" value={testMutation.data.reachable ? '可达' : '不可达'} tone={testMutation.data.reachable ? 'success' : 'default'} />
                    <MetricCard label="平均 RTT" value={`${testMutation.data.rttAvgMS.toFixed(2)} ms`} tone="default" />
                    <MetricCard label="丢包率" value={`${testMutation.data.packetLoss.toFixed(2)} %`} tone={testMutation.data.packetLoss > 0 ? 'warn' : 'success'} />
                  </div>
                )}

                {testMutation.isError && <InlineError message={testMutation.error.message} />}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  className="rounded-xl bg-white/8 px-5 font-bold text-white hover:bg-white/12"
                  onPress={() => {
                    setTestingItem(null)
                    testMutation.reset()
                  }}
                >
                  关闭
                </Button>
                <Button
                  color="primary"
                  className="rounded-xl px-5 font-bold"
                  isLoading={testMutation.isPending}
                  onPress={handleTest}
                >
                  开始测试
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}

type EditDraft = {
  mode: 'dhcp' | 'static'
  address: string
  gateway: string
  dnsServers: string
  mtu: string
}

type TestDraft = {
  target: string
  count: string
}

/**
 * NetworkSection 统一承载一组网口卡片。
 */
function NetworkSection({
  title,
  description,
  items,
  emptyText,
  onEdit,
  onTest,
}: {
  title: string
  description: string
  items: NetworkInterfaceView[]
  emptyText: string
  onEdit: (item: NetworkInterfaceView) => void
  onTest: (item: NetworkInterfaceView) => void
}) {
  return (
    <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-3xl">
      <CardHeader className="flex flex-col items-start gap-2 border-b border-white/6 p-6">
        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-apple-text-tertiary">{title}</div>
        <div className="text-sm leading-7 text-apple-text-secondary">{description}</div>
      </CardHeader>
      <CardBody className="grid gap-4 p-5 lg:grid-cols-2 2xl:grid-cols-3">
        {items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-black/10 p-6 text-sm text-apple-text-tertiary">
            {emptyText}
          </div>
        ) : (
          items.map((item) => (
            <NetworkCard key={item.name} item={item} onEdit={onEdit} onTest={onTest} />
          ))
        )}
      </CardBody>
    </Card>
  )
}

/**
 * NetworkCard 展示单个网口的配置与实时状态。
 */
function NetworkCard({
  item,
  onEdit,
  onTest,
}: {
  item: NetworkInterfaceView
  onEdit: (item: NetworkInterfaceView) => void
  onTest: (item: NetworkInterfaceView) => void
}) {
  const isMgmt = item.role === 'mgmt'
  const dnsLabel = item.config.dnsServers.length > 0 ? item.config.dnsServers.join(', ') : '-'

  return (
    <article className="flex h-full flex-col rounded-[28px] border border-white/8 bg-[#08111d] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white">{item.name}</span>
            <Chip
              size="sm"
              variant="flat"
              classNames={{ base: 'border-0 bg-white/8 text-[10px] font-black uppercase tracking-[0.18em] text-white' }}
            >
              {item.role}
            </Chip>
            {item.isProtected ? (
              <Chip
                size="sm"
                variant="flat"
                classNames={{ base: 'border-0 bg-apple-blue/15 text-[10px] font-black uppercase tracking-[0.18em] text-apple-blue-light' }}
              >
                protected
              </Chip>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-apple-text-secondary">
            <LinkStateBadge linkState={item.status.linkState} carrier={item.status.carrier} />
            <span className="font-mono">MAC {item.status.mac || '-'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            className="rounded-xl bg-white/8 px-3 text-[11px] font-bold text-white hover:bg-white/12"
            onPress={() => onTest(item)}
          >
            连通性测试
          </Button>
          {!isMgmt ? (
            <Button
              size="sm"
              color="primary"
              variant="flat"
              startContent={<PencilSquareIcon className="h-4 w-4" />}
              className="rounded-xl px-3 text-[11px] font-bold"
              onPress={() => onEdit(item)}
            >
              编辑
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <MetricCard label="期望模式" value={item.config.mode === 'static' ? '静态地址' : 'DHCP'} tone="default" />
        <MetricCard label="当前 IP" value={item.status.currentIP || '-'} tone="default" />
        <MetricCard label="期望地址" value={item.config.address || '-'} tone="default" />
        <MetricCard label="当前网关" value={item.status.currentGateway || '-'} tone="default" />
        <MetricCard label="期望网关" value={item.config.gateway || '-'} tone="default" />
        <MetricCard label="链路速率" value={item.status.speed || '-'} tone="default" />
      </div>

      <div className="mt-4 grid gap-3 rounded-[22px] border border-white/8 bg-black/10 p-4">
        <InlineSummary label="DNS" value={dnsLabel} mono />
        <InlineSummary label="MTU" value={String(item.config.mtu || 1500)} />
      </div>
    </article>
  )
}

/**
 * NetworkPageSkeleton 在接口加载时提供占位反馈。
 */
function NetworkPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-40 rounded-[32px] bg-white/5" />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_2fr]">
        <Skeleton className="h-[420px] rounded-[32px] bg-white/5" />
        <Skeleton className="h-[420px] rounded-[32px] bg-white/5" />
      </div>
    </div>
  )
}

/**
 * MetricCard 统一展示单个关键指标。
 */
function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'default' | 'success' | 'warn'
}) {
  const toneClass = tone === 'success'
    ? 'text-apple-green-light bg-apple-green/10 border-apple-green/20'
    : tone === 'warn'
      ? 'text-[#ffd37a] bg-[#ffd37a]/10 border-[#ffd37a]/20'
      : 'text-white bg-white/[0.03] border-white/8'

  return (
    <div className={`rounded-[20px] border p-4 ${toneClass}`}>
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-apple-text-tertiary">{label}</div>
      <div className="break-all text-sm font-semibold leading-6">{value}</div>
    </div>
  )
}

/**
 * LinkStateBadge 用颜色快速表达网口链路状态。
 */
function LinkStateBadge({ linkState, carrier }: { linkState: string; carrier: boolean }) {
  const normalized = linkState === 'up' ? 'UP' : 'DOWN'
  const colorClass = normalized === 'UP'
    ? 'border-apple-green/25 bg-apple-green/10 text-apple-green-light'
    : 'border-white/10 bg-white/6 text-apple-text-secondary'
  const Icon = normalized === 'UP' ? WifiIcon : LinkIcon

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${colorClass}`}>
      <Icon className="h-3.5 w-3.5" />
      {normalized}
      {carrier ? <SignalIcon className="h-3 w-3" /> : null}
    </span>
  )
}

/**
 * InlineSummary 以紧凑形式展示非核心配置字段。
 */
function InlineSummary({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-apple-text-tertiary">{label}</span>
      <span className={`${mono ? 'font-mono text-[12px]' : 'font-semibold'} break-all text-right text-white`}>
        {value || '-'}
      </span>
    </div>
  )
}

/**
 * InlineError 统一展示接口错误提示。
 */
function InlineError({ message }: { message: string }) {
  return (
    <div className="rounded-[20px] border border-[#ff8d8d]/20 bg-[#ff8d8d]/10 px-4 py-3 text-sm text-[#ffd4d4]">
      {message}
    </div>
  )
}

/**
 * buildEditDraft 将网口视图映射为表单初值。
 */
function buildEditDraft(item: NetworkInterfaceView | null): EditDraft {
  return {
    mode: item?.config.mode === 'static' ? 'static' : 'dhcp',
    address: item?.config.address || '',
    gateway: item?.config.gateway || '',
    dnsServers: item?.config.dnsServers.join('\n') || '',
    mtu: item?.config.mtu ? String(item.config.mtu) : '1500',
  }
}

const inputClassNames = {
  inputWrapper: 'border border-white/10 bg-white/[0.04] text-white shadow-none',
  input: 'text-white placeholder:text-apple-text-tertiary',
  label: 'text-apple-text-secondary',
}
