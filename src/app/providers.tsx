import { ConfigProvider } from '@arco-design/web-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { PropsWithChildren } from 'react'

/**
 * AppProviders 统一挂载 Arco 与 React Query Provider。
 */
export function AppProviders({ children }: PropsWithChildren) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
    [],
  )

  return (
    <ConfigProvider componentConfig={{ Card: { bordered: false } }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ConfigProvider>
  )
}
