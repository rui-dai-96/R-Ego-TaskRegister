import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from './AuthProvider'

const schema = z.object({
  password: z.string().min(12, '新密码至少需要 12 位').regex(/[A-Z]/, '需要至少一个大写字母').regex(/[0-9]/, '需要至少一个数字'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
})

type Values = z.infer<typeof schema>

export default function PasswordChangePage() {
  const { profile, changePassword } = useAuth()
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })

  if (!profile) return <Navigate to="/login" replace />
  if (!profile.must_change_password || done) return <Navigate to="/" replace />

  return <main className="password-page"><form className="auth-form compact" onSubmit={handleSubmit(async (values) => {
    setServerError('')
    try {
      await changePassword(values.password)
      setDone(true)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : '密码更新失败')
    }
  })}>
    <div className="security-mark"><ShieldCheck /></div>
    <p className="auth-eyebrow">FIRST SIGN IN</p><h2>设置你的新密码</h2><p>首次登录需要更换 Admin 分配的临时密码。</p>
    <label>新密码<div><input type="password" autoComplete="new-password" {...register('password')} /></div>{errors.password && <small>{errors.password.message}</small>}</label>
    <label>确认新密码<div><input type="password" autoComplete="new-password" {...register('confirmPassword')} /></div>{errors.confirmPassword && <small>{errors.confirmPassword.message}</small>}</label>
    {serverError && <div className="auth-error">{serverError}</div>}
    <button type="submit" disabled={isSubmitting}>{isSubmitting ? '保存中…' : '保存新密码'}</button>
  </form></main>
}
