import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.ts'
import { getComments, deleteComment } from '../../services/commentService.ts'
import type { Comment } from '../../types/comment.ts'
import { parseApiError } from '../../utils/formErrors.ts'
import CommentItem from './CommentItem.tsx'
import CommentForm from './CommentForm.tsx'

interface CommentSectionProps {
  postId: string
  postAuthorId: string
}

export default function CommentSection({
  postId,
  postAuthorId,
}: CommentSectionProps) {
  const { user } = useAuth()

  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    let ignore = false

    getComments(postId)
      .then((data) => {
        if (!ignore) setComments(data.comments)
      })
      .catch((caught) => {
        if (!ignore) setLoadError(parseApiError(caught).message)
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [postId])

  const handleCreated = (comment: Comment) => {
    setActionError('')
    setComments((prev) => [...prev, comment])
  }

  const handleDelete = async (comment: Comment) => {
    if (!window.confirm('Delete this comment?')) return

    setActionError('')
    setDeletingIds((ids) => new Set(ids).add(comment.id))

    try {
      await deleteComment(postId, comment.id)
      setComments((prev) => prev.filter((c) => c.id !== comment.id))
    } catch (caught) {
      setActionError(parseApiError(caught).message)
    } finally {
      setDeletingIds((ids) => {
        const next = new Set(ids)
        next.delete(comment.id)
        return next
      })
    }
  }

  const canDeleteComment = (comment: Comment) =>
    user?.id === comment.author.id || user?.id === postAuthorId

  return (
    <section
      aria-label="Comments"
      className="mt-4 space-y-4 border-t border-slate-100 pt-4"
    >
      <h3 className="text-sm font-semibold text-slate-700">Comments</h3>

      {actionError ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {actionError}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading comments…</p>
      ) : loadError ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {loadError}
        </p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-400">No comments yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canDelete={canDeleteComment(comment)}
              isDeleting={deletingIds.has(comment.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CommentForm
        postId={postId}
        isLoggedIn={Boolean(user)}
        onCreated={handleCreated}
      />
    </section>
  )
}
