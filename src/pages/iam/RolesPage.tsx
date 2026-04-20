import { useState } from 'react'
import { Alert, Button, Card, CardBody, Chip, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Skeleton } from '@heroui/react'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ApiError, isApiError } from '@/api/client'
import {
  cloneRole,
  createPermission,
  createRole,
  deleteRole,
  type PermissionView,
  type RoleView,
  updatePermission,
  updateRole,
  usePermissionCatalogView,
  useRoleOptionsView,
} from '@/api/adapters/user'
import { useAuthStore } from '@/store/auth'
import { PERMISSIONS, hasPermission } from '@/utils/permissions'

type RoleModalMode = 'create' | 'edit' | 'clone'
type PermissionModalMode = 'create' | 'edit'

interface RoleDraft {
  roleID?: string
  code: string
  name: string
  description: string
  permissionCodes: string[]
}

interface PermissionDraft {
  code: string
  name: string
  description: string
  status: 'active' | 'disabled'
}

const EMPTY_ROLE_DRAFT: RoleDraft = {
  code: '',
  name: '',
  description: '',
  permissionCodes: [],
}

const EMPTY_PERMISSION_DRAFT: PermissionDraft = {
  code: '',
  name: '',
  description: '',
  status: 'active',
}

export function RolesPage() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.currentUser)
  const canManageRoles = hasPermission(currentUser?.permissions, PERMISSIONS.roleManage)

  const rolesQuery = useRoleOptionsView()
  const permissionsQuery = usePermissionCatalogView()

  const [notice, setNotice] = useState<{ type: 'success' | 'danger'; message: string } | null>(null)
  const [roleModalMode, setRoleModalMode] = useState<RoleModalMode | null>(null)
  const [permissionModalMode, setPermissionModalMode] = useState<PermissionModalMode | null>(null)
  const [roleDraft, setRoleDraft] = useState<RoleDraft>(EMPTY_ROLE_DRAFT)
  const [permissionDraft, setPermissionDraft] = useState<PermissionDraft>(EMPTY_PERMISSION_DRAFT)

  const roles = rolesQuery.data || []
  const permissions = permissionsQuery.data || []
  const activePermissions = permissions.filter((permission) => permission.status === 'active')
  const disabledPermissions = new Set(permissions.filter((permission) => permission.status === 'disabled').map((permission) => permission.code))
  const permissionCatalog = Array.from(new Set([...permissions.map((permission) => permission.code), ...roles.flatMap((role) => role.permissions)])).sort((a, b) => a.localeCompare(b))

  const refreshIAM = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/roles'] }),
      queryClient.invalidateQueries({ queryKey: ['/permissions'] }),
      queryClient.invalidateQueries({ queryKey: ['/users'] }),
    ])
  }

  const createRoleMutation = useMutation({
    mutationFn: createRole,
    onSuccess: async () => {
      setNotice({ type: 'success', message: '自定义角色已创建。' })
      setRoleModalMode(null)
      setRoleDraft(EMPTY_ROLE_DRAFT)
      await refreshIAM()
    },
    onError: (error) => setNotice({ type: 'danger', message: resolveActionError(error, '创建角色失败') }),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ roleID, ...payload }: RoleDraft & { roleID: string }) =>
      updateRole(roleID, {
        name: payload.name,
        description: payload.description,
        permissionCodes: payload.permissionCodes,
      }),
    onSuccess: async () => {
      setNotice({ type: 'success', message: '角色权限已更新。' })
      setRoleModalMode(null)
      setRoleDraft(EMPTY_ROLE_DRAFT)
      await refreshIAM()
    },
    onError: (error) => setNotice({ type: 'danger', message: resolveActionError(error, '更新角色失败') }),
  })

  const cloneRoleMutation = useMutation({
    mutationFn: ({ roleID, ...payload }: RoleDraft & { roleID: string }) =>
      cloneRole(roleID, {
        code: payload.code,
        name: payload.name,
        description: payload.description,
      }),
    onSuccess: async () => {
      setNotice({ type: 'success', message: '角色已复制为自定义角色。' })
      setRoleModalMode(null)
      setRoleDraft(EMPTY_ROLE_DRAFT)
      await refreshIAM()
    },
    onError: (error) => setNotice({ type: 'danger', message: resolveActionError(error, '复制角色失败') }),
  })

  const deleteRoleMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: async () => {
      setNotice({ type: 'success', message: '角色已删除。' })
      await refreshIAM()
    },
    onError: (error) => setNotice({ type: 'danger', message: resolveActionError(error, '删除角色失败') }),
  })

  const createPermissionMutation = useMutation({
    mutationFn: createPermission,
    onSuccess: async () => {
      setNotice({ type: 'success', message: '自定义权限已创建。' })
      setPermissionModalMode(null)
      setPermissionDraft(EMPTY_PERMISSION_DRAFT)
      await refreshIAM()
    },
    onError: (error) => setNotice({ type: 'danger', message: resolveActionError(error, '创建权限失败') }),
  })

  const updatePermissionMutation = useMutation({
    mutationFn: ({ code, ...payload }: PermissionDraft) =>
      updatePermission(code, {
        name: payload.name,
        description: payload.description,
        status: payload.status,
      }),
    onSuccess: async () => {
      setNotice({ type: 'success', message: '权限目录已更新。' })
      setPermissionModalMode(null)
      setPermissionDraft(EMPTY_PERMISSION_DRAFT)
      await refreshIAM()
    },
    onError: (error) => setNotice({ type: 'danger', message: resolveActionError(error, '更新权限失败') }),
  })

  if (rolesQuery.isPending || permissionsQuery.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 p-8 pb-20">
        <Skeleton className="h-12 w-64 rounded-2xl bg-white/5" />
        <Skeleton className="h-[260px] w-full rounded-[32px] bg-white/5" />
        <Skeleton className="h-[420px] w-full rounded-[32px] bg-white/5" />
      </div>
    )
  }

  if (rolesQuery.isError || permissionsQuery.isError) {
    return (
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 p-8 pb-20">
        <div className="flex items-center justify-center rounded-[32px] border border-white/5 bg-apple-tertiary-bg/10 p-20 backdrop-blur-3xl">
          <div className="flex flex-col items-center gap-4 opacity-80">
            <ShieldCheckIcon className="h-12 w-12 text-apple-red-light" />
            <p className="text-sm font-bold uppercase tracking-widest text-apple-text-tertiary">IAM 工作台加载失败</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-10 p-8 pb-20 text-apple-text-primary animate-in fade-in duration-700">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="h-8 w-8 text-apple-blue-light" />
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">IAM 角色与权限工作台</h1>
              <p className="mt-1 max-w-3xl text-[14px] text-apple-text-secondary">
                内置角色保留为受保护基线，可复制为自定义角色；系统权限只读，自定义权限可直接运营维护。
              </p>
            </div>
          </div>
          {canManageRoles && (
            <div className="flex items-center gap-3">
              <Button color="primary" variant="flat" onPress={() => openPermissionCreate(setPermissionModalMode, setPermissionDraft)}>
                新建权限
              </Button>
              <Button color="primary" onPress={() => openRoleCreate(setRoleModalMode, setRoleDraft)}>
                新建角色
              </Button>
            </div>
          )}
        </div>
        {notice && (
          <Alert
            color={notice.type}
            variant="flat"
            title={notice.type === 'success' ? '操作成功' : '操作失败'}
            description={notice.message}
            className="border border-white/10 bg-white/5"
          />
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border border-white/10 bg-white/[0.02] shadow-none backdrop-blur-3xl">
          <CardBody className="flex flex-col gap-5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">角色管理</h2>
                <p className="text-[12px] uppercase tracking-[0.2em] text-apple-text-tertiary">Roles</p>
              </div>
              <Chip variant="flat" className="border border-white/10 bg-white/5 text-apple-text-secondary">
                {roles.length} 个角色
              </Chip>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {roles.map((role) => {
                const hasDisabledPermission = role.permissions.some((permission) => disabledPermissions.has(permission))
                return (
                  <div key={role.id} data-testid={`role-card-${role.code}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-white">{role.name}</h3>
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-apple-text-tertiary">{role.code}</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Chip size="sm" variant="flat" className={role.isBuiltin ? 'border border-white/10 bg-white/5 text-apple-text-secondary' : 'border border-apple-blue/20 bg-apple-blue/10 text-apple-blue-light'}>
                          {role.isBuiltin ? '内置基线' : '自定义'}
                        </Chip>
                        {hasDisabledPermission && (
                          <Chip size="sm" variant="flat" className="border border-apple-yellow/20 bg-apple-yellow/10 text-apple-yellow-light">
                            含停用权限
                          </Chip>
                        )}
                      </div>
                    </div>

                    <p className="mt-4 min-h-[40px] text-[13px] leading-relaxed text-apple-text-secondary">{role.description || '暂无描述'}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {role.permissions.map((permission) => (
                        <span
                          key={permission}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                            disabledPermissions.has(permission)
                              ? 'border border-apple-yellow/20 bg-apple-yellow/10 text-apple-yellow-light'
                              : 'border border-apple-blue/20 bg-apple-blue/10 text-apple-blue-light'
                          }`}
                        >
                          {permission}
                        </span>
                      ))}
                    </div>

                    {canManageRoles && (
                      <div className="mt-5 flex flex-wrap gap-3">
                        {role.isBuiltin ? (
                          <Button size="sm" variant="flat" onPress={() => openRoleClone(role, setRoleModalMode, setRoleDraft)}>
                            复制为自定义角色
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="flat" onPress={() => openRoleEdit(role, setRoleModalMode, setRoleDraft)}>
                              编辑角色
                            </Button>
                            <Button
                              size="sm"
                              color="danger"
                              variant="flat"
                              onPress={() => deleteRoleMutation.mutate(role.id)}
                              isLoading={deleteRoleMutation.isPending}
                            >
                              删除角色
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>

        <Card className="border border-white/10 bg-white/[0.02] shadow-none backdrop-blur-3xl">
          <CardBody className="flex flex-col gap-5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">权限目录</h2>
                <p className="text-[12px] uppercase tracking-[0.2em] text-apple-text-tertiary">Permissions</p>
              </div>
              <Chip variant="flat" className="border border-white/10 bg-white/5 text-apple-text-secondary">
                {permissions.length} 条权限
              </Chip>
            </div>

            <div className="flex flex-col gap-3">
              {permissions.map((permission) => (
                <div key={permission.code} data-testid={`permission-card-${permission.code}`} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[12px] font-bold uppercase tracking-widest text-white">{permission.code}</p>
                      <p className="mt-1 text-sm font-semibold text-apple-text-primary">{permission.name}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Chip size="sm" variant="flat" className={permission.isBuiltin ? 'border border-white/10 bg-white/5 text-apple-text-secondary' : 'border border-apple-blue/20 bg-apple-blue/10 text-apple-blue-light'}>
                        {permission.isBuiltin ? '系统只读' : '自定义'}
                      </Chip>
                      <Chip size="sm" variant="flat" className={permission.status === 'disabled' ? 'border border-apple-yellow/20 bg-apple-yellow/10 text-apple-yellow-light' : 'border border-apple-green/20 bg-apple-green/10 text-apple-green-light'}>
                        {permission.status === 'disabled' ? '已停用' : '已启用'}
                      </Chip>
                    </div>
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-apple-text-secondary">{permission.description || '暂无描述'}</p>
                  {canManageRoles && !permission.isBuiltin && (
                    <div className="mt-4">
                      <Button size="sm" variant="flat" onPress={() => openPermissionEdit(permission, setPermissionModalMode, setPermissionDraft)}>
                        编辑权限
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl">
        <div className="border-b border-white/5 px-6 py-5">
          <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-apple-text-tertiary">Permission Matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-apple-text-tertiary">权限码</th>
                {roles.map((role) => (
                  <th key={role.code} className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-apple-text-tertiary">
                    {role.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionCatalog.map((permissionCode) => (
                <tr key={permissionCode} className="border-b border-white/5 last:border-b-0">
                  <td className="px-6 py-4 font-mono text-[12px] font-bold text-white">{permissionCode}</td>
                  {roles.map((role) => (
                    <td key={`${role.code}-${permissionCode}`} className="px-4 py-4 text-center">
                      {role.permissions.includes(permissionCode) ? (
                        <span className="inline-flex rounded-full border border-apple-green/20 bg-apple-green/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-apple-green-light">
                          Allow
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-apple-text-tertiary">
                          Deny
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal isOpen={roleModalMode !== null} onOpenChange={(open) => !open && setRoleModalMode(null)}>
        <ModalContent className="border border-white/10 bg-[#0b1324] text-white">
          <ModalHeader>{roleModalMode === 'create' ? '新建角色' : roleModalMode === 'edit' ? '编辑角色' : '复制为自定义角色'}</ModalHeader>
          <ModalBody className="gap-4">
            <Input
              label="角色编码"
              labelPlacement="outside"
              aria-label="角色编码"
              value={roleDraft.code}
              isDisabled={roleModalMode === 'edit'}
              onValueChange={(value) => setRoleDraft((draft) => ({ ...draft, code: value }))}
            />
            <Input
              label="角色名称"
              labelPlacement="outside"
              aria-label="角色名称"
              value={roleDraft.name}
              onValueChange={(value) => setRoleDraft((draft) => ({ ...draft, name: value }))}
            />
            <label className="text-sm text-apple-text-secondary">
              <span className="mb-2 block text-[12px] uppercase tracking-[0.2em] text-apple-text-tertiary">角色描述</span>
              <textarea
                aria-label="角色描述"
                className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
                value={roleDraft.description}
                onChange={(event) => setRoleDraft((draft) => ({ ...draft, description: event.target.value }))}
              />
            </label>
            {roleModalMode !== 'clone' && (
              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-3 text-[12px] font-black uppercase tracking-[0.2em] text-apple-text-tertiary">绑定权限</p>
                <div className="grid max-h-[260px] gap-2 overflow-y-auto pr-1">
                  {activePermissions.map((permission) => (
                    <label key={permission.code} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-2 text-sm">
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-wider text-white">{permission.code}</div>
                        <div className="text-xs text-apple-text-secondary">{permission.name}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={roleDraft.permissionCodes.includes(permission.code)}
                        onChange={() => togglePermissionCode(permission.code, roleDraft, setRoleDraft)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
            {roleModalMode === 'clone' && (
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-apple-text-secondary">
                克隆会沿用源角色当前的权限集合，创建后可在角色管理里继续编辑。
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setRoleModalMode(null)}>
              取消
            </Button>
            <Button
              color="primary"
              onPress={() => submitRoleDraft(roleModalMode, roleDraft, createRoleMutation, updateRoleMutation, cloneRoleMutation)}
              isLoading={createRoleMutation.isPending || updateRoleMutation.isPending || cloneRoleMutation.isPending}
            >
              {roleModalMode === 'create' ? '创建角色' : roleModalMode === 'edit' ? '保存角色' : '复制角色'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={permissionModalMode !== null} onOpenChange={(open) => !open && setPermissionModalMode(null)}>
        <ModalContent className="border border-white/10 bg-[#0b1324] text-white">
          <ModalHeader>{permissionModalMode === 'create' ? '新建权限' : '编辑权限'}</ModalHeader>
          <ModalBody className="gap-4">
            <Input
              label="权限编码"
              labelPlacement="outside"
              aria-label="权限编码"
              value={permissionDraft.code}
              isDisabled={permissionModalMode === 'edit'}
              onValueChange={(value) => setPermissionDraft((draft) => ({ ...draft, code: value }))}
            />
            <Input
              label="权限名称"
              labelPlacement="outside"
              aria-label="权限名称"
              value={permissionDraft.name}
              onValueChange={(value) => setPermissionDraft((draft) => ({ ...draft, name: value }))}
            />
            <label className="text-sm text-apple-text-secondary">
              <span className="mb-2 block text-[12px] uppercase tracking-[0.2em] text-apple-text-tertiary">权限描述</span>
              <textarea
                aria-label="权限描述"
                className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
                value={permissionDraft.description}
                onChange={(event) => setPermissionDraft((draft) => ({ ...draft, description: event.target.value }))}
              />
            </label>
            {permissionModalMode === 'edit' && (
              <label className="text-sm text-apple-text-secondary">
                <span className="mb-2 block text-[12px] uppercase tracking-[0.2em] text-apple-text-tertiary">状态</span>
                <select
                  aria-label="权限状态"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
                  value={permissionDraft.status}
                  onChange={(event) => setPermissionDraft((draft) => ({ ...draft, status: event.target.value as 'active' | 'disabled' }))}
                >
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
              </label>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setPermissionModalMode(null)}>
              取消
            </Button>
            <Button
              color="primary"
              onPress={() => submitPermissionDraft(permissionModalMode, permissionDraft, createPermissionMutation, updatePermissionMutation)}
              isLoading={createPermissionMutation.isPending || updatePermissionMutation.isPending}
            >
              {permissionModalMode === 'create' ? '创建权限' : '保存权限'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

function openRoleCreate(setModalMode: (mode: RoleModalMode | null) => void, setDraft: (value: RoleDraft) => void) {
  setDraft(EMPTY_ROLE_DRAFT)
  setModalMode('create')
}

function openRoleEdit(role: RoleView, setModalMode: (mode: RoleModalMode | null) => void, setDraft: (value: RoleDraft) => void) {
  setDraft({
    roleID: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    permissionCodes: [...role.permissions],
  })
  setModalMode('edit')
}

function openRoleClone(role: RoleView, setModalMode: (mode: RoleModalMode | null) => void, setDraft: (value: RoleDraft) => void) {
  setDraft({
    roleID: role.id,
    code: `${role.code}-copy`,
    name: `${role.name} 副本`,
    description: role.description,
    permissionCodes: [...role.permissions],
  })
  setModalMode('clone')
}

function openPermissionCreate(setModalMode: (mode: PermissionModalMode | null) => void, setDraft: (value: PermissionDraft) => void) {
  setDraft(EMPTY_PERMISSION_DRAFT)
  setModalMode('create')
}

function openPermissionEdit(permission: PermissionView, setModalMode: (mode: PermissionModalMode | null) => void, setDraft: (value: PermissionDraft) => void) {
  setDraft({
    code: permission.code,
    name: permission.name,
    description: permission.description,
    status: permission.status,
  })
  setModalMode('edit')
}

function togglePermissionCode(permissionCode: string, draft: RoleDraft, setDraft: (value: RoleDraft | ((current: RoleDraft) => RoleDraft)) => void) {
  const exists = draft.permissionCodes.includes(permissionCode)
  setDraft((current) => ({
    ...current,
    permissionCodes: exists
      ? current.permissionCodes.filter((item) => item !== permissionCode)
      : [...current.permissionCodes, permissionCode].sort((a, b) => a.localeCompare(b)),
  }))
}

function submitRoleDraft(
  mode: RoleModalMode | null,
  draft: RoleDraft,
  createRoleMutation: { mutate: (payload: { code: string; name: string; description: string; permissionCodes: string[] }) => void },
  updateRoleMutation: { mutate: (payload: RoleDraft & { roleID: string }) => void },
  cloneRoleMutation: { mutate: (payload: RoleDraft & { roleID: string }) => void },
) {
  if (mode === 'create') {
    createRoleMutation.mutate({
      code: draft.code,
      name: draft.name,
      description: draft.description,
      permissionCodes: draft.permissionCodes,
    })
    return
  }
  if (mode === 'edit' && draft.roleID) {
    updateRoleMutation.mutate({ ...draft, roleID: draft.roleID })
    return
  }
  if (mode === 'clone' && draft.roleID) {
    cloneRoleMutation.mutate({ ...draft, roleID: draft.roleID })
  }
}

function submitPermissionDraft(
  mode: PermissionModalMode | null,
  draft: PermissionDraft,
  createPermissionMutation: { mutate: (payload: { code: string; name: string; description: string }) => void },
  updatePermissionMutation: { mutate: (payload: PermissionDraft) => void },
) {
  if (mode === 'create') {
    createPermissionMutation.mutate({
      code: draft.code,
      name: draft.name,
      description: draft.description,
    })
    return
  }
  if (mode === 'edit') {
    updatePermissionMutation.mutate(draft)
  }
}

function resolveActionError(error: unknown, fallback: string) {
  if (isApiError(error)) {
    if (error.status === 409) {
      return error.message
    }
    return error.message || fallback
  }
  if (error instanceof ApiError) {
    return error.message || fallback
  }
  if (error instanceof Error) {
    return error.message || fallback
  }
  return fallback
}
