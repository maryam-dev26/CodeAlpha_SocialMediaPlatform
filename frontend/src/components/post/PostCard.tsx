import { useState } from 'react'

import type { Post } from '../../types/post.ts'
import { postTypeLabels, postTypeStyles } from '../../utils/postTypes.ts'
import PostEditForm from './PostEditForm.tsx'

interface PostCardProps {
  post: Post
  canEdit: boolean
  canDelete: boolean
  isLiking: boolean
  onUpdated: () => void
  onDelete: (post: Post) => void
  onToggleLike: (post: Post) => void
}

export default function PostCard({
  post,
  canEdit,
  canDelete,
  isLiking,
  onUpdated,
  onDelete,
  onToggleLike,
}: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false)
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

        {canEdit || canDelete ? (
          <div className="flex items-center gap-1">
            {canEdit ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-md px-2 py-1 text-sm text-teal-700 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-700"
              >
                Edit
              </button>
            ) : null}
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
        ) : null}
      </div>

      {isEditing ? (
        <PostEditForm
          post={post}
          onCancel={() => setIsEditing(false)}
          onUpdated={() => {
            setIsEditing(false)
            onUpdated()
          }}
        />
      ) : (
        <>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            {post.title}
          </h2>

          <p className="mt-2 whitespace-pre-wrap text-slate-700">
            {post.content}
          </p>
        </>
      )}

      <p className="mt-4 text-sm text-slate-500">
        {post.author.name} (@{post.author.username}) on {date}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onToggleLike(post)}
          disabled={isLiking}
          aria-pressed={post.likedByMe}
          className={`rounded-md px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60 ${
            post.likedByMe
              ? 'font-medium text-teal-800 hover:bg-teal-50'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {post.likedByMe ? 'Liked' : 'Like'}
        </button>
        <span className="text-sm text-slate-500">
          {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}
        </span>
      </div>
    </article>
  )
}