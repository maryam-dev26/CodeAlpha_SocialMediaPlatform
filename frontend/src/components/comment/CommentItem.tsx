import type { Comment } from '../../types/comment.ts'

interface CommentItemProps {
  comment: Comment
  canDelete: boolean
  isDeleting: boolean
  onDelete: (comment: Comment) => void
}

export default function CommentItem({
  comment,
  canDelete,
  isDeleting,
  onDelete,
}: CommentItemProps) {
  const date = new Date(comment.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="flex items-start gap-3 py-3">
      <div aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800 select-none">
        {comment.author.name.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-slate-900">
            {comment.author.name}
          </span>
          <span className="text-xs text-slate-500">@{comment.author.username}</span>
          <span className="ml-auto text-xs text-slate-500 shrink-0">{date}</span>
        </div>

        <p className="mt-0.5 text-sm text-slate-700 whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>

      {canDelete ? (
        <button
          type="button"
          onClick={() => onDelete(comment)}
          disabled={isDeleting}
          aria-label={`Delete comment by ${comment.author.name}`}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
      ) : null}
    </div>
  )
}
