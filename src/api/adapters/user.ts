import { useQuery } from '@tanstack/react-query'
import type {
  GetUsersParams,
  InternalCenterHttpHandlerCloneRoleRequest,
  InternalCenterHttpHandlerCreatePermissionRequest,
  InternalCenterHttpHandlerCreateRoleRequest,
  InternalCenterHttpHandlerPermissionItem,
  InternalCenterHttpHandlerPermissionListResponse,
  InternalCenterHttpHandlerPermissionMutationResponse,
  InternalHandlerCommonActionResponse,
  InternalHandlerCreateUserRequest,
  InternalHandlerRoleItem,
  InternalHandlerRoleListResponse,
  InternalCenterHttpHandlerRoleMutationResponse,
  InternalCenterHttpHandlerUpdatePermissionRequest,
  InternalCenterHttpHandlerUpdateRoleRequest,
  InternalHandlerUpdateUserRolesRequest,
  InternalHandlerUpdateUserStatusRequest,
  InternalHandlerUserCreateResponse,
  InternalHandlerUserListItem,
  InternalHandlerUserListResponse,
} from '@/api/generated/model'
import {
  deleteRolesId,
  getPermissions,
  getRoles,
  getUsers,
  patchPermissionsCode,
  patchRolesId,
  patchUsersIdStatus,
  postPermissions,
  postRoles,
  postRolesIdClone,
  postUsers,
  postUsersIdResetPassword,
  useGetPermissions,
  useGetRoles,
  useGetUsers,
  putUsersIdRoles,
} from '@/api/generated/sdk'
import { httpClient } from '@/api/client'

export interface UserView {
  id: string
  username: string
  displayName: string
  status: string
  isBuiltin: boolean
  lastLoginAt?: string
  roles: RoleView[]
}

export interface RoleView {
  id: string
  code: string
  name: string
  description: string
  isBuiltin: boolean
  permissions: string[]
}

export interface PermissionView {
  code: string
  name: string
  description: string
  isBuiltin: boolean
  status: 'active' | 'disabled'
}

export interface UserListView {
  items: UserView[]
  traceId: string
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}

export interface CreateUserPayload {
  username: string
  displayName: string
  password: string
  roleCodes: string[]
}

export interface ResetPasswordPayload {
  newPassword: string
}

export interface ReplaceRolesPayload {
  roleCodes: string[]
}

export interface CreatePermissionPayload {
  code: string
  name: string
  description: string
}

export interface UpdatePermissionPayload {
  name: string
  description: string
  status: 'active' | 'disabled'
}

export interface CreateRolePayload {
  code: string
  name: string
  description: string
  permissionCodes: string[]
}

export interface UpdateRolePayload {
  name: string
  description: string
  permissionCodes: string[]
}

export interface CloneRolePayload {
  code: string
  name: string
  description: string
}

export interface UpdateStatusPayload {
  status: 'active' | 'disabled'
}

export interface UserPermissionSnapshotView {
  userID: string
  roleCodes: string[]
  permissions: string[]
}

/**
 * useUserListView 读取用户列表并转换为页面视图结构。
 */
export function useUserListView(params: GetUsersParams) {
  return useGetUsers(params, {
    query: {
      select: (response): UserListView => {
        const payload = response.data as InternalHandlerUserListResponse
        return {
          items: (payload.data || []).map(toUserView),
          traceId: payload.trace_id || 'n/a',
          pagination: {
            page: payload.pagination?.page || params.page || 1,
            pageSize: payload.pagination?.page_size || params.page_size || 20,
            total: payload.pagination?.total || 0,
          },
        }
      },
    },
  })
}

/**
 * useRoleOptionsView 读取角色列表并转换为页面选项。
 */
export function useRoleOptionsView() {
  return useGetRoles({
    query: {
      select: (response): RoleView[] => {
        const payload = response.data as InternalHandlerRoleListResponse
        return (payload.data || []).map(toRoleView)
      },
    },
  })
}

/**
 * usePermissionCatalogView 读取权限目录并转换为页面视图结构。
 */
export function usePermissionCatalogView() {
  return useGetPermissions({
    query: {
      select: (response): PermissionView[] => {
        const payload = response.data as InternalCenterHttpHandlerPermissionListResponse
        return (payload.data || []).map(toPermissionView)
      },
    },
  })
}

/**
 * useUserPermissionSnapshotView 读取指定用户的权限快照。
 */
export function useUserPermissionSnapshotView(userID?: string) {
  return useQuery({
    queryKey: ['user-permissions', userID],
    enabled: Boolean(userID),
    queryFn: async (): Promise<UserPermissionSnapshotView> => {
      const response = await httpClient.get(`/users/${userID}/permissions`)
      const body = response.data as {
        data?: {
          user_id?: string
          role_codes?: string[]
          permissions?: string[]
        }
      }
      return {
        userID: body.data?.user_id || '',
        roleCodes: body.data?.role_codes || [],
        permissions: body.data?.permissions || [],
      }
    },
  })
}

/**
 * createUser 执行创建用户动作。
 */
export async function createUser(payload: CreateUserPayload) {
  const response = await postUsers({
    username: payload.username,
    display_name: payload.displayName,
    password: payload.password,
    role_codes: payload.roleCodes,
  } satisfies InternalHandlerCreateUserRequest)

  const body = response.data as InternalHandlerUserCreateResponse
  return toUserView(body.data)
}

/**
 * updateUserStatus 执行用户启停动作。
 */
export async function updateUserStatus(userID: string, payload: UpdateStatusPayload) {
  const response = await patchUsersIdStatus(userID, {
    status: payload.status,
  } satisfies InternalHandlerUpdateUserStatusRequest)

  const body = response.data as InternalHandlerUserCreateResponse
  return toUserView(body.data)
}

/**
 * resetUserPassword 执行管理员重置密码动作。
 */
export async function resetUserPassword(userID: string, payload: ResetPasswordPayload) {
  const response = await postUsersIdResetPassword(userID, {
    new_password: payload.newPassword,
  })

  const body = response.data as InternalHandlerCommonActionResponse
  return Boolean(body.data?.success)
}

/**
 * replaceUserRoles 执行角色替换动作。
 */
export async function replaceUserRoles(userID: string, payload: ReplaceRolesPayload) {
  const response = await putUsersIdRoles(userID, {
    role_codes: payload.roleCodes,
  } satisfies InternalHandlerUpdateUserRolesRequest)

  const body = response.data as InternalHandlerUserCreateResponse
  return toUserView(body.data)
}

/**
 * createPermission 执行权限创建动作。
 */
export async function createPermission(payload: CreatePermissionPayload) {
  const response = await postPermissions({
    code: payload.code,
    name: payload.name,
    description: payload.description,
  } satisfies InternalCenterHttpHandlerCreatePermissionRequest)

  const body = response.data as InternalCenterHttpHandlerPermissionMutationResponse
  return toPermissionView(body.data)
}

/**
 * updatePermission 执行权限更新动作。
 */
export async function updatePermission(code: string, payload: UpdatePermissionPayload) {
  const response = await patchPermissionsCode(code, {
    name: payload.name,
    description: payload.description,
    status: payload.status,
  } satisfies InternalCenterHttpHandlerUpdatePermissionRequest)

  const body = response.data as InternalCenterHttpHandlerPermissionMutationResponse
  return toPermissionView(body.data)
}

/**
 * createRole 执行角色创建动作。
 */
export async function createRole(payload: CreateRolePayload) {
  const response = await postRoles({
    code: payload.code,
    name: payload.name,
    description: payload.description,
    permission_codes: payload.permissionCodes,
  } satisfies InternalCenterHttpHandlerCreateRoleRequest)

  const body = response.data as InternalCenterHttpHandlerRoleMutationResponse
  return toRoleView(body.data)
}

/**
 * updateRole 执行角色更新动作。
 */
export async function updateRole(roleID: string, payload: UpdateRolePayload) {
  const response = await patchRolesId(roleID, {
    name: payload.name,
    description: payload.description,
    permission_codes: payload.permissionCodes,
  } satisfies InternalCenterHttpHandlerUpdateRoleRequest)

  const body = response.data as InternalCenterHttpHandlerRoleMutationResponse
  return toRoleView(body.data)
}

/**
 * deleteRole 执行角色删除动作。
 */
export async function deleteRole(roleID: string) {
  const response = await deleteRolesId(roleID)
  const body = response.data as InternalHandlerCommonActionResponse
  return Boolean(body.data?.success)
}

/**
 * cloneRole 执行角色克隆动作。
 */
export async function cloneRole(roleID: string, payload: CloneRolePayload) {
  const response = await postRolesIdClone(roleID, {
    code: payload.code,
    name: payload.name,
    description: payload.description,
  } satisfies InternalCenterHttpHandlerCloneRoleRequest)

  const body = response.data as InternalCenterHttpHandlerRoleMutationResponse
  return toRoleView(body.data)
}

/**
 * refetchUsers 提供非 Hook 场景下的列表读取能力。
 */
export async function refetchUsers(params: GetUsersParams) {
  const response = await getUsers(params)
  const body = response.data as InternalHandlerUserListResponse
  return {
    items: (body.data || []).map(toUserView),
    traceId: body.trace_id || 'n/a',
    pagination: {
      page: body.pagination?.page || params.page || 1,
      pageSize: body.pagination?.page_size || params.page_size || 20,
      total: body.pagination?.total || 0,
    },
  } satisfies UserListView
}

/**
 * refetchRoles 提供非 Hook 场景下的角色读取能力。
 */
export async function refetchRoles() {
  const response = await getRoles()
  const body = response.data as InternalHandlerRoleListResponse
  return (body.data || []).map(toRoleView)
}

/**
 * refetchPermissions 提供非 Hook 场景下的权限目录读取能力。
 */
export async function refetchPermissions() {
  const response = await getPermissions()
  const body = response.data as InternalCenterHttpHandlerPermissionListResponse
  return (body.data || []).map(toPermissionView)
}

function toUserView(user?: InternalHandlerUserListItem | null): UserView {
  return {
    id: user?.id || '',
    username: user?.username || '',
    displayName: user?.display_name || '',
    status: user?.status || 'unknown',
    isBuiltin: Boolean(user?.is_builtin),
    lastLoginAt: user?.last_login_at || undefined,
    roles: (user?.roles || []).map(toRoleView),
  }
}

function toRoleView(role?: InternalHandlerRoleItem | null): RoleView {
  const roleWithPermissions = role as (InternalHandlerRoleItem & { permissions?: string[] }) | null | undefined
  return {
    id: role?.id || '',
    code: role?.code || '',
    name: role?.name || '',
    description: role?.description || '',
    isBuiltin: Boolean(role?.is_builtin),
    permissions: roleWithPermissions?.permissions || [],
  }
}

function toPermissionView(permission?: InternalCenterHttpHandlerPermissionItem | null): PermissionView {
  return {
    code: permission?.code || '',
    name: permission?.name || '',
    description: permission?.description || '',
    isBuiltin: Boolean(permission?.is_builtin),
    status: permission?.status === 'disabled' ? 'disabled' : 'active',
  }
}
