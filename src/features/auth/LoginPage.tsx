import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import logo from '../../assets/ropedia-logo.png'
import { useAuth } from './AuthProvider'
import './auth.css'

const schema = z.object({
  email: z.email('请输入有效邮箱'),
  password: z.string().min(8, '密码至少需要 8 位'),
})

type LoginValues = z.infer<typeof schema>

export default function LoginPage() {
  const { profile, signIn } = useAuth()
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  if (profile) return <Navigate to="/" replace />

  const submit = handleSubmit(async (values) => {
    setServerError('')
    try {
      await signIn(values.email, values.password)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : '登录失败，请重试')
    }
  })

  return <main className="auth-page">
    <section className="auth-brand">
      <img src={logo} alt="Ropedia" />
      <div><span>EMBODIED INTELLIGENCE</span><h1>让真实世界的数据<br />成为智能的起点。</h1><p>安全、高效地管理具身智能数据采集任务。</p></div>
    </section>
    <section className="auth-form-wrap">
      <form className="auth-form" onSubmit={submit}>
        <p className="auth-eyebrow">TASK REGISTER</p>
        <h2>登录工作台</h2>
        <p>使用 Admin 创建的账号登录</p>
        <label>工作邮箱<div><Mail size={17} /><input type="email" autoComplete="email" placeholder="name@company.com" {...register('email')} /></div>{errors.email && <small>{errors.email.message}</small>}</label>
        <label>密码<div><LockKeyhole size={17} /><input type="password" autoComplete="current-password" placeholder="输入密码" {...register('password')} /></div>{errors.password && <small>{errors.password.message}</small>}</label>
        {serverError && <div className="auth-error">{serverError}</div>}
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? '登录中…' : '登录'}<ArrowRight size={17} /></button>
        <footer>© 2026 Ropedia · Secure workspace</footer>
      </form>
    </section>
  </main>
}
