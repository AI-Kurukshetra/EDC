'use client'

import type { SyntheticEvent } from 'react'
import { startTransition, useState } from 'react'

import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { loginWithPassword, requestPasswordReset, sendMagicLink } from '@/lib/actions/auth'
import { cn } from '@/lib/utils/cn'
import {
  ForgotPasswordSchema,
  LoginSchema,
  MagicLinkSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type MagicLinkInput,
} from '@/lib/validations/auth.schema'

type LoginFormProps = {
  authError?: string | undefined
  className?: string
}

/** Handles password and magic-link sign-in flows for approved study users. */
export function LoginForm({ authError, className }: LoginFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingLink, setIsSendingLink] = useState(false)
  const [isSendingRecovery, setIsSendingRecovery] = useState(false)

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const magicLinkForm = useForm<MagicLinkInput>({
    resolver: zodResolver(MagicLinkSchema),
    defaultValues: {
      email: '',
    },
  })

  const forgotPasswordForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  function handleLogin(values: LoginInput) {
    setIsSubmitting(true)

    startTransition(async () => {
      const result = await loginWithPassword(values)
      setIsSubmitting(false)

      if (!result.success) {
        if (typeof result.error === 'object') {
          Object.entries(result.error).forEach(([field, errors]) => {
            loginForm.setError(field as keyof LoginInput, {
              message: errors[0] ?? 'Invalid value',
            })
          })
          return
        }

        toast.error(result.error)
        return
      }

      toast.success('Welcome back.')
      router.push(result.data.redirectTo)
      router.refresh()
    })
  }

  function handleMagicLink(values: MagicLinkInput) {
    setIsSendingLink(true)

    startTransition(async () => {
      const result = await sendMagicLink(values)
      setIsSendingLink(false)

      if (!result.success) {
        if (typeof result.error === 'object') {
          Object.entries(result.error).forEach(([field, errors]) => {
            magicLinkForm.setError(field as keyof MagicLinkInput, {
              message: errors[0] ?? 'Invalid value',
            })
          })
          return
        }

        toast.error(result.error)
        return
      }

      toast.success(result.data)
      magicLinkForm.reset()
    })
  }

  function handleForgotPassword(values: ForgotPasswordInput) {
    setIsSendingRecovery(true)

    startTransition(async () => {
      const result = await requestPasswordReset(values)
      setIsSendingRecovery(false)

      if (!result.success) {
        if (typeof result.error === 'object') {
          Object.entries(result.error).forEach(([field, errors]) => {
            forgotPasswordForm.setError(field as keyof ForgotPasswordInput, {
              message: errors[0] ?? 'Invalid value',
            })
          })
          return
        }

        toast.error(result.error)
        return
      }

      toast.success(result.data)
      forgotPasswordForm.reset()
    })
  }

  function handleLoginSubmit(event: SyntheticEvent<HTMLFormElement>) {
    void loginForm.handleSubmit(handleLogin)(event)
  }

  function handleMagicLinkSubmit(event: SyntheticEvent<HTMLFormElement>) {
    void magicLinkForm.handleSubmit(handleMagicLink)(event)
  }

  function handleForgotPasswordSubmit(event: SyntheticEvent<HTMLFormElement>) {
    void forgotPasswordForm.handleSubmit(handleForgotPassword)(event)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {authError ? (
        <Card className="border-[color:var(--color-gray-300)] bg-[color:var(--color-gray-50)]">
          <CardHeader>
            <CardTitle className="text-lg">Authentication link issue</CardTitle>
            <CardDescription>{authError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <p className="text-xs font-medium tracking-[0.08em] text-[color:var(--color-navy-700)] uppercase">
            Secure access
          </p>
          <CardTitle>Sign in to Clinical Data Hub</CardTitle>
          <CardDescription>
            Continue with your study operations workspace using your approved user account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...loginForm}>
            <form className="space-y-5" onSubmit={handleLoginSubmit} noValidate>
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="email"
                        placeholder="operator@clinicalhub.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Password re-entry is also used for 21 CFR Part 11 signature workflows.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-[color:var(--color-navy-100)] bg-[color:var(--color-navy-50)]/80">
        <CardHeader>
          <CardTitle className="text-xl">Prefer a magic link?</CardTitle>
          <CardDescription>
            Use passwordless sign-in for low-friction access on shared clinical site workstations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...magicLinkForm}>
            <form className="space-y-5" onSubmit={handleMagicLinkSubmit} noValidate>
              <FormField
                control={magicLinkForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="email"
                        placeholder="operator@clinicalhub.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button className="w-full" disabled={isSendingLink} type="submit" variant="outline">
                {isSendingLink ? 'Sending link...' : 'Send magic link'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Forgot your password?</CardTitle>
          <CardDescription>
            Request a recovery link that lets you set a new password securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...forgotPasswordForm}>
            <form className="space-y-5" noValidate onSubmit={handleForgotPasswordSubmit}>
              <FormField
                control={forgotPasswordForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="email"
                        placeholder="operator@clinicalhub.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The recovery link will take you to a secure password reset screen.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                className="w-full"
                disabled={isSendingRecovery}
                type="submit"
                variant="outline"
              >
                {isSendingRecovery ? 'Sending recovery link...' : 'Send recovery link'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
