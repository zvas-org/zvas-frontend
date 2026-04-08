import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

type UseUrlTabStateOptions<T extends string> = {
  param: string
  defaultValue: T
  values: readonly T[]
}

export function useUrlTabState<T extends string>({ param, defaultValue, values }: UseUrlTabStateOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawValue = searchParams.get(param)
  const activeValue = rawValue && values.includes(rawValue as T) ? (rawValue as T) : defaultValue

  useEffect(() => {
    if (!rawValue) return
    if (values.includes(rawValue as T)) return

    const next = new URLSearchParams(searchParams)
    next.delete(param)
    setSearchParams(next, { replace: true })
  }, [param, rawValue, searchParams, setSearchParams, values])

  const setActiveValue = useCallback((nextValue: T) => {
    const next = new URLSearchParams(searchParams)
    if (nextValue === defaultValue) {
      next.delete(param)
    } else {
      next.set(param, nextValue)
    }
    setSearchParams(next, { replace: true })
  }, [defaultValue, param, searchParams, setSearchParams])

  return [activeValue, setActiveValue] as const
}
