import { z } from 'zod'

const contentSchema = z
  .string({ error: 'Content is required' })
  .trim()
  .min(1, { error: 'Content is required' })
  .max(1000, { error: 'Content cannot exceed 1000 characters' })

export const createCommentSchema = z
  .object({
    content: contentSchema,
  })
  .strict()
