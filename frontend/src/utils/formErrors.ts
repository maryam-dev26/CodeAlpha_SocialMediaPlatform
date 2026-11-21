import { ApiError } from '../services/ApiError.ts'

export type FieldErrors = Record<string, string>

export function parseApiError(error: unknown): {
  message: string
  fields: FieldErrors
} {
  if (error instanceof ApiError) {
    const fields: FieldErrors = {}

    for (const item of error.errors ?? []) {
      if (!(item.field in fields)) {
        fields[item.field] = item.message
      }
    }

    const hasFieldErrors = Object.keys(fields).length > 0

    return { message: hasFieldErrors ? '' : error.message, fields }
  }

  return { message: 'Something went wrong. Please try again.', fields: {} }
}