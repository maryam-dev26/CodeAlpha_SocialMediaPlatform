import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import FormField from '../common/FormField.tsx'
import { updatePost } from '../../services/postService.ts'
import type { Post } from '../../types/post.ts'
import { parseApiError } from '../../utils/formErrors.ts'
import type { FieldErrors } from '../../utils/formErrors.ts'

interface PostEditFormProps {
  post: Post
  onCancel: () => void
  onUpdated: () => void
}

export default function PostEditForm({
  post,
  onCancel,
  onUpdated,
}: PostEditFormProps) {
  const [title, setTitle] = useState(post.title)
  const [content, setContent] = useState(post.content)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setFormError('')
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      await updatePost(post.id, { title, content })
      onUpdated()
    } catch (error) {
      const parsed = parseApiError(error)
      setFormError(parsed.message)
      setFieldErrors(parsed.fields)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-3 space-y-4">
      {formError ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {formError}
        </p>
      ) : null}

      <FormField
        id={`edit-title-${post.id}`}
        label="Title"
        value={title}
        onChange={setTitle}
        error={fieldErrors.title}
      />

      <div>
        <label
          htmlFor={`edit-content-${post.id}`}
          className="block text-sm font-medium text-slate-800"
        >
          Content
        </label>
        <textarea
          id={`edit-content-${post.id}`}
          rows={5}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          aria-invalid={fieldErrors.content ? true : undefined}
          className={`mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-2 focus:outline-teal-700 ${
            fieldErrors.content ? 'border-red-500' : 'border-slate-300'
          }`}
        />
        {fieldErrors.content ? (
          <p className="mt-1 text-sm text-red-700">{fieldErrors.content}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-teal-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
