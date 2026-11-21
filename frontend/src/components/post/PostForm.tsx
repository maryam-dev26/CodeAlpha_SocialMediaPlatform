import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import FormField from '../common/FormField.tsx'
import { createPost } from '../../services/postService.ts'
import type { PostType } from '../../types/post.ts'
import { parseApiError } from '../../utils/formErrors.ts'
import type { FieldErrors } from '../../utils/formErrors.ts'
import { postTypes, postTypeLabels } from '../../utils/postTypes.ts'

interface PostFormProps {
  onCreated: () => void
}

const inputClasses =
  'mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-2 focus:outline-teal-700'

export default function PostForm({ onCreated }: PostFormProps) {
  const [type, setType] = useState<PostType>('journey')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
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
      await createPost({ type, title, content })
      setTitle('')
      setContent('')
      onCreated()
    } catch (error) {
      const parsed = parseApiError(error)
      setFormError(parsed.message)
      setFieldErrors(parsed.fields)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-900">Share something</h2>

      {formError ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {formError}
        </p>
      ) : null}

      <div>
        <label htmlFor="post-type" className="block text-sm font-medium text-slate-800">
          Post type
        </label>
        <select
          id="post-type"
          value={type}
          onChange={(event) => setType(event.target.value as PostType)}
          className={`${inputClasses} ${fieldErrors.type ? 'border-red-500' : 'border-slate-300'}`}
        >
          {postTypes.map((value) => (
            <option key={value} value={value}>
              {postTypeLabels[value]}
            </option>
          ))}
        </select>
        {fieldErrors.type ? (
          <p className="mt-1 text-sm text-red-700">{fieldErrors.type}</p>
        ) : null}
      </div>

      <FormField
        id="post-title"
        label="Title"
        value={title}
        onChange={setTitle}
        error={fieldErrors.title}
      />

      <div>
        <label htmlFor="post-content" className="block text-sm font-medium text-slate-800">
          Content
        </label>
        <textarea
          id="post-content"
          rows={5}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          aria-invalid={fieldErrors.content ? true : undefined}
          className={`${inputClasses} ${fieldErrors.content ? 'border-red-500' : 'border-slate-300'}`}
        />
        {fieldErrors.content ? (
          <p className="mt-1 text-sm text-red-700">{fieldErrors.content}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Publishing…' : 'Publish post'}
      </button>
    </form>
  )
}