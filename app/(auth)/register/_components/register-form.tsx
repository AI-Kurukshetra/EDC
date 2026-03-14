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
import { registerWithPassword } from '@/lib/actions/auth'
import { cn } from '@/lib/utils/cn'
import { RegisterSchema, type RegisterInput } from '@/lib/validations/auth.schema'

const ROLE_OPTIONS = [
  { label: 'Sponsor', value: 'sponsor' },
  { label: 'Investigator', value: 'investigator' },
  { label: 'Coordinator', value: 'coordinator' },
  { label: 'Monitor', value: 'monitor' },
  { label: 'Data Manager', value: 'data_manager' },
  { label: 'Read Only', value: 'read_only' },
] as const

type RegisterFormProps = {
  className?: string
}

/** Captures a new access request and provisions the initial Supabase account flow. */
export function RegisterForm({ className }: RegisterFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      role: 'coordinator',
    },
  })

  function onSubmit(values: RegisterInput) {
    setIsSubmitting(true)

    startTransition(async () => {
      const result = await registerWithPassword(values)
      setIsSubmitting(false)

      if (!result.success) {
        if (typeof result.error === 'object') {
          Object.entries(result.error).forEach(([field, errors]) => {
            form.setError(field as keyof RegisterInput, {
              message: errors[0] ?? 'Invalid value',
            })
          })
          return
        }

        toast.error(result.error)
        return
      }

      toast.success(result.data)
      router.push('/login')
    })
  }

  function handleFormSubmit(event: SyntheticEvent<HTMLFormElement>) {
    void form.handleSubmit(onSubmit)(event)
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <p className="text-xs font-medium tracking-[0.08em] text-[color:var(--color-navy-700)] uppercase">
          Role request
        </p>
        <CardTitle>Request access</CardTitle>
        <CardDescription>
          Accounts are provisioned through Supabase Auth and approved by a platform super admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-5" onSubmit={handleFormSubmit} noValidate>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Alicia Chen" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="email"
                      placeholder="alicia@site-network.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="new-password"
                      placeholder="Choose a secure password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Use a strong password. Signature workflows will re-prompt for credential
                    confirmation.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requested role</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-11 w-full rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-2 text-sm text-[color:var(--color-gray-900)] shadow-sm outline-none focus:border-[color:var(--color-navy-700)] focus:ring-2 focus:ring-[color:var(--color-navy-100)]"
                      {...field}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Submitting request...' : 'Create account'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
