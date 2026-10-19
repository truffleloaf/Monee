import type { Metadata } from 'next'
import { AuthForm } from '@/components/monee/auth-form'

export const metadata: Metadata = { title: 'Start the demo — Monee' }
export default function SignUpPage() { return <AuthForm mode="sign-up" /> }
