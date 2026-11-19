import { z } from 'zod'

import { POST_TYPES } from '../models/Post.js'

const typeSchema = z.enum(POST_TYPES, {
  error: `Post type must be one of: ${POST_TYPES.join(', ')}`,
})

const titleSchema = z
  .string({ error: 'Title is required' })
  .trim()
  .min(3, { error: 'Title must be at least 3 characters' })
  .max(120, { error: 'Title cannot exceed 120 characters' })

const contentSchema = z
  .string({ error: 'Content is required' })
  .trim()
  .min(1, { error: 'Content is required' })
  .max(5000, { error: 'Content cannot exceed 5000 characters' })

export const createPostSchema = z
  .object({
    type: typeSchema,
    title: titleSchema,
    content: contentSchema,
  })
  .strict()

export const updatePostSchema = z
  .object({
    title: titleSchema,
    content: contentSchema,
  })
  .strict()

export const listPostsQuerySchema = z.object({
  page: z.coerce
    .number({ error: 'Page must be a number' })
    .int({ error: 'Page must be a whole number' })
    .min(1, { error: 'Page must be at least 1' })
    .default(1),
  limit: z.coerce
    .number({ error: 'Limit must be a number' })
    .int({ error: 'Limit must be a whole number' })
    .min(1, { error: 'Limit must be at least 1' })
    .max(50, { error: 'Limit cannot exceed 50' })
    .default(10),
  type: typeSchema.optional(),
})