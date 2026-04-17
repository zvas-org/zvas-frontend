import type {
  InternalCenterHttpHandlerNetworkConnectivityTestResponse,
  InternalCenterHttpHandlerNetworkInterfaceItem,
  InternalCenterHttpHandlerNetworkInterfaceListResponse,
  InternalCenterHttpHandlerNetworkInterfaceResponse,
  InternalHandlerSystemHealthResponse,
  InternalHandlerSystemSettingsResponse,
  InternalHandlerSystemVersionResponse,
} from '@/api/generated/model'
import { useGetSystemHealth, useGetSystemSettings, useGetSystemVersion } from '@/api/generated/sdk'
import { httpClient } from '@/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * SystemHealthView 定义系统健康页的视图模型。
 */
export interface SystemHealthView {
  service: string
  status: string
  traceId: string
  httpStatus: number
}

/**
 * SystemVersionView 定义系统版本页的视图模型。
 */
export interface SystemVersionView {
  service: string
  version: string
  commit: string
  buildTime: string
  traceId: string
  httpStatus: number
}

/**
 * SystemSettingsView 定义系统设置页的视图模型。
 */
export interface SystemSettingsView {
  service: string
  traceId: string
  user: {
    id: string
    name: string
    role: string
    permissions: string[]
  }
}

/**
 * NetworkInterfaceView 定义网络管理页使用的网口合并视图。
 */
export interface NetworkInterfaceView {
  name: string
  role: string
  isProtected: boolean
  config: {
    mode: string
    address: string
    gateway: string
    dnsServers: string[]
    mtu: number
  }
  status: {
    linkState: string
    mac: string
    speed: string
    carrier: boolean
    currentIP: string
    currentGateway: string
  }
}

/**
 * NetworkConnectivityTestView 定义网络连通性测试结果。
 */
export interface NetworkConnectivityTestView {
  reachable: boolean
  rttAvgMS: number
  packetLoss: number
}

/**
 * UpdateNetworkInterfaceInput 定义网络配置更新入参。
 */
export interface UpdateNetworkInterfaceInput {
  name: string
  mode: 'dhcp' | 'static'
  address?: string
  gateway?: string
  dnsServers?: string[]
  mtu?: number
}

/**
 * TestNetworkInterfaceInput 定义连通性测试入参。
 */
export interface TestNetworkInterfaceInput {
  name: string
  target: string
  count: number
}


/**
 * useSystemHealthView 将生成代码结果转换为页面更稳定的视图结构。
 */
export function useSystemHealthView() {
  return useGetSystemHealth({
    query: {
      select: (response): SystemHealthView => {
        const payload = response.data as InternalHandlerSystemHealthResponse
        return {
          service: payload.data?.service || 'unknown',
          status: payload.data?.status || 'unknown',
          traceId: payload.trace_id || 'n/a',
          httpStatus: response.status,
        }
      },
    },
  })
}

/**
 * useSystemVersionView 将系统版本接口响应转换为页面视图结构。
 */
export function useSystemVersionView() {
  return useGetSystemVersion({
    query: {
      select: (response): SystemVersionView => {
        const payload = response.data as InternalHandlerSystemVersionResponse
        return {
          service: payload.data?.service || 'unknown',
          version: payload.data?.version || 'unknown',
          commit: payload.data?.commit || 'unknown',
          buildTime: payload.data?.build_time || 'unknown',
          traceId: payload.trace_id || 'n/a',
          httpStatus: response.status,
        }
      },
    },
  })
}

/**
 * useSystemSettingsView 将受保护接口响应转换为页面视图结构。
 */
export function useSystemSettingsView() {
  return useGetSystemSettings({
    query: {
      retry: false,
      select: (response): SystemSettingsView => {
        const payload = response.data as InternalHandlerSystemSettingsResponse
        return {
          service: payload.data?.service || 'unknown',
          traceId: payload.trace_id || 'n/a',
          user: {
            id: payload.data?.user?.id || 'unknown',
            name: payload.data?.user?.name || 'unknown',
            role: payload.data?.user?.role || 'unknown',
            permissions: payload.data?.user?.permissions || [],
          },
        }
      },
    },
  })
}

/**
 * useSystemNetworkInterfaces 查询全部网络接口视图。
 */
export function useSystemNetworkInterfaces() {
  return useQuery({
    queryKey: ['system', 'network', 'interfaces'],
    queryFn: async (): Promise<NetworkInterfaceView[]> => {
      const response = await httpClient.get<InternalCenterHttpHandlerNetworkInterfaceListResponse>('/system/network/interfaces')
      const items = response.data?.data || []
      return items.map(mapNetworkInterfaceView)
    },
  })
}

/**
 * useUpdateSystemNetworkInterface 更新业务网口配置，并刷新列表与详情缓存。
 */
export function useUpdateSystemNetworkInterface() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateNetworkInterfaceInput): Promise<NetworkInterfaceView> => {
      const response = await httpClient.put<InternalCenterHttpHandlerNetworkInterfaceResponse>(`/system/network/interfaces/${input.name}`, {
        mode: input.mode,
        address: input.address || '',
        gateway: input.gateway || '',
        dns_servers: input.dnsServers || [],
        mtu: input.mtu || 0,
      })
      return mapNetworkInterfaceView(response.data?.data)
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['system', 'network', 'interfaces'] })
      queryClient.invalidateQueries({ queryKey: ['system', 'network', 'interfaces', input.name] })
    },
  })
}

/**
 * useTestSystemNetworkInterface 通过指定网口执行一次 ping 连通性测试。
 */
export function useTestSystemNetworkInterface() {
  return useMutation({
    mutationFn: async (input: TestNetworkInterfaceInput): Promise<NetworkConnectivityTestView> => {
      const response = await httpClient.post<InternalCenterHttpHandlerNetworkConnectivityTestResponse>(`/system/network/interfaces/${input.name}/test`, {
        target: input.target,
        count: input.count,
      })
      return {
        reachable: Boolean(response.data?.data?.reachable),
        rttAvgMS: Number(response.data?.data?.rtt_avg_ms || 0),
        packetLoss: Number(response.data?.data?.packet_loss || 0),
      }
    },
  })
}

/**
 * mapNetworkInterfaceView 将接口响应字段映射为前端更稳定的命名。
 */
function mapNetworkInterfaceView(item?: InternalCenterHttpHandlerNetworkInterfaceItem): NetworkInterfaceView {
  const config = item?.config || {}
  const status = item?.status || {}
  return {
    name: String(item?.name || ''),
    role: String(item?.role || ''),
    isProtected: Boolean(item?.is_protected),
    config: {
      mode: String(config?.mode || 'dhcp'),
      address: String(config?.address || ''),
      gateway: String(config?.gateway || ''),
      dnsServers: Array.isArray(config?.dns_servers) ? config.dns_servers.map(String) : [],
      mtu: Number(config?.mtu || 0),
    },
    status: {
      linkState: String(status?.link_state || ''),
      mac: String(status?.mac || ''),
      speed: String(status?.speed || ''),
      carrier: Boolean(status?.carrier),
      currentIP: String(status?.current_ip || ''),
      currentGateway: String(status?.current_gateway || ''),
    },
  }
}
