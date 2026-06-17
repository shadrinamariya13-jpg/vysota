import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Coffee, Mail, Lock, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn, signUp, user } = useAuth()
  if (user) return <Navigate to="/today" replace />
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password)
        if (error) throw error
      } else {
        if (password.length < 6) throw new Error('Пароль должен быть от 6 символов')
        const { data, error } = await signUp(email.trim(), password)
        if (error) throw error
        if (!data.session) {
          setMsg('Аккаунт создан. Проверьте почту для подтверждения и зайдите снова.')
        }
      }
    } catch (e2) {
      setErr(e2.message || 'Что-то пошло не так')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-bg px-5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl2 bg-gold flex items-center justify-center shadow-gold mb-4">
            <Coffee className="w-7 h-7 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="font-display text-3xl text-coffee-dark">Кофе</h1>
          <p className="text-coffee-mid text-sm mt-1">
            {mode === 'signin' ? 'С возвращением' : 'Создайте аккаунт'}
          </p>
        </div>

        <form onSubmit={submit} className="card p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-coffee-mid mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-light" />
              <input
                type="email"
                required
                autoComplete="email"
                className="input pl-9"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-coffee-mid mb-1.5 uppercase tracking-wide">
              Пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-light" />
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="input pl-9"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {err && (
            <div className="text-xs text-terracotta bg-terracotta/10 border border-terracotta/20 rounded-lg px-3 py-2">
              {err}
            </div>
          )}
          {msg && (
            <div className="text-xs text-olive bg-olive/10 border border-olive/20 rounded-lg px-3 py-2">
              {msg}
            </div>
          )}

          <button type="submit" disabled={busy} className="btn-gold w-full disabled:opacity-60">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'signin' ? 'Войти' : 'Создать аккаунт'}
          </button>

          <div className="text-center text-xs text-coffee-mid">
            {mode === 'signin' ? 'Ещё нет аккаунта? ' : 'Уже есть аккаунт? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setErr(null)
                setMsg(null)
              }}
              className="text-gold hover:text-gold-deep font-medium"
            >
              {mode === 'signin' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </div>
        </form>

        <p className="text-center text-[11px] text-coffee-light mt-4 px-4">
          Без интернета приложение тоже работает — данные хранятся локально и
          синхронизируются, когда сеть появится.
        </p>
      </div>
    </div>
  )
}
