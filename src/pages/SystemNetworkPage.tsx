import {
  Button,
  Card,
  CardBody,
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
  Textarea,
} from '@heroui/react'
import {
  ArrowPathIcon,
  BoltIcon,
  LinkIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  SignalIcon,
  WifiIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  type NetworkInterfaceView,
  type TestNetworkInterfaceInput,
  useToggleSystemNetworkInterface,
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
 * SystemNetworkPage 以运维编排台视角展示网络接口状态与操作入口。
 */
export function SystemNetworkPage() {
  const navigate = useNavigate()
  const interfacesQuery = useSystemNetworkInterfaces()
  const updateMutation = useUpdateSystemNetworkInterface()
  const testMutation = useTestSystemNetworkInterface()
  const toggleMutation = useToggleSystemNetworkInterface()
  const [selectedName, setSelectedName] = useState('')
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

  const dashboard = useMemo(() => {
    const interfaceItems = interfacesQuery.data || []
    const managementItems = interfaceItems.filter((item) => item.role === 'mgmt')
    const scanItems = interfaceItems.filter((item) => item.role !== 'mgmt')
    const liveItems = interfaceItems.filter((item) => item.status.linkState === 'up')
    const staticItems = interfaceItems.filter((item) => item.config.mode === 'static')

    return {
      all: interfaceItems,
      managementItems,
      scanItems,
      totalCount: interfaceItems.length,
      managementCount: managementItems.length,
      scanCount: scanItems.length,
      liveCount: liveItems.length,
      staticCount: staticItems.length,
    }
  }, [interfacesQuery.data])

  useEffect(() => {
    if (dashboard.all.length === 0) {
      setSelectedName('')
      return
    }
    const selectedStillExists = dashboard.all.some((item) => item.name === selectedName)
    if (selectedStillExists) {
      return
    }
    setSelectedName(dashboard.all[0].name)
  }, [dashboard.all, selectedName])

  const selectedItem = useMemo(() => {
    if (dashboard.all.length === 0) {
      return null
    }
    return dashboard.all.find((item) => item.name === selectedName) || dashboard.all[0]
  }, [dashboard.all, selectedName])

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

  async function handleToggle(item: NetworkInterfaceView) {
    const action = item.status.linkState === 'up' ? 'disable' : 'enable'
    await toggleMutation.mutateAsync({ name: item.name, action })
  }

  if (interfacesQuery.isPending) {
    return <NetworkPageSkeleton />
  }

  if (interfacesQuery.isError) {
    if (isApiError(interfacesQuery.error) && (interfacesQuery.error.status === 401 || interfacesQuery.error.status === 403)) {
      return null
    }

    return (
      <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-[#07111b] p-10 text-apple-text-primary shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(51,194,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,145,77,0.12),transparent_28%)]" />
        <div className="relative flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
          <div className="inline-flex items-center rounded-full border border-[#ff9150]/30 bg-[#ff9150]/10 px-4 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-[#ffc199]">
            Network Control Offline
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-[0.04em] text-white">网络编排台当前不可用</h2>
            <p className="mx-auto max-w-2xl text-sm leading-7 text-white/60">
              {interfacesQuery.error.message || '当前系统未启用网络管理模块，或宿主机不支持 nmcli 管理。'}
            </p>
          </div>
          <Button
            variant="flat"
            className="rounded-2xl border border-white/10 bg-white/8 px-6 font-bold text-white hover:bg-white/12"
            onPress={() => interfacesQuery.refetch()}
          >
            重新检测
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 pb-16 text-apple-text-primary">
      <section className="relative overflow-hidden rounded-[40px] border border-white/10 bg-[#05101b] shadow-[0_36px_120px_rgba(0,0,0,0.38)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(43,184,255,0.18),transparent_28%),radial-gradient(circle_at_75%_12%,rgba(98,255,221,0.12),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0)_46%)]" />
        <div className="absolute inset-y-0 right-[28%] w-px bg-white/8" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-[linear-gradient(to_top,rgba(0,0,0,0.34),transparent)]" />

        <div className="relative grid gap-6 p-6 xl:grid-cols-[1.35fr_0.95fr] xl:p-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#59d0ff]/25 bg-[#59d0ff]/10 px-4 py-1 text-[10px] font-black uppercase tracking-[0.34em] text-[#8ee3ff]">
                <SignalIcon className="h-3.5 w-3.5" />
                Network Orchestrator Deck
              </div>
              <div className="max-w-4xl space-y-3">
                <h1 className="text-4xl font-black uppercase tracking-[0.06em] text-white md:text-5xl">
                  网络管理
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-white/62 md:text-[15px]">
                  以扫描执行视角管理宿主机网口。左侧选择接口，右侧查看实时链路、声明式配置和操作面板，避免在一堆平级卡片里来回寻找关键信息。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <OverviewMetric
                eyebrow="Interfaces"
                value={String(dashboard.totalCount)}
                tone="cyan"
                detail="已纳管网口总数"
              />
              <OverviewMetric
                eyebrow="Scan Ports"
                value={String(dashboard.scanCount)}
                tone="teal"
                detail="可用于业务扫描的接口"
              />
              <OverviewMetric
                eyebrow="Links Up"
                value={String(dashboard.liveCount)}
                tone="amber"
                detail="当前链路处于连通状态"
              />
              <OverviewMetric
                eyebrow="Static Mode"
                value={String(dashboard.staticCount)}
                tone="slate"
                detail="已固定为静态地址模式"
              />
            </div>
          </div>

          <div className="grid gap-4 rounded-[32px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-2xl">
            <StatusLine
              label="管理口"
              value={dashboard.managementCount > 0 ? `${dashboard.managementCount} 个受保护接口` : '尚未识别'}
              tone="cyan"
            />
            <StatusLine
              label="业务口"
              value={dashboard.scanCount > 0 ? `${dashboard.scanCount} 个扫描出口` : '尚未识别'}
              tone="teal"
            />
            <StatusLine
              label="编排策略"
              value="管理口只读，业务口支持 DHCP / 静态配置 / 启停"
              tone="slate"
            />
            <StatusLine
              label="操作入口"
              value="支持链路测试、在线配置下发与网卡启停"
              tone="amber"
            />
            <div className="mt-2 flex flex-wrap gap-3">
              <Button
                variant="flat"
                startContent={<ArrowPathIcon className="h-4 w-4" />}
                className="rounded-2xl border border-white/10 bg-white/8 px-5 font-bold text-white hover:bg-white/12"
                onPress={() => interfacesQuery.refetch()}
              >
                刷新状态
              </Button>
              {selectedItem ? (
                <Button
                  variant="flat"
                  startContent={<WrenchScrewdriverIcon className="h-4 w-4" />}
                  className="rounded-2xl border border-[#59d0ff]/20 bg-[#59d0ff]/12 px-5 font-bold text-[#b7f0ff] hover:bg-[#59d0ff]/18"
                  onPress={() => setTestingItem(selectedItem)}
                >
                  测试当前接口
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[400px_minmax(0,1fr)]">
        <Card className="overflow-hidden border border-white/10 bg-[#08131f] shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
          <CardBody className="gap-5 p-0">
            <div className="border-b border-white/8 px-5 py-5">
              <div className="text-[10px] font-black uppercase tracking-[0.32em] text-white/42">Interface Index</div>
              <div className="mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">接口清单</div>
              <p className="mt-2 text-sm leading-7 text-white/55">
                先选接口，再看右侧深度信息。管理口和业务口在同一条时间线上排布，但通过颜色和状态做明确分区。
              </p>
            </div>

            <div className="max-h-[calc(100vh-320px)] space-y-4 overflow-y-auto px-4 pb-4">
              <InterfaceRailSection
                title="管理口"
                subtitle="只读保护区"
                items={dashboard.managementItems}
                selectedName={selectedItem?.name || ''}
                onSelect={setSelectedName}
              />
              <InterfaceRailSection
                title="业务口"
                subtitle="扫描出口"
                items={dashboard.scanItems}
                selectedName={selectedItem?.name || ''}
                onSelect={setSelectedName}
              />
            </div>
          </CardBody>
        </Card>

        <NetworkDetailStage
          item={selectedItem}
          onEdit={setEditingItem}
          onTest={setTestingItem}
          onToggle={handleToggle}
          togglePending={toggleMutation.isPending}
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
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">编辑业务口配置</div>
                <div className="text-xl font-black uppercase tracking-[0.08em] text-white">{editingItem?.name || '-'}</div>
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
                  classNames={selectClassNames}
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

                <div className="grid gap-4 md:grid-cols-[1.5fr_0.8fr]">
                  <Textarea
                    label="DNS 服务器"
                    value={editDraft.dnsServers}
                    onValueChange={(value) => setEditDraft((current) => ({ ...current, dnsServers: value }))}
                    isDisabled={editDraft.mode !== 'static'}
                    placeholder={'每行一个 DNS，例如\n223.5.5.5\n114.114.114.114'}
                    minRows={5}
                    classNames={textareaClassNames}
                  />
                  <Input
                    label="MTU"
                    value={editDraft.mtu}
                    onValueChange={(value) => setEditDraft((current) => ({ ...current, mtu: value }))}
                    placeholder="1500"
                    classNames={inputClassNames}
                  />
                </div>

                {updateMutation.isError ? <InlineError message={updateMutation.error.message} /> : null}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  className="rounded-xl border border-white/10 bg-white/8 px-5 font-bold text-white hover:bg-white/12"
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
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">链路测试窗口</div>
                <div className="text-xl font-black uppercase tracking-[0.08em] text-white">{testingItem?.name || '-'}</div>
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
                  classNames={selectClassNames}
                >
                  {NETWORK_TEST_COUNT_OPTIONS.map((option) => (
                    <SelectItem key={option.key} textValue={option.label}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>

                {testMutation.data ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <MetricCard label="可达性" value={testMutation.data.reachable ? '可达' : '不可达'} tone={testMutation.data.reachable ? 'success' : 'default'} />
                    <MetricCard label="平均 RTT" value={`${testMutation.data.rttAvgMS.toFixed(2)} ms`} tone="default" />
                    <MetricCard label="丢包率" value={`${testMutation.data.packetLoss.toFixed(2)} %`} tone={testMutation.data.packetLoss > 0 ? 'warn' : 'success'} />
                  </div>
                ) : null}

                {testMutation.isError ? <InlineError message={testMutation.error.message} /> : null}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  className="rounded-xl border border-white/10 bg-white/8 px-5 font-bold text-white hover:bg-white/12"
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

      {toggleMutation.isError ? <InlineError message={toggleMutation.error.message} /> : null}
    </div>
  )
}

/**
 * InterfaceRailSection 负责渲染左侧接口索引区块。
 */
function InterfaceRailSection({
  title,
  subtitle,
  items,
  selectedName,
  onSelect,
}: {
  title: string
  subtitle: string
  items: NetworkInterfaceView[]
  selectedName: string
  onSelect: (name: string) => void
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between px-1">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">{subtitle}</div>
          <div className="mt-1 text-[15px] font-black uppercase tracking-[0.16em] text-white">{title}</div>
        </div>
        <div className="text-[11px] font-semibold text-white/38">{items.length} 项</div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-white/38">
          当前区块暂无接口。
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const selected = item.name === selectedName
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => onSelect(item.name)}
                className={`group w-full rounded-[24px] border px-4 py-4 text-left transition-all duration-300 ${selected
                  ? 'border-[#5ad3ff]/30 bg-[#5ad3ff]/12 shadow-[0_0_0_1px_rgba(90,211,255,0.1)]'
                  : 'border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-black uppercase tracking-[0.12em] text-white">
                        {item.name}
                      </span>
                      {item.isProtected ? (
                        <Chip size="sm" variant="flat" classNames={{ base: 'border-0 bg-[#59d0ff]/12 text-[9px] font-black uppercase tracking-[0.18em] text-[#99ebff]' }}>
                          protected
                        </Chip>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <LinkStateBadge linkState={item.status.linkState} carrier={item.status.carrier} compact />
                      <RoleBadge role={item.role} />
                    </div>
                  </div>
                  <div className={`text-[11px] font-semibold ${selected ? 'text-[#c8f5ff]' : 'text-white/40 group-hover:text-white/60'}`}>
                    {item.status.currentIP || item.config.address || '-'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

/**
 * NetworkDetailStage 负责展示当前选中接口的实时态、声明态与操作区。
 */
function NetworkDetailStage({
  item,
  onEdit,
  onTest,
  onToggle,
  togglePending,
}: {
  item: NetworkInterfaceView | null
  onEdit: (item: NetworkInterfaceView) => void
  onTest: (item: NetworkInterfaceView) => void
  onToggle: (item: NetworkInterfaceView) => void
  togglePending: boolean
}) {
  if (!item) {
    return (
      <Card className="border border-white/10 bg-[#08131f] shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
        <CardBody className="flex min-h-[560px] items-center justify-center p-10 text-center">
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/45">
              <LinkIcon className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-[0.08em] text-white">暂无接口</h3>
              <p className="mt-2 max-w-lg text-sm leading-7 text-white/50">
                当前没有可展示的网络接口。请先确认宿主机上存在物理网口，并且 center 已成功完成网络模块 bootstrap。
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  const isManagement = item.role === 'mgmt'
  const dnsLabel = item.config.dnsServers.length > 0 ? item.config.dnsServers.join('\n') : '-'
  const selectedTone = isManagement ? 'cyan' : 'teal'
  const toggleTitle = item.status.linkState === 'up' ? '停用接口' : '启用接口'
  const toggleDescription = item.status.linkState === 'up'
    ? '主动断开当前业务口，暂停其承载扫描流量'
    : '重新启用当前业务口，恢复 NetworkManager 接管'

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-white/10 bg-[#08131f] shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
        <CardBody className="relative gap-6 overflow-hidden p-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(89,208,255,0.15),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_48%)]" />
          <div className="relative border-b border-white/8 px-6 py-6">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={item.role} />
                  <LinkStateBadge linkState={item.status.linkState} carrier={item.status.carrier} />
                  {item.isProtected ? (
                    <Chip size="sm" variant="flat" classNames={{ base: 'border-0 bg-[#59d0ff]/12 text-[10px] font-black uppercase tracking-[0.2em] text-[#a6efff]' }}>
                      protected
                    </Chip>
                  ) : null}
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/38">Selected Interface</div>
                  <h2 className="mt-2 text-4xl font-black uppercase tracking-[0.08em] text-white">{item.name}</h2>
                </div>
                <p className="max-w-3xl text-sm leading-7 text-white/55">
                  当前聚焦接口的实时状态、声明式配置和受控操作都在这一面板里。运维只需要盯住这一块，不必在多个分散卡片之间切换。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                <ActionPill
                  icon={<BoltIcon className="h-4 w-4" />}
                  title="链路测试"
                  description="通过当前接口发起定向 ping"
                  tone={selectedTone}
                  onPress={() => onTest(item)}
                />
                <ActionPill
                  icon={<ArrowPathIcon className="h-4 w-4" />}
                  title={isManagement ? '只读保护' : toggleTitle}
                  description={isManagement ? '管理口当前版本不可在线启停' : toggleDescription}
                  tone={isManagement ? 'slate' : selectedTone}
                  disabled={isManagement || togglePending}
                  onPress={() => onToggle(item)}
                />
                <ActionPill
                  icon={<PencilSquareIcon className="h-4 w-4" />}
                  title={isManagement ? '只读保护' : '调整配置'}
                  description={isManagement ? '管理口当前版本不可在线修改' : '切换 DHCP / 静态地址'}
                  tone={isManagement ? 'slate' : selectedTone}
                  disabled={isManagement}
                  onPress={() => onEdit(item)}
                />
              </div>
            </div>
          </div>

          <div className="relative grid gap-6 p-6 2xl:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-6">
              <BlockSection title="实时链路状态" kicker="Runtime Telemetry">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="当前 IP" value={item.status.currentIP || '-'} tone="default" />
                  <MetricCard label="当前网关" value={item.status.currentGateway || '-'} tone="default" />
                  <MetricCard label="链路速率" value={item.status.speed || '-'} tone="default" />
                  <MetricCard label="MAC 地址" value={item.status.mac || '-'} tone="default" />
                </div>
              </BlockSection>

              <BlockSection title="声明式配置" kicker="Declared Config">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="模式" value={item.config.mode === 'static' ? '静态地址' : 'DHCP 自动获取'} tone={item.config.mode === 'static' ? 'warn' : 'default'} />
                  <MetricCard label="期望地址" value={item.config.address || '-'} tone="default" />
                  <MetricCard label="期望网关" value={item.config.gateway || '-'} tone="default" />
                  <MetricCard label="MTU" value={String(item.config.mtu || 1500)} tone="default" />
                </div>
              </BlockSection>
            </section>

            <section className="space-y-6">
              <BlockSection title="执行约束" kicker="Guard Rails">
                <div className="space-y-3">
                  <GuardLine
                    icon={<ShieldCheckIcon className="h-4 w-4" />}
                    label="角色约束"
                    value={isManagement ? '管理口只读，当前版本禁止在线修改' : '业务口允许执行配置下发'}
                  />
                  <GuardLine
                    icon={<WifiIcon className="h-4 w-4" />}
                    label="链路状态"
                    value={item.status.linkState === 'up' ? '接口链路已建立，可直接用于探测与测试' : '接口当前未连通，建议先核查物理链路'}
                  />
                  <GuardLine
                    icon={<LinkIcon className="h-4 w-4" />}
                    label="业务说明"
                    value={isManagement ? '用于中心节点宿主机管理路径' : '用于扫描出口与业务流量调度'}
                  />
                </div>
              </BlockSection>

              <BlockSection title="DNS 计划" kicker="Name Resolution">
                <pre className="max-h-[220px] overflow-auto rounded-[26px] border border-white/8 bg-black/20 p-4 font-mono text-xs leading-6 text-white/72 whitespace-pre-wrap break-all">
                  {dnsLabel}
                </pre>
              </BlockSection>
            </section>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

/**
 * NetworkPageSkeleton 为编排台提供更接近最终结构的骨架占位。
 */
function NetworkPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-[320px] rounded-[40px] bg-white/5" />
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[400px_minmax(0,1fr)]">
        <Skeleton className="h-[720px] rounded-[36px] bg-white/5" />
        <Skeleton className="h-[720px] rounded-[36px] bg-white/5" />
      </div>
    </div>
  )
}

/**
 * OverviewMetric 用于页首总览指标。
 */
function OverviewMetric({
  eyebrow,
  value,
  detail,
  tone,
}: {
  eyebrow: string
  value: string
  detail: string
  tone: 'cyan' | 'teal' | 'amber' | 'slate'
}) {
  const toneClass = metricToneClassMap[tone]
  return (
    <div className={`rounded-[28px] border p-4 ${toneClass}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/42">{eyebrow}</div>
      <div className="mt-3 text-4xl font-black uppercase tracking-[0.06em] text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-white/55">{detail}</div>
    </div>
  )
}

/**
 * StatusLine 用于右上角控制说明面板。
 */
function StatusLine({ label, value, tone }: { label: string; value: string; tone: 'cyan' | 'teal' | 'amber' | 'slate' }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-4 rounded-[22px] border border-white/8 bg-black/18 px-4 py-4">
      <span className={`text-[10px] font-black uppercase tracking-[0.24em] ${lineToneClassMap[tone]}`}>{label}</span>
      <span className="text-sm leading-6 text-white/68">{value}</span>
    </div>
  )
}

/**
 * ActionPill 让高频动作保持在详情标题区即可触达。
 */
function ActionPill({
  icon,
  title,
  description,
  tone,
  disabled = false,
  onPress,
}: {
  icon: ReactNode
  title: string
  description: string
  tone: 'cyan' | 'teal' | 'slate'
  disabled?: boolean
  onPress: () => void
}) {
  const toneClass = tone === 'cyan'
    ? 'border-[#5ad3ff]/18 bg-[#5ad3ff]/10 text-[#bcefff]'
    : tone === 'teal'
      ? 'border-[#6dffd2]/18 bg-[#6dffd2]/10 text-[#c6fff0]'
      : 'border-white/10 bg-white/[0.05] text-white/62'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      className={`rounded-[24px] border px-4 py-4 text-left transition-all ${toneClass} ${disabled ? 'cursor-not-allowed opacity-55' : 'hover:translate-y-[-1px] hover:bg-white/[0.08]'}`}
    >
      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em]">
        {icon}
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-white/58">{description}</div>
    </button>
  )
}

/**
 * BlockSection 为详情区的不同信息块提供统一标题样式。
 */
function BlockSection({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return (
    <section className="rounded-[30px] border border-white/8 bg-white/[0.03] p-5">
      <div className="mb-4">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">{kicker}</div>
        <div className="mt-2 text-xl font-black uppercase tracking-[0.08em] text-white">{title}</div>
      </div>
      {children}
    </section>
  )
}

/**
 * GuardLine 用于说明当前接口的操作边界与上下文。
 */
function GuardLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[24px_88px_minmax(0,1fr)] items-start gap-3 rounded-[22px] border border-white/8 bg-black/18 px-4 py-4">
      <div className="mt-0.5 text-[#94e7ff]">{icon}</div>
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">{label}</div>
      <div className="text-sm leading-6 text-white/64">{value}</div>
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
    <div className={`rounded-[22px] border p-4 ${toneClass}`}>
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-apple-text-tertiary">{label}</div>
      <div className="break-all text-sm font-semibold leading-6">{value}</div>
    </div>
  )
}

/**
 * RoleBadge 用颜色区分管理口与业务口。
 */
function RoleBadge({ role }: { role: string }) {
  const label = role === 'mgmt' ? '管理口' : '业务口'
  const className = role === 'mgmt'
    ? 'border-[#59d0ff]/20 bg-[#59d0ff]/10 text-[#a8edff]'
    : 'border-[#6dffd2]/20 bg-[#6dffd2]/10 text-[#cbfff0]'

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${className}`}>
      {label}
    </span>
  )
}

/**
 * LinkStateBadge 用颜色快速表达网口链路状态。
 */
function LinkStateBadge({ linkState, carrier, compact = false }: { linkState: string; carrier: boolean; compact?: boolean }) {
  const normalized = linkState === 'up' ? 'UP' : 'DOWN'
  const colorClass = normalized === 'UP'
    ? 'border-apple-green/25 bg-apple-green/10 text-apple-green-light'
    : 'border-white/10 bg-white/6 text-apple-text-secondary'
  const Icon = normalized === 'UP' ? WifiIcon : LinkIcon

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${compact ? 'px-2 py-1 text-[9px]' : 'px-2.5 py-1 text-[10px]'} font-black uppercase tracking-[0.18em] ${colorClass}`}>
      <Icon className="h-3.5 w-3.5" />
      {normalized}
      {carrier ? <SignalIcon className="h-3 w-3" /> : null}
    </span>
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

const metricToneClassMap = {
  cyan: 'border-[#59d0ff]/18 bg-[#59d0ff]/08',
  teal: 'border-[#6dffd2]/18 bg-[#6dffd2]/08',
  amber: 'border-[#ffd37a]/18 bg-[#ffd37a]/08',
  slate: 'border-white/8 bg-white/[0.03]',
} as const

const lineToneClassMap = {
  cyan: 'text-[#94e7ff]',
  teal: 'text-[#a2ffe3]',
  amber: 'text-[#ffd38f]',
  slate: 'text-white/46',
} as const

const inputClassNames = {
  inputWrapper: 'border border-white/10 bg-white/[0.04] text-white shadow-none data-[hover=true]:bg-white/[0.06]',
  input: 'text-white placeholder:text-apple-text-tertiary',
  label: 'text-apple-text-secondary',
}

const textareaClassNames = {
  inputWrapper: 'border border-white/10 bg-white/[0.04] text-white shadow-none data-[hover=true]:bg-white/[0.06]',
  input: 'text-white placeholder:text-apple-text-tertiary',
  label: 'text-apple-text-secondary',
}

const selectClassNames = {
  trigger: 'border border-white/10 bg-white/[0.04] text-white shadow-none data-[hover=true]:bg-white/[0.06]',
  label: 'text-apple-text-secondary',
  value: 'text-white',
}
