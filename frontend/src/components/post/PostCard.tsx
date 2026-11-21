import type { Post } from '../../types/post.ts'
import { postTypeLabels, postTypeStyles } from '../../utils/postTypes.ts'

interface PostCardProps {
  post: Post
  canDelete: boolean
  onDelete: (post: Post) => void
}

export default function PostCard({ post, canDelete, onDelete }: PostCardProps) {
  const date = new Date(post.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${postTypeStyles[post.type]}`}
        >
          {postTypeLabels[post.type]}
        </span>

        {canDelete ? (
          <button
            type="button"
            onClick={() => onDelete(post)}
            className="rounded-md px-2 py-1 text-sm text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700"
          >
            Delete
          </button>
        ) : null}
      </div>

      <h2 className="mt-3 text-lg font-semibold text-slate-900">{post.title}</h2>
      
      <p className="mt-2 whitespace-pre-wrap text-slate-700">{post.content}</p>

      <p className="mt-4 text-sm text-slate-500">
        {post.author.name} (@{post.author.username}) on {date}
      </p>
    </article>
  )
}