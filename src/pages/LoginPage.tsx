import { Button, Input, Alert } from '@heroui/react'
import { EyeIcon, EyeSlashIcon, LockClosedIcon, UserIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

import { login } from '@/api/adapters/auth'
import { ApiError } from '@/api/client'
import { useAuthStore } from '@/store/auth'

/**
 * 依据强制架构约束：使用 Tailwind CSS 和 HeroUI 构建的深色控制台登录入口
 * 修复：自研 Fixed 模式提示逻辑，解决 addToast 导致的布局挤占与不消失问题
 */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((state) => state.setSession)
  const [submitting, setSubmitting] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // 核心修复：通过本地状态控制唯一、自动消失且 Fixed 定位的提示 (模拟 Element UI Message)
  const [toast, setToast] = useState<{ title: string; msg: string; type: 'warning' | 'danger' } | null>(null)

  const toggleVisibility = () => setIsVisible(!isVisible)

  const redirectPath = new URLSearchParams(location.search).get('redirect') || '/system/health'

  // 处理自动消失逻辑：彻底解决消息不退出的问题
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // 通用消息提醒函数：通过状态驱动，确保 fixed 定位不挤压布局
  const notify = (title: string, msg: string, type: 'warning' | 'danger') => {
    setToast(null) // 先置空，清除老弹窗
    setTimeout(() => {
      setToast({ title, msg, type })
    }, 50)
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const username = formData.get('username') as string
    const password = formData.get('password') as string

    if (!username || !password) {
      notify('验证提醒', '请完整填写管理员账号和安全口令', 'warning')
      return
    }

    try {
      setSubmitting(true)
      const result = await login({ username, password })
      setSession(result.accessToken, result.user)
      navigate(redirectPath, { replace: true })
    } catch (error) {
      const msg = error instanceof ApiError
        ? error.message
        : error instanceof Error ? error.message : '未知认证错误'

      notify('登录失败', msg, 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden bg-apple-black text-apple-text-primary select-none font-sans">
      {/* 极简发光背景 */}
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-full h-[40%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(41,151,255,0.08),transparent_75%)] pointer-events-none z-0" />

      {/* 核心修复：Fixed 定位提示层，深度模拟 Element UI Message 体验 */}
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
              <Alert
                hideIcon
                color={toast.type}
                variant="flat"
                classNames={{
                  base: [
                    "max-w-fit min-h-0 border border-white/10 rounded-full py-2.5 px-6 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10 items-center",
                    toast.type === 'danger' ? "bg-apple-red/20" : "bg-apple-blue-light/10"
                  ].join(" "),
                  mainWrapper: "flex flex-row items-center",
                }}
              >
                <div className="flex flex-row items-center gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                  <span className={[
                    "text-[15px] font-bold tracking-tight leading-none whitespace-nowrap",
                    toast.type === 'danger' ? "text-apple-red-light" : "text-apple-blue-light"
                  ].join(" ")}>
                    {toast.title}: {toast.msg}
                  </span>
                </div>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-[420px] relative z-10 flex flex-col">
        <header className="flex flex-col items-center text-center mb-14">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-8 p-3 rounded-[24%] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-2xl backdrop-blur-xl"
          >
            <svg viewBox="0 0 40 40" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 5L35 12.5V27.5L20 35L5 27.5V12.5L20 5Z" stroke="url(#logo_grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 12L28 16V24L20 28L12 24V16L20 12Z" fill="url(#logo_grad)" fillOpacity="0.2" />
              <path d="M20 15L24 17V23L20 25L16 23V17L20 15Z" fill="url(#logo_grad)" fillOpacity="0.5" />
              <defs>
                <linearGradient id="logo_grad" x1="5" y1="5" x2="35" y2="35" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#2997ff" />
                  <stop offset="1" stopColor="#0071e3" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
          <h1 className="text-[40px] font-bold tracking-[-0.02em] text-apple-text-primary leading-tight mb-2">ZVAS Console</h1>
          <p className="text-[19px] text-apple-text-secondary font-medium tracking-tight">
            安全地访问您的核心资产管理面板
          </p>
        </header>

        <form onSubmit={submit} className="flex flex-col gap-4 w-full" noValidate>
          <div className="flex flex-col gap-2">
            <label className="text-apple-text-secondary text-sm font-bold px-1">用户名</label>
            <Input
              name="username"
              aria-label="用户名"
              placeholder="管理员账户"
              defaultValue="admin"
              autoComplete="username"
              size="lg"
              variant="flat"
              startContent={<UserIcon className="w-5 h-5 text-apple-text-secondary flex-shrink-0" />}
              classNames={{
                base: "max-w-full group",
                mainWrapper: "h-14 min-h-[56px]",
                inputWrapper: [
                  "h-14 min-h-[56px]",
                  "bg-apple-bg/60",
                  "backdrop-blur-2xl",
                  "border border-white/[0.08]",
                  "rounded-[22px]",
                  "px-5",
                  "flex flex-row items-center",
                  "transition-all duration-300",
                  "hover:bg-apple-bg/80",
                  "hover:border-white/[0.12]",
                  "group-data-[focus=true]:bg-black",
                  "group-data-[focus=true]:border-apple-blue-light/50",
                  "group-data-[focus=true]:shadow-[0_0_0_1px_rgba(41,151,255,0.2)]",
                  "!cursor-text",
                ].join(" "),
                innerWrapper: "flex flex-row items-center gap-3 w-full h-full",
                input: [
                  "text-[17px]",
                  "placeholder:text-apple-text-secondary",
                  "caret-apple-blue-light",
                  "bg-transparent",
                  "outline-none",
                  "border-none",
                  "focus:ring-0",
                  "p-0",
                  "m-0",
                  "h-full",
                  "w-full",
                  "flex-1",
                  "leading-relaxed",
                ].join(" "),
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-apple-text-secondary text-sm font-bold px-1">密码</label>
            <Input
              name="password"
              aria-label="密码"
              type={isVisible ? "text" : "password"}
              placeholder="安全口令"
              defaultValue="Admin@123456"
              autoComplete="current-password"
              size="lg"
              variant="flat"
              startContent={<LockClosedIcon className="w-5 h-5 text-apple-text-secondary flex-shrink-0" />}
              endContent={
                <button className="focus:outline-none p-1 -mr-1" type="button" onClick={toggleVisibility} aria-label="toggle password visibility">
                  {isVisible ? (
                    <EyeSlashIcon className="w-5 h-5 text-apple-text-secondary transition-colors hover:text-apple-text-primary" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-apple-text-secondary transition-colors hover:text-apple-text-primary" />
                  )}
                </button>
              }
              classNames={{
                base: "max-w-full group",
                mainWrapper: "h-14 min-h-[56px]",
                inputWrapper: [
                  "h-14 min-h-[56px]",
                  "bg-apple-bg/60",
                  "backdrop-blur-2xl",
                  "border border-white/[0.08]",
                  "rounded-[22px]",
                  "px-5",
                  "flex flex-row items-center",
                  "transition-all duration-300",
                  "hover:bg-apple-bg/80",
                  "hover:border-white/[0.12]",
                  "group-data-[focus=true]:bg-black",
                  "group-data-[focus=true]:border-apple-blue-light/50",
                  "group-data-[focus=true]:shadow-[0_0_0_1px_rgba(41,151,255,0.2)]",
                  "!cursor-text",
                ].join(" "),
                innerWrapper: "flex flex-row items-center gap-3 w-full h-full",
                input: [
                  "text-[17px]",
                  "placeholder:text-apple-text-secondary",
                  "caret-apple-blue-light",
                  "bg-transparent",
                  "outline-none",
                  "border-none",
                  "focus:ring-0",
                  "p-0",
                  "m-0",
                  "h-full",
                  "w-full",
                  "flex-1",
                  "leading-relaxed",
                ].join(" "),
              }}
            />
          </div>

          <Button
            type="submit"
            isLoading={submitting}
            className="mt-8 w-full h-[56px] min-h-[56px] text-[17px] font-bold bg-apple-text-primary text-apple-black rounded-[22px] hover:bg-white active:scale-[0.98] transition-all shadow-lg overflow-hidden relative group"
          >
            <span className="relative z-10">{submitting ? '验证中...' : '继 续'}</span>
          </Button>
        </form>

        <footer className="mt-28 text-center">
          <p className="text-[13px] text-apple-text-secondary leading-relaxed font-semibold">
            网络节点：私有环境部署<br />
            <span className="opacity-50 font-normal">
              如果未注册管理员，请使用默认账号：admin / Admin@123456登录
            </span>
          </p>
        </footer>
      </div>
    </main>
  )
}





