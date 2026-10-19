'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useDemoSession } from './demo-session'

type Mode = 'sign-in' | 'sign-up'

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const { startDemo } = useDemoSession()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const isSignUp = mode === 'sign-up'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const confirmation = String(formData.get('confirmation') ?? '')

    if (isSignUp && name.length < 2) return setError('Enter your name using at least 2 characters.')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    if (isSignUp && password.length < 10) return setError('Use a password with at least 10 characters.')
    if (!isSignUp && !password) return setError('Enter a password to start the demo.')
    if (isSignUp && password !== confirmation) return setError('The passwords do not match.')

    setPending(true)
    // Credentials are only used for form validation. They are never saved or sent.
    startDemo()
    router.push('/financial-health')
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-5 py-12 sm:px-8">
      <section className="w-full max-w-md rounded-3xl border border-foreground/10 bg-card/90 p-7 shadow-2xl shadow-black/20 sm:p-9">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Monee</Link>
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-mint">Monee demo</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{isSignUp ? 'Start your demo' : 'Welcome back'}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {isSignUp ? 'Try the financial workspace with your own sample assumptions.' : 'Continue to the Monee financial workspace.'}
        </p>

        <aside className="mt-6 rounded-2xl border border-lavender/25 bg-lavender/[0.08] p-4 text-sm leading-6 text-foreground/80">
          <strong className="block text-foreground">Prototype only</strong>
          This does not create or verify an account. Any valid email and password can start the demo. Passwords are not saved or sent. The simulator uses one shared workspace in this browser.
        </aside>

        {error && <p role="alert" className="mt-5 rounded-xl border border-destructive/25 bg-destructive/[0.08] p-3 text-sm text-destructive">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          {isSignUp && <Field label="Name" name="name" autoComplete="name" required minLength={2} />}
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <PasswordField label="Password" name="password" show={showPassword} onToggle={() => setShowPassword((value) => !value)} minLength={isSignUp ? 10 : 1} />
          {isSignUp && <PasswordField label="Confirm password" name="confirmation" show={showPassword} onToggle={() => setShowPassword((value) => !value)} minLength={10} />}
          {isSignUp && <p className="-mt-2 text-xs text-muted-foreground">Use at least 10 characters. Your password is only checked in this form and is discarded.</p>}
          <button type="submit" disabled={pending} className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-mint px-5 text-sm font-semibold text-background transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60">
            {pending ? 'Opening demo…' : isSignUp ? 'Continue to demo' : 'Sign in to demo'}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          {isSignUp ? <>Already here? <Link href="/sign-in" className="text-mint hover:underline">Sign in</Link></> : <>New to Monee? <Link href="/sign-up" className="text-mint hover:underline">Start the demo</Link></>}
        </p>
      </section>
    </main>
  )
}

function Field({ label, name, type = 'text', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return <div><label htmlFor={name} className="mb-2 block text-sm text-foreground/85">{label}</label><input id={name} name={name} type={type} className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/20" {...props} /></div>
}

function PasswordField({ label, name, show, onToggle, minLength }: { label: string; name: string; show: boolean; onToggle: () => void; minLength: number }) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm text-foreground/85">{label}</label>
      <div className="relative">
        <input id={name} name={name} type={show ? 'text' : 'password'} required minLength={minLength} autoComplete={name === 'password' ? 'current-password' : 'new-password'} className="h-12 w-full rounded-xl border border-input bg-background px-4 pr-12 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/20" />
        <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={onToggle} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}
