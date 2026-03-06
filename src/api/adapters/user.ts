import type {
  GetUsersParams,
  InternalHandlerCommonActionResponse,
  InternalHandlerCreateUserRequest,
  InternalHandlerRoleItem,
  InternalHandlerRoleListResponse,
  InternalHandlerUpdateUserRolesRequest,
  InternalHandlerUpdateUserStatusRequest,
  InternalHandlerUserCreateResponse,
  InternalHandlerUserListItem,
  InternalHandlerUserListResponse,
} from '@/api/generated/model'
import {
  getRoles,
  getUsers,
  patchUsersIdStatus,
  postUsers,
  postUsersIdResetPassword,
  useGetRoles,
  useGetUsers,
  putUsersIdRoles,
} from '@/api/generated/sdk'

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

export interface UpdateStatusPayload {
  status: 'active' | 'disabled'
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
  return {
    id: role?.id || '',
    code: role?.code || '',
    name: role?.name || '',
    description: role?.description || '',
    isBuiltin: Boolean(role?.is_builtin),
  }
}
