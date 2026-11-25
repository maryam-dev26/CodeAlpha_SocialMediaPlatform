import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import { Link } from 'react-router'
import { createComment } from '../../services/commentService.ts'
import type { Comment } from '../../types/comment.ts'
import { parseApiError } from '../../utils/formErrors.ts'
import type { FieldErrors } from '../../utils/formErrors.ts'

interface CommentFormProps {
  postId: string
  isLoggedIn: boolean
  onCreated: (comment: Comment) => void
}

const maxChar = 1000

export default function CommentForm({
  postId,
  isLoggedIn,
  onCreated,
}: CommentFormProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  if (!isLoggedIn) {
    return (
      <p className="text-sm text-slate-600">
        <Link to="/login" className="font-medium text-teal-700 hover:underline">
          Log in
        </Link>{' '}
        to leave a comment.
      </p>
    )
  }

  const trimmedLength = content.trim().length
  const isOverLimit = content.length > maxChar
  const inputId = `comment-input-${postId}`
  const errorId = `${inputId}-error`

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting || trimmedLength === 0 || isOverLimit) return

    setFormError('')
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      const result = await createComment(postId, { content })
      setContent('')
      onCreated(result.comment)
    } catch (error) {
      const parsed = parseApiError(error)
      setFormError(parsed.message)
      setFieldErrors(parsed.fields)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-2">
      {formError ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {formError}
        </p>
      ) : null}

      <div>
        <label htmlFor={inputId} className="sr-only">
          Write a comment
        </label>
        <textarea
          id={inputId}
          rows={3}
          placeholder="Write a comment…"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          aria-invalid={fieldErrors.content || isOverLimit ? true : undefined}
          aria-describedby={fieldErrors.content ? errorId : undefined}
          className={`block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-2 focus:outline-teal-700 ${fieldErrors.content || isOverLimit
              ? 'border-red-500'
              : 'border-slate-300'
            }`}
        />
        {fieldErrors.content ? (
          <p id={errorId} className="mt-1 text-sm text-red-700">
            {fieldErrors.content}
          </p>
        ) : null}
        <p
          className={`mt-1 text-right text-xs ${isOverLimit ? 'text-red-700' : 'text-slate-500'
            }`}
        >
          {content.length} / {maxChar}
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || trimmedLength === 0 || isOverLimit}
        className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold 
                  text-white hover:bg-teal-800 focus-visible:outline-2 
                  focus-visible:outline-offset-2 focus-visible:outline-teal-700 
                  disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Posting…' : 'Post comment'}
      </button>
    </form>
  )
}
