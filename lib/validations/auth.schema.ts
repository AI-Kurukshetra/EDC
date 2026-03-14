import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginInput = z.infer<typeof LoginSchema>

export const RegisterSchema = LoginSchema.extend({
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  role: z.enum(['sponsor', 'investigator', 'coordinator', 'monitor', 'data_manager', 'read_only']),
})

export type RegisterInput = z.infer<typeof RegisterSchema>

export const MagicLinkSchema = z.object({
  email: z.email('Enter a valid email address'),
})

export type MagicLinkInput = z.infer<typeof MagicLinkSchema>
