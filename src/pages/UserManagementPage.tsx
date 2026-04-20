import {
  Button,
  Card,
  CardBody,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Skeleton,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Alert,
} from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ExclamationTriangleIcon, PlusIcon, ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

import { isApiError } from '@/api/client'
import {
  createUser,
  replaceUserRoles,
  resetUserPassword,
  updateUserStatus,
  useRoleOptionsView,
  useUserPermissionSnapshotView,
  useUserListView,
  type CreateUserPayload,
  type UserView,
} from '@/api/adapters/user'
import { useAuthStore } from '@/store/auth'
import { APPLE_TABLE_CLASSES } from '@/utils/theme'
import { PERMISSIONS, hasPermission } from '@/utils/permissions'

interface CreateUserDraft {
  username: string
  displayName: string
  password: string
  roleCodes: string[]
}

/**
 * UserManagementPage 展示用户管理、状态控制和角色编辑能力。
 * 重构：基于 Apple Design 规范，引入 Bento 布局与丝滑消息反馈
 */
export function UserManagementPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.currentUser)

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all')
  const [createVisible, setCreateVisible] = useState(false)
  const [createDraft, setCreateDraft] = useState<CreateUserDraft>({
    username: '',
    displayName: '',
    password: '',
    roleCodes: [],
  })
  const [resetTarget, setResetTarget] = useState<UserView | null>(null)
  const [resetPasswordDraft, setResetPasswordDraft] = useState('')
  const [roleTarget, setRoleTarget] = useState<UserView | null>(null)
  const [roleDraft, setRoleDraft] = useState<string[]>([])

  // 新增：详情面板与权限快照状态
  const [detailTarget, setDetailTarget] = useState<UserView | null>(null)

  // 核心：自研消息胶囊状态 (模拟 Element UI)
  const [toast, setToast] = useState<{ title: string; msg: string; type: 'warning' | 'danger' | 'success' } | null>(null)

  // 状态：用于“禁用/启用”的二次确认
  const [confirmTarget, setConfirmTarget] = useState<{ user: UserView; status: 'active' | 'disabled' } | null>(null)

  // 消息自动消失逻辑
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const notify = (title: string, msg: string, type: 'warning' | 'danger' | 'success') => {
    setToast(null)
    setTimeout(() => setToast({ title, msg, type }), 50)
  }

  // 搜索/状态变化时重置页码
  const handleKeywordChange = (v: string) => { setKeyword(v); setPage(1); }
  const handleStatusFilterChange = (v: 'all' | 'active' | 'disabled') => { setStatusFilter(v); setPage(1); }

  const usersQuery = useUserListView({
    page,
    page_size: pageSize,
    keyword: keyword || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter
  })
  const rolesQuery = useRoleOptionsView()
  const permissionSnapshotQuery = useUserPermissionSnapshotView(detailTarget?.id)

  useEffect(() => {
    const error = usersQuery.error || rolesQuery.error
    if (!error || !isApiError(error)) {
      return
    }

    if (error.status === 401) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true })
      return
    }

    if (error.status === 403) {
      navigate('/403', { replace: true })
    }
  }, [location.pathname, navigate, rolesQuery.error, usersQuery.error])

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      notify('操作成功', '新用户已成功创建并同步至安全系统', 'success')
      setCreateVisible(false)
      setCreateDraft({ username: '', displayName: '', password: '', roleCodes: [] })
      await refreshUsersAndAudits(queryClient)
    },
    onError: (error) => {
      notify('创建失败', resolveActionError(error, '创建用户失败'), 'danger')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ userID, status }: { userID: string; status: 'active' | 'disabled' }) => updateUserStatus(userID, { status }),
    onSuccess: async (_, variables) => {
      notify('状态更新', variables.status === 'disabled' ? '用户账户已立即禁用' : '用户账户已重新启用', 'success')
      if (detailTarget?.id === variables.userID) {
        setDetailTarget(prev => prev ? { ...prev, status: variables.status } : null)
      }
      await refreshUsersAndAudits(queryClient)
    },
    onError: (error) => {
      notify('更新失败', resolveActionError(error, '更新用户状态失败'), 'danger')
    },
  })

  const resetMutation = useMutation({
    mutationFn: ({ userID, password }: { userID: string; password: string }) => resetUserPassword(userID, { newPassword: password }),
    onSuccess: async () => {
      notify('安全更新', '该用户的访问口令已重置并生效', 'success')
      setResetTarget(null)
      setResetPasswordDraft('')
      await refreshUsersAndAudits(queryClient)
    },
    onError: (error) => {
      notify('重置失败', resolveActionError(error, '重置密码失败'), 'danger')
    },
  })

  const roleMutation = useMutation({
    mutationFn: ({ userID, roleCodes }: { userID: string; roleCodes: string[] }) => replaceUserRoles(userID, { roleCodes }),
    onSuccess: async () => {
      notify('权限同步', '用户的角色分配已实时更新', 'success')
      setRoleTarget(null)
      setRoleDraft([])
      await refreshUsersAndAudits(queryClient)
    },
    onError: (error) => {
      notify('同步失败', resolveActionError(error, '更新用户角色失败'), 'danger')
    },
  })

  const canManageUsers = hasPermission(currentUser?.permissions, PERMISSIONS.userManage)
  const canManageRoles = hasPermission(currentUser?.permissions, PERMISSIONS.roleManage)
  const roleOptions = rolesQuery.data || []

  const filteredItems = usersQuery.data?.items || []

  const metrics = useMemo(() => {
    return {
      total: usersQuery.data?.pagination.total || 0,
      active: (usersQuery.data?.items || []).filter((item) => item.status === 'active').length, // 这里由于只拿了一页，metrics 可能略有不准，但 total 是准确的
      disabled: (usersQuery.data?.items || []).filter((item) => item.status === 'disabled').length,
      builtin: (usersQuery.data?.items || []).filter((item) => item.isBuiltin).length,
    }
  }, [usersQuery.data])

  const apiError = usersQuery.error as { status?: number } | null
  const isActualError = usersQuery.isError && apiError?.status !== 401 && apiError?.status !== 403

  return (
    <div className="flex flex-col gap-14 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20">
      {/* 核心反馈层保持不变 */}
      <div className="fixed top-12 left-0 right-0 z-[100] flex justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {toast && (
            <motion.div
              key={toast.msg}
              initial={{ y: -60, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
              className="pointer-events-auto"
            >
              <div>
                <Alert
                  hideIcon
                  color={toast.type}
                  variant="flat"
                  classNames={{
                    base: [
                      "max-w-fit min-h-0 border border-white/10 rounded-full py-2.5 px-6 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10 items-center",
                      toast.type === 'danger' ? "bg-apple-red/20" :
                        toast.type === 'success' ? "bg-apple-green/20" : "bg-apple-blue-light/10"
                    ].join(" "),
                    mainWrapper: "flex flex-row items-center",
                  }}
                >
                  <div className="flex flex-row items-center gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <span className={[
                      "text-[15px] font-bold tracking-tight leading-none whitespace-nowrap",
                      toast.type === 'danger' ? "text-apple-red-light" :
                        toast.type === 'success' ? "text-apple-green-light" : "text-apple-blue-light"
                    ].join(" ")}>
                      {toast.title}: {toast.msg}
                    </span>
                  </div>
                </Alert>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 紧凑型指标概览区 (iPhone 风格) */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 h-auto md:h-[130px]">
        {/* 指标卡：Total Users */}
        <Card className="bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-3xl h-full shadow-none apple-spotlight rounded-[32px]">
          <CardBody className="p-6 flex flex-col justify-center">
            <span className="text-[10px] text-apple-blue-light uppercase tracking-[0.3em] font-black opacity-80">Full_Registry</span>
            {usersQuery.isPending ? <Skeleton className="h-8 w-12 rounded-lg bg-white/10 mt-1" /> : (
              <strong className="text-4xl font-black tracking-tighter mt-1 text-white leading-none">{metrics.total}</strong>
            )}
          </CardBody>
        </Card>

        {/* 指标卡：Active */}
        <Card className="bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-3xl h-full shadow-none apple-spotlight rounded-[32px]">
          <CardBody className="p-6 flex flex-col justify-center">
            <span className="text-[10px] text-apple-green-light uppercase tracking-[0.3em] font-black opacity-80 mb-1">Online_Nodes</span>
            {usersQuery.isPending ? <Skeleton className="h-8 w-12 rounded-lg bg-white/10" /> : (
              <strong className="text-4xl font-black tracking-tighter text-white leading-none">{metrics.active}</strong>
            )}
          </CardBody>
        </Card>

        {/* 指标卡：Builtin */}
        <Card className="bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-3xl h-full shadow-none apple-spotlight rounded-[32px]">
          <CardBody className="p-6 flex flex-col justify-center">
            <span className="text-[10px] text-apple-blue-light uppercase tracking-[0.3em] font-black opacity-80 mb-1">Core_Preset</span>
            {usersQuery.isPending ? <Skeleton className="h-8 w-12 rounded-lg bg-white/10" /> : (
              <strong className="text-4xl font-black tracking-tighter text-white leading-none">{metrics.builtin}</strong>
            )}
          </CardBody>
        </Card>

        {/* 指标卡：Disabled */}
        <Card className="bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-3xl h-full shadow-none apple-spotlight rounded-[32px]">
          <CardBody className="p-6 flex flex-col justify-center">
            <span className="text-[10px] text-apple-red-light uppercase tracking-[0.3em] font-black opacity-80 mb-1">Revoked_Status</span>
            {usersQuery.isPending ? <Skeleton className="h-8 w-12 rounded-lg bg-white/10" /> : (
              <strong className="text-4xl font-black tracking-tighter text-white leading-none">{metrics.disabled}</strong>
            )}
          </CardBody>
        </Card>
      </section>

      {/* 操作与搜索胶囊栏：始终渲染，确保护航功能可用 */}
      <section className="flex flex-col md:flex-row items-center gap-4 w-full">
        <div className="flex-1 w-full relative">
          <Input
            isClearable
            value={keyword}
            placeholder="搜索用户名、显示名、角色..."
            onValueChange={handleKeywordChange}
            variant="flat"
            startContent={<MagnifyingGlassIcon className="w-5 h-5 text-apple-text-tertiary" />}
            classNames={{
              inputWrapper: "bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-14 rounded-2xl border border-white/5 backdrop-blur-md",
              input: "text-base font-medium placeholder:text-apple-text-tertiary",
            }}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select
            aria-label="状态筛选"
            selectedKeys={[statusFilter]}
            onChange={(e) => handleStatusFilterChange((e.target.value as 'all' | 'active' | 'disabled') || 'all')} // handleStatusFilterChange 内部会重置 page 为 1
            variant="flat"
            classNames={{
              trigger: "bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-14 w-40 rounded-2xl border border-white/5 backdrop-blur-md text-apple-text-primary font-bold pr-10",
              value: "text-apple-text-primary truncate text-ellipsis pl-1"
            }}
            popoverProps={{ classNames: { content: "bg-apple-bg/95 backdrop-blur-3xl border border-white/10 shadow-2xl p-1 min-w-[160px]" } }}
          >
            <SelectItem key="all" textValue="全部状态">全部状态</SelectItem>
            <SelectItem key="active" textValue="在线 (Active)">在线 (Active)</SelectItem>
            <SelectItem key="disabled" textValue="已禁用 (Disabled)">已禁用 (Disabled)</SelectItem>
          </Select>
          <Button
            variant="flat"
            isIconOnly
            className="h-14 w-14 rounded-2xl bg-apple-tertiary-bg/10 border border-white/5 backdrop-blur-md"
            onPress={() => void refreshUsersAndAudits(queryClient, false)}
          >
            <ArrowPathIcon className="w-6 h-6 text-apple-text-secondary" />
          </Button>
          <Button
            color="primary"
            className="h-14 rounded-2xl font-black px-8 shadow-2xl shadow-apple-blue/20 flex items-center gap-2"
            isDisabled={!canManageUsers}
            onPress={() => setCreateVisible(true)}
          >
            <PlusIcon className="w-5 h-5" />
            <span>新建用户</span>
          </Button>
        </div>
      </section>

      {/* 磨砂玻璃用户列表表格容器 */}
      {isActualError ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-apple-text-tertiary bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-3xl rounded-[32px]">
          <p className="text-base font-medium">账户身份同步失败</p>
          <p className="text-xs opacity-60">{usersQuery.error instanceof Error ? usersQuery.error.message : '身份管控中心暂时无法响应'}</p>
          <Button
            size="sm"
            variant="flat"
            color="primary"
            className="rounded-full font-bold px-6"
            onPress={() => void refreshUsersAndAudits(queryClient, false)}
          >
            立即刷新
          </Button>
        </div>
      ) : !usersQuery.data && !usersQuery.isPending ? (
        <div className="flex flex-col items-center justify-center h-64 text-apple-text-tertiary bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-3xl rounded-[32px]">
          <p className="font-bold">暂无有效载荷数据 (NULL_PAYLOAD)</p>
        </div>
      ) : (
        <div className="rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-x-auto scrollbar-hide md:scrollbar-default custom-scrollbar">
          <Table
            aria-label="User identity table"
            layout="fixed"
            removeWrapper
            classNames={{
              ...APPLE_TABLE_CLASSES,
              base: "p-4 min-w-[1000px]",
              tr: `${APPLE_TABLE_CLASSES.tr} cursor-default`
            }}
          >
            <TableHeader>
              <TableColumn width={220} align="start">用户</TableColumn>
              <TableColumn width={200} align="start">权限角色</TableColumn>
              <TableColumn width={100} align="start">状态</TableColumn>
              <TableColumn width={100} align="start">类型</TableColumn>
              <TableColumn width={160} align="start">最后活跃</TableColumn>
              <TableColumn width={260} align="end">操作</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent={<div className="h-40 flex items-center justify-center text-apple-text-tertiary font-bold">未发现符合筛选条件的身份主体。</div>}
              isLoading={usersQuery.isPending}
              loadingContent={<Skeleton className="rounded-xl w-full h-40 bg-white/5" />}
            >
              {filteredItems.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-base font-bold text-white tracking-tight leading-tight">{record.displayName}</span>
                      <span className="text-[11px] text-apple-text-tertiary font-mono tracking-tighter uppercase opacity-60">{record.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {record.roles.map((role) => (
                        <span key={`${record.id}-${role.code}`} className="inline-flex items-center px-2 py-0.5 rounded-full bg-apple-blue/10 border border-apple-blue/30 text-apple-blue-light text-[10px] font-black uppercase tracking-wider">
                          {role.name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${record.status === 'active'
                      ? 'border-apple-green/40 text-apple-green-light bg-apple-green/10'
                      : 'border-apple-red/40 text-apple-red-light bg-apple-red/10'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${record.status === 'active' ? 'bg-apple-green-light' : 'bg-apple-red-light'}`} />
                      {record.status === 'active' ? '在线' : '禁用'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-black tracking-widest uppercase py-1 px-2 rounded-md ${record.isBuiltin ? 'text-apple-blue-light bg-white/5 border border-white/10' : 'text-apple-text-tertiary border border-transparent'
                      }`}>
                      {record.isBuiltin ? '核心预置' : '普通成员'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {record.lastLoginAt ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-apple-text-secondary">{formatDateTime(record.lastLoginAt)}</span>
                        <span className="text-[10px] text-apple-text-tertiary uppercase tracking-tighter">会话同步</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-apple-text-tertiary opacity-40 italic">从未初始化</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="bordered"
                        className="rounded-full border-white/10 text-apple-text-secondary hover:text-white hover:border-white/30 font-bold h-8 px-4"
                        onPress={() => setDetailTarget(record)}
                      >
                        详情
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        color={record.status === 'active' ? 'danger' : 'success'}
                        isDisabled={!canManageUsers || record.isBuiltin || statusMutation.isPending}
                        className="rounded-full font-black text-[11px] uppercase tracking-wider min-w-[64px] h-8 px-4"
                        onPress={() => {
                          setConfirmTarget({ user: record, status: record.status === 'active' ? 'disabled' : 'active' })
                        }}
                      >
                        {record.status === 'active' ? '禁用' : '解禁'}
                      </Button>
                      <Button
                        size="sm"
                        variant="bordered"
                        isDisabled={!canManageUsers}
                        className="rounded-full border-white/10 text-apple-text-secondary hover:text-white hover:border-white/30 font-bold h-8 px-4"
                        onPress={() => {
                          setResetTarget(record)
                          setResetPasswordDraft('')
                        }}
                      >
                        重置密码
                      </Button>
                      <Button
                        size="sm"
                        variant="bordered"
                        isDisabled={!canManageRoles || record.isBuiltin}
                        className="rounded-full border-white/10 text-apple-text-secondary hover:text-white hover:border-white/30 font-bold h-8 px-4"
                        onPress={() => {
                          setRoleTarget(record)
                          setRoleDraft(record.roles.map((role) => role.code))
                        }}
                      >
                        权限
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {usersQuery.data && (
            <div className="px-6 py-6 flex flex-col md:flex-row gap-4 justify-between items-center border-t border-white/5 bg-white/[0.01]">
              <p className="text-[11px] text-apple-text-tertiary font-bold uppercase tracking-[0.2em]">
                当前展示 <span className="text-white">{filteredItems.length}</span> / {usersQuery.data.pagination.total} 个身份主体
              </p>
              <Pagination
                total={Math.ceil(usersQuery.data.pagination.total / usersQuery.data.pagination.pageSize)}
                page={page}
                onChange={(page) => setPage(page)}
                showControls
                classNames={{
                  wrapper: "gap-2",
                  item: "bg-white/5 text-apple-text-secondary font-bold rounded-xl border border-white/5 hover:bg-white/10 transition-all min-w-[40px] h-10",
                  cursor: "bg-apple-blue font-black rounded-xl shadow-lg shadow-apple-blue/30",
                  prev: "bg-white/5 text-white/50 rounded-xl",
                  next: "bg-white/5 text-white/50 rounded-xl",
                }}
              />
            </div>
          )}
        </div>
      )}

      {usersQuery.data && (
        <Card className="bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-md">
          <CardBody className="p-6">
            <div className="grid grid-cols-[160px_1fr] gap-y-4 text-sm font-medium">
              <div className="text-apple-text-tertiary text-[10px] tracking-[0.2em] uppercase font-black">身份溯源 (Trace_ID)</div>
              <div className="font-mono text-apple-text-primary select-all text-xs opacity-80 italic">{usersQuery.data.traceId}</div>
              <div className="text-apple-text-tertiary text-[10px] tracking-[0.2em] uppercase font-black">当前账户权能 (Permissions)</div>
              <div className="font-mono text-apple-text-tertiary uppercase text-[9px] tracking-tight opacity-50">{(currentUser?.permissions || []).join(' | ') || '-'}</div>
            </div>
          </CardBody>
        </Card>
      )}

      <Modal
        isOpen={createVisible}
        onOpenChange={(open) => {
          if (!open) {
            setCreateVisible(false)
            setCreateDraft({ username: '', displayName: '', password: '', roleCodes: [] })
          }
        }}
        placement="center"
        backdrop="blur"
        classNames={{
          base: "bg-apple-bg/80 backdrop-blur-3xl text-apple-text-primary border border-white/10 rounded-[32px] max-w-md shadow-2xl",
          header: "border-b border-white/5 p-8",
          body: "p-8",
          footer: "border-t border-white/5 p-6 bg-white/[0.02]",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-[10px] text-apple-blue-light uppercase tracking-[0.3em] font-black">Management / 账户创建</span>
                <h3 className="text-2xl font-black tracking-tight mt-1">创建新用户身份</h3>
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-6">
                  <Input
                    label="用户名 (Username)"
                    placeholder="例如: admin_ops"
                    labelPlacement="outside"
                    value={createDraft.username}
                    onValueChange={(value) => setCreateDraft((draft) => ({ ...draft, username: value }))}
                    variant="flat"
                    classNames={{
                      inputWrapper: "bg-white/5 h-12 rounded-2xl border border-white/5",
                      label: "text-apple-text-tertiary font-black text-[10px] uppercase tracking-widest",
                    }}
                  />
                  <Input
                    label="显示名称"
                    placeholder="例如: 资产安全审计员"
                    labelPlacement="outside"
                    value={createDraft.displayName}
                    onValueChange={(value) => setCreateDraft((draft) => ({ ...draft, displayName: value }))}
                    variant="flat"
                    classNames={{
                      inputWrapper: "bg-white/5 h-12 rounded-2xl border border-white/5",
                      label: "text-apple-text-tertiary font-black text-[10px] uppercase tracking-widest",
                    }}
                  />
                  <Input
                    label="初始认证口令"
                    type="password"
                    placeholder="要求 8 位及以上复杂字符"
                    labelPlacement="outside"
                    value={createDraft.password}
                    onValueChange={(value) => setCreateDraft((draft) => ({ ...draft, password: value }))}
                    variant="flat"
                    classNames={{
                      inputWrapper: "bg-white/5 h-12 rounded-2xl border border-white/5",
                      label: "text-apple-text-tertiary font-black text-[10px] uppercase tracking-widest",
                    }}
                  />
                  <div className="flex flex-col gap-2">
                    <label className="text-apple-text-secondary text-xs font-bold px-1">分配访问角色</label>
                    <Select
                      selectionMode="multiple"
                      placeholder="请选择安全策略组"
                      selectedKeys={new Set(createDraft.roleCodes)}
                      onSelectionChange={(keys) => setCreateDraft((draft) => ({ ...draft, roleCodes: Array.from(keys) as string[] }))}
                      variant="flat"
                      classNames={{
                        trigger: "bg-white/5 h-12 rounded-2xl border border-white/5 pr-10",
                        value: "truncate text-ellipsis text-sm pl-1"
                      }}
                      popoverProps={{ classNames: { content: "bg-apple-bg/95 backdrop-blur-3xl border border-white/10 shadow-2xl p-1 min-w-[240px]" } }}
                    >
                    {roleOptions.map((role) => (
                      <SelectItem key={role.code} textValue={`${role.name} / ${role.code}`}>
                        {role.name} / {role.code} {role.isBuiltin ? '(系统内置)' : '(自定义)'}
                      </SelectItem>
                    ))}
                  </Select>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose} className="rounded-xl px-6 font-bold text-apple-text-secondary">取消操作</Button>
                <Button
                  color="primary"
                  className="rounded-xl px-10 font-black shadow-lg shadow-apple-blue/20"
                  isLoading={createMutation.isPending}
                  isDisabled={
                    createDraft.username.trim().length === 0 ||
                    createDraft.displayName.trim().length === 0 ||
                    createDraft.password.length < 8 ||
                    createDraft.roleCodes.length === 0
                  }
                  onPress={() => createMutation.mutate(toCreatePayload(createDraft))}
                >
                  确认初始化
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null)
            setResetPasswordDraft('')
          }
        }}
        placement="center"
        backdrop="blur"
        classNames={{
          base: "bg-apple-bg/80 backdrop-blur-3xl text-apple-text-primary border border-white/10 rounded-[32px] max-w-sm shadow-2xl",
          header: "border-b border-white/5 p-8",
          body: "p-8",
          footer: "border-t border-white/5 p-6 bg-white/[0.02]",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-[10px] text-apple-red-light uppercase tracking-[0.3em] font-black">Security / 覆写指令</span>
                <h3 className="text-2xl font-black tracking-tight mt-1">重置访问口令</h3>
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-6">
                  <div className="p-4 bg-apple-red/5 border border-apple-red/20 rounded-2xl">
                    <p className="text-xs text-apple-red-light leading-relaxed font-bold">
                      正在覆写用户 <span className="underline">{resetTarget?.displayName}</span> 的访问凭证。旧密码将失效内容更新完成。
                    </p>
                  </div>
                  <Input
                    label="新安全密码"
                    type="password"
                    labelPlacement="outside"
                    value={resetPasswordDraft}
                    placeholder="输入新的 Master Key"
                    onValueChange={setResetPasswordDraft}
                    variant="flat"
                    classNames={{
                      inputWrapper: "bg-white/5 h-12 rounded-2xl border border-white/5 focus-within:border-apple-red-light/50",
                      label: "text-apple-text-tertiary font-black text-[10px] uppercase tracking-widest",
                    }}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose} className="rounded-xl px-6 font-bold text-apple-text-secondary">取消</Button>
                <Button
                  color="danger"
                  className="rounded-xl px-10 font-black bg-apple-red-light shadow-lg shadow-apple-red/20"
                  isLoading={resetMutation.isPending}
                  isDisabled={resetPasswordDraft.length < 8}
                  onPress={() => {
                    if (resetTarget) {
                      resetMutation.mutate({ userID: resetTarget.id, password: resetPasswordDraft })
                    }
                  }}
                >
                  确认重置
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={Boolean(roleTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRoleTarget(null)
            setRoleDraft([])
          }
        }}
        placement="center"
        backdrop="blur"
        classNames={{
          base: "bg-apple-bg/80 backdrop-blur-3xl text-apple-text-primary border border-white/10 rounded-[32px] max-w-md shadow-2xl",
          header: "border-b border-white/5 p-8",
          body: "p-8",
          footer: "border-t border-white/5 p-6 bg-white/[0.02]",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-[10px] text-apple-blue-light uppercase tracking-[0.3em] font-black">Privilege / 权限迁移</span>
                <h3 className="text-2xl font-black tracking-tight mt-1">编辑权限组集</h3>
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-6">
                  <p className="text-sm text-apple-text-secondary leading-relaxed font-medium">
                    正在为 <span className="text-white font-black">{roleTarget?.displayName}</span> 重新分配全量角色。这会导致其资产访问权限立即重组内容更新完成。
                  </p>
                  <div className="flex flex-col gap-2">
                    <label className="text-apple-text-secondary text-xs font-bold px-1">身份-角色映射图 (Identity Role Map)</label>
                    <Select
                      selectionMode="multiple"
                      placeholder="请选择安全策略组"
                      selectedKeys={new Set(roleDraft)}
                      onSelectionChange={(keys) => setRoleDraft(Array.from(keys) as string[])}
                      variant="flat"
                      classNames={{
                        trigger: "bg-white/5 h-12 rounded-2xl border border-white/5 pr-10",
                        value: "truncate text-ellipsis text-sm pl-1"
                      }}
                      popoverProps={{ classNames: { content: "bg-apple-bg/95 backdrop-blur-3xl border border-white/10 shadow-2xl p-1 min-w-[240px]" } }}
                    >
                    {roleOptions.map((role) => (
                      <SelectItem key={role.code} textValue={`${role.name} / ${role.code}`}>
                        {role.name} / {role.code} {role.isBuiltin ? '(系统内置)' : '(自定义)'}
                      </SelectItem>
                    ))}
                  </Select>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose} className="rounded-xl px-6 font-bold text-apple-text-secondary">放弃</Button>
                <Button
                  color="primary"
                  className="rounded-xl px-10 font-black shadow-lg shadow-apple-blue/20"
                  isLoading={roleMutation.isPending}
                  isDisabled={roleDraft.length === 0}
                  onPress={() => {
                    if (roleTarget) {
                      roleMutation.mutate({ userID: roleTarget.id, roleCodes: roleDraft })
                    }
                  }}
                >
                  同步权能
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <Modal
        isOpen={Boolean(detailTarget)}
        onOpenChange={(open) => {
          if (!open) setDetailTarget(null)
        }}
        placement="center"
        backdrop="blur"
        scrollBehavior="inside"
        classNames={{
          base: "bg-apple-bg/80 backdrop-blur-3xl text-apple-text-primary border border-white/10 rounded-[32px] max-w-lg shadow-2xl",
          header: "border-b border-white/5 p-8",
          body: "p-8",
          footer: "border-t border-white/5 p-6 bg-white/[0.02]",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-[10px] text-apple-blue-light uppercase tracking-[0.3em] font-black">Identity / 深度解析报告</span>
                <h3 className="text-2xl font-black tracking-tight mt-1">{detailTarget?.displayName}</h3>
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-8">
                  {/* 基础信息卡片 */}
                  <section>
                    <h4 className="text-[10px] text-apple-text-tertiary uppercase tracking-widest font-black mb-4 flex items-center gap-2">
                      <span className="w-1 h-3 bg-apple-blue-light rounded-full" />
                      核心描述符 (Core_Descriptor)
                    </h4>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 grid grid-cols-2 gap-y-4">
                      <div>
                        <div className="text-[9px] text-apple-text-tertiary uppercase tracking-tighter">用户名</div>
                        <div className="text-sm font-bold font-mono uppercase">{detailTarget?.username}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-apple-text-tertiary uppercase tracking-tighter">当前状态</div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${detailTarget?.status === 'active' ? 'bg-apple-green-light' : 'bg-apple-red-light'}`} />
                          {detailTarget?.status === 'active' ? '在线运行 (Operational)' : '已被驳回 (Revoked)'}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[9px] text-apple-text-tertiary uppercase tracking-tighter">已分配角色</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {detailTarget?.roles.map(r => (
                            <span key={r.code} className="px-2 py-0.5 bg-apple-blue/10 border border-apple-blue/30 text-apple-blue-light text-[9px] font-black uppercase rounded-full">
                              {r.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 权限快照：核心安全特性 */}
                  <section>
                    <h4 className="text-[10px] text-apple-text-tertiary uppercase tracking-widest font-black mb-4 flex items-center gap-2">
                      <span className="w-1 h-3 bg-apple-blue-light rounded-full" />
                      有效权能快照 (Permission_Snapshot)
                    </h4>
                    <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                      <div className="p-4 bg-white/[0.02] border-b border-white/5 flex justify-between">
                        <span className="text-[9px] text-apple-text-tertiary uppercase font-black tracking-widest">动作标识 (Action)</span>
                        <span className="text-[9px] text-apple-text-tertiary uppercase font-black tracking-widest">权级状态</span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {permissionSnapshotQuery.isPending ? (
                          <div className="p-8 text-center text-xs text-apple-text-tertiary italic">权限快照同步中...</div>
                        ) : permissionSnapshotQuery.isError ? (
                          <div className="p-8 text-center">
                            <p className="text-xs text-apple-red-light italic">权限快照加载失败</p>
                            <p className="text-[10px] text-apple-text-tertiary/50 mt-1">请稍后刷新重试</p>
                          </div>
                        ) : (permissionSnapshotQuery.data?.permissions || []).length === 0 ? (
                          <div className="p-8 text-center text-xs text-apple-text-tertiary italic">未检测到任何活动权能内容更新完成。</div>
                        ) : (
                          <div className="p-2 space-y-1">
                            {(permissionSnapshotQuery.data?.permissions || []).map((permission) => (
                              <div key={permission} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                                <span className="font-mono text-[12px] font-bold text-white">{permission}</span>
                                <span className="rounded-full border border-apple-green/20 bg-apple-green/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-apple-green-light">
                                  Enabled
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* 时间线 */}
                  <section className="opacity-60">
                    <div className="text-[9px] text-apple-text-tertiary uppercase tracking-tighter mb-2">内部注册表 (Internal_Registry)</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-medium">
                        <span>创建时间</span>
                        <span className="text-white">{detailTarget?.id || '—'}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-medium">
                        <span>最后访问</span>
                        <span className="text-white">{detailTarget?.lastLoginAt ? formatDateTime(detailTarget.lastLoginAt) : 'N/A'}</span>
                      </div>
                    </div>
                  </section>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose} className="w-full rounded-2xl h-12 font-black text-apple-text-secondary">关闭分析台 (Close)</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={Boolean(confirmTarget)}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null)
        }}
        placement="center"
        backdrop="blur"
        classNames={{
          base: "bg-apple-bg/80 backdrop-blur-3xl text-apple-text-primary border border-white/10 rounded-[32px] max-w-sm shadow-2xl",
          header: "border-b border-white/5 p-8",
          body: "p-8",
          footer: "border-t border-white/5 p-6 bg-white/[0.02]",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="flex flex-col gap-1">
                  <span className={`text-[10px] uppercase tracking-[0.3em] font-black ${confirmTarget?.status === 'disabled' ? 'text-apple-red-light' : 'text-apple-green-light'}`}>
                    Security / 执行锁 (Action_Lock)
                  </span>
                  <h3 className="text-2xl font-black tracking-tight mt-1">
                    账户状态变更确认
                  </h3>
                </div>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-apple-text-secondary leading-relaxed font-medium">
                  您确定要 {confirmTarget?.status === 'disabled' ? '禁用' : '启用'} 用户 <span className="text-white font-black">{confirmTarget?.user.displayName}</span> 吗？
                  <br /><br />
                  {confirmTarget?.status === 'disabled' ? '该操作将导致用户立即下线且无法进入核心网络。' : '该操作将恢复用户的所有既定访问权限。'}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose} className="rounded-xl px-6 font-bold text-apple-text-secondary">放弃</Button>
                <Button
                  color={confirmTarget?.status === 'disabled' ? 'danger' : 'success'}
                  className="rounded-xl px-10 font-black"
                  isLoading={statusMutation.isPending}
                  onPress={() => {
                    if (confirmTarget) {
                      statusMutation.mutate({ userID: confirmTarget.user.id, status: confirmTarget.status })
                      onClose()
                    }
                  }}
                >
                  确认识别
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}


function toCreatePayload(draft: CreateUserDraft): CreateUserPayload {
  return {
    username: draft.username.trim(),
    displayName: draft.displayName.trim(),
    password: draft.password,
    roleCodes: draft.roleCodes,
  }
}

async function refreshUsersAndAudits(queryClient: ReturnType<typeof useQueryClient>, includeAudits = true) {
  await queryClient.invalidateQueries({ queryKey: ['/users'] })
  if (includeAudits) {
    await queryClient.invalidateQueries({ queryKey: ['/audits'] })
  }
}

function resolveActionError(error: unknown, fallback: string) {
  if (isApiError(error)) {
    return error.message
  }
  return error instanceof Error ? error.message : fallback
}

function formatDateTime(value: string) {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  }).format(new Date(timestamp))
}
