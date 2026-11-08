import { z } from 'zod'

const nameSchema = z
  .string({ error: 'Name is required' })
  .trim()
  .min(2, { error: 'Name must be at least 2 characters' })
  .max(50, { error: 'Name cannot exceed 50 characters' })

const usernameSchema = z
  .string({ error: 'Username is required' })
  .trim()
  .toLowerCase()
  .min(3, { error: 'Username must be at least 3 characters' })
  .max(30, { error: 'Username cannot exceed 30 characters' })
  .regex(/^[a-z0-9_]+$/, {
    error: 'Username may only contain letters, numbers, and underscores',
  })

const emailSchema = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(254, { error: 'Email cannot exceed 254 characters' })
  .pipe(z.email({ error: 'Please provide a valid email address' }))

const passwordSchema = z
  .string({ error: 'Password is required' })
  .min(8, { error: 'Password must be at least 8 characters' })
  .max(128, { error: 'Password cannot exceed 128 characters' })

export const registerSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
}).strict()

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
}).strict()
