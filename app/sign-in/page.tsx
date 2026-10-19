import type { Metadata } from 'next'
import { AuthForm } from '@/components/monee/auth-form'

export const metadata: Metadata = { title: 'Sign in — Monee' }
export default function SignInPage() { return <AuthForm mode="sign-in" /> }
