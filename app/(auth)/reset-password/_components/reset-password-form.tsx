'use client'

import { useEffect, useState, useTransition } from 'react'

import Link from 'next/link'
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
import { getBrowserSupabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { ResetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth.schema'

type ResetPasswordFormProps = {
  className?: string
}

/** Completes a Supabase recovery session by collecting and saving a new password. */
export function ResetPasswordForm({ className }: ResetPasswordFormProps) {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [isSubmitting, startSubmittingTransition] = useTransition()

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    void (async () => {
      const supabase = getBrowserSupabase()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setHasRecoverySession(Boolean(session))
      setIsReady(true)
    })()
  }, [])

  function handleSubmit(values: ResetPasswordInput) {
    startSubmittingTransition(() => {
      void (async () => {
        const supabase = getBrowserSupabase()
        const { error } = await supabase.auth.updateUser({
          password: values.password,
        })

        if (error) {
          toast.error(error.message)
          return
        }

        toast.success('Password updated.')
        router.push('/')
        router.refresh()
      })()
    })
  }

  if (!isReady) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle>Preparing recovery session</CardTitle>
          <CardDescription>Checking your one-time reset link.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!hasRecoverySession) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <p className="text-xs font-medium tracking-[0.08em] text-[color:var(--color-navy-700)] uppercase">
            Recovery required
          </p>
          <CardTitle>Password reset link required</CardTitle>
          <CardDescription>
            Open the latest recovery link from your email or request a new one from the sign-in
            page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <p className="text-xs font-medium tracking-[0.08em] text-[color:var(--color-navy-700)] uppercase">
          Password recovery
        </p>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>
          Choose a fresh password for your Clinical Data Hub account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            className="space-y-5"
            noValidate
            onSubmit={(event) => {
              void form.handleSubmit(handleSubmit)(event)
            }}
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="new-password"
                      placeholder="Choose a secure password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Use at least eight characters. You will use this same credential in signature
                    confirmation flows.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="new-password"
                      placeholder="Re-enter your new password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Updating password...' : 'Save new password'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
